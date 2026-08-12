import { adminApi } from '../../lib/admin-api'
import type { AdminCourseNodeMappingCandidate } from '../../types/admin'
import { adminActions } from './admin-action-registry'
import { buildEmptyRow, buildErrorRow, buildLoadingRow, escapeHtml, matchesKeyword, normalizeText, updateFilterSummary } from './admin-dashboard-support'
import { renderAdminMarkup } from './admin-react-renderer'

type RunAdminAction = (task: () => Promise<void>) => Promise<void>

let mappingCandidates: AdminCourseNodeMappingCandidate[] = []
let mappingQuery = ''

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)
  if (!element) throw new Error(`${id} element was not found`)
  return element as T
}

function renderNodeIds(nodeIds: number[], emptyLabel: string) {
  if (!nodeIds.length) return `<span class="text-xs text-slate-400">${escapeHtml(emptyLabel)}</span>`
  return `<div class="flex max-w-sm flex-wrap gap-1">${nodeIds.map((id) => `<span class="admin-mapping-node-chip">#${id}</span>`).join('')}</div>`
}

function normalizeMappingCandidate(candidate: AdminCourseNodeMappingCandidate) {
  return {
    ...candidate,
    courseTags: candidate.courseTags ?? [],
    mappedNodeIds: candidate.mappedNodeIds ?? [],
    suggestedNodeIds: candidate.suggestedNodeIds ?? [],
    tagMatchRate: Number.isFinite(candidate.tagMatchRate) ? candidate.tagMatchRate : 0,
    recommendationSource: candidate.recommendationSource || 'TAG_COVERAGE',
  }
}

function renderMappingRows(candidates: AdminCourseNodeMappingCandidate[]) {
  const tbody = getElement('courseNodeMappingTableBody')
  renderAdminMarkup(tbody, candidates.length
    ? candidates.map((candidate) => `
      <tr class="border-b border-slate-100 transition-colors hover:bg-fuchsia-50/20">
        <td class="px-6 py-3"><strong class="block text-xs text-slate-800">${escapeHtml(candidate.courseTitle)}</strong><span class="mt-1 block font-mono text-[10px] text-slate-400">강의 #${candidate.courseId}</span></td>
        <td class="px-6 py-3"><div class="flex max-w-sm flex-wrap gap-1">${candidate.courseTags.length ? candidate.courseTags.map((tag) => `<span class="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">${escapeHtml(tag)}</span>`).join('') : '<span class="text-xs text-slate-400">태그 없음</span>'}</div></td>
        <td class="px-6 py-3">${renderNodeIds(candidate.mappedNodeIds, '연결 없음')}</td>
        <td class="px-6 py-3"><div class="mb-1 flex items-center gap-2"><strong class="text-xs text-slate-700">일치 ${Math.round(candidate.tagMatchRate)}%</strong><span class="admin-mapping-source ${candidate.recommendationSource === 'GEMINI' ? 'is-ai' : ''}">${candidate.recommendationSource === 'GEMINI' ? 'Gemini' : '태그 분석'}</span></div>${renderNodeIds(candidate.suggestedNodeIds, '추천 없음')}</td>
        <td class="px-6 py-3"><div class="admin-mapping-actions"><button data-admin-click="requestAiMapping(${candidate.courseId})" type="button"><i class="fas fa-wand-magic-sparkles"></i>AI 추천</button><button data-admin-click="applySuggestedMapping(${candidate.courseId})" class="is-primary" type="button" ${candidate.suggestedNodeIds.length ? '' : 'disabled'}>추천 적용</button><button data-admin-click="clearCourseNodeMapping(${candidate.courseId})" class="is-danger" type="button" ${candidate.mappedNodeIds.length ? '' : 'disabled'}>연결 해제</button></div></td>
      </tr>`).join('')
    : buildEmptyRow(5, '조건에 맞는 강의가 없습니다.'))
}

function applyMappingFilter() {
  const keyword = normalizeText(mappingQuery)
  const filtered = mappingCandidates.filter((candidate) => matchesKeyword(keyword, [
    candidate.courseId,
    candidate.courseTitle,
    candidate.courseTags.join(' '),
    candidate.mappedNodeIds.join(' '),
    candidate.suggestedNodeIds.join(' '),
  ]))
  renderMappingRows(filtered)
  updateFilterSummary('mappingFilterSummary', mappingCandidates.length, filtered.length)
}

