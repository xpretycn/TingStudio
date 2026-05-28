import XLSX from "xlsx";

export async function mergeExcelBuffers(
  buffers: Buffer[],
  sheetNames: string[],
): Promise<Buffer> {
  if (buffers.length === 0) {
    throw new Error("没有可合并的Excel文件");
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const mergedWorkbook = XLSX.utils.book_new();

  for (let i = 0; i < buffers.length; i++) {
    const sourceWorkbook = XLSX.read(buffers[i], { type: "buffer" });
    const targetName = sheetNames[i] || `配方${i + 1}`;
    const safeName = targetName.length > 31 ? targetName.slice(0, 31) : targetName;

    const sourceSheetName = sourceWorkbook.SheetNames[0];
    if (!sourceSheetName) continue;

    const worksheet = sourceWorkbook.Sheets[sourceSheetName];
    if (!worksheet) continue;

    XLSX.utils.book_append_sheet(mergedWorkbook, worksheet, safeName);
  }

  const output = XLSX.write(mergedWorkbook, { bookType: "xlsx", type: "buffer" });
  return Buffer.from(output);
}
