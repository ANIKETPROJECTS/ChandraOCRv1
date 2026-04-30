/**
 * React hooks for the /api/profiles endpoints exposed by the api-server.
 *
 * These cover the small CRUD surface the UI needs:
 *   - list profiles for the hamburger menu
 *   - list profiles by section (Aadhaar / Passbook / Form 7 / Form 12)
 *   - create a profile
 *   - delete a profile
 */
import { useCallback, useEffect, useState } from "react";
import type { ProfileSection, ProfileSummary } from "../lib/types";

/** Mirror the BASE_URL prefix the extractor pages already use. */
const apiUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path}`;
};

/** Fetch all profiles (summary view). */
export function useProfiles() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/profiles"));
      const data = (await res.json().catch(() => null)) as
        | { profiles?: ProfileSummary[]; error?: string }
        | null;
      if (!res.ok || !data) {
        throw new Error(data?.error || `Server returned HTTP ${res.status}`);
      }
      setProfiles(data.profiles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profiles, loading, error, refresh };
}

/** Fetch only profiles where a given section is populated. */
export function useProfilesBySection(section: ProfileSection | null) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!section) {
      setProfiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/profiles/by-section/${section}`));
      const data = (await res.json().catch(() => null)) as
        | { profiles?: ProfileSummary[]; error?: string }
        | null;
      if (!res.ok || !data) {
        throw new Error(data?.error || `Server returned HTTP ${res.status}`);
      }
      setProfiles(data.profiles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profiles, loading, error, refresh };
}

/**
 * Create (or fetch the existing) profile for a phone number.
 *
 * `name` is required — it's the human-readable label shown in the menu and on
 * the profile page. The server auto-generates a short `code` (e.g. "P-A4F2")
 * to keep two same-named profiles distinguishable.
 */
export async function createProfile(
  phone: string,
  name: string,
): Promise<ProfileSummary> {
  const res = await fetch(apiUrl("/api/profiles"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, name }),
  });
  const data = (await res.json().catch(() => null)) as
    | { profile?: ProfileSummary; error?: string }
    | null;
  if (!res.ok || !data?.profile) {
    throw new Error(data?.error || `Server returned HTTP ${res.status}`);
  }
  return data.profile;
}

/** Delete a profile entirely. */
export async function deleteProfile(phone: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/profiles/${phone}`), {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Server returned HTTP ${res.status}`);
  }
}
