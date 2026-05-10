import type { ZodType } from "zod";
import type { ToolContext, ToolResult } from "../../types/ai.js";

interface ToolDefinition<TParams extends ZodType = ZodType> {
  name: string;
  description: string;
  paramsSchema: TParams;
  handler: (params: z.infer<TParams>, context: ToolContext) => Promise<ToolResult>;
  requiresConfirmation?: boolean;
  rateLimit?: number;
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private rateLimitTracker = new Map<string, number[]>();

  register<TParams extends ZodType>(tool: ToolDefinition<TParams>): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool "${tool.name}" already registered, overwriting`);
    }
    this.tools.set(tool.name, tool as ToolDefinition);
    console.log(`[ToolRegistry] ✓ Registered tool: ${tool.name}`);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Array<{ name: string; description: string; parameters: unknown }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.paramsSchema,
    }));
  }

  getToolsForLLM(): Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.getAllTools().map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: (tool.parameters as any)?.toJSON?.() || {},
      },
    }));
  }

  async execute(toolName: string, rawParams: unknown, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${toolName}`,
        metadata: { availableTools: Array.from(this.tools.keys()) },
      };
    }

    const parseResult = tool.paramsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid parameters for tool "${toolName}": ${parseResult.error.message}`,
      };
    }

    if (tool.rateLimit && !this.checkRateLimit(toolName, context.userId)) {
      return {
        success: false,
        error: `Rate limit exceeded for tool: ${toolName}. Please try again later.`,
      };
    }

    try {
      console.log(`[ToolRegistry] Executing tool: ${toolName}`, {
        userId: context.userId,
        requestId: context.requestId,
      });

      const result = await tool.handler(parseResult.data, context);

      await this.auditLog(toolName, rawParams, result, context);

      return result;
    } catch (error) {
      console.error(`[ToolRegistry] Error executing ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  requiresConfirmation(toolName: string): boolean {
    const tool = this.tools.get(toolName);
    return tool?.requiresConfirmation ?? false;
  }

  private checkRateLimit(toolName: string, userId: string): boolean {
    const key = `${userId}:${toolName}`;
    const now = Date.now();
    const windowMs = 60 * 1000;

    let calls = this.rateLimitTracker.get(key) || [];
    calls = calls.filter(timestamp => now - timestamp < windowMs);

    const tool = this.tools.get(toolName);
    if (tool && calls.length >= (tool.rateLimit || 60)) {
      return false;
    }

    calls.push(now);
    this.rateLimitTracker.set(key, calls);
    return true;
  }

  private async auditLog(toolName: string, params: unknown, result: ToolResult, context: ToolContext): Promise<void> {
    try {
      console.log(`[Audit] User=${context.userId} Tool=${toolName} Success=${result.success}`);
    } catch (error) {
      console.error("[ToolRegistry] Failed to write audit log:", error);
    }
  }
}

export { ToolRegistry };
export const toolRegistry = new ToolRegistry();
export type { ToolDefinition, ToolContext, ToolResult };
