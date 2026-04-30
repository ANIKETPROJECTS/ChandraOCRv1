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

export interface AadharSubdoc {
  name?: string;
  aadhaarNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  mobileNumber?: string;
  photoBase64?: string;
  photoMimeType?: string;
  rawText?: string;
}

export interface PassbookSubdoc {
  bankName?: string;
  accountHolderName?: string;
  cifNumber?: string;
  accountNumber?: string;
  accountType?: string;
  ifsc?: string;
  micr?: string;
  branchName?: string;
  branchCode?: string;
  accountOpeningDate?: string;
  rawText?: string;
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

/**
 * Convert the structured extraction result into a sub-document matching the
 * persisted MongoDB user schema.
 *
 * `markdown` is captured into the `rawText` field on every section, mirroring
 * the existing user document.
 */
export function mapExtractionToSection(
  documentType: string,
  presented: PresentedDocument | null,
  markdown: string | null,
): MappedExtraction | null {
  const section = documentTypeToSection(documentType);
  if (!section) return null;

  const fields = presented ? flattenFields(presented.sections) : {};
  const rawText = nonEmpty(markdown ?? undefined);

  switch (section) {
    case "aadhar": {
      const data: AadharSubdoc = stripUndefined({
        name: nonEmpty(fields["full_name"]),
        aadhaarNumber: nonEmpty(fields["aadhaar_number"]),
        dateOfBirth: nonEmpty(fields["date_of_birth"]),
        gender: nonEmpty(fields["gender"]),
        address: nonEmpty(fields["address"]),
        mobileNumber: nonEmpty(fields["mobile_number"]),
        rawText,
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

      const data: PassbookSubdoc = stripUndefined({
        bankName: nonEmpty(fields["bank_name"]),
        accountHolderName: nonEmpty(fields["account_holder_name"]),
        cifNumber: nonEmpty(fields["customer_id"]),
        accountNumber: nonEmpty(fields["account_number"]),
        accountType: nonEmpty(fields["account_type"]),
        ifsc,
        micr: nonEmpty(fields["micr_code"]),
        branchName: nonEmpty(fields["branch_name"]),
        branchCode: branchCodeFromIfsc,
        accountOpeningDate: nonEmpty(fields["opening_date"]),
        rawText,
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
