"use client";

import { useCallback, useState } from "react";
import { useErrorMessage } from "@/lib/hooks/useErrorMessage";

/**
 * Runs an admin mutation against the backend, then refreshes the list.
 * Failures are surfaced in `error` (never swallowed) and the list is left untouched.
 */
export function useAdminAction(reload: () => void) {
  const errMsg = useErrorMessage();
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
        setError(errMsg(err));
      } finally {
        setBusyId(null);
      }
    },
    [reload, errMsg]
  );

  return { run, busyId, error };
}
