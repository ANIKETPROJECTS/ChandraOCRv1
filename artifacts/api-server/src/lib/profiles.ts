/**
 * Profile schema mapping
 * ----------------------
 * The MongoDB `users` collection in `apnaapp` already contains documents with
 * this shape (one document per phone-number-identified profile):
 *
 *   {
 *     _id: ObjectId,
 *     phone: string,                    // unique profile identifier
 *     createdAt: ISODate,
 *     updatedAt: ISODate,
 *     aadhar?: AadharSubdoc,
 *     passbook?: PassbookSubdoc,
 *     form7?: Form7Subdoc,
 *     form12?: Form12Subdoc,
 *   }
 *
 * The aadhar / passbook sub-documents below match the existing user document's
 * structure exactly. form7 / form12 follow the same naming pattern (camelCase
 * keys derived from the extractor's snake_case keys + `rawText`).
 *
 * `mapExtractionToSection` accepts the structured extractor output and returns
 * a sub-document ready to be persisted under the matching profile section.
 */
import type { PresentedDocument, PresentedSection } from "./document-types";

export type ProfileSection = "aadhar" | "passbook" | "form7" | "form12";

/** Section names valid as the URL `:section` parameter and the user's hamburger menu. */
export const PROFILE_SECTIONS: ProfileSection[] = [
  "aadhar",
  "passbook",
  "form7",
  "form12",
];

/** Maps the public document type id used by the frontend to the profile section. */
export function documentTypeToSection(documentType: string): ProfileSection | null {
  switch (documentType) {
    case "aadhar":
      return "aadhar";
    case "bank_passbook":
      return "passbook";
    case "form7":
      return "form7";
    case "form12":
      return "form12";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------------- */
/* Sub-document shapes (must match the existing MongoDB document exactly).   */
/* ------------------------------------------------------------------------- */

/** A picture pulled from the document (Aadhaar portrait, signature, logo, …). */
export interface ProfileImage {
  /** Original Datalab filename (e.g. "_page_0_Picture_1.jpeg"). */
  name: string;
  /** Inferred MIME type, ready for use in a `data:` URL. */
  mimeType: string;
  /** Bare base64 payload (no `data:` prefix). */
  base64: string;
}

export interface AadharSubdoc {
  name?: string;
  aadhaarNumber?: string;
  vid?: string;
  dateOfBirth?: string;
  gender?: string;
  fathersOrHusbandsName?: string;
  address?: string;
  pincode?: string;
  state?: string;
  mobileNumber?: string;
  issueDate?: string;
  enrolmentNumber?: string;
  photoBase64?: string;
  photoMimeType?: string;
}

export interface PassbookTransaction {
  date?: string;
  particulars?: string;
  chequeRef?: string;
  withdrawal?: string;
  deposit?: string;
  balance?: string;
}

export interface PassbookSubdoc {
  bankName?: string;
  branchName?: string;
  branchAddress?: string;
  ifsc?: string;
  micr?: string;
  accountHolderName?: string;
  jointHolders?: string[];
  nomineeName?: string;
  nomineeRelationship?: string;
  address?: string;
  mobileNumber?: string;
  email?: string;
  cifNumber?: string;
  accountNumber?: string;
  accountType?: string;
  branchCode?: string;
  accountOpeningDate?: string;
  currentBalance?: string;
  transactions?: PassbookTransaction[];
  rawText?: string;
  html?: string;
  images?: ProfileImage[];
}

/** Form 7 (Maharashtra 7/12 Ownership Register). Stores extractor fields as-is + rawText. */
export interface Form7Subdoc {
  village?: string;
  taluka?: string;
  district?: string;
  surveyNumber?: string;
  puId?: string;
  occupantClass?: string;
  ownerNames?: string[];
  khateNumber?: string;
  ownerShare?: string;
  modeOfAcquisition?: string;
  totalArea?: string;
  landRevenueAssessment?: string;
  collectionCharges?: string;
  nonAgriculturalArea?: string;
  nonCultivatedArea?: string;
  tenantName?: string;
  tenantRent?: string;
  otherRights?: string;
  encumbrances?: string;
  lastMutationNumber?: string;
  lastMutationDate?: string;
  pendingMutation?: string;
  rawText?: string;
  html?: string;
  images?: ProfileImage[];
}

/** Form 12 (Maharashtra 7/12 Crop Inspection Register). */
export interface Form12Subdoc {
  village?: string;
  taluka?: string;
  district?: string;
  surveyNumber?: string;
  khateNumber?: string;
  cropEntries?: Array<{
    year?: string;
    season?: string;
    khateNumber?: string;
    cropType?: string;
    cropName?: string;
    irrigatedArea?: string;
    unirrigatedArea?: string;
    irrigationSource?: string;
    landUseNature?: string;
    area?: string;
    remarks?: string;
  }>;
  rawText?: string;
  html?: string;
  images?: ProfileImage[];
}

export interface UserProfile {
  phone: string;
  /** Human-readable name supplied at profile creation. */
  name?: string;
  /** Auto-generated short code (e.g. "P-A4F2") to disambiguate same-name profiles. */
  code?: string;
  createdAt: string;
  updatedAt: string;
  aadhar?: AadharSubdoc;
  passbook?: PassbookSubdoc;
  form7?: Form7Subdoc;
  form12?: Form12Subdoc;
}

/* ------------------------------------------------------------------------- */
/* Helpers to read fields out of the structured extraction result.           */
/* ------------------------------------------------------------------------- */

/** Flatten { sectionTitle: { fieldKey: value } } so we can look up by extractor field key. */
function flattenFields(sections: PresentedSection[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.value !== undefined && f.value !== null && f.value !== "") {
        out[f.key] = f.value;
      }
    }
  }
  return out;
}

