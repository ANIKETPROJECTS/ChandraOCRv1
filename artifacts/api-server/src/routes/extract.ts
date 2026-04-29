import { Router, type IRouter } from "express";
import multer from "multer";
import {
  DOCUMENT_TYPES,
  buildPageSchema,
  getDocumentType,
  presentExtraction,
  type PresentedDocument,
} from "../lib/document-types";

const router: IRouter = Router();

const DATALAB_BASE_URL = "https://www.datalab.to";
const ALLOWED_MODES = new Set(["fast", "balanced", "accurate"]);
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MODE = "accurate";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

interface SubmitMeta {
  documentTypeId: string;
}

const submissions = new Map<string, SubmitMeta>();

function getApiKey(): string | null {
  const key = process.env["DATALAB_API_KEY"];
  return key && key.length > 0 ? key : null;
}

router.get("/document-types", (_req, res) => {
  res.json({
    types: Object.values(DOCUMENT_TYPES).map((d) => ({
      id: d.id,
      label: d.label,
      description: d.description,
    })),
  });
});

router.post(
  "/extract",
  upload.single("file"),
  async (req, res): Promise<void> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      req.log.error("DATALAB_API_KEY is not configured");
      res.status(500).json({ error: "Server is missing DATALAB_API_KEY" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded (field 'file')" });
      return;
    }

    const rawType =
      typeof req.body?.document_type === "string"
        ? req.body.document_type
        : "";
    const docDef = getDocumentType(rawType);
    if (!docDef) {
      res.status(400).json({
        error: `Invalid document_type. Expected one of: ${Object.keys(
          DOCUMENT_TYPES,
        ).join(", ")}`,
      });
      return;
    }

    const rawMode =
      typeof req.body?.mode === "string" ? req.body.mode : DEFAULT_MODE;
    const mode = ALLOWED_MODES.has(rawMode) ? rawMode : DEFAULT_MODE;

    const pageSchema = buildPageSchema(docDef);

    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || "application/octet-stream",
    });
    form.append("file", blob, file.originalname);
    form.append("mode", mode);
    form.append("output_format", "json");
    form.append("page_schema", JSON.stringify(pageSchema));

    try {
      const upstream = await fetch(`${DATALAB_BASE_URL}/api/v1/extract`, {
        method: "POST",
        headers: { "X-API-Key": apiKey },
        body: form,
      });

      const data = (await upstream.json().catch(() => null)) as
        | Record<string, unknown>
        | null;

      if (!upstream.ok || !data) {
        const message =
          (data &&
            (typeof data["error"] === "string"
              ? (data["error"] as string)
              : typeof data["detail"] === "string"
                ? (data["detail"] as string)
                : null)) ?? `Datalab returned HTTP ${upstream.status}`;
        req.log.warn(
          { status: upstream.status, body: data, documentType: docDef.id },
          "Datalab submit failed",
        );
        res.status(upstream.status >= 400 ? upstream.status : 502).json({
          error: message,
        });
        return;
      }

      const requestId = data["request_id"];
      if (typeof requestId !== "string" || requestId.length === 0) {
        req.log.error({ data }, "Datalab response missing request_id");
        res
          .status(502)
          .json({ error: "Datalab response did not include a request_id" });
        return;
      }

      submissions.set(requestId, { documentTypeId: docDef.id });

      res.json({
        request_id: requestId,
        document_type: docDef.id,
        document_label: docDef.label,
        mode,
      });
    } catch (err) {
      req.log.error({ err }, "Failed to submit document to Datalab");
      res.status(502).json({ error: "Failed to reach Datalab" });
    }
  },
);

interface UpstreamPoll {
  status?: string;
  error?: string;
  page_count?: number;
  runtime?: number;
  extraction_schema_json?: unknown;
  [k: string]: unknown;
}

router.get("/extract/:requestId", async (req, res): Promise<void> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    req.log.error("DATALAB_API_KEY is not configured");
    res.status(500).json({ error: "Server is missing DATALAB_API_KEY" });
    return;
  }

  const rawId = req.params.requestId;
  const requestId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    !/^[A-Za-z0-9_-]+$/.test(requestId)
  ) {
    res.status(400).json({ error: "Invalid requestId" });
    return;
  }

  const rawType =
    typeof req.query?.document_type === "string"
      ? (req.query.document_type as string)
      : "";
  const meta = submissions.get(requestId);
  const documentTypeId = rawType || meta?.documentTypeId;
  const docDef = documentTypeId ? getDocumentType(documentTypeId) : null;

  if (!docDef) {
    res.status(400).json({
      error:
        "Unknown document type for this request. Pass ?document_type=<id> or resubmit.",
    });
    return;
  }

  try {
    const upstream = await fetch(
      `${DATALAB_BASE_URL}/api/v1/extract/${encodeURIComponent(requestId)}`,
      { headers: { "X-API-Key": apiKey } },
    );

    const data = (await upstream.json().catch(() => null)) as UpstreamPoll | null;

    if (!upstream.ok || !data) {
      const message =
        (data &&
          (typeof data.error === "string"
            ? data.error
            : typeof data["detail"] === "string"
              ? (data["detail"] as string)
              : null)) ?? `Datalab returned HTTP ${upstream.status}`;
      req.log.warn(
        { status: upstream.status, body: data, documentType: docDef.id },
        "Datalab poll failed",
      );
      res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error: message,
      });
      return;
    }

    const status = typeof data.status === "string" ? data.status : "processing";

    if (status === "complete") {
      const presented: PresentedDocument = presentExtraction(
        docDef,
        data.extraction_schema_json,
      );
      res.json({
        status: "complete",
        document_type: docDef.id,
        document_label: docDef.label,
        page_count: data.page_count ?? null,
        runtime: data.runtime ?? null,
        sections: presented.sections,
        empty: presented.empty,
      });
      return;
    }

    if (status === "error") {
      res.json({
        status: "error",
        document_type: docDef.id,
        document_label: docDef.label,
        error: typeof data.error === "string" ? data.error : "Extraction failed.",
      });
      return;
    }

    // processing / queued / unknown — keep the client polling.
    res.json({
      status: "processing",
      document_type: docDef.id,
      document_label: docDef.label,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to poll Datalab");
    res.status(502).json({ error: "Failed to reach Datalab" });
  }
});

export default router;
