import { renderAdminMarkup } from './admin-react-renderer'
import type { AdminOfficialRoadmapOption, AdminRoadmapNode } from '../../types/admin'
import { escapeHtml, normalizeOptionalString, parseOptionalNumber, parseRequiredNumber, type RoadmapNodePayload } from './admin-dashboard-support'

let modalNodeItems: AdminRoadmapNode[] = []
let modalRoadmapOptions: AdminOfficialRoadmapOption[] = []
let roadmapNodeModalResolver: ((payload: RoadmapNodePayload | null) => void) | null = null
let roadmapNodeModalEditingNode: AdminRoadmapNode | null = null
let roadmapNodeModalInitialized = false
let roadmapNodeModalReturnFocus: HTMLElement | null = null

export function syncRoadmapNodeModalData(nodes: AdminRoadmapNode[], roadmaps: AdminOfficialRoadmapOption[]) {
  modalNodeItems = nodes
  modalRoadmapOptions = roadmaps
}

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id)
  if (!element) throw new Error(`${id} element was not found`)
  return element as T
}

function getDefaultNodeSortOrder(roadmapId: number, node?: AdminRoadmapNode) {
  if (node?.sortOrder !== null && node?.sortOrder !== undefined) {
    return node.sortOrder
  }

  return Math.max(
    0,
    ...modalNodeItems
      .filter((item) => item.roadmapId === roadmapId)
      .map((item) => item.sortOrder ?? 0),
  ) + 1
}

function getRoadmapNodeModalElements() {
  return {
    modal: getElement<HTMLDivElement>('addNodeModal'),
    form: getElement<HTMLFormElement>('addNodeForm'),
    title: getElement<HTMLHeadingElement>('addNodeModalTitle'),
    description: getElement<HTMLParagraphElement>('addNodeModalDescription'),
    roadmapIdInput: getElement<HTMLSelectElement>('roadmapIdInput'),
    nodeTypeInput: getElement<HTMLSelectElement>('nodeTypeInput'),
    nodeTitleInput: getElement<HTMLInputElement>('nodeTitleInput'),
    nodeContentInput: getElement<HTMLTextAreaElement>('nodeContentInput'),
    sortOrderInput: getElement<HTMLInputElement>('sortOrderInput'),
    branchGroupInput: getElement<HTMLInputElement>('branchGroupInput'),
    subTopicsInput: getElement<HTMLInputElement>('subTopicsInput'),
    cancelButton: getElement<HTMLButtonElement>('cancelAddNodeBtn'),
    confirmButton: getElement<HTMLButtonElement>('confirmAddNodeBtn'),
  }
}

function populateRoadmapSelectOptions(node?: AdminRoadmapNode) {
  const { roadmapIdInput } = getRoadmapNodeModalElements()
  const options = [...modalRoadmapOptions]

  if (node && !options.some((roadmap) => roadmap.roadmapId === node.roadmapId)) {
    options.push({
      roadmapId: node.roadmapId,
      title: node.roadmapTitle,
    })
  }

  renderAdminMarkup(roadmapIdInput, [
    '<option value="">로드맵을 선택해주세요</option>',
    ...options.map(
      (roadmap) => (
        `<option value="${roadmap.roadmapId}">[ID: ${roadmap.roadmapId}] ${escapeHtml(roadmap.title)}</option>`
      ),
    ),
  ].join(''))
}

function getInitialRoadmapId(node?: AdminRoadmapNode, selectedRoadmapFilter = '') {
  if (node) {
    return node.roadmapId
  }

  const selectedRoadmapId = Number(selectedRoadmapFilter)
  if (
    Number.isInteger(selectedRoadmapId)
    && modalRoadmapOptions.some((roadmap) => roadmap.roadmapId === selectedRoadmapId)
  ) {
    return selectedRoadmapId
  }

  return null
}

function setRoadmapNodeModalOpen(open: boolean) {
  const { modal } = getRoadmapNodeModalElements()
  modal.classList.toggle('active', open)
  modal.setAttribute('aria-hidden', open ? 'false' : 'true')
  document.body.classList.toggle('devpath-modal-open', open)
}

function closeRoadmapNodeModal() {
  setRoadmapNodeModalOpen(false)
  roadmapNodeModalEditingNode = null

  const returnFocus = roadmapNodeModalReturnFocus
  roadmapNodeModalReturnFocus = null
  returnFocus?.focus()
}

function resolveRoadmapNodeModal(payload: RoadmapNodePayload | null) {
  if (!roadmapNodeModalResolver) {
    closeRoadmapNodeModal()
    return
  }

  const resolve = roadmapNodeModalResolver
  roadmapNodeModalResolver = null
  closeRoadmapNodeModal()
  resolve(payload)
}

