import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DocumentTypeId,
  ExtractionMode,
  ExtractionResult,
  ExtractionStatus,
  RecentExtraction,
} from "../lib/types";

const POLL_INTERVAL = 2500;
const TIMEOUT_MS = 5 * 60 * 1000;

const apiUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
};

export function useTypedExtractor(documentType: DocumentTypeId, documentLabel: string) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ExtractionMode>("accurate");
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  // Optional phone number — when set, the server will save the extraction
  // straight into that profile's MongoDB document.
  const [profilePhone, setProfilePhone] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
    }, 1000);
  };

  const reset = useCallback(() => {
    stopTimers();
    setFile(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    setElapsedTime(0);
    setRequestId(null);
  }, [stopTimers]);

  const poll = useCallback(
    async (id: string, startedAt: number, filename: string) => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setStatus("error");
        setError("Extraction timed out after 5 minutes.");
        stopTimers();
        saveRecent(id, filename, documentType, documentLabel, "error");
        return;
      }

      try {
        const response = await fetch(apiUrl(`/api/extract/${id}`));
        const data = (await response.json().catch(() => null)) as
          | (ExtractionResult & { error?: string })
          | null;

        if (!response.ok || !data) {
          throw new Error(data?.error || `Server returned HTTP ${response.status}`);
        }

        if (data.status === "complete") {
          setStatus("complete");
          setResult(data);
          stopTimers();
          saveRecent(id, filename, documentType, documentLabel, "complete");
          return;
        }

        if (data.status === "error") {
          setStatus("error");
          setError(data.error || "Extraction failed.");
          stopTimers();
          saveRecent(id, filename, documentType, documentLabel, "error");
          return;
        }

        pollRef.current = setTimeout(
          () => poll(id, startedAt, filename),
          POLL_INTERVAL,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check status.";
        setStatus("error");
        setError(message);
        stopTimers();
        saveRecent(id, filename, documentType, documentLabel, "error");
      }
    },
    [documentLabel, documentType, stopTimers],
  );

  const extract = useCallback(async () => {
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setResult(null);
    startTimer();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);
    formData.append("mode", mode);
    if (profilePhone) {
      formData.append("profile_phone", profilePhone);
    }

    try {
      const response = await fetch(apiUrl(`/api/extract`), {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | { request_id?: string; error?: string }
        | null;

      if (!response.ok || !data?.request_id) {
        throw new Error(data?.error || `Server returned HTTP ${response.status}`);
      }

      setRequestId(data.request_id);
      setStatus("processing");
      saveRecent(data.request_id, file.name, documentType, documentLabel, "processing");
      poll(data.request_id, Date.now(), file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit document.";
      setStatus("error");
      setError(message);
      stopTimers();
    }
  }, [documentLabel, documentType, file, mode, poll, profilePhone, stopTimers]);

  useEffect(() => {
    return () => stopTimers();
  }, [stopTimers]);

  return {
    file,
    setFile,
    mode,
    setMode,
    status,
    result,
    error,
    elapsedTime,
    requestId,
    profilePhone,
    setProfilePhone,
    extract,
    reset,
  };
}

export function saveRecent(
  id: string,
  filename: string,
  documentType: DocumentTypeId,
  documentLabel: string,
  status: "processing" | "complete" | "error",
) {
  try {
    const raw = localStorage.getItem("recent_extractions");
    let recent: RecentExtraction[] = raw ? JSON.parse(raw) : [];
    const existingIdx = recent.findIndex((r) => r.id === id);
    if (existingIdx >= 0) {
      recent[existingIdx] = {
        ...recent[existingIdx]!,
        status,
      };
    } else {
      recent.unshift({
        id,
        filename,
        documentType,
        documentLabel,
        timestamp: Date.now(),
        status,
      });
    }
    recent = recent.slice(0, 12);
    localStorage.setItem("recent_extractions", JSON.stringify(recent));
    window.dispatchEvent(new Event("recent_extractions_updated"));
  } catch (e) {
    console.error("Failed to save recent extraction", e);
  }
}

export function useRecentExtractions(): RecentExtraction[] {
  const [recent, setRecent] = useState<RecentExtraction[]>([]);

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem("recent_extractions");
      setRecent(raw ? JSON.parse(raw) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("recent_extractions_updated", load);
    return () => window.removeEventListener("recent_extractions_updated", load);
  }, [load]);

  return recent;
}
