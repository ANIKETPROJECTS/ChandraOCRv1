import { useCallback, useMemo, useRef } from "react";
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
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useTypedExtractor } from "@/hooks/use-extractor";
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
    extract,
    reset,
  } = useTypedExtractor(documentType, meta.subtitle);

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

  const downloadJson = () => {
    if (!result?.sections) return;
    const payload = sectionsToFlatJson(result.sections);
    const content = JSON.stringify(
      {
        document_type: result.document_type,
        document_label: result.document_label,
        page_count: result.page_count,
        runtime: result.runtime,
        data: payload,
      },
      null,
      2,
    );
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.document_type}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyJson = () => {
    if (!result?.sections) return;
    const payload = sectionsToFlatJson(result.sections);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "Extracted fields copied as JSON.",
    });
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
          <div>
            <h1 className="text-3xl font-serif font-semibold tracking-tight text-primary">
              {meta.title}
            </h1>
            <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
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

            {status === "complete" && result?.sections && (
              <Card
                className="border-border shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
                data-testid="result-card"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Extraction Complete
                    </CardTitle>
                    <CardDescription>
                      {result.page_count ? `${result.page_count} page${result.page_count === 1 ? "" : "s"} · ` : ""}
                      Processed in{" "}
                      {result.runtime ? `${result.runtime.toFixed(1)}s` : `${elapsedTime}s`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyJson} data-testid="button-copy">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadJson}
                      data-testid="button-download"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {result.empty ? (
                    <div className="p-6 rounded-md bg-muted/40 text-sm text-muted-foreground text-center">
                      No fields could be extracted from this document. Try
                      uploading a clearer scan or a different page.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {result.sections.map((section) => (
                        <SectionView key={section.title} section={section} />
                      ))}
                    </div>
                  )}
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
    </div>
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
