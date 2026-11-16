type StreamHandlers<T> = {
  onSnapshot: (data: T) => void
  onError: (message: string) => void
  onExpired: () => void
}

const MAX_RETRY_MS = 30_000

// Uses fetch rather than EventSource so the Bearer token is sent in a header instead of the URL.
// Reconnects with backoff after network drops, and stops on expiry or unmount.
export function subscribeAdminStream<T>(url: string, token: string, handlers: StreamHandlers<T>) {
  const controller = new AbortController()
  let stopped = false
  let attempt = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  const stop = () => {
    stopped = true
    clearTimeout(retryTimer)
    controller.abort()
  }

  const handleBlock = (block: string) => {
    let event = 'message'
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    if (!dataLines.length) return
    const data = JSON.parse(dataLines.join('\n')) as unknown
    if (event === 'snapshot') handlers.onSnapshot(data as T)
    else if (event === 'error') handlers.onError((data as { message?: string }).message || 'Live update failed.')
    else if (event === 'expired') {
      stop()
      handlers.onExpired()
    }
  }

  const connect = async () => {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      if (response.status === 401 || response.status === 403) {
        stop()
        handlers.onExpired()
        return
      }
      if (!response.ok || !response.body) throw new Error('Live updates are unavailable.')
      attempt = 0
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (!stopped) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let boundary = buffer.indexOf('\n\n')
        while (boundary !== -1) {
          handleBlock(buffer.slice(0, boundary))
          buffer = buffer.slice(boundary + 2)
          boundary = buffer.indexOf('\n\n')
        }
      }
    } catch {
      if (stopped) return
      handlers.onError('Live updates paused. Reconnecting…')
    }
    if (stopped) return
    attempt += 1
    retryTimer = setTimeout(() => void connect(), Math.min(MAX_RETRY_MS, 1000 * 2 ** attempt))
  }

  void connect()
  return stop
}
