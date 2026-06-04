import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';

const { mockGetDb } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
}));

vi.mock('../src/config/database-better-sqlite3.js', () => ({
  getDb: mockGetDb,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
  success: vi.fn((data) => ({ success: true, data })),
  successWithPagination: vi.fn((list, total, page, pageSize) => ({
    success: true,
    data: {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })),
}));

vi.mock("../src/services/parseResultCleanupService.js", () => ({
  parseResultCleanupService: {
    getDegradationInfo: vi.fn(() => Promise.resolve({ level: "normal", reason: "", recommendations: [] })),
    getSystemStatus: vi.fn(() => Promise.resolve({ totalCount: 0, storageLimit: 5000, usagePercent: 0, cleanupThreshold: 95, isOverThreshold: false })),
    getLastCleanupResult: vi.fn(() => null),
    performCleanup: vi.fn(() => Promise.resolve({ deletedCount: 0, triggerReason: "", degradationLevel: "normal" })),
  },
}));

vi.mock("../src/services/parseResultMonitoringService.js", () => ({
  parseResultMonitoringService: {
    getMetrics: vi.fn(() => Promise.resolve({})),
    checkAlerts: vi.fn(() => Promise.resolve([])),
    getPerformanceStats: vi.fn(() => Promise.resolve({})),
  },
}));

describe('ParseResultController - 解析结果控制器', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let mockDb: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockDb = {
      prepare: vi.fn(),
    };

    mockGetDb.mockReturnValue(mockDb);

    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe('SMART_TOOL_CALL_TYPES 行为验证', () => {
    it('saveParseResult 应仅接受 parse_formula 和 parse_nutrition 类型', async () => {
      // parse_formula 应该通过验证（不返回 400 的类型错误）
      mockReq.body = {
        callType: 'parse_formula',
        fileHash: 'abc123',
        fileName: 'test.txt',
        fileSize: 1024,
        parsedResult: '{}',
        rawResponse: '{}',
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const configStmt = { get: vi.fn().mockReturnValue({ config_value: '5000' }) };
      const countStmt = { get: vi.fn().mockReturnValue({ count: 0 }) };
      const insertStmt = { run: vi.fn() };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('storage_limit')) return configStmt;
        if (sql.includes('COUNT')) return countStmt;
        return insertStmt;
      });

      const { saveParseResult } = await import('../src/controllers/parseResultController.js');
      await saveParseResult(mockReq as Request, mockRes as Response);
      expect(statusMock).not.toHaveBeenCalledWith(400);

      // Reset for next test
      vi.clearAllMocks();
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      mockRes = { json: jsonMock, status: statusMock };
      mockGetDb.mockReturnValue(mockDb);

      // parse_nutrition 也应该通过验证
      mockReq.body = {
        callType: 'parse_nutrition',
        fileHash: 'abc123',
        fileName: 'test.txt',
        fileSize: 1024,
        parsedResult: '{}',
        rawResponse: '{}',
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('storage_limit')) return configStmt;
        if (sql.includes('COUNT')) return countStmt;
        return insertStmt;
      });

      await saveParseResult(mockReq as Request, mockRes as Response);
      expect(statusMock).not.toHaveBeenCalledWith(400);

      // Reset for next test
      vi.clearAllMocks();
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      mockRes = { json: jsonMock, status: statusMock };
      mockGetDb.mockReturnValue(mockDb);

      // invalid_type 应该返回 400
      mockReq.body = {
        callType: 'invalid_type',
        fileHash: 'abc123',
        fileName: 'test.txt',
        fileSize: 1024,
        parsedResult: '{}',
        rawResponse: '{}',
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      await saveParseResult(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('getParseResults - 获取解析结果列表', () => {
    it('应该返回解析结果列表和分页信息', async () => {
      const mockItems = [
        {
          id: 'test-id-1',
          call_type: 'parse_formula',
          file_hash: 'abc123',
          file_name: 'test.txt',
          file_size: 1024,
          status: 'success',
          model_provider: 'dashscope',
          model_name: 'qwen-vl-max',
          used_count: 5,
          is_linked: 1,
          linked_formula_id: 'formula-1',
          linked_material_id: null,
          created_at: '2026-05-16T00:00:00.000Z',
          expires_at: '2026-06-16T00:00:00.000Z',
        },
      ];

      const countStmt = { get: vi.fn().mockReturnValue({ total: 1 }) };
      const listStmt = { all: vi.fn().mockReturnValue(mockItems) };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT')) return countStmt;
        return listStmt;
      });

      mockReq.query = { page: '1', pageSize: '20' };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { getParseResults } = await import('../src/controllers/parseResultController.js');
      await getParseResults(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveProperty('list');
      expect(response.data).toHaveProperty('pagination');
    });

    it('未认证用户应使用 undefined userId 查询', async () => {
      const countStmt = { get: vi.fn().mockReturnValue({ total: 0 }) };
      const listStmt = { all: vi.fn().mockReturnValue([]) };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT')) return countStmt;
        return listStmt;
      });

      mockReq.query = {};
      (mockReq as Record<string, unknown>).user = undefined;

      const { getParseResults } = await import('../src/controllers/parseResultController.js');
      await getParseResults(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe('getParseResultById - 获取单条解析结果', () => {
    it('应该返回指定 ID 的解析结果详情', async () => {
      const mockDetail = {
        id: 'test-id-1',
        user_id: 'user-123',
        call_type: 'parse_formula',
        file_hash: 'abc123',
        file_name: 'test.txt',
        file_size: 1024,
        parsed_result: JSON.stringify({ result: 'success' }),
        raw_response: JSON.stringify({ raw: 'data' }),
        model_provider: 'dashscope',
        model_name: 'qwen-vl-max',
        tokens_used: 1000,
        status: 'success',
        error_message: null,
        used_count: 5,
        is_linked: 0,
        linked_formula_id: null,
        linked_material_id: null,
        created_at: '2026-05-16T00:00:00.000Z',
        updated_at: '2026-05-16T00:00:00.000Z',
        expires_at: '2026-06-16T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({ get: vi.fn().mockReturnValue(mockDetail) });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { getParseResultById } = await import('../src/controllers/parseResultController.js');
      await getParseResultById(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('不存在的记录应返回 404', async () => {
      mockDb.prepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      mockReq.params = { id: 'non-existent-id' };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { getParseResultById } = await import('../src/controllers/parseResultController.js');
      await getParseResultById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('saveParseResult - 保存解析结果', () => {
    it('应该成功保存解析结果', async () => {
      const configStmt = { get: vi.fn().mockReturnValue({ config_value: '5000' }) };
      const countStmt = { get: vi.fn().mockReturnValue({ count: 0 }) };
      const insertStmt = { run: vi.fn() };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('storage_limit')) return configStmt;
        if (sql.includes('COUNT')) return countStmt;
        return insertStmt;
      });

      mockReq.body = {
        callType: 'parse_formula',
        fileHash: 'abc123',
        fileName: 'test.txt',
        fileSize: 1024,
        parsedResult: JSON.stringify({ result: 'success' }),
        rawResponse: JSON.stringify({ raw: 'data' }),
        modelProvider: 'dashscope',
        modelName: 'qwen-vl-max',
        tokensUsed: 1000,
        status: 'success',
        errorMessage: null,
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { saveParseResult } = await import('../src/controllers/parseResultController.js');
      await saveParseResult(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('缺少必填字段应返回 400', async () => {
      mockReq.body = {
        callType: 'parse_formula',
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { saveParseResult } = await import('../src/controllers/parseResultController.js');
      await saveParseResult(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('无效的调用类型应返回 400', async () => {
      mockReq.body = {
        callType: 'invalid_type',
        fileHash: 'abc123',
        fileName: 'test.txt',
        fileSize: 1024,
        parsedResult: '{}',
        rawResponse: '{}',
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { saveParseResult } = await import('../src/controllers/parseResultController.js');
      await saveParseResult(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteParseResult - 删除解析结果', () => {
    it('所有者应该能够删除自己的记录', async () => {
      const mockDetail = {
        id: 'test-id-1',
        user_id: 'user-123',
      };

      const getStmt = { get: vi.fn().mockReturnValue(mockDetail) };
      const deleteStmt = { run: vi.fn() };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return getStmt;
        return deleteStmt;
      });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { deleteParseResult } = await import('../src/controllers/parseResultController.js');
      await deleteParseResult(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('管理员应该能够删除任何记录', async () => {
      const mockDetail = {
        id: 'test-id-1',
        user_id: 'other-user-id',
      };

      const getStmt = { get: vi.fn().mockReturnValue(mockDetail) };
      const deleteStmt = { run: vi.fn() };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return getStmt;
        return deleteStmt;
      });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as Record<string, unknown>).user = { userId: 'admin-123', role: 'admin' };

      const { deleteParseResult } = await import('../src/controllers/parseResultController.js');
      await deleteParseResult(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('非所有者非管理员应返回 403', async () => {
      const mockDetail = {
        id: 'test-id-1',
        user_id: 'other-user-id',
      };

      mockDb.prepare.mockReturnValue({ get: vi.fn().mockReturnValue(mockDetail) });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { deleteParseResult } = await import('../src/controllers/parseResultController.js');
      await deleteParseResult(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('getParseResultStatistics - 获取统计信息', () => {
    it('应该返回统计信息结构', async () => {
      const totalStmt = { get: vi.fn().mockReturnValue({ count: 100 }) };
      const typeStmt = { all: vi.fn().mockReturnValue([{ call_type: 'parse_formula', count: 80 }]) };
      const statusStmt = { all: vi.fn().mockReturnValue([{ status: 'success', count: 95 }]) };
      const configStmt = { all: vi.fn().mockReturnValue([
        { config_key: 'storage_limit', config_value: '5000' },
        { config_key: 'cleanup_threshold_percent', config_value: '95' },
        { config_key: 'cleanup_batch_percent', config_value: '5' },
      ]) };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('COUNT(*) as count') && sql.includes('GROUP BY call_type')) return typeStmt;
        if (sql.includes('COUNT(*) as count') && sql.includes('GROUP BY status')) return statusStmt;
        if (sql.includes('COUNT(*) as count') && !sql.includes('GROUP BY')) return totalStmt;
        if (sql.includes('parse_result_configs')) return configStmt;
        return totalStmt;
      });

      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { getParseResultStatistics } = await import('../src/controllers/parseResultController.js');
      await getParseResultStatistics(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveProperty('totalCount');
    });
  });

  describe('checkParseResult - 检查文件是否已解析', () => {
    it('已解析的文件应返回缓存信息', async () => {
      const mockResult = {
        id: 'cached-id',
        status: 'success',
      };

      mockDb.prepare.mockReturnValue({ get: vi.fn().mockReturnValue(mockResult) });

      mockReq.body = {
        fileHash: 'abc123',
        callType: 'parse_formula',
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { checkParseResult } = await import('../src/controllers/parseResultController.js');
      await checkParseResult(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('未解析的文件应返回未缓存', async () => {
      mockDb.prepare.mockReturnValue({ get: vi.fn().mockReturnValue(undefined) });

      mockReq.body = {
        fileHash: 'new-file-hash',
        callType: 'parse_formula',
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { checkParseResult } = await import('../src/controllers/parseResultController.js');
      await checkParseResult(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe('getParseResultConfig - 获取配置', () => {
    it('应该返回配置信息', async () => {
      const mockConfig = [
        { config_key: 'storage_limit', config_value: '5000', description: '最大数量', updated_at: '2026-01-01' },
        { config_key: 'cleanup_threshold_percent', config_value: '95', description: '清理阈值', updated_at: '2026-01-01' },
      ];

      mockDb.prepare.mockReturnValue({ all: vi.fn().mockReturnValue(mockConfig) });

      const { getParseResultConfig } = await import('../src/controllers/parseResultController.js');
      await getParseResultConfig(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe('updateParseResultConfig - 更新配置', () => {
    it('管理员应该能够更新配置', async () => {
      mockDb.prepare.mockReturnValue({ run: vi.fn().mockReturnValue({ changes: 1 }) });

      mockReq.body = {
        storageLimit: 10000,
      };
      (mockReq as Record<string, unknown>).user = { userId: 'admin-123', role: 'admin' };

      const { updateParseResultConfig } = await import('../src/controllers/parseResultController.js');
      await updateParseResultConfig(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('非管理员应返回 403', async () => {
      mockReq.body = {
        storageLimit: 10000,
      };
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { updateParseResultConfig } = await import('../src/controllers/parseResultController.js');
      await updateParseResultConfig(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('无效的配置值应返回 400', async () => {
      mockReq.body = {
        storageLimit: 500,
      };
      (mockReq as Record<string, unknown>).user = { userId: 'admin-123', role: 'admin' };

      const { updateParseResultConfig } = await import('../src/controllers/parseResultController.js');
      await updateParseResultConfig(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('cleanupParseResults - 清理过期记录', () => {
    it('管理员应该能够执行清理', async () => {
      const mockRecords = [
        { id: 'r1', file_name: 'test1.txt', created_at: '2026-01-01' },
        { id: 'r2', file_name: 'test2.txt', created_at: '2026-01-02' },
      ];

      const selectStmt = { all: vi.fn().mockReturnValue(mockRecords) };
      const deleteStmt = { run: vi.fn() };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes('SELECT')) return selectStmt;
        return deleteStmt;
      });

      mockReq.body = {
        dryRun: false,
      };
      (mockReq as Record<string, unknown>).user = { userId: 'admin-123', role: 'admin' };

      const { cleanupParseResults } = await import('../src/controllers/parseResultController.js');
      await cleanupParseResults(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('dryRun 模式应返回预览结果', async () => {
      const mockRecords = [
        { id: 'r1', file_name: 'test1.txt', created_at: '2026-01-01' },
      ];

      mockDb.prepare.mockReturnValue({ all: vi.fn().mockReturnValue(mockRecords) });

      mockReq.body = {
        dryRun: true,
      };
      (mockReq as Record<string, unknown>).user = { userId: 'admin-123', role: 'admin' };

      const { cleanupParseResults } = await import('../src/controllers/parseResultController.js');
      await cleanupParseResults(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('非管理员应返回 403', async () => {
      mockReq.body = {};
      (mockReq as Record<string, unknown>).user = { userId: 'user-123', role: 'user' };

      const { cleanupParseResults } = await import('../src/controllers/parseResultController.js');
      await cleanupParseResults(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
