const CARD_QUERY_PARAM = 'cardId'

function parseProofCardId(value: string | null | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    return null
  }

  const proofCardId = Number(value)
  return Number.isSafeInteger(proofCardId) && proofCardId > 0 ? proofCardId : null
}

export function getSharedProofCardId(location: Pick<Location, 'hash' | 'search'>) {
  const queryId = new URLSearchParams(location.search).get(CARD_QUERY_PARAM)
  return parseProofCardId(queryId) ?? parseProofCardId(location.hash.replace(/^#/, ''))
}

export function buildLearningLogShareUrl(origin: string, proofCardId: number) {
  const url = new URL('/learning-log-gallery', origin)
  url.searchParams.set(CARD_QUERY_PARAM, String(proofCardId))
  return url.toString()
}
