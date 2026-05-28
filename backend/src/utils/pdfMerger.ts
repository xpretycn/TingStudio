export async function mergePdfs(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error("没有可合并的PDF文件");
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  console.warn(
    `[pdfMerger] 多配方PDF合并暂不支持，当前返回第一个配方PDF。` +
    `共 ${buffers.length} 个配方，已忽略后 ${buffers.length - 1} 个。` +
    `如需合并请安装 pdf-lib 依赖。`,
  );

  return buffers[0];
}
