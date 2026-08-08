declare global {
  interface Window {
    refreshCurrentTab: () => void
    logout: () => Promise<void>
    createTag: () => Promise<void>
    mergeTag: (tagId: number) => Promise<void>
    editOfficialRoadmap: (roadmapId: number) => void
    deleteOfficialRoadmap: (roadmapId: number) => Promise<void>
    createRoadmapNode: () => Promise<void>
    editRoadmapNode: (nodeId: number) => Promise<void>
    editRoadmapInfo: (roadmapId: number) => void
    clearRoadmapInfo: (roadmapId: number) => Promise<void>
    updateNodeTags: (nodeId: number) => Promise<void>
    updateNodePrerequisites: (nodeId: number) => Promise<void>
    updateNodeRules: (nodeId: number) => Promise<void>
    editRoadmapNodeResource: (resourceId: number) => void
    deleteRoadmapNodeResource: (resourceId: number) => Promise<void>
    toggleAccountStatus: (userId: number, accountStatus: string) => Promise<void>
    approveCourse: (courseId: number) => Promise<void>
    rejectCourse: (courseId: number) => Promise<void>
    blindContent: (reportId: number) => Promise<void>
    resolveReport: (reportId: number) => Promise<void>
    createCatalogCategory: () => void
    saveCourseCatalogMenu: () => Promise<void>
    setAllCatalogCategoriesCollapsed: (collapsed: boolean) => void
    toggleCatalogCategoryCollapsed: (categoryIndex: number) => void
    moveCatalogCategory: (categoryIndex: number, direction: number) => void
    deleteCatalogCategory: (categoryIndex: number) => void
    updateCatalogCategoryField: (categoryIndex: number, field: string, value: string) => void
    updateCatalogCategoryActive: (categoryIndex: number, checked: boolean) => void
    addCatalogMegaMenuItem: (categoryIndex: number) => void
    updateCatalogMegaMenuItemLabel: (categoryIndex: number, itemIndex: number, value: string) => void
    moveCatalogMegaMenuItem: (categoryIndex: number, itemIndex: number, direction: number) => void
    removeCatalogMegaMenuItem: (categoryIndex: number, itemIndex: number) => void
    addCatalogGroup: (categoryIndex: number) => void
    updateCatalogGroupField: (categoryIndex: number, groupIndex: number, field: string, value: string) => void
    moveCatalogGroup: (categoryIndex: number, groupIndex: number, direction: number) => void
    removeCatalogGroup: (categoryIndex: number, groupIndex: number) => void
    addCatalogGroupItem: (categoryIndex: number, groupIndex: number) => void
    updateCatalogGroupItemField: (categoryIndex: number, groupIndex: number, itemIndex: number, field: string, value: string) => void
    moveCatalogGroupItem: (categoryIndex: number, groupIndex: number, itemIndex: number, direction: number) => void
    removeCatalogGroupItem: (categoryIndex: number, groupIndex: number, itemIndex: number) => void
    createRoadmapHubSection: () => void
    saveRoadmapHubCatalog: () => Promise<void>
    setAllRoadmapHubSectionsCollapsed: (collapsed: boolean) => void
    toggleRoadmapHubSectionCollapsed: (sectionIndex: number) => void
    moveRoadmapHubSection: (sectionIndex: number, direction: number) => void
    deleteRoadmapHubSection: (sectionIndex: number) => void
    updateRoadmapHubSectionField: (sectionIndex: number, field: string, value: string) => void
    updateRoadmapHubSectionActive: (sectionIndex: number, checked: boolean) => void
    addRoadmapHubItem: (sectionIndex: number) => void
    moveRoadmapHubItem: (sectionIndex: number, itemIndex: number, direction: number) => void
    removeRoadmapHubItem: (sectionIndex: number, itemIndex: number) => void
    updateRoadmapHubItemField: (sectionIndex: number, itemIndex: number, field: string, value: string) => void
    updateRoadmapHubItemToggle: (sectionIndex: number, itemIndex: number, field: string, checked: boolean) => void
  }
}

