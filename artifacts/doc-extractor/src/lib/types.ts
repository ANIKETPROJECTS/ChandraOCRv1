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

export type ExtractionStatus = "idle" | "uploading" | "processing" | "complete" | "error";

export interface ExtractionResult {
  status: "complete" | "processing" | "error";
  document_type: DocumentTypeId;
  document_label: string;
  page_count?: number | null;
  runtime?: number | null;
  sections?: PresentedSection[];
  empty?: boolean;
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
