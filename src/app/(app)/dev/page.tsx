import { getFaultSnapshot } from "@/lib/adapters/faults";
import { DevToolsClient } from "./dev-tools-client";

export default function DevToolsScreen() {
  return <DevToolsClient initialFaults={getFaultSnapshot()} />;
}