async function fetchPolicies() {
  const policy = await adminApi.getSystemPolicies()
  getElement<HTMLInputElement>('policyPlatformFeeRate').value = String(policy.platformFeeRate)
  getElement<HTMLInputElement>('policyRefundDays').value = String(policy.refundPolicyDays)
  getElement<HTMLInputElement>('policyMaxCoursePrice').value = String(policy.maxCoursePrice)
  getElement<HTMLInputElement>('policyHlsEnabled').checked = policy.hlsEnabled ?? true
  getElement<HTMLSelectElement>('policyMaxResolution').value = policy.maxResolution || '1080p'
  getElement<HTMLInputElement>('policyWatermarkEnabled').checked = policy.watermarkEnabled ?? true
}

async function fetchMappingCandidates() {
  const tbody = getElement('courseNodeMappingTableBody')
  renderAdminMarkup(tbody, buildLoadingRow(5, '강의·노드 추천을 계산하는 중입니다...'))
  try {
    mappingCandidates = (await adminApi.getCourseNodeMappingCandidates()).map(normalizeMappingCandidate)
    applyMappingFilter()
  } catch (error) {
    renderAdminMarkup(tbody, buildErrorRow(5, error instanceof Error ? error.message : '매핑 후보를 불러오지 못했습니다.'))
    updateFilterSummary('mappingFilterSummary', 0, 0)
  }
}

export async function fetchAdminGovernance() {
  await Promise.all([fetchPolicies(), fetchMappingCandidates()])
}

export function installAdminGovernanceBindings(runAction: RunAdminAction) {
  getElement<HTMLInputElement>('mappingFilterInput').addEventListener('input', (event) => {
    mappingQuery = (event.currentTarget as HTMLInputElement).value
    applyMappingFilter()
  })

  getElement<HTMLFormElement>('adminSystemPolicyForm').addEventListener('submit', (event) => {
    event.preventDefault()
    void runAction(async () => {
      await adminApi.updateSystemPolicies({
        platformFeeRate: Number(getElement<HTMLInputElement>('policyPlatformFeeRate').value),
        refundPolicyDays: Number(getElement<HTMLInputElement>('policyRefundDays').value),
        maxCoursePrice: Number(getElement<HTMLInputElement>('policyMaxCoursePrice').value),
      })
      await fetchPolicies()
    })
  })

  getElement<HTMLFormElement>('adminStreamingPolicyForm').addEventListener('submit', (event) => {
    event.preventDefault()
    void runAction(async () => {
      await adminApi.updateStreamingPolicy({
        hlsEnabled: getElement<HTMLInputElement>('policyHlsEnabled').checked,
        maxResolution: getElement<HTMLSelectElement>('policyMaxResolution').value,
        watermarkEnabled: getElement<HTMLInputElement>('policyWatermarkEnabled').checked,
      })
      await fetchPolicies()
    })
  })
}

export function installAdminGovernanceActions(runAction: RunAdminAction) {
  adminActions.requestAiMapping = async (courseId: number) => {
    await runAction(async () => {
      const recommendation = normalizeMappingCandidate(await adminApi.getAiCourseNodeMappingCandidate(courseId))
      mappingCandidates = mappingCandidates.map((candidate) => candidate.courseId === courseId ? recommendation : candidate)
      applyMappingFilter()
    })
  }
  adminActions.applySuggestedMapping = async (courseId: number) => {
    await runAction(async () => {
      const candidate = mappingCandidates.find((item) => item.courseId === courseId)
      if (!candidate?.suggestedNodeIds.length) return
      if (!window.confirm(`'${candidate.courseTitle}' 강의를 추천 노드 ${candidate.suggestedNodeIds.length}개에 연결하시겠습니까?`)) return
      await adminApi.applyCourseNodeMapping(courseId, candidate.suggestedNodeIds)
      await fetchMappingCandidates()
    })
  }
  adminActions.clearCourseNodeMapping = async (courseId: number) => {
    await runAction(async () => {
      const candidate = mappingCandidates.find((item) => item.courseId === courseId)
      if (!candidate || !window.confirm(`'${candidate.courseTitle}' 강의의 모든 노드 연결을 해제하시겠습니까?`)) return
      await adminApi.applyCourseNodeMapping(courseId, [])
      await fetchMappingCandidates()
    })
  }
}