function readRoadmapNodeModalPayload() {
  const {
    roadmapIdInput,
    nodeTypeInput,
    nodeTitleInput,
    nodeContentInput,
    sortOrderInput,
    branchGroupInput,
    subTopicsInput,
  } = getRoadmapNodeModalElements()

  if (!roadmapIdInput.value.trim()) {
    window.alert('로드맵을 선택하세요.')
    roadmapIdInput.focus()
    return null
  }

  const roadmapId = parseRequiredNumber(roadmapIdInput.value, '로드맵 ID는 0 이상의 숫자로 입력하세요.')
  if (roadmapId === null) {
    roadmapIdInput.focus()
    return null
  }

  const knownRoadmap = modalRoadmapOptions.some((roadmap) => roadmap.roadmapId === roadmapId)
  if (!roadmapNodeModalEditingNode && modalRoadmapOptions.length > 0 && !knownRoadmap) {
    window.alert('선택 가능한 공식 로드맵 ID를 입력하세요.')
    roadmapIdInput.focus()
    return null
  }

  const title = nodeTitleInput.value.trim()
  if (!title) {
    window.alert('노드 제목을 입력하세요.')
    nodeTitleInput.focus()
    return null
  }

  const nodeType = nodeTypeInput.value.trim().toUpperCase()
  if (!nodeType) {
    window.alert('노드 유형을 선택하세요.')
    nodeTypeInput.focus()
    return null
  }

  if (!sortOrderInput.value.trim()) {
    window.alert('정렬 순서를 입력하세요.')
    sortOrderInput.focus()
    return null
  }

  const sortOrder = parseRequiredNumber(sortOrderInput.value, '정렬 순서는 0 이상의 숫자로 입력하세요.')
  if (sortOrder === null) {
    sortOrderInput.focus()
    return null
  }

  const branchGroup = parseOptionalNumber(branchGroupInput.value, '분기 그룹은 0 이상의 숫자로 입력하세요.')
  if (branchGroup === null) {
    branchGroupInput.focus()
    return null
  }

  return {
    roadmapId,
    title,
    content: normalizeOptionalString(nodeContentInput.value),
    nodeType,
    sortOrder,
    subTopics: normalizeOptionalString(subTopicsInput.value),
    branchGroup: branchGroup ?? null,
  }
}

function initRoadmapNodeModal() {
  if (roadmapNodeModalInitialized) {
    return
  }

  const {
    modal,
    form,
    roadmapIdInput,
    sortOrderInput,
    cancelButton,
  } = getRoadmapNodeModalElements()

  const refreshSortOrder = () => {
    if (roadmapNodeModalEditingNode) {
      return
    }

    if (!roadmapIdInput.value) {
      sortOrderInput.value = ''
      return
    }

    const roadmapId = Number(roadmapIdInput.value)
    if (Number.isInteger(roadmapId) && roadmapId >= 0) {
      sortOrderInput.value = String(getDefaultNodeSortOrder(roadmapId))
    }
  }

  roadmapIdInput.addEventListener('change', refreshSortOrder)

  cancelButton.addEventListener('click', () => {
    resolveRoadmapNodeModal(null)
  })

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      resolveRoadmapNodeModal(null)
    }
  })

  document.addEventListener('keydown', (event) => {
    const currentModal = document.getElementById('addNodeModal')
    if (event.key === 'Escape' && currentModal?.classList.contains('active')) {
      resolveRoadmapNodeModal(null)
    }
  })

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const payload = readRoadmapNodeModalPayload()
    if (payload) {
      resolveRoadmapNodeModal(payload)
    }
  })

  roadmapNodeModalInitialized = true
}

export function openRoadmapNodeModal(node?: AdminRoadmapNode, selectedRoadmapFilter = '') {
  if (!node && modalRoadmapOptions.length === 0) {
    window.alert('선택 가능한 공식 로드맵이 없습니다.')
    return Promise.resolve(null)
  }

  if (roadmapNodeModalResolver) {
    resolveRoadmapNodeModal(null)
  }

  initRoadmapNodeModal()
  populateRoadmapSelectOptions(node)

  const {
    modal,
    form,
    title,
    description,
    roadmapIdInput,
    nodeTypeInput,
    nodeTitleInput,
    nodeContentInput,
    sortOrderInput,
    branchGroupInput,
    subTopicsInput,
    confirmButton,
  } = getRoadmapNodeModalElements()

  const roadmapId = getInitialRoadmapId(node, selectedRoadmapFilter)
  roadmapNodeModalEditingNode = node ?? null

  form.reset()
  title.textContent = node ? '마스터 로드맵 노드 수정' : '마스터 로드맵 노드 추가'
  description.textContent = node
    ? '노드 정보를 수정한 뒤 저장하세요.'
    : '공식 로드맵에 연결할 노드 정보를 입력하세요.'
  confirmButton.textContent = node ? '수정하기' : '추가하기'

  roadmapIdInput.value = roadmapId === null ? '' : String(roadmapId)
  roadmapIdInput.disabled = Boolean(node)
  roadmapIdInput.classList.toggle('devpath-modal-input-disabled', Boolean(node))
  nodeTypeInput.value = node?.nodeType?.toUpperCase() || 'CONCEPT'
  nodeTitleInput.value = node?.title ?? ''
  nodeContentInput.value = node?.content ?? ''
  sortOrderInput.value = roadmapId === null ? '' : String(getDefaultNodeSortOrder(roadmapId, node))
  branchGroupInput.value = node?.branchGroup?.toString() ?? ''
  subTopicsInput.value = node?.subTopics ?? ''

  return new Promise<RoadmapNodePayload | null>((resolve) => {
    roadmapNodeModalResolver = resolve
    roadmapNodeModalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setRoadmapNodeModalOpen(true)

    window.setTimeout(() => {
      if (!modal.classList.contains('active')) {
        return
      }

      if (node) {
        nodeTitleInput.focus()
        return
      }

      roadmapIdInput.focus()
    }, 80)
  })
}
