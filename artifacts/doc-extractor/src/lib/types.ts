export type ExtractionMode = "fast" | "balanced" | "accurate";
export type OutputFormat = "markdown" | "html" | "json";

export interface SchemaField {
  id: string;
  key: string;
  type: string;
  description: string;
}

export interface MarkerBlock {
  id?: string;
  block_type?: string;
  html?: string;
  polygon?: number[][];
  bbox?: number[];
  section_hierarchy?: Record<string, string>;
  images?: Record<string, string> | null;
  children?: MarkerBlock[] | null;
}

export interface ExtractionResult {
  status: "processing" | "complete" | "error";
  markdown?: string;
  html?: string;
  json?: MarkerBlock | Record<string, unknown>;
  images?: Record<string, string> | null;
  extraction_schema_json?: unknown;
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
