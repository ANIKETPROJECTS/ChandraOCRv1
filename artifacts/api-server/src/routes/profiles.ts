/**
 * Profiles API
 * ============
 *
 * Each user profile is identified by their phone number and lives as a single
 * document in the `users` MongoDB collection (database `apnaapp`). A profile
 * may have any combination of these sections, populated from document scans:
 *
 *   - `aadhar`   : Aadhaar Card identity details
 *   - `passbook` : Bank passbook (account & branch) details
 *   - `form7`    : Maharashtra 7/12 ownership register
 *   - `form12`   : Maharashtra 7/12 crop inspection register
 *   - `form8a`   : Maharashtra 8A khata utara (combined holdings register)
 *
 * Endpoints (mounted under `/api`):
 *
 *   GET    /profiles                       List every profile (summary).
 *   POST   /profiles                       Create an empty profile.
 *   GET    /profiles/:phone                Read a single profile (full document).
 *   DELETE /profiles/:phone                Remove a profile.
 *   PATCH  /profiles/:phone/:section       Replace one section's fields.
 *   GET    /profiles/by-section/:section   List only profiles that have :section
 *                                          populated (used by the hamburger menu).
 *
 * The `phone` parameter is the document's `phone` field — exactly the same
 * convention as the existing user document already in the collection.
 */
import { Router, type IRouter } from "express";
import { ObjectId, type Filter, type WithId, type Document } from "mongodb";
import { getDb } from "../lib/mongo";
import {
  PROFILE_SECTIONS,
  type ProfileSection,
  type UserProfile,
} from "../lib/profiles";

const router: IRouter = Router();

const COLLECTION = "users";

/** Phone validation: digits only, 7-15 chars (covers Indian + international formats). */
const PHONE_RE = /^[0-9]{7,15}$/;

/** Code alphabet — uppercase letters + digits, with ambiguous chars removed. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a short, human-friendly code like "P-A4F2". Used to disambiguate
 * profiles that share the same name. Caller passes a uniqueness check via
 * `isTaken`; we retry up to a handful of times before giving up.
 */
