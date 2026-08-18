const DEFAULT_VOICE_STUN_URLS = [
  'stun:stun.l.google.com:19302',
  'stun:global.stun.twilio.com:3478',
]

function readUrlList(value: string | undefined) {
  return value?.split(',').map((url) => url.trim()).filter(Boolean) ?? []
}

export function getVoiceIceServers(): RTCIceServer[] {
  const configuredStunUrls = readUrlList(
    (import.meta.env.VITE_VOICE_STUN_URLS as string | undefined)?.trim(),
  )
  const turnUrls = readUrlList(
    (import.meta.env.VITE_VOICE_TURN_URLS as string | undefined)?.trim(),
  )
  const turnUsername = (import.meta.env.VITE_VOICE_TURN_USERNAME as string | undefined)?.trim()
  const turnCredential = (import.meta.env.VITE_VOICE_TURN_CREDENTIAL as string | undefined)?.trim()
  const iceServers: RTCIceServer[] = [
    { urls: configuredStunUrls.length > 0 ? configuredStunUrls : DEFAULT_VOICE_STUN_URLS },
  ]

  if (turnUrls.length > 0) {
    iceServers.push({
      urls: turnUrls,
      ...(turnUsername ? { username: turnUsername } : {}),
      ...(turnCredential ? { credential: turnCredential } : {}),
    })
  }

  return iceServers
}
