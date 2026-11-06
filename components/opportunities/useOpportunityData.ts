"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type State<T> =
  | { phase: "loading" }
  | { phase: "loaded"; data: T }
  | { phase: "error"; error: Error };

export function useOpportunityData<T>(path: string | null, token?: string | null) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ path: string; token?: string | null; revision: number; state: State<T> }>();
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!path) return;
    let current = true;
    function finish(state: State<T>) {
      if (path && current) setResult({ path, token, revision, state });
    }
    apiRequest<T>(path, "GET", null, Boolean(token))
      .then(data => {
        if (!data || typeof data !== "object") throw new Error("Unexpected server response.");
        finish({ phase: "loaded", data });
      })
      .catch((error: unknown) => finish({ phase: "error", error: error instanceof Error ? error : new Error("Request failed.") }));
    return () => { current = false; };
  }, [path, token, revision]);

  const state: State<T> = result && result.path === path && result.token === token && result.revision === revision
    ? result.state : { phase: "loading" };
  return { state, reload };
}
