import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../src/config/database-better-sqlite3.js', () => ({
  getDb: vi.fn(),
}));

describe('ParseResultController - 解析结果控制器', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    };

    const { getDb } = require('../src/config/database-better-sqlite3.js');
    getDb.mockReturnValue(mockDb);

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

  describe('SMART_TOOL_CALL_TYPES 常量', () => {
    it('应该包含 parse_formula 和 parse_nutrition', async () => {
      const { SMART_TOOL_CALL_TYPES } = await import('../src/controllers/parseResultController.js');
      expect(SMART_TOOL_CALL_TYPES).toContain('parse_formula');
      expect(SMART_TOOL_CALL_TYPES).toContain('parse_nutrition');
      expect(SMART_TOOL_CALL_TYPES).toHaveLength(2);
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

      mockDb.prepare.mockReturnValue({
        all: vi.fn().mockReturnValueOnce([{ total: 1 }]).mockReturnValueOnce(mockItems),
      });

      mockReq.query = { page: '1', pageSize: '20' };
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

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

    it('未认证用户应返回 401', async () => {
      mockReq.query = {};
      (mockReq as any).user = undefined;

      const { getParseResults } = await import('../src/controllers/parseResultController.js');
      await getParseResults(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
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

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockDetail),
      });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { getParseResultById } = await import('../src/controllers/parseResultController.js');
      await getParseResultById(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('不存在的记录应返回 404', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      });

      mockReq.params = { id: 'non-existent-id' };
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { getParseResultById } = await import('../src/controllers/parseResultController.js');
      await getParseResultById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('saveParseResult - 保存解析结果', () => {
    it('应该成功保存解析结果', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 1 }),
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
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { saveParseResult } = await import('../src/controllers/parseResultController.js');
      await saveParseResult(mockReq as Request, mockRes as Response);

      expect(mockDb.run).toHaveBeenCalled();
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
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

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
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

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
        call_type: 'parse_formula',
        file_hash: 'abc123',
        file_name: 'test.txt',
        file_size: 1024,
        parsed_result: '{}',
        raw_response: '{}',
        model_provider: 'dashscope',
        model_name: 'qwen-vl-max',
        tokens_used: 1000,
        status: 'success',
        error_message: null,
        used_count: 0,
        is_linked: 0,
        linked_formula_id: null,
        linked_material_id: null,
        created_at: '2026-05-16T00:00:00.000Z',
        updated_at: '2026-05-16T00:00:00.000Z',
        expires_at: '2026-06-16T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockDetail),
        run: vi.fn().mockReturnValue({ changes: 1 }),
      });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

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
        call_type: 'parse_formula',
        file_hash: 'abc123',
        file_name: 'test.txt',
        file_size: 1024,
        parsed_result: '{}',
        raw_response: '{}',
        model_provider: 'dashscope',
        model_name: 'qwen-vl-max',
        tokens_used: 1000,
        status: 'success',
        error_message: null,
        used_count: 0,
        is_linked: 0,
        linked_formula_id: null,
        linked_material_id: null,
        created_at: '2026-05-16T00:00:00.000Z',
        updated_at: '2026-05-16T00:00:00.000Z',
        expires_at: '2026-06-16T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockDetail),
        run: vi.fn().mockReturnValue({ changes: 1 }),
      });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as any).user = { userId: 'admin-123', role: 'admin' };

      const { deleteParseResult } = await import('../src/controllers/parseResultController.js');
      await deleteParseResult(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('已关联的记录应返回 400', async () => {
      const mockDetail = {
        id: 'test-id-1',
        user_id: 'user-123',
        call_type: 'parse_formula',
        file_hash: 'abc123',
        file_name: 'test.txt',
        file_size: 1024,
        parsed_result: '{}',
        raw_response: '{}',
        model_provider: 'dashscope',
        model_name: 'qwen-vl-max',
        tokens_used: 1000,
        status: 'success',
        error_message: null,
        used_count: 5,
        is_linked: 1,
        linked_formula_id: 'formula-1',
        linked_material_id: null,
        created_at: '2026-05-16T00:00:00.000Z',
        updated_at: '2026-05-16T00:00:00.000Z',
        expires_at: '2026-06-16T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockDetail),
      });

      mockReq.params = { id: 'test-id-1' };
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { deleteParseResult } = await import('../src/controllers/parseResultController.js');
      await deleteParseResult(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RESOURCE_LINKED',
          }),
        })
      );
    });
  });

  describe('getParseResultStatistics - 获取统计信息', () => {
    it('应该返回统计信息结构', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn()
          .mockReturnValueOnce({ count: 100 })
          .mockReturnValueOnce({ count: 80, total_size: 80000000 })
          .mockReturnValueOnce({ count: 15 })
          .mockReturnValueOnce({ count: 10 })
          .mockReturnValueOnce({ count: 5 }),
      });

      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { getParseResultStatistics } = await import('../src/controllers/parseResultController.js');
      await getParseResultStatistics(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveProperty('total');
    });
  });

  describe('checkParseResult - 检查文件是否已解析', () => {
    it('已解析的文件应返回缓存信息', async () => {
      const mockResult = {
        id: 'cached-id',
        call_type: 'parse_formula',
        file_hash: 'abc123',
        file_name: 'test.txt',
        status: 'success',
        created_at: '2026-05-16T00:00:00.000Z',
      };

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockResult),
      });

      mockReq.body = {
        fileHash: 'abc123',
        callType: 'parse_formula',
      };
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { checkParseResult } = await import('../src/controllers/parseResultController.js');
      await checkParseResult(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('未解析的文件应返回未缓存', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(undefined),
      });

      mockReq.body = {
        fileHash: 'new-file-hash',
        callType: 'parse_formula',
      };
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

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
        { config_key: 'storage_limit', config_value: '5000' },
        { config_key: 'cleanup_threshold_percent', config_value: '95' },
        { config_key: 'cleanup_batch_percent', config_value: '5' },
        { config_key: 'retention_days', config_value: '30' },
        { config_key: 'max_file_size_bytes', config_value: '5242880' },
      ];

      mockDb.prepare.mockReturnValue({
        all: vi.fn().mockReturnValue(mockConfig),
      });

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
      mockDb.prepare.mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 1 }),
      });

      mockReq.body = {
        storageLimit: 10000,
      };
      (mockReq as any).user = { userId: 'admin-123', role: 'admin' };

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
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { updateParseResultConfig } = await import('../src/controllers/parseResultController.js');
      await updateParseResultConfig(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('无效的配置值应返回 400', async () => {
      mockReq.body = {
        storageLimit: 500,
      };
      (mockReq as any).user = { userId: 'admin-123', role: 'admin' };

      const { updateParseResultConfig } = await import('../src/controllers/parseResultController.js');
      await updateParseResultConfig(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('cleanupParseResults - 清理过期记录', () => {
    it('管理员应该能够执行清理', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 10 }),
        get: vi.fn().mockReturnValue({ count: 100 }),
      });

      mockReq.body = {
        dryRun: false,
      };
      (mockReq as any).user = { userId: 'admin-123', role: 'admin' };

      const { cleanupParseResults } = await import('../src/controllers/parseResultController.js');
      await cleanupParseResults(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('dryRun 模式不应删除记录', async () => {
      mockDb.prepare.mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 0 }),
        get: vi.fn().mockReturnValue({ count: 100 }),
      });

      mockReq.body = {
        dryRun: true,
      };
      (mockReq as any).user = { userId: 'admin-123', role: 'admin' };

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
      (mockReq as any).user = { userId: 'user-123', role: 'user' };

      const { cleanupParseResults } = await import('../src/controllers/parseResultController.js');
      await cleanupParseResults(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
