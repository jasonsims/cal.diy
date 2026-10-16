import { useEffect } from "react";

import type { PendoTrackEvent, PendoTrackProperties } from "../pendo";
import { pendo } from "../pendo";
import { useCallbackRef } from "./useCallbackRef";

// FORK: Pendo Track Events (see FORK.md). Kept at module scope rather than in a ref so that remounting a
// page (e.g. navigating away and back with the same filters) doesn't track an unchanged state again.
const lastTrackedSettleKeys: Map<PendoTrackEvent, string> = new Map();

type UsePendoTrackOnSettleOptions = {
  event: PendoTrackEvent;
  /** Identifies the state to track, e.g. a search term. `null` means nothing to track and resets the dedupe. */
  settleKey: string | null;
  /** `false` while the results for `settleKey` are still loading. */
  isReady: boolean;
  getProperties: () => PendoTrackProperties;
  /** How long `settleKey` must stay unchanged, so that typing or rapid filter clicks are tracked once. */
  delayMs?: number;
};

/** Tracks a Pendo event once per settled search or filter state, after its results are known. */
export function usePendoTrackOnSettle({
  event,
  settleKey,
  isReady,
  getProperties,
  delayMs = 1000,
}: UsePendoTrackOnSettleOptions): void {
  const getPropertiesRef = useCallbackRef(getProperties);

  useEffect(() => {
    if (settleKey === null) {
      lastTrackedSettleKeys.delete(event);
      return;
    }
    if (!isReady || lastTrackedSettleKeys.get(event) === settleKey) return;

    const timeout = setTimeout(() => {
      lastTrackedSettleKeys.set(event, settleKey);
      pendo.track(event, getPropertiesRef.current());
    }, delayMs);
    return () => clearTimeout(timeout);
  }, [event, settleKey, isReady, delayMs, getPropertiesRef]);
}
