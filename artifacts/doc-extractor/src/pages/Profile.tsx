/**
 * Profile detail page (`/profile/:phone`)
 * =======================================
 *
 * Loads a single MongoDB user document via `GET /api/profiles/:phone` and
 * shows every saved section (Aadhaar, Passbook, Form 7, Form 12) in one place.
 *
 * Each section has a "Re-upload" button that jumps to the Extract page with
 * the current profile pre-bound, so a fresh scan overwrites the same section.
 * Sections that haven't been populated yet show an "Upload now" call-to-action.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  IdCard,
  BookOpen,
  ScrollText,
  FileText,
  Landmark,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteProfile } from "@/hooks/use-profiles";
import { inlineImagesInHtml } from "@/components/blocks-view";
import type {
  DocumentTypeId,
  ProfileDoc,
  ProfileSection,
} from "@/lib/types";

/** Stored shape of an image saved alongside a profile section. */
interface ProfileImage {
  name: string;
  mimeType: string;
  base64: string;
}

/** A Table block captured verbatim from the source document (Form 7). */
interface RawTable {
  blockId?: string;
  page?: number;
  headers: string[];
  rows: string[][];
  html: string;
}

interface ProfileProps {
  phone: string;
}

interface SectionMeta {
  key: ProfileSection;
  documentType: DocumentTypeId;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  accent: string;
  /** Friendly labels for known sub-document field keys. */
  fieldLabels: Record<string, string>;
  /** Sub-keys that are arrays of objects (rendered as tables). */
  tableKeys?: { key: string; label: string }[];
  /** Sub-keys that are arrays of strings (rendered as bullet list). */
  listKeys?: string[];
}

const SECTIONS: SectionMeta[] = [
  {
    key: "aadhar",
    documentType: "aadhar",
    title: "Aadhaar Card",
    subtitle: "UIDAI identity details",
    icon: IdCard,
    accent: "text-sky-700 bg-sky-50 border-sky-200",
    fieldLabels: {
      name: "Name",
      aadhaarNumber: "Aadhaar Number",
      vid: "Virtual ID (VID)",
      dateOfBirth: "Date of Birth",
      gender: "Gender",
      fathersOrHusbandsName: "Father's / Husband's Name",
      address: "Address",
      pincode: "PIN Code",
      state: "State",
      mobileNumber: "Mobile Number",
      issueDate: "Issue Date",
      enrolmentNumber: "Enrolment No.",
      photoBase64: "Photo (base64)",
      photoMimeType: "Photo Format",
    },
  },
  {
    key: "passbook",
    documentType: "bank_passbook",
    title: "Bank Passbook",
    subtitle: "Account & branch details",
    icon: BookOpen,
    accent: "text-violet-700 bg-violet-50 border-violet-200",
    fieldLabels: {
      bankName: "Bank Name",
      branchName: "Branch Name",
      branchAddress: "Branch Address",
      ifsc: "IFSC",
      micr: "MICR",
      accountHolderName: "Account Holder",
      jointHolders: "Joint Holders",
      nomineeName: "Nominee Name",
      nomineeRelationship: "Nominee Relationship",
      address: "Customer Address",
      mobileNumber: "Mobile Number",
      email: "Email",
      cifNumber: "CIF Number",
      accountNumber: "Account Number",
      accountType: "Account Type",
      branchCode: "Branch Code",
      accountOpeningDate: "Opening Date",
      currentBalance: "Current Balance",
      rawText: "Raw OCR Text",
    },
    listKeys: ["jointHolders"],
    tableKeys: [{ key: "transactions", label: "Transactions" }],
  },
  {
    key: "form7",
    documentType: "form7",
    title: "Form 7",
    subtitle: "Maharashtra 7/12 — Ownership Register",
    icon: ScrollText,
    accent: "text-amber-700 bg-amber-50 border-amber-200",
    fieldLabels: {
      village: "Village",
      taluka: "Taluka",
      district: "District",
      surveyNumber: "Survey Number",
      puId: "PU ID",
      occupantClass: "Occupant Class",
      ownerNames: "Owner Names",
      khateNumber: "Khate Number",
      ownerShare: "Owner Share",
      modeOfAcquisition: "Mode of Acquisition",
      totalArea: "Total Area",
      landRevenueAssessment: "Land Revenue Assessment",
      collectionCharges: "Collection Charges",
      nonAgriculturalArea: "Non-Agricultural Area",
      nonCultivatedArea: "Non-Cultivated Area",
      tenantName: "Tenant Name",
      tenantRent: "Tenant Rent",
      otherRights: "Other Rights",
      encumbrances: "Encumbrances",
      lastMutationNumber: "Last Mutation No.",
      lastMutationDate: "Last Mutation Date",
      pendingMutation: "Pending Mutation",
      oldMutationNumbers: "Previous Mutation Nos.",
      boundaryAndSurveyMarks: "Boundary & Survey Marks",
      rawText: "Raw OCR Text",
    },
    listKeys: ["ownerNames", "oldMutationNumbers"],
    tableKeys: [{ key: "ownershipEntries", label: "Ownership / Khata Entries" }],
  },
  {
    key: "form12",
    documentType: "form12",
    title: "Form 12",
    subtitle: "Maharashtra 7/12 — Crop Inspection Register",
    icon: FileText,
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    fieldLabels: {
      village: "Village",
      taluka: "Taluka",
      district: "District",
      surveyNumber: "Survey Number",
      khateNumber: "Khate Number",
      rawText: "Raw OCR Text",
    },
    tableKeys: [{ key: "cropEntries", label: "Crop Inspection Entries" }],
  },
  {
    key: "form8a",
    documentType: "form8a",
    title: "Form 8A",
    subtitle: "Maharashtra Village Form 8A — धारण जमिनींची नोंदवही",
    icon: Landmark,
    accent: "text-blue-700 bg-blue-50 border-blue-200",
    fieldLabels: {
      year: "Year (वर्ष)",
      reportDate: "Report Date",
      village: "Village (गाव)",
      taluka: "Taluka (तालुका)",
      district: "District (जिल्हा)",
      khateNumber: "Khate Number (खाते क्रमांक)",
      accountType: "Account Type (खात्याचा प्रकार)",
      khatedarNames: "Khatedar Name(s)",
      khatedarAddress: "Khatedar Address",
      totalArea: "Total Area (एकूण क्षेत्र)",
      totalAssessmentOrJudi: "Total Assessment / Judi (एकूण आकारणी किंवा जुडी)",
      totalDamageOnInheritedLand: "Total Damage on Inherited Land (दुमाला)",
      totalZpLocalCess: "Total ZP Local Cess (जि.प.)",
      totalGpLocalCess: "Total GP Local Cess (ग्रा.प.)",
      totalRecoveryAmount: "Total Recovery (वसुलीसाठी एकूण)",
      grandTotal: "Grand Total (एकूण)",
      rawText: "Raw OCR Text",
    },
    listKeys: ["khatedarNames"],
    tableKeys: [
      { key: "holdings", label: "Holdings (धारण जमिनींची नोंदवही)" },
    ],
  },
];

