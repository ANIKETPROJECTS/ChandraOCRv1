export type ExtractionMode = "fast" | "balanced" | "accurate";
export type OutputFormat = "markdown" | "html" | "json";

export interface SchemaField {
  id: string;
  key: string;
  type: string;
  description: string;
}

export interface ExtractionResult {
  status: "processing" | "complete" | "error";
  markdown?: string;
  html?: string;
  json?: any;
  extraction_schema_json?: any;
  page_count?: number;
  runtime?: number;
  error?: string;
}

export interface RecentExtraction {
  id: string;
  filename: string;
  timestamp: number;
  status: "processing" | "complete" | "error";
}
