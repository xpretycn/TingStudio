declare module "pdfkit" {
  import { Writable } from "stream";
  interface PDFDocumentOptions {
    size?: string | number[];
    margins?: number | { top: number; bottom: number; left: number; right: number };
    info?: Record<string, string>;
    compress?: boolean;
    bufferPages?: boolean;
    autoFirstPage?: boolean;
    layout?: "portrait" | "landscape";
    [key: string]: unknown;
  }
  class PDFDocument extends Writable {
    constructor(options?: PDFDocumentOptions);
    pipe(destination: NodeJS.WritableStream): this;
    end(): this;
    addPage(options?: PDFDocumentOptions): this;
    font(src: string | Buffer, size?: number): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    fillOpacity(opacity: number): this;
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    rect(x: number, y: number, width: number, height: number): this;
    lineCap(style: string): this;
    lineWidth(width: number): this;
    stroke(color?: string): this;
    fill(color?: string): this;
    drawImage(path: string | Buffer, x: number, y: number, options?: Record<string, unknown>): this;
    image(src: string | Buffer, x?: number, y?: number, options?: Record<string, unknown>): this;
    widthOfString(text: string): number;
    heightOfString(text: string, options?: Record<string, unknown>): number;
    x: number;
    y: number;
    page: { width: number; height: number; margins: { top: number; bottom: number; left: number; right: number } };
  }
  export = PDFDocument;
}
