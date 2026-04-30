export type ExtractionMode = "fast" | "balanced" | "accurate";

export type DocumentTypeId =
  | "form7"
  | "form12"
  | "form8a"
  | "aadhar"
  | "bank_passbook";

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

/** Status of the auto-save into a MongoDB profile (returned with `complete`). */
export interface ExtractionProfileResult {
  phone: string;
  section: string | null;
  saved: boolean;
  error: string | null;
}

export interface ExtractionResult {
  status: "complete" | "processing" | "error";
  document_type: DocumentTypeId;
  document_label: string;
  page_count?: number | null;
  runtime?: number | null;
  structured?: StructuredResult | null;
  marker?: MarkerResult | null;
  profile?: ExtractionProfileResult | null;
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

/* ----------------------------------------------------------------------- */
/* Profiles (server-side MongoDB user documents).                          */
/* ----------------------------------------------------------------------- */

/** Section names that map 1:1 to MongoDB sub-documents on a user profile. */
export type ProfileSection =
  | "aadhar"
  | "passbook"
  | "form7"
  | "form12"
  | "form8a";

/** Maps a Home-page hamburger entry (DocumentTypeId) to its profile section. */
export const DOC_TO_SECTION: Record<DocumentTypeId, ProfileSection> = {
  form7: "form7",
  form12: "form12",
  form8a: "form8a",
  aadhar: "aadhar",
  bank_passbook: "passbook",
};

/** Lightweight summary for the profile picker / hamburger menu. */
export interface ProfileSummary {
  _id: string;
  phone: string;
  /** Human-readable name supplied at profile creation. */
  name?: string | null;
  /** Auto-generated short code (e.g. "P-A4F2") for disambiguation. */
  code?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sections: Record<ProfileSection, boolean>;
  labels: Record<ProfileSection, string | null>;
}

/** Full profile document — sub-documents are arbitrary JSON shapes. */
export interface ProfileDoc {
  _id: string;
  phone: string;
  name?: string;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
  aadhar?: Record<string, unknown>;
  passbook?: Record<string, unknown>;
  form7?: Record<string, unknown>;
  form12?: Record<string, unknown>;
  form8a?: Record<string, unknown>;
}
