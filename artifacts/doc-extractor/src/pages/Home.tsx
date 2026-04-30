import { Link } from "wouter";
import { FileText, ScrollText, IdCard, BookOpen, Clock, CheckCircle, AlertCircle, Loader2, Landmark } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecentExtractions } from "@/hooks/use-extractor";
import { ProfileMenu } from "@/components/profile-menu";
import type { DocumentTypeId } from "@/lib/types";

interface DocCard {
  id: DocumentTypeId;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof FileText;
  accent: string;
}

const DOCS: DocCard[] = [
  {
    id: "form7",
    title: "Form 7",
    subtitle: "Maharashtra 7/12 — Ownership Register",
    description:
      "Extract owner details, area, assessment, encumbrances, and mutation entries from the Satbara Form 7 (अधिकार अभिलेख).",
    icon: ScrollText,
    accent: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "form12",
    title: "Form 12",
    subtitle: "Maharashtra 7/12 — Crop Inspection Register",
    description:
      "Extract every crop inspection row — year, season, crop, irrigation, and area — from the Satbara Form 12 (पीक पाहणी).",
    icon: FileText,
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "form8a",
    title: "Form 8A",
    subtitle: "Maharashtra Holding Register — खाते उतारा / 8-अ",
    description:
      "Extract khatedar details and every survey-number holding — area, assessment, pot-kharab — from the combined खाते उतारा (8A).",
    icon: Landmark,
    accent: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    id: "aadhar",
    title: "Aadhaar Card",
    subtitle: "UIDAI Identity Card",
    description:
      "Extract name, gender, date of birth, Aadhaar number, address, VID, and other printed details.",
    icon: IdCard,
    accent: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    id: "bank_passbook",
    title: "Bank Passbook",
    subtitle: "Account & Branch Details",
    description:
      "Extract bank, branch, IFSC, account number, holder details, nominee, and any printed transactions.",
    icon: BookOpen,
    accent: "text-violet-700 bg-violet-50 border-violet-200",
  },
];

export default function Home() {
  const recent = useRecentExtractions();

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <h1 className="text-4xl font-serif font-semibold tracking-tight text-primary">
                Document Extractor
              </h1>
              <p className="text-muted-foreground text-lg max-w-3xl">
                Pick a document type to upload. We extract the printed fields on the
                server and show them in a clean parameter / value layout — no manual
                cleanup required.
              </p>
            </div>
            <ProfileMenu />
          </div>
        </header>

        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
            {DOCS.map((doc) => {
              const Icon = doc.icon;
              return (
                <Link key={doc.id} href={`/extract/${doc.id}`}>
                  <Card
                    className="cursor-pointer border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all h-full"
                    data-testid={`card-doc-${doc.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div
                          className={`shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center ${doc.accent}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-xl">{doc.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {doc.subtitle}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {doc.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {recent.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Recent Extractions</h2>
            </div>
            <Card className="border-border">
              <CardContent className="p-0 divide-y divide-border">
                {recent.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 flex items-center justify-between gap-4"
                    data-testid={`recent-${item.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.documentLabel} · {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {item.status === "complete" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : item.status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
