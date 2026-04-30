/**
 * ProfileMenu
 * ===========
 *
 * The hamburger menu shown on the Home page. Lists the four document
 * sub-document sections (Form 7, Form 12, Aadhaar, Bank Passbook) and, under
 * each section, the user profiles in MongoDB that already have data for that
 * section.
 *
 * Clicking a profile entry opens the dedicated profile detail page
 * (`/profile/:phone`) so the user can view all saved fields. From there they
 * can re-upload any section. The "+ Upload new ... (no profile)" link still
 * jumps straight to the Extract page for a fresh, unbound upload.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Menu,
  Plus,
  IdCard,
  BookOpen,
  ScrollText,
  FileText,
  Landmark,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  createProfile,
  deleteProfile,
  useProfiles,
} from "@/hooks/use-profiles";
import {
  DOC_TO_SECTION,
  type DocumentTypeId,
  type ProfileSection,
} from "@/lib/types";

interface SectionEntry {
  id: DocumentTypeId;
  section: ProfileSection;
  title: string;
  subtitle: string;
  icon: typeof FileText;
  accent: string;
}

const SECTIONS: SectionEntry[] = [
  {
    id: "form7",
    section: DOC_TO_SECTION.form7,
    title: "Form 7",
    subtitle: "Maharashtra 7/12 — Ownership Register",
    icon: ScrollText,
    accent: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    id: "form12",
    section: DOC_TO_SECTION.form12,
    title: "Form 12",
    subtitle: "Maharashtra 7/12 — Crop Inspection Register",
    icon: FileText,
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    id: "form8a",
    section: DOC_TO_SECTION.form8a,
    title: "Form 8A",
    subtitle: "Maharashtra Holding Register — खाते उतारा",
    icon: Landmark,
    accent: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    id: "aadhar",
    section: DOC_TO_SECTION.aadhar,
    title: "Aadhaar Card",
    subtitle: "UIDAI Identity Card",
    icon: IdCard,
    accent: "text-sky-700 bg-sky-50 border-sky-200",
  },
  {
    id: "bank_passbook",
    section: DOC_TO_SECTION.bank_passbook,
    title: "Bank Passbook",
    subtitle: "Account & Branch Details",
    icon: BookOpen,
    accent: "text-violet-700 bg-violet-50 border-violet-200",
  },
];

/** Build the Extract URL, optionally pre-binding a profile phone number. */
function extractUrl(docId: DocumentTypeId, phone?: string | null): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const qs = phone ? `?profile_phone=${encodeURIComponent(phone)}` : "";
  return `${base}/extract/${docId}${qs}`;
}

/** Build the Profile detail page URL. */
function profileUrl(phone: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/profile/${encodeURIComponent(phone)}`;
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletePhone, setDeletePhone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<ProfileSection, boolean>>({
    aadhar: true,
    passbook: true,
    form7: true,
    form12: true,
    form8a: true,
  });
  const { profiles, loading, error, refresh } = useProfiles();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const toggle = (section: ProfileSection) =>
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

  const handleDelete = async (phone: string) => {
    try {
      await deleteProfile(phone);
      toast({
        title: "Profile deleted",
        description: `Removed profile for +${phone}.`,
      });
      await refresh();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Unknown error.",
        variant: "destructive",
      });
    } finally {
      setDeletePhone(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Open profile menu"
            data-testid="button-open-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[360px] sm:w-[420px] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle>Profiles</SheetTitle>
            <SheetDescription>
              Pick a profile under any section to upload a new scan straight into
              it, or start fresh.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading profiles…
              </div>
            )}
            {error && (
              <div className="mx-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {SECTIONS.map((entry) => {
              const Icon = entry.icon;
              const matching = profiles.filter(
                (p) => p.sections[entry.section],
              );
              const isOpen = expanded[entry.section];
              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border overflow-hidden"
                  data-testid={`section-${entry.section}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(entry.section)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/40"
                  >
                    <div
                      className={`shrink-0 w-9 h-9 rounded-md border flex items-center justify-center ${entry.accent}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {matching.length} saved
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border bg-muted/20 divide-y divide-border">
                      {matching.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground italic">
                          No profiles have a {entry.title} saved yet.
                        </div>
                      ) : (
                        matching.map((p) => (
                          <button
                            key={`${entry.section}-${p._id}`}
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              navigate(profileUrl(p.phone));
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-muted/60 flex items-center justify-between gap-2"
                            data-testid={`profile-${p.phone}-${entry.section}`}
                            title="View profile details"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                                +{p.phone}
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </p>
                              {p.labels[entry.section] && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {p.labels[entry.section]}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate(extractUrl(entry.id));
                        }}
                        className="block w-full text-left px-3 py-2 text-xs text-primary hover:bg-muted/60"
                        data-testid={`new-${entry.id}`}
                      >
                        + Upload new {entry.title} (no profile)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {profiles.length > 0 && (
              <div className="rounded-lg border border-border">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                  Manage profiles
                </div>
                <div className="divide-y divide-border">
                  {profiles.map((p) => (
                    <div
                      key={p._id}
                      className="px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left hover:opacity-80"
                        onClick={() => {
                          setOpen(false);
                          navigate(profileUrl(p.phone));
                        }}
                        data-testid={`open-profile-${p.phone}`}
                      >
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          +{p.phone}
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {Object.entries(p.sections)
                            .filter(([, has]) => has)
                            .map(([s]) => s)
                            .join(", ") || "no sections yet"}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDeletePhone(p.phone)}
                        aria-label={`Delete profile +${p.phone}`}
                        data-testid={`button-delete-${p.phone}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <Button
              className="w-full"
              onClick={() => setCreateOpen(true)}
              data-testid="button-new-profile"
            >
              <Plus className="w-4 h-4 mr-2" />
              New profile
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <CreateProfileDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          void refresh();
        }}
      />

      <AlertDialog
        open={deletePhone !== null}
        onOpenChange={(o) => !o && setDeletePhone(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the profile for{" "}
              <strong>+{deletePhone}</strong> and all of its saved sections.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePhone && handleDelete(deletePhone)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface CreateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateProfileDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProfileDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { toast } = useToast();

  const submit = async () => {
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
      toast({
        title: "Profile ready",
        description: `Profile +${cleaned} is available.`,
      });
      setPhone("");
      setName("");
      onOpenChange(false);
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New profile</DialogTitle>
          <DialogDescription>
            Profiles are identified by phone number. If a profile already exists
            for the number you enter, it will be reused.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="new-profile-name">Name</Label>
            <Input
              id="new-profile-name"
              type="text"
              placeholder="e.g. Aniket Sanjay Rane"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              maxLength={120}
              data-testid="input-new-profile-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-profile-phone">Phone number</Label>
            <Input
              id="new-profile-phone"
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
              data-testid="input-new-profile-phone"
            />
            <p className="text-xs text-muted-foreground">
              7-15 digits. Don't include spaces, dashes, or country code prefixes
              like "+".
            </p>
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            data-testid="button-create-profile"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
