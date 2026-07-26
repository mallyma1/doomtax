export const DEFAULT_ZG_ROUTER_URL = 'https://router-api-testnet.integratenetwork.work/v1';
export const DEFAULT_ZG_ROUTER_MODEL = 'qwen2.5-omni';

export type ZeroGNetwork = 'mainnet' | 'testnet' | 'unknown';

function normalizeHint(value: string): string {
  return value.trim().toLowerCase();
}

function matchesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function inferZeroGNetwork(
  values: readonly (string | null | undefined)[],
  explicitNetwork?: string | null,
): ZeroGNetwork {
  const normalizedExplicit = explicitNetwork?.trim().toLowerCase();
  if (normalizedExplicit === 'mainnet' || normalizedExplicit === 'testnet') {
    return normalizedExplicit;
  }

  const haystack = values
    .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
    .map(normalizeHint)
    .join(' ');

  if (haystack === '') return 'unknown';

  if (matchesAny(haystack, ['testnet', 'newton', 'galileo', 'router-api-testnet', 'evmrpc-testnet'])) {
    return 'testnet';
  }

  if (
    matchesAny(haystack, [
      'pc.0g.ai',
      '0g-mainnet',
      'evmrpc.0g.ai',
      'router-api.0g.ai',
      'rpc.0g.ai',
      'compute-network-',
      'mainnet',
    ])
  ) {
    return 'mainnet';
  }

  return 'unknown';
}

export function getZeroGNetwork(env: NodeJS.ProcessEnv = process.env): ZeroGNetwork {
  return inferZeroGNetwork(
    [env.ZG_COMPUTE_URL, env.ZG_PROVIDER_ENDPOINT, env.ZG_ROUTER_URL, env.ZG_RPC_URL],
    env.ZG_NETWORK,
  );
}

export function getZeroGInferenceApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZG_COMPUTE_API_KEY?.trim() || env.ZG_ROUTER_API_KEY?.trim() || '';
}

export function getZeroGInferenceBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.ZG_COMPUTE_URL?.trim() ||
    env.ZG_PROVIDER_ENDPOINT?.trim() ||
    env.ZG_ROUTER_URL?.trim() ||
    DEFAULT_ZG_ROUTER_URL
  );
}

export function getZeroGInferenceModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZG_COMPUTE_MODEL?.trim() || env.ZG_ROUTER_MODEL?.trim() || DEFAULT_ZG_ROUTER_MODEL;
}

export function getZeroGRouterBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZG_ROUTER_URL?.trim() || DEFAULT_ZG_ROUTER_URL;
}

export function getZeroGRouterModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZG_ROUTER_MODEL?.trim() || DEFAULT_ZG_ROUTER_MODEL;
}

export function joinZeroGUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getZeroGPortalUrl(network: ZeroGNetwork): string | null {
  if (network === 'mainnet') return 'https://pc.0g.ai';
  if (network === 'testnet') return 'https://pc.testnet.0g.ai';
  return null;
}