const CROP_ENTRY_COLUMNS: { key: string; label: string }[] = [
  { key: "year", label: "Year" },
  { key: "season", label: "Season" },
  { key: "khateNumber", label: "Khate" },
  { key: "cropType", label: "Crop Type" },
  { key: "cropName", label: "Crop Name" },
  { key: "irrigatedArea", label: "Irrigated Area" },
  { key: "unirrigatedArea", label: "Un-irrigated Area" },
  { key: "irrigationSource", label: "Irrigation Source" },
  { key: "landUseNature", label: "Land Use" },
  { key: "area", label: "Area" },
  { key: "remarks", label: "Remarks" },
];

const TRANSACTION_COLUMNS: { key: string; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "particulars", label: "Particulars" },
  { key: "chequeRef", label: "Cheque / Ref" },
  { key: "withdrawal", label: "Withdrawal (Dr)" },
  { key: "deposit", label: "Deposit (Cr)" },
  { key: "balance", label: "Balance" },
];

const OWNERSHIP_ENTRY_COLUMNS: { key: string; label: string }[] = [
  { key: "khateNumber", label: "Khate No." },
  { key: "ownerName", label: "Owner Name" },
  { key: "area", label: "Area" },
  { key: "assessment", label: "Assessment" },
  { key: "collectionCharges", label: "Po.Kh." },
  { key: "mutationNumber", label: "Mutation No." },
  { key: "tenantRentOtherRights", label: "Tenant / Rent / Other Rights" },
];

