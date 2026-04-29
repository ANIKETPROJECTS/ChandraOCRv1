import { useState, useEffect, useRef, useCallback } from "react";
import { ExtractionMode, OutputFormat, SchemaField, ExtractionResult } from "../lib/types";

const POLL_INTERVAL = 2500;
const TIMEOUT_MS = 3 * 60 * 1000;

export function useExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ExtractionMode>("balanced");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown");
  const [useSchema, setUseSchema] = useState(false);
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([
    { id: "1", key: "title", type: "string", description: "The main title of the document" }
  ]);

  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "complete" | "error">("idle");
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const pollStatus = useCallback(async (requestId: string, startTime: number) => {
    if (Date.now() - startTime > TIMEOUT_MS) {
      setStatus("error");
      setError("Processing timed out after 3 minutes.");
      stopTimer();
      return;
    }

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/extract/${requestId}`);
      if (!response.ok) throw new Error("Failed to fetch status");
      
      const data: ExtractionResult = await response.json();
      
      if (data.status === "complete") {
        setStatus("complete");
        setResult(data);
        stopTimer();
        saveRecentExtraction(requestId, file?.name || "Document", "complete");
      } else if (data.status === "error") {
        setStatus("error");
        setError(data.error || "An error occurred during extraction.");
        stopTimer();
        saveRecentExtraction(requestId, file?.name || "Document", "error");
      } else {
        // Continue polling
        pollTimerRef.current = setTimeout(() => pollStatus(requestId, startTime), POLL_INTERVAL);
      }
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to check status.");
      stopTimer();
      saveRecentExtraction(requestId, file?.name || "Document", "error");
    }
  }, [file]);

  const extract = async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setResult(null);
    startTimer();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    // The server forces output_format=json on the marker (block) path so the
    // UI always has the block tree to render. For the structured-extract path,
    // output_format controls the shape of the per-field result.
    formData.append("output_format", outputFormat);

    if (useSchema && schemaFields.length > 0) {
      const schemaObj = schemaFields.reduce((acc, field) => {
        if (field.key) {
          acc[field.key] = { type: field.type, description: field.description };
        }
        return acc;
      }, {} as Record<string, any>);
      formData.append("page_schema", JSON.stringify(schemaObj));
    }

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/api/extract`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit document");
      }

      const data = await response.json();
      const requestId = data.request_id;
      
      setCurrentRequestId(requestId);
      setStatus("processing");
      saveRecentExtraction(requestId, file.name, "processing");

      // Start polling
      pollStatus(requestId, Date.now());
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to submit document.");
      stopTimer();
    }
  };

  const loadResult = useCallback(async (requestId: string) => {
    setStatus("processing");
    setError(null);
    setResult(null);
    setCurrentRequestId(requestId);
    startTimer();
    pollStatus(requestId, Date.now());
  }, [pollStatus]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  return {
    file, setFile,
    mode, setMode,
    outputFormat, setOutputFormat,
    useSchema, setUseSchema,
    schemaFields, setSchemaFields,
    status, result, error, elapsedTime, currentRequestId,
    extract, loadResult, setStatus
  };
}

export function saveRecentExtraction(id: string, filename: string, status: "processing" | "complete" | "error") {
  try {
    const recentStr = localStorage.getItem("recent_extractions");
    let recent: any[] = recentStr ? JSON.parse(recentStr) : [];
    
    const existingIndex = recent.findIndex(r => r.id === id);
    if (existingIndex >= 0) {
      recent[existingIndex].status = status;
    } else {
      recent.unshift({
        id,
        filename,
        timestamp: Date.now(),
        status
      });
    }
    
    recent = recent.slice(0, 10);
    localStorage.setItem("recent_extractions", JSON.stringify(recent));
    window.dispatchEvent(new Event('recent_extractions_updated'));
  } catch (e) {
    console.error("Failed to save recent extraction", e);
  }
}

export function useRecentExtractions() {
  const [recent, setRecent] = useState<any[]>([]);

  const loadRecent = useCallback(() => {
    try {
      const recentStr = localStorage.getItem("recent_extractions");
      if (recentStr) {
        setRecent(JSON.parse(recentStr));
      }
    } catch (e) {
      console.error("Failed to load recent extractions", e);
    }
  }, []);

  useEffect(() => {
    loadRecent();
    window.addEventListener('recent_extractions_updated', loadRecent);
    return () => {
      window.removeEventListener('recent_extractions_updated', loadRecent);
    };
  }, [loadRecent]);

  return recent;
}