async function generateUniqueCode(
  isTaken: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let suffix = "";
    for (let i = 0; i < 4; i += 1) {
      suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const code = `P-${suffix}`;
    if (!(await isTaken(code))) return code;
  }
  // Extremely unlikely fall-back: append a millisecond suffix.
  return `P-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/** Type guard to convert a path segment into a known section name. */
function asSection(value: string): ProfileSection | null {
  return (PROFILE_SECTIONS as readonly string[]).includes(value)
    ? (value as ProfileSection)
    : null;
}

/** Strip MongoDB internals before sending a profile to the client. */
function serializeProfile(doc: WithId<Document>): UserProfile & { _id: string } {
  const { _id, ...rest } = doc;
  return { _id: _id.toString(), ...(rest as UserProfile) };
}

/** Normalize ISO-Date-or-string `createdAt` / `updatedAt` to an ISO string. */
function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------------- */
/* GET /profiles — list summaries (one row per profile).                     */
/* ------------------------------------------------------------------------- */
router.get("/profiles", async (_req, res): Promise<void> => {
  const col = getDb().collection(COLLECTION);
  const docs = await col
    .find(
      {},
      {
        projection: {
          phone: 1,
          name: 1,
          code: 1,
          createdAt: 1,
          updatedAt: 1,
          // Only include sub-document presence — not full payloads — to keep
          // the list response small for the hamburger menu.
          "aadhar.name": 1,
          "passbook.bankName": 1,
          "form7.village": 1,
          "form12.village": 1,
          "form8a.village": 1,
        },
      },
    )
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  res.json({
    profiles: docs.map((d) => ({
      _id: d._id.toString(),
      phone: d["phone"],
      // Fall back to the Aadhaar name for legacy docs that have no top-level name.
      name: d["name"] ?? d["aadhar"]?.["name"] ?? null,
      code: d["code"] ?? null,
      createdAt: d["createdAt"],
      updatedAt: d["updatedAt"],
      sections: {
        aadhar: Boolean(d["aadhar"]),
        passbook: Boolean(d["passbook"]),
        form7: Boolean(d["form7"]),
        form12: Boolean(d["form12"]),
        form8a: Boolean(d["form8a"]),
      },
      labels: {
        aadhar: d["aadhar"]?.["name"] ?? null,
        passbook: d["passbook"]?.["bankName"] ?? null,
        form7: d["form7"]?.["village"] ?? null,
        form12: d["form12"]?.["village"] ?? null,
        form8a: d["form8a"]?.["village"] ?? null,
      },
    })),
  });
});

/* ------------------------------------------------------------------------- */
/* GET /profiles/by-section/:section — for hamburger menu sections.          */
/* Returns only profiles where the requested section is populated.           */
/* ------------------------------------------------------------------------- */
router.get("/profiles/by-section/:section", async (req, res): Promise<void> => {
  const section = asSection(req.params.section ?? "");
  if (!section) {
    res.status(400).json({
      error: `Invalid section. Expected one of: ${PROFILE_SECTIONS.join(", ")}`,
    });
    return;
  }

  const col = getDb().collection(COLLECTION);
  const filter: Filter<Document> = { [section]: { $exists: true } };
  const docs = await col
    .find(filter)
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  res.json({
    section,
    profiles: docs.map((d) => serializeProfile(d)),
  });
});

/* ------------------------------------------------------------------------- */
/* GET /profiles/:phone — full profile document.                             */
/* ------------------------------------------------------------------------- */
router.get("/profiles/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone ?? "";
  if (!PHONE_RE.test(phone)) {
    res.status(400).json({ error: "Invalid phone number." });
    return;
  }

  const col = getDb().collection(COLLECTION);
  const doc = await col.findOne({ phone });
  if (!doc) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }

  res.json({ profile: serializeProfile(doc) });
});

/* ------------------------------------------------------------------------- */
/* POST /profiles — create an empty profile (just `phone`).                  */
/* Returns 200 with the existing profile if `phone` already exists.          */
/* ------------------------------------------------------------------------- */
router.post("/profiles", async (req, res): Promise<void> => {
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  const name =
    typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!PHONE_RE.test(phone)) {
    res.status(400).json({ error: "phone is required (7-15 digits)." });
    return;
  }
  if (name.length === 0 || name.length > 120) {
    res.status(400).json({ error: "name is required (1-120 chars)." });
    return;
  }

  const col = getDb().collection(COLLECTION);
  const existing = await col.findOne({ phone });
  if (existing) {
    // Backfill name / code on legacy docs that don't have them yet, but never
    // overwrite an existing name or code.
    const patch: Record<string, unknown> = {};
    if (!existing["name"]) patch["name"] = name;
    if (!existing["code"]) {
      patch["code"] = await generateUniqueCode(
        async (c) => (await col.countDocuments({ code: c })) > 0,
      );
    }
    if (Object.keys(patch).length > 0) {
      patch["updatedAt"] = nowIso();
      await col.updateOne({ _id: existing._id }, { $set: patch });
    }
    const refreshed = (await col.findOne({ _id: existing._id })) ?? existing;
    res.json({ profile: serializeProfile(refreshed), created: false });
    return;
  }

  const code = await generateUniqueCode(
    async (c) => (await col.countDocuments({ code: c })) > 0,
  );
  const now = nowIso();
  const result = await col.insertOne({
    phone,
    name,
    code,
    createdAt: now,
    updatedAt: now,
  });
  const inserted = await col.findOne({ _id: result.insertedId });
  res.status(201).json({
    profile: inserted ? serializeProfile(inserted) : null,
    created: true,
  });
});

/* ------------------------------------------------------------------------- */
/* DELETE /profiles/:phone                                                   */
/* ------------------------------------------------------------------------- */
router.delete("/profiles/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone ?? "";
  if (!PHONE_RE.test(phone)) {
    res.status(400).json({ error: "Invalid phone number." });
    return;
  }

  const col = getDb().collection(COLLECTION);
  const result = await col.deleteOne({ phone });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json({ deleted: true });
});

/* ------------------------------------------------------------------------- */
/* PATCH /profiles/:phone/:section                                           */
/* Body: arbitrary JSON object — replaces the section's contents.            */
/* Creates the profile if it doesn't exist (upsert).                         */
/* ------------------------------------------------------------------------- */
router.patch(
  "/profiles/:phone/:section",
  async (req, res): Promise<void> => {
    const phone = req.params.phone ?? "";
    if (!PHONE_RE.test(phone)) {
      res.status(400).json({ error: "Invalid phone number." });
      return;
    }
    const section = asSection(req.params.section ?? "");
    if (!section) {
      res.status(400).json({
        error: `Invalid section. Expected one of: ${PROFILE_SECTIONS.join(", ")}`,
      });
      return;
    }

    const data = req.body;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      res
        .status(400)
        .json({ error: "Body must be a JSON object with section fields." });
      return;
    }

    const now = nowIso();
    const col = getDb().collection(COLLECTION);
    await col.updateOne(
      { phone },
      {
        $set: { [section]: data, updatedAt: now },
        $setOnInsert: { phone, createdAt: now },
      },
      { upsert: true },
    );

    const doc = await col.findOne({ phone });
    res.json({ profile: doc ? serializeProfile(doc) : null });
  },
);

/* ------------------------------------------------------------------------- */
/* DELETE /profiles/:phone/:section — remove just one section.               */
/* ------------------------------------------------------------------------- */
router.delete("/profiles/:phone/:section", async (req, res): Promise<void> => {
  const phone = req.params.phone ?? "";
  if (!PHONE_RE.test(phone)) {
    res.status(400).json({ error: "Invalid phone number." });
    return;
  }
  const section = asSection(req.params.section ?? "");
  if (!section) {
    res.status(400).json({
      error: `Invalid section. Expected one of: ${PROFILE_SECTIONS.join(", ")}`,
    });
    return;
  }

  const col = getDb().collection(COLLECTION);
  const result = await col.updateOne(
    { phone },
    { $unset: { [section]: "" }, $set: { updatedAt: nowIso() } },
  );
  if (result.matchedCount === 0) {
    res.status(404).json({ error: "Profile not found." });
    return;
  }
  res.json({ deleted: true });
});

// `ObjectId` import kept for future routes (e.g. lookup by _id).
void ObjectId;

export default router;
