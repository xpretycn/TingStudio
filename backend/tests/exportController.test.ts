import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";

vi.mock("../src/services/exportService.js", () => ({
  getTemplates: vi.fn(() => Promise.resolve({ list: [], total: 0, page: 1, pageSize: 20 })),
  createTemplate: vi.fn(() => Promise.resolve({ id: "t1" })),
  updateTemplate: vi.fn(() => Promise.resolve()),
  deleteTemplate: vi.fn(() => Promise.resolve()),
  createJob: vi.fn(() => Promise.resolve({ jobId: "j1", status: "pending" })),
  getJobs: vi.fn(() => Promise.resolve({ list: [], total: 0, page: 1, pageSize: 20 })),
  getJob: vi.fn(() => Promise.resolve(null)),
  downloadFile: vi.fn(() => Promise.resolve({ filePath: "/tmp/test.xlsx", fileName: "test.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })),
  retryJob: vi.fn(() => Promise.resolve({ status: "pending" })),
  reExportJob: vi.fn(() => Promise.resolve({ status: "pending" })),
  createShare: vi.fn(() => Promise.resolve({ shareId: "s1" })),
  getPublicShare: vi.fn(() => Promise.resolve({ shareId: "s1" })),
  getShares: vi.fn(() => Promise.resolve([])),
  deleteShare: vi.fn(() => Promise.resolve()),
  getStatistics: vi.fn(() => Promise.resolve({})),
  getConfig: vi.fn(() => Promise.resolve({})),
  updateConfig: vi.fn(() => Promise.resolve({})),
  getMaterialsForExport: vi.fn(() => Promise.resolve({ list: [], total: 0, page: 1, pageSize: 20 })),
  getReportsForExport: vi.fn(() => Promise.resolve({ list: [], total: 0, page: 1, pageSize: 20 })),
}));

vi.mock("../src/utils/helpers.js", () => ({
  success: vi.fn((data, message) => ({ success: true, message: message || "操作成功", data })),
  successWithPagination: vi.fn((list, total, page, pageSize) => ({
    success: true, message: "查询成功",
    data: { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
  })),
  buildContentDisposition: vi.fn((name) => `attachment; filename="${name}"`),
}));

describe("exportController - 导出控制器", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;
  let sendFileMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = vi.fn();
    sendFileMock = vi.fn();

    mockReq = {
      params: {},
      query: {},
      body: {},
    };

    mockRes = {
      json: jsonMock,
      status: statusMock,
      setHeader: setHeaderMock,
      sendFile: sendFileMock,
    };
  });

  it("getExportTemplates 应调用 exportService.getTemplates 并返回分页结果", async () => {
    mockReq.query = { type: "material", page: "1", pageSize: "10" };

    const { getTemplates } = await import("../src/services/exportService.js");
    const { getExportTemplates } = await import("../src/controllers/exportController.js");

    await getExportTemplates(mockReq as Request, mockRes as Response);

    expect(getTemplates).toHaveBeenCalledWith({ type: "material", category: undefined, page: 1, pageSize: 10 });
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          list: [],
          pagination: expect.objectContaining({ page: 1, pageSize: 20, total: 0 }),
        }),
      }),
    );
  });

  it("createExportTemplate 应调用 exportService.createTemplate 并返回 201", async () => {
    (mockReq as unknown as Record<string, unknown>).user = { userId: "u1", role: "admin" };
    mockReq.body = { name: "模板A", type: "material" };

    const { createTemplate } = await import("../src/services/exportService.js");
    const { createExportTemplate } = await import("../src/controllers/exportController.js");

    await createExportTemplate(mockReq as Request, mockRes as Response);

    expect(createTemplate).toHaveBeenCalledWith({ name: "模板A", type: "material" }, "u1");
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { id: "t1" } }),
    );
  });

  it("getExportJob 任务存在时应返回任务数据", async () => {
    mockReq.params = { jobId: "j1" };
    const { getJob } = await import("../src/services/exportService.js");
    (getJob as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ jobId: "j1", status: "completed" });

    const { getExportJob } = await import("../src/controllers/exportController.js");

    await getExportJob(mockReq as Request, mockRes as Response);

    expect(getJob).toHaveBeenCalledWith("j1");
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { jobId: "j1", status: "completed" } }),
    );
  });

  it("getExportJob 任务不存在时应返回 404 NOT_FOUND", async () => {
    mockReq.params = { jobId: "j-missing" };
    const { getJob } = await import("../src/services/exportService.js");
    (getJob as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { getExportJob } = await import("../src/controllers/exportController.js");

    await getExportJob(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: "NOT_FOUND" }) }),
    );
  });

  it("downloadExportFile 应设置响应头并发送文件", async () => {
    mockReq.params = { jobId: "j1" };

    const { downloadExportFile } = await import("../src/controllers/exportController.js");

    await downloadExportFile(mockReq as Request, mockRes as Response);

    expect(setHeaderMock).toHaveBeenCalledWith("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(setHeaderMock).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="test.xlsx"');
    expect(sendFileMock).toHaveBeenCalled();
  });

  it("downloadExportFile 文件不存在时应返回 404", async () => {
    mockReq.params = { jobId: "j-missing" };
    const { downloadFile } = await import("../src/services/exportService.js");
    (downloadFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("文件不存在"));

    const { downloadExportFile } = await import("../src/controllers/exportController.js");

    await downloadExportFile(mockReq as Request, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: "NOT_FOUND" }) }),
    );
  });

  it("getExportConfig 非 admin 应返回默认配置列表", async () => {
    (mockReq as unknown as Record<string, unknown>).user = { userId: "u1", role: "formulist" };

    const { getConfig } = await import("../src/services/exportService.js");
    const { getExportConfig } = await import("../src/controllers/exportController.js");

    await getExportConfig(mockReq as Request, mockRes as Response);

    expect(getConfig).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ configKey: "default_export_format" }),
        ]),
      }),
    );
  });

  it("updateExportConfig 非 admin 应返回 updatedCount 0", async () => {
    (mockReq as unknown as Record<string, unknown>).user = { userId: "u1", role: "formulist" };
    mockReq.body = { configs: [] };

    const { updateConfig } = await import("../src/services/exportService.js");
    const { updateExportConfig } = await import("../src/controllers/exportController.js");

    await updateExportConfig(mockReq as Request, mockRes as Response);

    expect(updateConfig).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ updatedCount: 0 }),
      }),
    );
  });
});
