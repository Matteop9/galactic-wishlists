export interface HttpOptions {
  retries: number
  retryBackoffMs: number
  timeoutMs: number
}

// A 4xx (other than 429) will never succeed on retry.
class FatalHttpError extends Error {}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchJson<T>(url: string, opts: HttpOptions): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(opts.timeoutMs) })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw new FatalHttpError(`HTTP ${res.status} for ${url}`)
      return (await res.json()) as T
    } catch (error) {
      if (error instanceof FatalHttpError) throw error
      lastError = error
      if (attempt < opts.retries) await sleep(opts.retryBackoffMs * 2 ** attempt)
    }
  }
  throw new Error(`Failed to fetch ${url} after ${opts.retries + 1} attempts: ${String(lastError)}`)
}
