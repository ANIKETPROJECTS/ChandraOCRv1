import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Copy,
  Loader2,
  User,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createProfile, useProfiles } from "@/hooks/use-profiles";
import { DOC_TO_SECTION } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTypedExtractor } from "@/hooks/use-extractor";
import { BlocksView, blocksToHtml, inlineImagesInHtml } from "@/components/blocks-view";
import type { DocumentTypeId, PresentedSection } from "@/lib/types";

const DOC_LABELS: Record<DocumentTypeId, { title: string; subtitle: string; description: string }> = {
  form7: {
    title: "Form 7",
    subtitle: "Maharashtra 7/12 — Ownership Register (अधिकार अभिलेख)",
    description:
      "Upload a Form 7 (Satbara) page. We extract owner, area, encumbrance, and mutation details.",
  },
  form12: {
    title: "Form 12",
    subtitle: "Maharashtra 7/12 — Crop Inspection Register (पीक पाहणी)",
    description:
      "Upload a Form 12 (Pik Pahani) page. We extract every crop, season, irrigation source, and area entry.",
  },
  form8a: {
    title: "Form 8A",
    subtitle: "Maharashtra Holding Register (खाते उतारा / 8-अ)",
    description:
      "Upload a Form 8A (Khata Utara) page. We extract khatedar details and every survey-number holding with area and assessment.",
  },
  aadhar: {
    title: "Aadhaar Card",
    subtitle: "UIDAI Identity Card",
    description:
      "Upload the Aadhaar card image or PDF. We extract identity, address, and document details.",
  },
  bank_passbook: {
    title: "Bank Passbook",
    subtitle: "Account & Branch Details",
    description:
      "Upload a passbook page. We extract bank, branch, account, and (when present) transaction rows.",
  },
};

interface ExtractProps {
  documentType: DocumentTypeId;
}