export type AdminActionName =
  | 'refreshCurrentTab' | 'logout' | 'createTag' | 'mergeTag' | 'editOfficialRoadmap' | 'deleteOfficialRoadmap'
  | 'createRoadmapNode' | 'editRoadmapNode' | 'editRoadmapInfo' | 'clearRoadmapInfo' | 'updateNodeTags'
  | 'updateNodePrerequisites' | 'updateNodeRules' | 'editRoadmapNodeResource' | 'deleteRoadmapNodeResource'
  | 'toggleAccountStatus' | 'approveCourse' | 'rejectCourse' | 'blindContent' | 'resolveReport'
  | 'createCatalogCategory' | 'saveCourseCatalogMenu' | 'setAllCatalogCategoriesCollapsed'
  | 'toggleCatalogCategoryCollapsed' | 'moveCatalogCategory' | 'deleteCatalogCategory' | 'updateCatalogCategoryField'
  | 'updateCatalogCategoryActive' | 'addCatalogMegaMenuItem' | 'updateCatalogMegaMenuItemLabel'
  | 'moveCatalogMegaMenuItem' | 'removeCatalogMegaMenuItem' | 'addCatalogGroup' | 'updateCatalogGroupField'
  | 'moveCatalogGroup' | 'removeCatalogGroup' | 'addCatalogGroupItem' | 'updateCatalogGroupItemField'
  | 'moveCatalogGroupItem' | 'removeCatalogGroupItem' | 'createRoadmapHubSection' | 'saveRoadmapHubCatalog'
  | 'setAllRoadmapHubSectionsCollapsed' | 'toggleRoadmapHubSectionCollapsed' | 'moveRoadmapHubSection'
  | 'deleteRoadmapHubSection' | 'updateRoadmapHubSectionField' | 'updateRoadmapHubSectionActive'
  | 'addRoadmapHubItem' | 'moveRoadmapHubItem' | 'removeRoadmapHubItem' | 'updateRoadmapHubItemField'
  | 'updateRoadmapHubItemToggle'

export const adminActions = Object.create(null) as Pick<Window, AdminActionName>

function parseArgument(token: string, element: HTMLElement) {
  const value = token.trim()
  if (value === 'this.checked' && element instanceof HTMLInputElement) return element.checked
  if (value === 'this.value' && (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) return element.value
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1).replaceAll("\\'", "'").replaceAll('\\"', '"')
  }
  return value
}

function invokeExpression(expression: string, element: HTMLElement) {
  const match = expression.trim().match(/^([A-Za-z][A-Za-z0-9_]*)\((.*)\)$/)
  if (!match) return
  const [, name, rawArguments] = match
  const action = adminActions[name as AdminActionName] as ((...args: unknown[]) => unknown) | undefined
  if (typeof action !== 'function') return
  const args = rawArguments.trim() ? rawArguments.split(',').map((token) => parseArgument(token, element)) : []
  void action(...args)
}

function sanitizeElement(element: HTMLElement) {
  const clickExpression = element.getAttribute('onclick')
  if (clickExpression) {
    element.dataset.adminClick = clickExpression
    element.removeAttribute('onclick')
  }
  const changeExpression = element.getAttribute('onchange')
  if (changeExpression) {
    element.dataset.adminChange = changeExpression
    element.removeAttribute('onchange')
  }
}

function sanitizeTree(root: ParentNode) {
  if (root instanceof HTMLElement) sanitizeElement(root)
  root.querySelectorAll<HTMLElement>('[onclick], [onchange]').forEach(sanitizeElement)
}

export function installAdminActionDelegation(root: HTMLElement) {
  sanitizeTree(root)
  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-admin-click]') : null
    if (target?.dataset.adminClick) invokeExpression(target.dataset.adminClick, target)
  })
  root.addEventListener('change', (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.dataset.adminChange) invokeExpression(target.dataset.adminChange, target)
  })
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) sanitizeTree(node)
    }))
  }).observe(root, { childList: true, subtree: true })
}