/**
 * Return value if it's a real value, otherwise undefined.
 *
 * `presentExtraction` substitutes the em-dash "—" for fields the LLM did not
 * find, so we treat that as missing too — otherwise we'd overwrite a previously
 * populated MongoDB field with a placeholder.
 */
function nonEmpty(v: string | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed === "—" || trimmed === "-" || trimmed === "null") return undefined;
  return trimmed;
}

/* ------------------------------------------------------------------------- */
/* Mapping: extractor output -> profile sub-document.                        */
/* ------------------------------------------------------------------------- */

export interface MappedExtraction {
  section: ProfileSection;
  data: AadharSubdoc | PassbookSubdoc | Form7Subdoc | Form12Subdoc;
}

/** Optional Datalab Marker output — full HTML + every embedded image. */
export interface MarkerInput {
  html: string | null;
  images: Record<string, string> | null;
}

/** Guess the MIME type from a filename extension. */
function guessMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  return "image/jpeg";
}

/** Strip a `data:...;base64,` prefix if present, leaving the bare payload. */
function stripDataUrlPrefix(value: string): string {
  const m = value.match(/^data:[^;]+;base64,(.*)$/);
  return m ? m[1] : value;
}

/** Convert Datalab's images map into our persistent ProfileImage[] form. */
function normalizeImages(
  images: Record<string, string> | null | undefined,
): ProfileImage[] | undefined {
  if (!images) return undefined;
  const out: ProfileImage[] = [];
  for (const [name, value] of Object.entries(images)) {
    if (typeof value !== "string" || value.length === 0) continue;
    out.push({
      name,
      mimeType: guessMimeFromName(name),
      base64: stripDataUrlPrefix(value),
    });
  }
  return out.length > 0 ? out : undefined;
}

/** Strip HTML tags and collapse whitespace. */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Find the human-readable caption Datalab Marker emitted near an image.
 *
 * Marker pairs each picture with a short Caption block ("Portrait photo",
 * "QR code", "Aadhaar logo", "Signature", …). Both the HTML and the markdown
 * place that caption immediately before or after the image reference, so we
 * scan a small window in both directions and concatenate the visible text.
 */
function findCaptionForImage(
  text: string | null | undefined,
  filename: string,
): string {
  if (!text) return "";
  const idx = text.indexOf(filename);
  if (idx < 0) return "";
  const before = text.slice(Math.max(0, idx - 400), idx);
  const after = text.slice(idx + filename.length, idx + filename.length + 600);
  return `${stripHtml(after)} ${stripHtml(before)}`;
}

/**
 * Pick the actual face photo from an Aadhaar's images.
 *
 * Aadhaar PDFs typically contain four pictures: the State Emblem, the UIDAI
 * Aadhaar logo, the QR code, and the cardholder's portrait. The QR code is
 * usually the biggest by raw byte count, so a "biggest wins" heuristic
 * actually picks the wrong one.
 *
 * Datalab Marker labels each picture with a short Caption block in both the
 * HTML and the markdown (e.g. "Portrait photo", "QR code"). We score each
 * image by its caption — strong positive for portrait/photo keywords, strong
 * negative for QR/logo/signature/emblem keywords — then fall back to file
 * size as a tiebreaker.
 */
