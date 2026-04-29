export type ExtractionMode = "fast" | "balanced" | "accurate";

export type DocumentTypeId = "form7" | "form12" | "aadhar" | "bank_passbook";

export interface DocumentTypeMeta {
  id: DocumentTypeId;
  label: string;
  description: string;
}

export interface PresentedField {
  key: string;
  label: string;
  value: string;
}

export interface PresentedTable {
  key: string;
  label: string;
  columns: { key: string; label: string }[];
  rows: { values: Record<string, string> }[];
}

export interface PresentedSection {
  title: string;
  fields: PresentedField[];
  tables: PresentedTable[];
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

export interface MarkerResult {
  json?: MarkerBlock | Record<string, unknown> | null;
  html?: string | null;
  markdown?: string | null;
  images?: Record<string, string> | null;
}

export interface StructuredResult {
  sections: PresentedSection[];
  empty: boolean;
}

export type ExtractionStatus = "idle" | "uploading" | "processing" | "complete" | "error";

export interface ExtractionErrors {
  extract?: string;
  marker?: string;
}

export interface ExtractionResult {
  status: "complete" | "processing" | "error";
  document_type: DocumentTypeId;
  document_label: string;
  page_count?: number | null;
  runtime?: number | null;
  structured?: StructuredResult | null;
  marker?: MarkerResult | null;
  errors?: ExtractionErrors;
  error?: string;
}

export interface RecentExtraction {
  id: string;
  filename: string;
  documentType: DocumentTypeId;
  documentLabel: string;
  timestamp: number;
  status: "processing" | "complete" | "error";
}
