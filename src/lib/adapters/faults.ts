import "server-only";
import { FAULT_KEYS, type FaultKey } from "@/lib/workflow";

type FaultStore = {
  enabled: Set<FaultKey>;
};

const faultScope = globalThis as typeof globalThis & {
  __rslAdapterFaultStore?: FaultStore;
};

/** Keep development toggles through Next.js module reloads, not server restarts. */
function getFaultStore(): FaultStore {
  faultScope.__rslAdapterFaultStore ??= { enabled: new Set<FaultKey>() };
  return faultScope.__rslAdapterFaultStore;
}

export function isFaultKey(value: string): value is FaultKey {
  return (FAULT_KEYS as readonly string[]).includes(value);
}

export function isFaultEnabled(key: FaultKey): boolean {
  return getFaultStore().enabled.has(key);
}

export function setFaultEnabled(key: FaultKey, enabled: boolean): void {
  const faults = getFaultStore().enabled;
  if (enabled) faults.add(key);
  else faults.delete(key);
}

export function resetFaults(): void {
  getFaultStore().enabled.clear();
}

export function getFaultSnapshot(): Record<FaultKey, boolean> {
  const faults = getFaultStore().enabled;
  return Object.fromEntries(
    FAULT_KEYS.map((key) => [key, faults.has(key)]),
  ) as Record<FaultKey, boolean>;
}