function pickPortrait(
  images: ProfileImage[] | undefined,
  markdown: string | null | undefined,
  html: string | null | undefined,
): { base64: string; mimeType: string } | undefined {
  if (!images || images.length === 0) return undefined;

  const PORTRAIT_RE = /\b(portrait|photo|photograph|cardholder|face|person)\b/i;
  const NON_PORTRAIT_RE =
    /\b(qr\s*code|qrcode|barcode|logo|signature|emblem|ashoka|state\s*emblem|hologram)\b/i;

  let best: { img: ProfileImage; score: number } | null = null;
  for (const img of images) {
    const caption = `${findCaptionForImage(markdown, img.name)} ${findCaptionForImage(html, img.name)}`;
    let score = 0;
    if (PORTRAIT_RE.test(caption)) score += 1000;
    if (NON_PORTRAIT_RE.test(caption)) score -= 1000;
    // Tiebreaker for unlabeled images: prefer a moderately-sized image. QR
    // codes are extremely dense PNGs (often the largest payload), so we use
    // log of size instead of raw size.
    score += Math.log10(img.base64.length + 1);
    if (!best || score > best.score) best = { img, score };
  }

  if (!best) return undefined;
  return { base64: best.img.base64, mimeType: best.img.mimeType };
}

/**
 * Convert the structured extraction result into a sub-document matching the
 * persisted MongoDB user schema.
 *
 * `markdown` is captured into the `rawText` field on every section, mirroring
 * the existing user document. `marker` (when present) carries the full HTML
 * rendering and every embedded picture so the profile page can show the same
 * visual the user saw on the extract page.
 */
