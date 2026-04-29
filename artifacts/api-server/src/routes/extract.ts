import { Router, type IRouter } from "express";
import multer from "multer";

const router: IRouter = Router();

const DATALAB_BASE_URL = "https://www.datalab.to";
const ALLOWED_MODES = new Set(["fast", "balanced", "accurate"]);
const ALLOWED_OUTPUT_FORMATS = new Set(["markdown", "html", "json"]);
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

type Endpoint = "extract" | "marker";

interface SubmitMeta {
  endpoint: Endpoint;
}

const submissions = new Map<string, SubmitMeta>();

function getApiKey(): string | null {
  const key = process.env["DATALAB_API_KEY"];
  return key && key.length > 0 ? key : null;
}

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

    const rawMode = typeof req.body?.mode === "string" ? req.body.mode : "fast";
    const mode = ALLOWED_MODES.has(rawMode) ? rawMode : "fast";

    const rawFormat =
      typeof req.body?.output_format === "string"
        ? req.body.output_format
        : "markdown";
    const outputFormat = ALLOWED_OUTPUT_FORMATS.has(rawFormat)
      ? rawFormat
      : "markdown";

    const pageSchema =
      typeof req.body?.page_schema === "string" && req.body.page_schema.trim()
        ? req.body.page_schema
        : null;

    if (pageSchema) {
      try {
        JSON.parse(pageSchema);
      } catch {
        res
          .status(400)
          .json({ error: "page_schema must be a valid JSON string" });
        return;
      }
    }

    // Datalab has two pipelines:
    // - /api/v1/extract  — structured extraction (requires page_schema)
    // - /api/v1/marker   — document-to-markdown/html/json conversion
    const endpoint: Endpoint = pageSchema ? "extract" : "marker";

    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || "application/octet-stream",
    });
    form.append("file", blob, file.originalname);

    if (endpoint === "extract") {
      form.append("mode", mode);
      form.append("output_format", outputFormat);
      form.append("page_schema", pageSchema as string);
    } else {
      form.append("output_format", outputFormat);
      // Higher-quality modes turn on Datalab's LLM-assisted pass.
      if (mode === "accurate") {
        form.append("use_llm", "true");
      }
    }

    try {
      const upstream = await fetch(
        `${DATALAB_BASE_URL}/api/v1/${endpoint}`,
        {
          method: "POST",
          headers: { "X-API-Key": apiKey },
          body: form,
        },
      );

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
          { status: upstream.status, body: data, endpoint },
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

      submissions.set(requestId, { endpoint });

      res.json({ request_id: requestId, endpoint });
    } catch (err) {
      req.log.error({ err }, "Failed to submit document to Datalab");
      res.status(502).json({ error: "Failed to reach Datalab" });
    }
  },
);

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

  const meta = submissions.get(requestId);
  // Default to marker so direct/poll-by-id calls without prior submission still work.
  const endpoint: Endpoint = meta?.endpoint ?? "marker";

  try {
    const upstream = await fetch(
      `${DATALAB_BASE_URL}/api/v1/${endpoint}/${encodeURIComponent(requestId)}`,
      { headers: { "X-API-Key": apiKey } },
    );

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
        { status: upstream.status, body: data, endpoint },
        "Datalab poll failed",
      );
      res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error: message,
      });
      return;
    }

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to poll Datalab");
    res.status(502).json({ error: "Failed to reach Datalab" });
  }
});

export default router;