const HOLDINGS_COLUMNS: { key: string; label: string }[] = [
  { key: "villageForm6Entry", label: "Khate Ref (गा.न. 6)" },
  { key: "surveyNumberWithSubdivision", label: "Survey No. / Sub-Div" },
  { key: "areaOrExtent", label: "क्षेत्र" },
  { key: "assessmentOrJudi", label: "आकारणी / जुडी" },
  { key: "damageOnInheritedLand", label: "दुमाला नुकसान" },
  { key: "zpLocalCess", label: "जि.प." },
  { key: "gpLocalCess", label: "ग्रा.प." },
  { key: "recoveryTotal", label: "वसुलीसाठी (७)" },
  { key: "rowTotal", label: "एकूण" },
];

const TABLE_COLUMNS: Record<string, { key: string; label: string }[]> = {
  cropEntries: CROP_ENTRY_COLUMNS,
  transactions: TRANSACTION_COLUMNS,
  ownershipEntries: OWNERSHIP_ENTRY_COLUMNS,
  holdings: HOLDINGS_COLUMNS,
};

const apiUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
};

const extractUrl = (docType: DocumentTypeId, phone: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/extract/${docType}?profile_phone=${encodeURIComponent(phone)}`;
};

export default function Profile({ phone }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/profiles/${phone}`));
      const data = (await res.json().catch(() => null)) as
        | { profile?: ProfileDoc; error?: string }
        | null;
      if (res.status === 404) {
        setProfile(null);
        setError("Profile not found.");
        return;
      }
      if (!res.ok || !data?.profile) {
        throw new Error(data?.error || `Server returned HTTP ${res.status}`);
      }
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    try {
      await deleteProfile(phone);
      toast({
        title: "Profile deleted",
        description: `Removed profile for +${phone}.`,
      });
      navigate("/");
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error.",
        variant: "destructive",
      });
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="-ml-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-serif font-semibold tracking-tight text-primary">
                Profile +{phone}
              </h1>
              {profile && (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.createdAt && (
                    <>Created {new Date(profile.createdAt).toLocaleString()}</>
                  )}
                  {profile.updatedAt && (
                    <>
                      {" · "}Updated {new Date(profile.updatedAt).toLocaleString()}
                    </>
                  )}
                </p>
              )}
            </div>
            {profile && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/40"
                onClick={() => setConfirmDelete(true)}
                data-testid="button-delete-profile"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete profile
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <Card className="border-border">
            <CardContent className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading profile…
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card className="border-destructive/40">
            <CardContent className="py-8 flex items-start gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Couldn't load this profile</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && profile && (
          <div className="space-y-5">
            {SECTIONS.map((section) => (
              <SectionCard
                key={section.key}
                section={section}
                phone={phone}
                data={profile[section.key] as Record<string, unknown> | undefined}
                onChanged={load}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete profile +{phone}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the profile and all of its saved
              sections. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SectionCardProps {
  section: SectionMeta;
  phone: string;
  data: Record<string, unknown> | undefined;
  onChanged: () => void;
}

function SectionCard({ section, phone, data, onChanged }: SectionCardProps) {
  const Icon = section.icon;
  const present = Boolean(data && Object.keys(data).length > 0);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(apiUrl(`/api/profiles/${phone}/${section.key}`), {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(err?.error || `Server returned HTTP ${res.status}`);
      }
      toast({
        title: "Section cleared",
        description: `${section.title} removed from +${phone}.`,
      });
      onChanged();
    } catch (err) {
      toast({
        title: "Could not remove",
        description: err instanceof Error ? err.message : "Unknown error.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card className="border-border shadow-sm" data-testid={`section-card-${section.key}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`shrink-0 w-10 h-10 rounded-md border flex items-center justify-center ${section.accent}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                {section.title}
                {present ? (
                  <Badge variant="secondary" className="text-xs">Saved</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Empty</Badge>
                )}
              </CardTitle>
              <CardDescription>{section.subtitle}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {present && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={removing}
                data-testid={`button-remove-${section.key}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Link href={extractUrl(section.documentType, phone)}>
              <Button size="sm" variant={present ? "outline" : "default"} data-testid={`button-upload-${section.key}`}>
                <Upload className="w-4 h-4 mr-2" />
                {present ? "Re-upload" : "Upload now"}
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!present ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No {section.title} saved on this profile yet.
          </div>
        ) : (
          <SectionBody section={section} data={data!} />
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {section.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears just the {section.title} data on profile +{phone}.
              The profile and other sections will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface SectionBodyProps {
  section: SectionMeta;
  data: Record<string, unknown>;
}

function SectionBody({ section, data }: SectionBodyProps) {
  const tableKeys = new Set((section.tableKeys ?? []).map((t) => t.key));
  const listKeys = new Set(section.listKeys ?? []);

  // Pull photo fields out so we can render them as an actual <img> tag,
  // and skip showing the raw base64 / mime type rows in the field table.
  const photoBase64 =
    typeof data.photoBase64 === "string" && data.photoBase64.trim().length > 0
      ? (data.photoBase64 as string)
      : null;
  const photoMime =
    typeof data.photoMimeType === "string" && data.photoMimeType.trim().length > 0
      ? (data.photoMimeType as string)
      : "image/jpeg";

  // Pictures Datalab pulled out of the document (portrait, signature, logos…).
  const images = Array.isArray(data.images)
    ? (data.images as unknown[]).filter(
        (i): i is ProfileImage =>
          typeof i === "object" &&
          i !== null &&
          typeof (i as ProfileImage).base64 === "string" &&
          (i as ProfileImage).base64.length > 0,
      )
    : [];

  // Full HTML rendering of the document from the marker pipeline.
  const html =
    typeof data.html === "string" && data.html.trim().length > 0
      ? (data.html as string)
      : null;

  // Build the {filename: base64} map used to inline image src= refs in the HTML.
  const imageMap: Record<string, string> = {};
  for (const img of images) imageMap[img.name] = img.base64;

  // Plain key/value rows for everything except known table/list/internal keys
  // and the special-render keys (photo, images gallery, html, mongo id).
  const SKIP_KEYS = new Set([
    "_id",
    "photoBase64",
    "photoMimeType",
    "images",
    "html",
    "tables",
    "textBlocks",
  ]);
  const flatEntries = Object.entries(data).filter(
    ([key, value]) =>
      !tableKeys.has(key) &&
      !SKIP_KEYS.has(key) &&
      value !== null &&
      value !== undefined &&
      (typeof value !== "string" || value.trim().length > 0),
  );

  return (
    <div className="space-y-5">
      {photoBase64 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photo
          </p>
          <div className="rounded-md border border-border bg-muted/20 p-3 inline-block">
            <img
              src={`data:${photoMime};base64,${photoBase64}`}
              alt="Aadhaar photo"
              className="max-h-56 w-auto rounded-sm object-contain"
              data-testid="img-aadhaar-photo"
            />
          </div>
        </div>
      )}

      {flatEntries.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableBody>
              {flatEntries.map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="bg-muted/30 font-medium text-sm w-1/3 align-top">
                    {section.fieldLabels[key] ?? humanize(key)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-pre-wrap break-words">
                    {renderValue(key, value, listKeys.has(key))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(section.tableKeys ?? []).map((t) => {
        const rows = data[t.key];
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const columns = TABLE_COLUMNS[t.key] ?? inferColumns(rows);
        return (
          <div key={t.key} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.label}
            </p>
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {columns.map((c) => (
                      <TableHead key={c.key} className="text-xs">{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map((c) => {
                        const cell = (row as Record<string, unknown>)[c.key];
                        return (
                          <TableCell key={c.key} className="text-sm">
                            {cell === null || cell === undefined || cell === ""
                              ? "—"
                              : String(cell)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}

      {Array.isArray((data as Record<string, unknown>).tables) &&
        ((data as Record<string, unknown>).tables as RawTable[]).length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source document tables (every cell preserved)
            </p>
            {((data as Record<string, unknown>).tables as RawTable[]).map(
              (tbl, idx) => (
                <div
                  key={tbl.blockId ?? idx}
                  className="border-l-4 border-l-orange-500 bg-card border border-border rounded-md p-4"
                  data-testid={`raw-table-${idx}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-orange-700 dark:text-orange-300">
                    Table
                  </div>
                  {section.key === "form7" ? (
                    // Form 7's source table is laid out with vertically-
                    // merged cells (e.g. the "अ) लागवड योग्य क्षेत्र"
                    // section spans many sub-rows in a single tall cell).
                    // Re-create that visual merging by computing rowspans
                    // from the captured rows[] matrix.
                    <SpannedTable headers={tbl.headers} rows={tbl.rows} />
                  ) : (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top text-foreground"
                      dangerouslySetInnerHTML={{ __html: tbl.html }}
                    />
                  )}
                </div>
              ),
            )}
          </div>
        )}

      {Array.isArray((data as Record<string, unknown>).textBlocks) &&
        ((data as Record<string, unknown>).textBlocks as string[]).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Other text from document
            </p>
            <div className="space-y-2">
              {((data as Record<string, unknown>).textBlocks as string[]).map(
                (t, i) => (
                  <div
                    key={i}
                    className="border-l-4 border-l-blue-500 bg-card border border-border rounded-md p-3 text-sm whitespace-pre-wrap break-words text-foreground"
                  >
                    {t}
                  </div>
                ),
              )}
            </div>
          </div>
        )}

      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pictures from document ({images.length})
          </p>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <figure
                key={img.name}
                className="rounded-md border border-border bg-muted/20 p-2 flex flex-col items-center gap-1"
                data-testid={`profile-image-${img.name}`}
              >
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={img.name}
                  className="max-h-40 w-auto rounded-sm object-contain"
                />
                <figcaption className="text-[10px] text-muted-foreground font-mono truncate max-w-[10rem]">
                  {img.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {html && (
        <details className="rounded-md border border-border" data-testid="document-html-view">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/30">
            Full document view
          </summary>
          <div
            className="p-4 prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:border [&_img]:border-border [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top text-foreground"
            dangerouslySetInnerHTML={{
              __html: inlineImagesInHtml(html, imageMap),
            }}
          />
        </details>
      )}
    </div>
  );
}

/** Pretty-print a value cell. Strings shown as-is; arrays as bullet/CSV; rest as JSON. */
function renderValue(key: string, value: unknown, asList: boolean): React.ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (asList) {
      return (
        <ul className="list-disc pl-5 space-y-0.5">
          {value.map((v, i) => (
            <li key={i}>{typeof v === "string" ? v : JSON.stringify(v)}</li>
          ))}
        </ul>
      );
    }
    return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ");
  }
  if (typeof value === "string") {
    if (key === "photoBase64" && value.length > 80) {
      return (
        <span className="font-mono text-xs text-muted-foreground">
          {value.slice(0, 60)}… ({value.length} chars)
        </span>
      );
    }
    return value;
  }
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
  return String(value);
}

/** "accountHolderName" -> "Account Holder Name". */
function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Build columns from the union of keys present in the array's rows. */
function inferColumns(rows: unknown[]): { key: string; label: string }[] {
  const keys = new Set<string>();
  for (const r of rows) {
    if (r && typeof r === "object") {
      for (const k of Object.keys(r as Record<string, unknown>)) keys.add(k);
    }
  }
  return Array.from(keys).map((k) => ({ key: k, label: humanize(k) }));
}

/**
 * True if `text` looks like a Form 7 section header — a single Devanagari
 * letter followed by ")" at the start (e.g. "अ) लागवड योग्य क्षेत्र",
 * "ब) पोटखराब क्षेत्र"). Used to fold each section's sub-row labels into
 * a single tall multi-line cell on the rendered table.
 */
function isSectionAnchorLabel(text: string): boolean {
  return /^\s*[\u0900-\u097F]\s*\)/.test(text ?? "");
}

