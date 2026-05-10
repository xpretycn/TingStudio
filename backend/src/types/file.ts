export interface ParsedData {
  sheet_name: string;
  row_number: number;
  data: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  file_type: 'excel' | 'image' | 'pdf' | 'unknown';
  filename: string;
  total_records: number;
  data: ParsedData[];
  error?: string;
  sheets_parsed?: number;
  ocr_text?: string;
  confidence?: number;
  raw_text?: string;
  summary?: Record<string, any>;
}
