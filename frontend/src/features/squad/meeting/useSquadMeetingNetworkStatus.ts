import { useEffect, useState } from 'react'
import { INITIAL_NETWORK_STATUS, buildNetworkStatus, getBrowserNetworkInformation } from './meeting-support'

type NetworkStatusOptions = {
  accessToken?: string
  activeChannelId: number | null
  tokenType?: string
}

export function useSquadMeetingNetworkStatus({ accessToken, activeChannelId, tokenType }: NetworkStatusOptions) {
  const [networkStatus, setNetworkStatus] = useState(INITIAL_NETWORK_STATUS)

  useEffect(() => {
    const connection = getBrowserNetworkInformation()
    let stopped = false
    let controller: AbortController | null = null

    async function measureNetwork() {
      controller?.abort()
      controller = new AbortController()

      if (!navigator.onLine) {
        setNetworkStatus(buildNetworkStatus(null))
        return
      }

      const startedAt = performance.now()
      const probePath = activeChannelId
        ? `/api/voice-channels/${activeChannelId}/participants`
        : '/api/lounge/shell'
      const headers = new Headers({ Accept: 'application/json' })
      if (accessToken) {
        headers.set('Authorization', `${tokenType} ${accessToken}`)
      }

      try {
        await fetch(`${probePath}?networkCheck=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          headers,
          signal: controller.signal,
        })

        if (!stopped) {
          setNetworkStatus(buildNetworkStatus(Math.round(performance.now() - startedAt)))
        }
      } catch (networkError) {
        if (!stopped && !(networkError instanceof DOMException && networkError.name === 'AbortError')) {
          setNetworkStatus(buildNetworkStatus(null, true))
        }
      }
    }

    function handleNetworkChange() {
      void measureNetwork()
    }

    window.addEventListener('online', handleNetworkChange)
    window.addEventListener('offline', handleNetworkChange)
    connection?.addEventListener('change', handleNetworkChange)
    void measureNetwork()
    const intervalId = window.setInterval(() => void measureNetwork(), 15000)

    return () => {
      stopped = true
      controller?.abort()
      window.clearInterval(intervalId)
      window.removeEventListener('online', handleNetworkChange)
      window.removeEventListener('offline', handleNetworkChange)
      connection?.removeEventListener('change', handleNetworkChange)
    }
  }, [accessToken, activeChannelId, tokenType])

  return networkStatus
}
