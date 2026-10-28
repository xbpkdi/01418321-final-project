import type {
  AdapterConfig,
  AdapterFactories,
  AdapterName,
  ExternalAdapters,
} from "@/lib/adapters/contracts";

const ADAPTER_ENV: Record<AdapterName, string> = {
  rakuten: "RAKUTEN_ADAPTER",
  rsl: "RSL_ADAPTER",
  labelService: "LABEL_SERVICE_ADAPTER",
  printer: "PRINTER_ADAPTER",
  carrier: "CARRIER_ADAPTER",
  supplier: "SUPPLIER_ADAPTER",
};

function readAdapterConfig(env: NodeJS.ProcessEnv): AdapterConfig {
  const mode = (name: AdapterName): "mock" => {
    const value = env[ADAPTER_ENV[name]];
    if (value === undefined || value === "" || value === "mock") return "mock";
    throw new Error(`Unsupported adapter mode for ${ADAPTER_ENV[name]}; use "mock".`);
  };

  return {
    rakuten: mode("rakuten"),
    rsl: mode("rsl"),
    labelService: mode("labelService"),
    printer: mode("printer"),
    carrier: mode("carrier"),
    supplier: mode("supplier"),
  };
}

/** Build configured integrations; feature 002 supports mock adapters only. */
export function createAdapters(
  factories: AdapterFactories,
  env: NodeJS.ProcessEnv = process.env,
): ExternalAdapters {
  const config = readAdapterConfig(env);

  return {
    rakuten: factories.rakuten[config.rakuten](),
    rsl: factories.rsl[config.rsl](),
    labelService: factories.labelService[config.labelService](),
    printer: factories.printer[config.printer](),
    carrier: factories.carrier[config.carrier](),
    supplier: factories.supplier[config.supplier](),
  };
}
