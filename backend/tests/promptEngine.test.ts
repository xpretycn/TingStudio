import { describe, it, expect, beforeEach } from 'vitest';
import { PromptEngine } from '../src/services/ai/agent/promptEngine.js';

describe('PromptEngine', () => {
  let engine: PromptEngine;

  beforeEach(() => {
    engine = new PromptEngine();
  });

  describe('buildSystemPrompt()', () => {
    it('should replace {{TOOLS_LIST}} placeholder with provided content', () => {
      const toolsDefinition = JSON.stringify([
        { name: 'tool1', description: 'Description 1' },
        { name: 'tool2', description: 'Description 2' },
      ], null, 2);

      const result = engine.buildSystemPrompt(toolsDefinition);

      expect(result).toContain('"tool1"');
      expect(result).toContain('"tool2"');
      expect(result).not.toContain('{{TOOLS_LIST}}');
    });

    it('should contain core principles in generated prompt', () => {
      const result = engine.buildSystemPrompt('[]');

      expect(result).toContain('确定性优先');
      expect(result).toContain('工具驱动');
      expect(result).toContain('查询优先');
      expect(result).toContain('写入指引');
    });

    it('should contain role definition', () => {
      const result = engine.buildSystemPrompt('[]');

      expect(result).toContain('TingStudio');
      expect(result).toContain('专业配方管理 AI 助手');
    });
  });

  describe('getPromptVersion()', () => {
    it('should return current version string', () => {
      const version = engine.getPromptVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });
  });

  describe('getLastUpdated()', () => {
    it('should return a Date object', () => {
      const lastUpdated = engine.getLastUpdated();
      expect(lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('updateTemplate()', () => {
    it('should update system prompt content', () => {
      const newContent = 'New system prompt content';
      engine.updateTemplate({ system: newContent });

      const rawTemplate = engine.getRawTemplate();
      expect(rawTemplate).toBe(newContent);
    });

    it('should update version', () => {
      engine.updateTemplate({ version: '2.0.0' });
      expect(engine.getPromptVersion()).toBe('2.0.0');
    });

    it('should auto-update lastUpdated date if not provided', () => {
      const beforeUpdate = engine.getLastUpdated();
      
      engine.updateTemplate({ system: 'updated' });
      
      const afterUpdate = engine.getLastUpdated();
      expect(afterUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('getRawTemplate()', () => {
    it('should return the raw template string', () => {
      const raw = engine.getRawTemplate();
      expect(typeof raw).toBe('string');
      expect(raw.length).toBeGreaterThan(0);
    });
  });
});
