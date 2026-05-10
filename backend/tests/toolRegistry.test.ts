import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '../src/services/ai/agent/toolRegistry.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register()', () => {
    it('should register a tool successfully', () => {
      const tool = {
        name: 'test_tool',
        description: 'Test tool',
        paramsSchema: z.object({ name: z.string() }),
        handler: async (params: any) => ({ success: true, data: params }),
      };

      registry.register(tool);
      
      expect(registry.getTool('test_tool')).toBeDefined();
    });

    it('should allow overwriting existing tool with warning', () => {
      const tool1 = {
        name: 'test_tool',
        description: 'First version',
        paramsSchema: z.object({ name: z.string() }),
        handler: async () => ({ success: true }),
      };

      const tool2 = {
        name: 'test_tool',
        description: 'Second version',
        paramsSchema: z.object({ name: z.string(), age: z.number() }),
        handler: async () => ({ success: true }),
      };

      registry.register(tool1);
      registry.register(tool2);

      const retrieved = registry.getTool('test_tool');
      expect(retrieved?.description).toBe('Second version');
    });
  });

  describe('getTool()', () => {
    it('should return undefined for non-existent tool', () => {
      expect(registry.getTool('non_existent')).toBeUndefined();
    });
  });

  describe('getAllTools()', () => {
    it('should return empty array when no tools registered', () => {
      expect(registry.getAllTools()).toEqual([]);
    });

    it('should return all registered tools', () => {
      registry.register({
        name: 'tool1',
        description: 'Tool 1',
        paramsSchema: z.object({}),
        handler: async () => ({ success: true }),
      });
      
      registry.register({
        name: 'tool2',
        description: 'Tool 2',
        paramsSchema: z.object({}),
        handler: async () => ({ success: true }),
      });

      const tools = registry.getAllTools();
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toContain('tool1');
      expect(tools.map(t => t.name)).toContain('tool2');
    });
  });

  describe('execute()', () => {
    it('should return error for unknown tool', async () => {
      const result = await registry.execute('unknown_tool', {}, {
        userId: 'user1',
        userRole: 'user',
        sessionId: 'session1',
        requestId: 'req1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });

    it('should validate parameters and return error for invalid params', async () => {
      registry.register({
        name: 'validate_test',
        description: 'Validation test',
        paramsSchema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        handler: async (params) => ({ success: true, data: params }),
      });

      const result = await registry.execute('validate_test', { name: 123 }, {
        userId: 'user1',
        userRole: 'user',
        sessionId: 'session1',
        requestId: 'req1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid parameters');
    });

    it('should execute tool successfully with valid params', async () => {
      registry.register({
        name: 'success_test',
        description: 'Success test',
        paramsSchema: z.object({
          message: z.string(),
        }),
        handler: async (params) => ({
          success: true,
          data: { echo: params.message },
        }),
      });

      const result = await registry.execute('success_test', { message: 'hello' }, {
        userId: 'user1',
        userRole: 'user',
        sessionId: 'session1',
        requestId: 'req1',
      });

      expect(result.success).toBe(true);
      expect((result as any).data).toEqual({ echo: 'hello' });
    });
  });

  describe('unregister()', () => {
    it('should remove a registered tool', () => {
      registry.register({
        name: 'to_remove',
        description: 'Will be removed',
        paramsSchema: z.object({}),
        handler: async () => ({ success: true }),
      });

      expect(registry.getTool('to_remove')).toBeDefined();

      const removed = registry.unregister('to_remove');

      expect(removed).toBe(true);
      expect(registry.getTool('to_remove')).toBeUndefined();
    });

    it('should return false when removing non-existent tool', () => {
      const removed = registry.unregister('non_existent');
      expect(removed).toBe(false);
    });
  });

  describe('requiresConfirmation()', () => {
    it('should return false by default', () => {
      registry.register({
        name: 'no_confirm',
        description: 'No confirmation needed',
        paramsSchema: z.object({}),
        handler: async () => ({ success: true }),
      });

      expect(registry.requiresConfirmation('no_confirm')).toBe(false);
    });

    it('should return true when configured', () => {
      registry.register({
        name: 'needs_confirm',
        description: 'Requires confirmation',
        paramsSchema: z.object({}),
        handler: async () => ({ success: true }),
        requiresConfirmation: true,
      });

      expect(registry.requiresConfirmation('needs_confirm')).toBe(true);
    });
  });
});
