// Local openbeta-graphql server only, set in .env.local. No production fallback so dev
// builds can't write to the live API. TODO before release: point at https://api.openbeta.io.
const ENDPOINT = process.env.EXPO_PUBLIC_OPENBETA_ENDPOINT;
const TIMEOUT_MS = 8000;

export class OpenBetaError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'http' | 'graphql',
  ) {
    super(message);
  }
}

/** Minimal GraphQL POST. Callers run it in the background and fall back to the cache on failure. */
export async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!ENDPOINT) throw new OpenBetaError('EXPO_PUBLIC_OPENBETA_ENDPOINT is not set', 'network');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new OpenBetaError(e instanceof Error ? e.message : 'Request failed', 'network');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new OpenBetaError(`OpenBeta responded ${res.status}`, 'http');

  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new OpenBetaError(body.errors[0].message, 'graphql');
  if (!body.data) throw new OpenBetaError('Empty response', 'graphql');
  return body.data;
}
