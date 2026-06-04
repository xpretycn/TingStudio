import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toolRegistry, registerAllTools } from '../src/services/ai/agent/toolRegistration.js';

// Mock SalespersonService - 导出单例实例
vi.mock('../src/services/business/salespersonService.js', () => {
  return {
    SalespersonService: vi.fn(),
    salespersonService: {
      create: vi.fn().mockResolvedValue({
        id: 'mock-sp-id',
        name: '测试业务员',
        phone: '13800138000',
        email: 'test@example.com',
        department: '测试部门',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      query: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      }),
      update: vi.fn().mockResolvedValue({
        id: 'mock-sp-id',
        name: '更新业务员',
      }),
      delete: vi.fn().mockResolvedValue(true),
    },
  };
});

// Mock SalesAnalysisService - 导出单例实例
vi.mock('../src/services/business/salesAnalysisService.js', () => {
  return {
    SalesAnalysisService: vi.fn(),
    salesAnalysisService: {
      analyze: vi.fn().mockResolvedValue({
        summary: {
          total_records: 0,
          total_quantity: 0,
          total_amount: 0,
          avg_quantity_per_order: 0,
          avg_amount_per_order: 0,
        },
        trends: [],
        top_formulas: [],
        top_salespersons: [],
        period_breakdown: [],
        has_data: false,
      }),
    },
  };
});

describe('ToolRegistration - AI Agent 工具注册集成', () => {
  beforeEach(() => {
    registerAllTools();
  });

  describe('工具注册完整性', () => {
    it('应该注册所有核心业务工具', () => {
      const tools = toolRegistry.getAllTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('calculate_nutrition');
      expect(toolNames).toContain('validate_ratio_factor');
      expect(toolNames).toContain('calculate_cost');
      expect(toolNames).toContain('parse_file');
      expect(toolNames).toContain('create_salesperson');
      expect(toolNames).toContain('query_salespersons');
      expect(toolNames).toContain('update_salesperson');
      expect(toolNames).toContain('delete_salesperson');
      expect(toolNames).toContain('analyze_sales');
    });

    it('应该注册至少9个工具', () => {
      const tools = toolRegistry.getAllTools();
      expect(tools.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('calculate_nutrition 工具', () => {
    it('应该正确执行营养计算', async () => {
      const result = await toolRegistry.execute(
        'calculate_nutrition',
        {
          finishedWeight: 100,
          materials: [
            {
              name: '人参',
              type: 'herb',
              quantity: 10,
              ratioFactor: 0.18,
              nutrition_per_100g: { protein: 5.2, fat: 1.1, carbohydrate: 23.4, sodium: 8 },
            },
            {
              name: '枸杞',
              type: 'supplement',
              quantity: 15,
              ratioFactor: 1.0,
              nutrition_per_100g: { protein: 13.6, fat: 1.7, carbohydrate: 64.1, sodium: 7 },
            },
          ],
        },
        { userId: 'test_user', userRole: 'user', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('calculation_steps');
      expect(result.data).toHaveProperty('result');
    });

    it('应该拒绝缺少必填参数的请求', async () => {
      const result = await toolRegistry.execute(
        'calculate_nutrition',
        { finishedWeight: -100, materials: [] },
        { userId: 'test_user', userRole: 'user', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('参数无效');
    });
  });

  describe('validate_ratio_factor 工具', () => {
    it('应该正确校验含量比', async () => {
      const result = await toolRegistry.execute(
        'validate_ratio_factor',
        {
          materials: [
            { quantity: 50, ratioFactor: 1.0 },
            { quantity: 50, ratioFactor: 1.0 },
          ],
          finishedWeight: 100,
        },
        { userId: 'test_user', userRole: 'user', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(true);
      expect(result.data.level).toBeDefined();
      expect(['normal', 'warning', 'high_warning', 'error']).toContain(result.data.level);
    });
  });

  describe('calculate_cost 工具', () => {
    it('应该正确计算成本', async () => {
      const result = await toolRegistry.execute(
        'calculate_cost',
        {
          materials: [
            { name: '人参', quantity: 500, unitPrice: 200 },
            { name: '枸杞', quantity: 300, unitPrice: 60 },
          ],
          packaging_cost: 5,
          other_costs: 3,
          profit_margin_percent: 25,
          finished_weight: 800,
        },
        { userId: 'test_user', userRole: 'user', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(true);
      expect(result.data.material_subtotal).toBeGreaterThan(0);
      expect(result.data.cost_subtotal).toBeGreaterThan(0);
      expect(result.data.total_price).toBeGreaterThan(0);
      expect(result.data.unit_cost).toBeDefined();
    });
  });

  describe('create_salesperson 工具', () => {
    it('需要确认才能创建', () => {
      const tool = toolRegistry.getTool('create_salesperson');
      expect(tool?.requiresConfirmation).toBe(true);
    });

    it('应该成功创建业务员', async () => {
      const result = await toolRegistry.execute(
        'create_salesperson',
        {
          name: '测试业务员',
          phone: '13800138000',
          email: 'test@example.com',
          department: '测试部门',
        },
        { userId: 'admin', userRole: 'admin', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('测试业务员');
      expect(result.data.id).toBeDefined();
    });
  });

  describe('query_salespersons 工具', () => {
    it('不需要确认即可查询', () => {
      const tool = toolRegistry.getTool('query_salespersons');
      expect(tool?.requiresConfirmation).toBe(false);
    });

    it('应该返回分页结果', async () => {
      const result = await toolRegistry.execute(
        'query_salespersons',
        { page: 1, limit: 10 },
        { userId: 'user1', userRole: 'user', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('data');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('page');
      expect(result.data).toHaveProperty('limit');
    });
  });

  describe('delete_salesperson 工具', () => {
    it('需要确认才能删除', () => {
      const tool = toolRegistry.getTool('delete_salesperson');
      expect(tool?.requiresConfirmation).toBe(true);
    });
  });

  describe('analyze_sales 工具', () => {
    it('应该返回完整的分析报告', async () => {
      const result = await toolRegistry.execute(
        'analyze_sales',
        {},
        { userId: 'manager', userRole: 'manager', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('summary');
      expect(result.data).toHaveProperty('trends');
      expect(result.data).toHaveProperty('top_formulas');
      expect(result.data).toHaveProperty('top_salespersons');
      expect(result.data).toHaveProperty('period_breakdown');
    });
  });

  describe('未知工具调用', () => {
    it('应该拒绝未注册的工具', async () => {
      const result = await toolRegistry.execute(
        'nonexistent_tool',
        {},
        { userId: 'test', userRole: 'user', sessionId: 'session_1', requestId: 'req_1' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('未知工具');
    });
  });
});