/**
 * Split a sub-row line like "जिरायत ०.१९.४०" into a label/value pair so
 * the rendered cell can show them in two columns (label flush-left,
 * numeric value flush-right) — the way the original document is laid out.
 *
 * The trailing token is treated as the value if it looks numeric: any
 * combination of Devanagari digits (०-९), ASCII digits (0-9), dots, slashes,
 * commas, parentheses or dashes — this catches "०.१९.४०", "१.३७", "-",
 * "(१२३४)" etc. without splitting genuine label-only rows like "एकूण",
 * "(लागवड अयोग्य)" or "अ) लागवड योग्य क्षेत्र".
 */
function splitLabelValue(line: string): { label: string; value: string | null } {
  const trimmed = (line ?? "").trim();
  if (!trimmed) return { label: "", value: null };

  // Find the last whitespace-separated token. If it matches the numeric
  // pattern AND there's something to its left, treat it as the value.
  const lastSpace = trimmed.search(/\s+\S+$/);
  if (lastSpace < 0) return { label: trimmed, value: null };

  const label = trimmed.slice(0, lastSpace).trim();
  const value = trimmed.slice(lastSpace).trim();
  if (!label) return { label: trimmed, value: null };

  if (/^[\u0966-\u096F0-9.,/\-()]+$/.test(value)) {
    return { label, value };
  }
  return { label: trimmed, value: null };
}

