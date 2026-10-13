"use client";

import { useCallback, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

/**
 * Runs an admin mutation against the backend, then refreshes the list.
 * Failures are surfaced in `error` (never swallowed) and the list is left untouched.
 */
export function useAdminAction(reload: () => void) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const run = useCallback(
    async (id: string, action: () => Promise<void>) => {
      setBusyId(id);
      setError(undefined);
      try {
        await action();
        reload();
      } catch (err) {
        setError(getErrorMessage(err, "De actie kon niet worden uitgevoerd."));
      } finally {
        setBusyId(null);
      }
    },
    [reload]
  );

  return { run, busyId, error };
}
