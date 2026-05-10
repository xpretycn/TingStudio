import { Request, Response } from 'express';
import { llmAgentService } from './llmService.js';
import { toolRegistry } from './toolRegistry.js';
import { promptEngine } from './promptEngine.js';
import type { ToolContext, ToolResult } from '../../types/ai.js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

interface ConversationSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActiveAt: Date;
}

class AIAgentController {
  private sessions = new Map<string, ConversationSession>();
  private sessionTimeout = 30 * 60 * 1000;

  async handleChat(req: Request, res: Response): Promise<void> {
    const { message, sessionId, stream = false } = req.body;
    const userId = (req as any).user?.userId || 'anonymous';

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Message is required and must be a string',
      });
      return;
    }

    const session = this.getOrCreateSession(sessionId);
    const toolsList = toolRegistry.getToolsForLLM();
    const systemPrompt = promptEngine.buildSystemPrompt(JSON.stringify(toolsList, null, 2));

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.getSessionHistory(session.id).slice(-20),
      { role: 'user', content: message },
    ];

    if (stream) {
      await this.handleStreamChat(req, res, messages, session, userId);
    } else {
      await this.handleNormalChat(res, messages, session, userId, message);
    }
  }

  private async handleStreamChat(
    req: Request,
    res: Response,
    messages: ChatMessage[],
    session: ConversationSession,
    userId: string
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const result = await llmAgentService.streamChat(
        { messages, tools: toolRegistry.getToolsForLLM() },
        (chunk) => {
          this.sendSSEEvent(res, 'chunk', { content: chunk });
        }
      );

      if ((result as any).tool_calls && (result as any).tool_calls.length > 0) {
        this.sendSSEEvent(res, 'tool_calls', { calls: result.tool_calls });

        const toolResults = await this.executeToolCalls(result.tool_calls!, userId, session.id);

        this.addMessagesToSession(session.id, [
          { role: 'assistant', content: result.content || '', toolName: 'multiple' },
          ...toolResults.map(tr => ({
            role: 'tool' as const,
            content: JSON.stringify(tr.result),
            toolCallId: tr.id,
          })),
        ]);

        const finalMessages = [
          { role: 'system', content: promptEngine.buildSystemPrompt(JSON.stringify(toolRegistry.getToolsForLLM(), null, 2)) },
          ...this.getSessionHistory(session.id).slice(-25),
        ];

        const finalResult = await llmAgentService.streamChat(
          { messages: finalMessages },
          (chunk) => {
            this.sendSSEEvent(res, 'chunk', { content: chunk });
          }
        );

        this.addMessagesToSession(session.id, [
          { role: 'user', content: messages[messages.length - 1].content },
          { role: 'assistant', content: finalResult.content || '' },
        ]);

        this.sendSSEEvent(res, 'done', { id: finalResult.id });
      } else {
        this.addMessagesToSession(session.id, [
          { role: 'user', content: messages[messages.length - 1].content },
          { role: 'assistant', content: result.content || '' },
        ]);
        this.sendSSEEvent(res, 'done', { id: result.id });
      }

      res.end();
    } catch (error) {
      console.error('[AIAgent] Stream chat error:', error);
      this.sendSSEEvent(res, 'error', { error: (error as Error).message });
      res.end();
    }
  }

  private async handleNormalChat(
    res: Response,
    messages: ChatMessage[],
    session: ConversationSession,
    userId: string,
    userMessage: string
  ): Promise<void> {
    try {
      const result = await llmAgentService.chat({
        messages,
        tools: toolRegistry.getToolsForLLM(),
      });

      if (result.tool_calls && result.tool_calls.length > 0) {
        const toolResults = await this.executeToolCalls(result.tool_calls, userId, session.id);

        res.json({
          success: true,
          type: 'tool_call_required',
          toolCalls: result.tool_calls,
          toolResults,
          assistantMessage: result.content,
          sessionId: session.id,
        });
      } else {
        this.addMessagesToSession(session.id, [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: result.content || '' },
        ]);

        res.json({
          success: true,
          type: 'text',
          content: result.content,
          usage: result.usage,
          model: result.model,
          sessionId: session.id,
        });
      }
    } catch (error) {
      console.error('[AIAgent] Normal chat error:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  getSessionHistory(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getAllSessions(): Array<{ id: string; messageCount: number; createdAt: Date; lastActiveAt: Date }> {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
    }));
  }

  private getOrCreateSession(sessionId?: string): ConversationSession {
    let session: ConversationSession;

    if (sessionId && this.sessions.has(sessionId)) {
      session = this.sessions.get(sessionId)!;
      session.lastActiveAt = new Date();
    } else {
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      session = {
        id: newSessionId,
        messages: [],
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };
      this.sessions.set(newSessionId, session);
    }

    return session;
  }

  private addMessagesToSession(sessionId: string, messages: ChatMessage[]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(...messages);
      session.lastActiveAt = new Date();
    }
  }

  private async executeToolCalls(
    toolCalls: Array<{ id: string; name: string; arguments: string }>,
    userId: string,
    sessionId: string
  ): Promise<Array<{ id: string; name: string; result: ToolResult }>> {
    const results = [];

    for (const tc of toolCalls) {
      try {
        const params = JSON.parse(tc.arguments);
        const context: ToolContext = {
          userId,
          userRole: 'user',
          sessionId,
          requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        const result = await toolRegistry.execute(tc.name, params, context);
        results.push({ id: tc.id, name: tc.name, result });
      } catch (error) {
        results.push({
          id: tc.id,
          name: tc.name,
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse arguments',
          },
        });
      }
    }

    return results;
  }

  private sendSSEEvent(res: Response, type: string, data: any): void {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  }
}

export const aiAgentController = new AIAgentController();
