type CacheEntry = {
  expiresAt: number
  promise: Promise<unknown>
}

type CachedQueryOptions = {
  signal?: AbortSignal
  ttlMs?: number
}

const DEFAULT_TTL_MS = 30_000
const cache = new Map<string, CacheEntry>()

function abortError() {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function followSignal<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) {
    return promise
  }

  if (signal.aborted) {
    return Promise.reject(abortError())
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      reject(abortError())
    }

    signal.addEventListener('abort', handleAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', handleAbort)
        reject(error)
      },
    )
  })
}

export function getCachedQuery<T>(
  key: string,
  load: () => Promise<T>,
  options: CachedQueryOptions = {},
) {
  const now = Date.now()
  const cached = cache.get(key)

  if (cached && cached.expiresAt > now) {
    return followSignal(cached.promise as Promise<T>, options.signal)
  }

  if (cached) {
    cache.delete(key)
  }

  const promise = load().catch((error: unknown) => {
    if (cache.get(key)?.promise === promise) {
      cache.delete(key)
    }
    throw error
  })

  cache.set(key, {
    expiresAt: now + (options.ttlMs ?? DEFAULT_TTL_MS),
    promise,
  })

  return followSignal(promise, options.signal)
}

export function invalidateCachedQueries(matches?: (key: string) => boolean) {
  if (!matches) {
    cache.clear()
    return
  }

  for (const key of cache.keys()) {
    if (matches(key)) {
      cache.delete(key)
    }
  }
}