/**
 * Render a `{headers, rows}` matrix where consecutive empty cells in a
 * column visually merge into the non-empty cell above them (rowspan). This
 * mimics the original Form 7 paper layout where a single tall cell like
 * "अ) लागवड योग्य क्षेत्र" (with sub-rows for जिरायत / बागायत / तरी /
 * एकूण / ला.यो. क्षेत्र) spans many physical rows in one merged cell.
 */
function SpannedTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  const colCount = Math.max(
    headers.length,
    ...rows.map((r) => r.length),
    1,
  );

  // Build a grid of {value, rowspan} | null. `null` means "this position
  // has been merged into an earlier rowspan'd cell — skip when rendering".
  type Cell = { value: string; rowspan: number };
  const grid: (Cell | null)[][] = rows.map((r) => {
    const padded: (Cell | null)[] = r.map((c) => ({
      value: c ?? "",
      rowspan: 1,
    }));
    while (padded.length < colCount) padded.push({ value: "", rowspan: 1 });
    return padded;
  });

  // For each column, walk top → bottom. If we hit an empty cell directly
  // under a non-empty anchor (or another empty under that anchor), bump
  // the anchor's rowspan and null-out the empty cell so it isn't rendered.
  for (let c = 0; c < colCount; c++) {
    let anchorRow = -1;
    for (let r = 0; r < grid.length; r++) {
      const cell = grid[r][c];
      if (cell === null) continue;
      const isEmpty = !cell.value || cell.value.trim() === "";
      if (!isEmpty) {
        anchorRow = r;
      } else if (anchorRow >= 0) {
        const anchor = grid[anchorRow][c];
        if (anchor) anchor.rowspan += 1;
        grid[r][c] = null;
      }
    }
  }

  // Extra pass for the leftmost (label) column: a "section header" row like
  // "अ) लागवड योग्य क्षेत्र" or "ब) पोटखराब क्षेत्र" should swallow all of
  // its sub-row labels (जिरायत, बागायत, तरी, एकूण, ला.यो. क्षेत्र, …) into
  // a single tall multi-line cell, matching the original document where each
  // labeled section is one merged cell. A section anchor is any row whose
  // column-0 text starts with a single Devanagari letter followed by ")".
  if (colCount > 0) {
    let sectionAnchorRow = -1;
    for (let r = 0; r < grid.length; r++) {
      const cell = grid[r][0];
      if (cell === null) continue;
      if (isSectionAnchorLabel(cell.value)) {
        sectionAnchorRow = r;
      } else if (sectionAnchorRow >= 0) {
        const anchor = grid[sectionAnchorRow][0];
        if (anchor) {
          const sub = (cell.value ?? "").trim();
          if (sub.length > 0) {
            anchor.value = anchor.value
              ? `${anchor.value}\n${sub}`
              : sub;
          }
          anchor.rowspan += 1;
        }
        grid[r][0] = null;
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-border text-sm text-foreground">
        {headers.length > 0 && (
          <thead>
            <tr className="bg-muted">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border border-border p-2 text-left font-semibold align-top whitespace-pre-wrap"
                >
                  {h || ""}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {grid.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => {
                if (cell === null) return null;
                // Split on \n so each sub-row label of a folded section
                // (e.g. जिरायत / बागायत / तरी / एकूण / ला.यो. क्षेत्र
                // inside the अ) section) renders as its own padded line.
                // Each line is then split into a label/value pair so that
                // the values line up in their own column on the right —
                // matching the original document's two-column layout
                // ("जिरायत   ०.१९.४०", "बागायत   -", …) rather than
                // appearing as a single concatenated line.
                const hasContent =
                  cell.value !== undefined &&
                  cell.value !== null &&
                  cell.value.length > 0;
                const lines = (cell.value ?? "").split("\n");
                return (
                  <td
                    key={cIdx}
                    rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                    className="border border-border px-3 py-2 align-top break-words"
                  >
                    {hasContent ? (
                      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 leading-relaxed">
                        {lines.flatMap((line, lIdx) => {
                          const { label, value } = splitLabelValue(line);
                          if (value === null) {
                            return [
                              <div
                                key={`${lIdx}-full`}
                                className="col-span-2 whitespace-pre-wrap"
                              >
                                {label.length > 0 ? label : "\u00A0"}
                              </div>,
                            ];
                          }
                          return [
                            <div
                              key={`${lIdx}-label`}
                              className="whitespace-pre-wrap"
                            >
                              {label}
                            </div>,
                            <div
                              key={`${lIdx}-value`}
                              className="whitespace-pre-wrap text-right tabular-nums"
                            >
                              {value}
                            </div>,
                          ];
                        })}
                      </div>
                    ) : (
                      ""
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