export default function Extract({ documentType }: ExtractProps) {
  const meta = DOC_LABELS[documentType];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    file,
    setFile,
    mode,
    setMode,
    status,
    result,
    error,
    elapsedTime,
    profilePhone,
    setProfilePhone,
    extract,
    reset,
  } = useTypedExtractor(documentType, meta.subtitle);

  // Initialize the bound profile from `?profile_phone=` in the URL exactly
  // once. Subsequent navigation between document types should keep it set.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("profile_phone");
    if (fromUrl && /^[0-9]{7,15}$/.test(fromUrl)) {
      setProfilePhone(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pickerOpen, setPickerOpen] = useState(false);
  const isBusy = status === "uploading" || status === "processing";

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isBusy) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) setFile(dropped);
    },
    [isBusy, setFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) setFile(f);
    },
    [setFile],
  );

  const removeFile = () => {
    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sections = result?.structured?.sections ?? null;
  const marker = result?.marker ?? null;

  const structuredJson = useMemo(
    () => (sections ? sectionsToFlatJson(sections) : null),
    [sections],
  );

  const markerHtml = useMemo(() => {
    if (!marker) return "";
    if (marker.html && marker.html.length > 0) {
      return inlineImagesInHtml(marker.html, marker.images);
    }
    return blocksToHtml(marker.json, marker.images);
  }, [marker]);

  const triggerDownload = (filename: string, contents: string, mime: string) => {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadStructuredJson = () => {
    if (!result || !structuredJson) return;
    const content = JSON.stringify(
      {
        document_type: result.document_type,
        document_label: result.document_label,
        page_count: result.page_count,
        runtime: result.runtime,
        data: structuredJson,
      },
      null,
      2,
    );
    triggerDownload(
      `${result.document_type}-fields-${Date.now()}.json`,
      content,
      "application/json",
    );
  };

  const copyStructuredJson = () => {
    if (!structuredJson) return;
    navigator.clipboard.writeText(JSON.stringify(structuredJson, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "Extracted fields copied as JSON.",
    });
  };

  const downloadMarkerJson = () => {
    if (!marker) return;
    triggerDownload(
      `${result?.document_type ?? "document"}-blocks-${Date.now()}.json`,
      JSON.stringify(marker.json ?? {}, null, 2),
      "application/json",
    );
  };

  const downloadMarkerHtml = () => {
    if (!markerHtml) return;
    triggerDownload(
      `${result?.document_type ?? "document"}-blocks-${Date.now()}.html`,
      `<!doctype html><html><head><meta charset="utf-8"><title>${result?.document_label ?? "Document"}</title></head><body>${markerHtml}</body></html>`,
      "text/html",
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="-ml-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All document types
            </Button>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-serif font-semibold tracking-tight text-primary">
                {meta.title}
              </h1>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {profilePhone ? (
                <>
                  <Badge variant="secondary" className="gap-1.5 py-1.5 px-3" data-testid="badge-profile">
                    <User className="w-3.5 h-3.5" />
                    Saving to +{profilePhone}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProfilePhone(null)}
                    disabled={isBusy}
                    data-testid="button-clear-profile"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerOpen(true)}
                    disabled={isBusy}
                  >
                    Change
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  disabled={isBusy}
                  data-testid="button-pick-profile"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Save to profile…
                </Button>
              )}
            </div>
          </div>
          <p className="text-muted-foreground max-w-3xl">{meta.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Upload Document</CardTitle>
                <CardDescription>PDF, DOCX, PPTX, PNG, JPG, or WEBP — up to 50MB.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !isBusy && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
                    ${isBusy ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary/50 hover:border-primary/50"}
                    ${file ? "border-primary/50 bg-secondary/20" : "border-border"}`}
                  data-testid="dropzone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp"
                    data-testid="file-input"
                  />

                  {file ? (
                    <div className="flex flex-col items-center space-y-3">
                      <FileText className="h-12 w-12 text-primary" />
                      <div>
                        <p className="font-medium text-lg">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {!isBusy && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                          data-testid="button-remove-file"
                        >
                          Remove File
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <UploadCloud className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-lg">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Any supported document format up to 50MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {status === "error" && (
                  <div className="mt-4 p-4 rounded-md bg-destructive/10 text-destructive flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Extraction Failed</h4>
                      <p className="text-sm opacity-90">{error}</p>
                    </div>
                  </div>
                )}

                {isBusy && (
                  <div className="mt-6 p-5 rounded-lg bg-secondary/30 border border-border space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="font-medium">
                          {status === "uploading"
                            ? "Uploading document..."
                            : "Extracting fields..."}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-sm font-mono">
                        {elapsedTime}s
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-pulse w-full" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Accurate mode is enabled — this can take up to a minute or two
                      depending on document length.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {status === "complete" && result && (
              <Card
                className="border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
                data-testid="result-card"
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Extraction Complete
                      </CardTitle>
                      <CardDescription>
                        {result.page_count
                          ? `${result.page_count} page${result.page_count === 1 ? "" : "s"} · `
                          : ""}
                        Processed in{" "}
                        {result.runtime
                          ? `${result.runtime.toFixed(1)}s`
                          : `${elapsedTime}s`}
                      </CardDescription>
                    </div>
                  </div>
                  {result.profile?.saved && (
                    <div
                      className="mt-2 flex flex-wrap items-center gap-2"
                      data-testid="profile-saved"
                    >
                      <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Saved to profile +{result.profile.phone}
                        {result.profile.section
                          ? ` · ${result.profile.section}`
                          : ""}
                      </p>
                      <Link href={`/profile/${result.profile.phone}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs gap-1"
                          data-testid="button-view-saved-profile"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View profile
                        </Button>
                      </Link>
                    </div>
                  )}
                  {result.profile && !result.profile.saved && result.profile.error && (
                    <p
                      className="text-xs text-amber-600 dark:text-amber-400 mt-2"
                      data-testid="profile-save-error"
                    >
                      Could not save to profile +{result.profile.phone}:{" "}
                      {result.profile.error}
                    </p>
                  )}
                  {result.errors?.extract && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Structured field extraction failed: {result.errors.extract}
                    </p>
                  )}
                  {result.errors?.marker && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Datalab block view failed: {result.errors.marker}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="structured" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger
                        value="structured"
                        disabled={!sections}
                        data-testid="tab-structured"
                      >
                        Structured Data
                      </TabsTrigger>
                      <TabsTrigger
                        value="blocks"
                        disabled={!marker?.json}
                        data-testid="tab-blocks"
                      >
                        Blocks
                      </TabsTrigger>
                      <TabsTrigger
                        value="html"
                        disabled={!markerHtml}
                        data-testid="tab-html"
                      >
                        HTML
                      </TabsTrigger>
                      <TabsTrigger
                        value="json"
                        disabled={!marker?.json}
                        data-testid="tab-json"
                      >
                        JSON
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="structured" className="mt-5">
                      {sections ? (
                        <>
                          <div className="flex justify-end gap-2 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyStructuredJson}
                              data-testid="button-copy-structured"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy JSON
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={downloadStructuredJson}
                              data-testid="button-download-structured"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                          {result.structured?.empty ? (
                            <div className="p-6 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
                              No fields could be extracted from this document. Try
                              uploading a clearer scan or a different page.
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {sections.map((section) => (
                                <SectionView key={section.title} section={section} />
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-6 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
                          Structured field extraction is not available for this document.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="blocks" className="mt-5">
                      {marker?.json ? (
                        <BlocksView root={marker.json} images={marker.images} />
                      ) : (
                        <div className="p-6 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
                          Block view not available.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="html" className="mt-5">
                      {markerHtml ? (
                        <>
                          <div className="flex justify-end gap-2 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={downloadMarkerHtml}
                              data-testid="button-download-html"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download HTML
                            </Button>
                          </div>
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none p-5 rounded-md border border-border bg-card [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:border [&_img]:border-border [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:p-2 [&_td]:align-top text-foreground"
                            dangerouslySetInnerHTML={{ __html: markerHtml }}
                            data-testid="html-view"
                          />
                        </>
                      ) : (
                        <div className="p-6 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
                          HTML view not available.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="json" className="mt-5">
                      {marker?.json ? (
                        <>
                          <div className="flex justify-end gap-2 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={downloadMarkerJson}
                              data-testid="button-download-json"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download JSON
                            </Button>
                          </div>
                          <pre
                            className="text-xs bg-muted/40 border border-border rounded-md p-4 overflow-auto max-h-[600px]"
                            data-testid="json-view"
                          >
                            {JSON.stringify(marker.json, null, 2)}
                          </pre>
                        </>
                      ) : (
                        <div className="p-6 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
                          Raw JSON not available.
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Extraction Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Processing Mode</Label>
                  <Select
                    value={mode}
                    onValueChange={(v: "fast" | "balanced" | "accurate") => setMode(v)}
                    disabled={isBusy}
                  >
                    <SelectTrigger data-testid="select-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accurate">Accurate (recommended)</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Accurate is the default — it turns on the LLM-assisted pass for the
                    best field-level accuracy.
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={extract}
                  disabled={!file || isBusy}
                  data-testid="button-extract"
                >
                  {isBusy ? "Processing..." : `Extract ${meta.title}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ProfilePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        documentType={documentType}
        currentPhone={profilePhone}
        onSelect={(phone) => {
          setProfilePhone(phone);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

interface ProfilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: import("@/lib/types").DocumentTypeId;
  currentPhone: string | null;
  onSelect: (phone: string) => void;
}

/**
 * Dialog that lets the user either pick an existing profile or create a new
 * one to bind the current extraction to. Re-uses the /api/profiles list so
 * the UI here mirrors the hamburger menu on the home page.
 */
function ProfilePickerDialog({
  open,
  onOpenChange,
  documentType,
  currentPhone,
  onSelect,
}: ProfilePickerDialogProps) {
  const { profiles, loading, refresh } = useProfiles();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const targetSection = DOC_TO_SECTION[documentType];

  // Surface profiles that already have data for this document's section first.
  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      const aHas = a.sections[targetSection] ? 1 : 0;
      const bHas = b.sections[targetSection] ? 1 : 0;
      return bHas - aHas;
    });
  }, [profiles, targetSection]);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 120) {
      setErr("Name is required (1-120 characters).");
      return;
    }
    const cleaned = phone.replace(/[^0-9]/g, "");
    if (!/^[0-9]{7,15}$/.test(cleaned)) {
      setErr("Phone number must be 7-15 digits.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await createProfile(cleaned, trimmedName);
      await refresh();
      setPhone("");
      setName("");
      onSelect(cleaned);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save extraction to a profile</DialogTitle>
          <DialogDescription>
            Pick the profile to write this {targetSection} into. The
            extraction will be saved automatically when processing finishes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="max-h-56 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
              </div>
            ) : sortedProfiles.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No profiles yet. Create one below.
              </div>
            ) : (
              sortedProfiles.map((p) => {
                const has = p.sections[targetSection];
                const isCurrent = p.phone === currentPhone;
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => onSelect(p.phone)}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between ${
                      isCurrent ? "bg-muted/40" : ""
                    }`}
                    data-testid={`pick-profile-${p.phone}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">+{p.phone}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {has
                          ? `Already has ${targetSection} — will be overwritten`
                          : `No ${targetSection} yet — will be added`}
                      </p>
                    </div>
                    {isCurrent && (
                      <Badge variant="outline" className="ml-2">
                        Current
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-md border border-border p-3 space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Or create a new profile
            </p>
            <div className="space-y-2">
              <Label htmlFor="picker-new-name" className="text-xs">Name</Label>
              <Input
                id="picker-new-name"
                type="text"
                placeholder="e.g. Aniket Sanjay Rane"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                maxLength={120}
                data-testid="input-picker-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="picker-new-phone" className="text-xs">Phone</Label>
              <div className="flex gap-2">
                <Input
                  id="picker-new-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Phone (7-15 digits)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                  data-testid="input-picker-phone"
                />
                <Button
                  onClick={handleCreate}
                  disabled={submitting || phone.length === 0 || name.trim().length === 0}
                  data-testid="button-picker-create"
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create & use
                </Button>
              </div>
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionView({ section }: { section: PresentedSection }) {
  return (
    <div className="space-y-3" data-testid={`section-${section.title}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
        {section.title}
      </h3>

      {section.fields.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableBody>
              {section.fields.map((field) => (
                <TableRow key={field.key}>
                  <TableCell className="bg-muted/30 font-medium text-sm w-1/3 align-top">
                    {field.label}
                  </TableCell>
                  <TableCell className="text-sm whitespace-pre-wrap break-words">
                    {field.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {section.tables.map((table) => (
        <div key={table.key} className="space-y-2">
          {section.fields.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground pt-2">
              {table.label}
            </p>
          )}
          {table.rows.length === 0 ? (
            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground text-center bg-muted/20">
              No {table.label.toLowerCase()} found in this document.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {table.columns.map((col) => (
                      <TableHead key={col.key} className="text-xs font-semibold">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {table.columns.map((col) => (
                        <TableCell key={col.key} className="text-sm align-top">
                          {row.values[col.key] ?? "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function sectionsToFlatJson(sections: PresentedSection[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of sections) {
    const sectionObj: Record<string, unknown> = {};
    for (const field of section.fields) {
      sectionObj[field.key] = field.value === "—" ? null : field.value;
    }
    for (const table of section.tables) {
      sectionObj[table.key] = table.rows.map((row) => {
        const r: Record<string, unknown> = {};
        for (const col of table.columns) {
          const v = row.values[col.key];
          r[col.key] = v && v !== "—" ? v : null;
        }
        return r;
      });
    }
    out[section.title] = sectionObj;
  }
  return out;
}