export function mapExtractionToSection(
  documentType: string,
  presented: PresentedDocument | null,
  markdown: string | null,
  marker?: MarkerInput | null,
): MappedExtraction | null {
  const section = documentTypeToSection(documentType);
  if (!section) return null;

  const fields = presented ? flattenFields(presented.sections) : {};
  const rawText = nonEmpty(markdown ?? undefined);
  const html = nonEmpty(marker?.html ?? undefined);
  const images = normalizeImages(marker?.images);

  switch (section) {
    case "aadhar": {
      // Per product requirements, the Aadhaar profile keeps only the portrait
      // photo and a fixed list of identity fields — no raw OCR text, no full
      // HTML rendering, and no other Datalab-extracted images (logo,
      // signature, …).
      const portrait = pickPortrait(images, markdown, marker?.html);
      const data: AadharSubdoc = stripUndefined({
        name: nonEmpty(fields["full_name"]),
        aadhaarNumber: nonEmpty(fields["aadhaar_number"]),
        vid: nonEmpty(fields["vid"]),
        dateOfBirth: nonEmpty(fields["date_of_birth"]),
        gender: nonEmpty(fields["gender"]),
        fathersOrHusbandsName: nonEmpty(fields["fathers_or_husbands_name"]),
        address: nonEmpty(fields["address"]),
        pincode: nonEmpty(fields["pincode"]),
        state: nonEmpty(fields["state"]),
        mobileNumber: nonEmpty(fields["mobile_number"]),
        issueDate: nonEmpty(fields["issue_date"]),
        enrolmentNumber: nonEmpty(fields["enrolment_number"]),
        photoBase64: portrait?.base64,
        photoMimeType: portrait?.mimeType,
      });
      return { section, data };
    }

    case "passbook": {
      // Branch code: the existing user has a 5-digit `branchCode`. The
      // extractor doesn't return one directly, so derive it from the IFSC
      // (last 6 chars after the bank prefix), e.g. SBIN0013035 -> 13035.
      const ifsc = nonEmpty(fields["ifsc_code"]);
      const branchCodeFromIfsc =
        ifsc && /^[A-Z]{4}0\d{6}$/.test(ifsc) ? ifsc.slice(6) : undefined;

      // Joint holders may come back as a CSV string (the flattenFields helper
      // joins string[] values), so split them back out into an array.
      const jointHoldersCsv = nonEmpty(fields["joint_holders"]);
      const jointHolders = jointHoldersCsv
        ? jointHoldersCsv.split(/\s*,\s*/).filter(Boolean)
        : undefined;

      // Pull the optional Transactions ledger from the document tables, the
      // same way Form 12's crop_entries are pulled.
      const txnRows =
        presented?.sections
          .flatMap((s) => s.tables)
          .find((t) => t.key === "transactions")?.rows ?? [];

      const transactions = txnRows
        .map((row) => {
          const v = row.values as Record<string, string>;
          const entry = stripUndefined({
            date: nonEmpty(v["date"]),
            particulars: nonEmpty(v["particulars"]),
            chequeRef: nonEmpty(v["cheque_ref"]),
            withdrawal: nonEmpty(v["withdrawal"]),
            deposit: nonEmpty(v["deposit"]),
            balance: nonEmpty(v["balance"]),
          });
          return Object.keys(entry).length > 0 ? entry : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const data: PassbookSubdoc = stripUndefined({
        bankName: nonEmpty(fields["bank_name"]),
        branchName: nonEmpty(fields["branch_name"]),
        branchAddress: nonEmpty(fields["branch_address"]),
        ifsc,
        micr: nonEmpty(fields["micr_code"]),
        accountHolderName: nonEmpty(fields["account_holder_name"]),
        jointHolders,
        nomineeName: nonEmpty(fields["nominee_name"]),
        nomineeRelationship: nonEmpty(fields["nominee_relationship"]),
        address: nonEmpty(fields["address"]),
        mobileNumber: nonEmpty(fields["mobile_number"]),
        email: nonEmpty(fields["email"]),
        cifNumber: nonEmpty(fields["customer_id"]),
        accountNumber: nonEmpty(fields["account_number"]),
        accountType: nonEmpty(fields["account_type"]),
        branchCode: branchCodeFromIfsc,
        accountOpeningDate: nonEmpty(fields["opening_date"]),
        currentBalance: nonEmpty(fields["current_balance"]),
        transactions: transactions.length > 0 ? transactions : undefined,
        rawText,
        html,
        images,
      });
      return { section, data };
    }

    case "form7": {
      const ownerNamesCsv = nonEmpty(fields["owner_names"]);
      const ownerNames = ownerNamesCsv
        ? ownerNamesCsv.split(/\s*,\s*/).filter(Boolean)
        : undefined;

      const data: Form7Subdoc = stripUndefined({
        village: nonEmpty(fields["village"]),
        taluka: nonEmpty(fields["taluka"]),
        district: nonEmpty(fields["district"]),
        surveyNumber: nonEmpty(fields["survey_number"]),
        puId: nonEmpty(fields["pu_id"]),
        occupantClass: nonEmpty(fields["occupant_class"]),
        ownerNames,
        khateNumber: nonEmpty(fields["khate_number"]),
        ownerShare: nonEmpty(fields["owner_share"]),
        modeOfAcquisition: nonEmpty(fields["mode_of_acquisition"]),
        totalArea: nonEmpty(fields["total_area"]),
        landRevenueAssessment: nonEmpty(fields["land_revenue_assessment"]),
        collectionCharges: nonEmpty(fields["collection_charges"]),
        nonAgriculturalArea: nonEmpty(fields["non_agricultural_area"]),
        nonCultivatedArea: nonEmpty(fields["non_cultivated_area"]),
        tenantName: nonEmpty(fields["tenant_name"]),
        tenantRent: nonEmpty(fields["tenant_rent"]),
        otherRights: nonEmpty(fields["other_rights"]),
        encumbrances: nonEmpty(fields["encumbrances"]),
        lastMutationNumber: nonEmpty(fields["last_mutation_number"]),
        lastMutationDate: nonEmpty(fields["last_mutation_date"]),
        pendingMutation: nonEmpty(fields["pending_mutation"]),
        rawText,
        html,
        images,
      });
      return { section, data };
    }

    case "form12": {
      const cropRows =
        presented?.sections
          .flatMap((s) => s.tables)
          .find((t) => t.key === "crop_entries")?.rows ?? [];

      const cropEntries = cropRows
        .map((row) => {
          const v = row.values as Record<string, string>;
          const entry = stripUndefined({
            year: nonEmpty(v["year"]),
            season: nonEmpty(v["season"]),
            khateNumber: nonEmpty(v["khate_number"]),
            cropType: nonEmpty(v["crop_type"]),
            cropName: nonEmpty(v["crop_name"]),
            irrigatedArea: nonEmpty(v["irrigated_area"]),
            unirrigatedArea: nonEmpty(v["unirrigated_area"]),
            irrigationSource: nonEmpty(v["irrigation_source"]),
            landUseNature: nonEmpty(v["land_use_nature"]),
            area: nonEmpty(v["area"]),
            remarks: nonEmpty(v["remarks"]),
          });
          return Object.keys(entry).length > 0 ? entry : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const data: Form12Subdoc = stripUndefined({
        village: nonEmpty(fields["village"]),
        taluka: nonEmpty(fields["taluka"]),
        district: nonEmpty(fields["district"]),
        surveyNumber: nonEmpty(fields["survey_number"]),
        khateNumber: nonEmpty(fields["khate_number"]),
        cropEntries: cropEntries.length > 0 ? cropEntries : undefined,
        rawText,
        html,
        images,
      });
      return { section, data };
    }
  }
}

/** Drop keys whose value is undefined so MongoDB $set doesn't write empty fields. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
