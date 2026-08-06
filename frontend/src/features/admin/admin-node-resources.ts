import { adminApi } from "../../lib/admin-api";
import type {
  AdminOfficialRoadmapOption,
  AdminRoadmapNode,
  AdminRoadmapNodeResource,
} from "../../types/admin";
import type { RoadmapNodeResourcePayload } from "./admin-dashboard-support";
import {
  escapeHtml,
  formatNodeStructure,
  formatNumber,
  matchesKeyword,
  nodeResourceSourceLabel,
  normalizeOptionalString,
  normalizeText,
  parseRequiredNumber,
} from "./admin-dashboard-support";

type RunAdminAction = (task: () => Promise<void>) => Promise<void>;

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`${id} element was not found`);
  return element as T;
}

function buildLoadingRow(
  colspan: number,
  message = "데이터를 불러오는 중입니다...",
) {
  return `<tr><td colspan="${colspan}" class="px-6 py-10 text-center text-sm text-slate-400">${escapeHtml(message)}</td></tr>`;
}

function buildEmptyRow(colspan: number, message = "표시할 데이터가 없습니다.") {
  return `<tr><td colspan="${colspan}" class="px-6 py-10 text-center text-sm text-slate-400">${escapeHtml(message)}</td></tr>`;
}

function buildErrorRow(
  colspan: number,
  message = "데이터를 불러오지 못했습니다.",
) {
  return `<tr><td colspan="${colspan}" class="px-6 py-10 text-center text-sm font-medium text-rose-500">${escapeHtml(message)}</td></tr>`;
}

function updateFilterSummary(
  elementId: string,
  totalCount: number,
  filteredCount: number,
) {
  const element = getElement<HTMLElement>(elementId);
  element.textContent =
    totalCount === filteredCount
      ? `전체 ${formatNumber(totalCount)}개`
      : `검색 결과 ${formatNumber(filteredCount)}개 / 전체 ${formatNumber(totalCount)}개`;
}

let nodeItems: AdminRoadmapNode[] = [];
let officialRoadmapOptions: AdminOfficialRoadmapOption[] = [];
let nodeResourceItems: AdminRoadmapNodeResource[] = [];
let nodeResourceEditingId: number | null = null;
let nodeResourceSaving = false;
const nodeResourceFilterState = {
  Query: "",
  RoadmapId: "",
  NodeId: "",
  SourceType: "",
  Status: "",
};

function getDefaultNodeResourceSortOrder(nodeId: number) {
  return (
    Math.max(
      -1,
      ...nodeResourceItems
        .filter(
          (resource) =>
            resource.nodeId === nodeId &&
            resource.resourceId !== nodeResourceEditingId,
        )
        .map((resource) => resource.sortOrder ?? 0),
    ) + 1
  );
}

function getNodeResourceRoadmapOptions() {
  const nodeCounts = new Map<number, number>();

  nodeItems.forEach((node) => {
    nodeCounts.set(node.roadmapId, (nodeCounts.get(node.roadmapId) ?? 0) + 1);
  });

  const roadmapOptions =
    officialRoadmapOptions.length > 0
      ? officialRoadmapOptions.map((roadmap) => ({
          roadmapId: roadmap.roadmapId,
          title: roadmap.title,
          nodeCount: nodeCounts.get(roadmap.roadmapId) ?? 0,
        }))
      : [
          ...new Map(
            nodeItems.map((node) => [
              node.roadmapId,
              {
                roadmapId: node.roadmapId,
                title: node.roadmapTitle,
                nodeCount: nodeCounts.get(node.roadmapId) ?? 0,
              },
            ]),
          ).values(),
        ];

  return roadmapOptions.sort(
    (left, right) =>
      left.title.localeCompare(right.title, "ko-KR") ||
      left.roadmapId - right.roadmapId,
  );
}

function getNodeResourceRoadmapTitle(roadmapId: number) {
  return (
    officialRoadmapOptions.find((roadmap) => roadmap.roadmapId === roadmapId)
      ?.title ??
    nodeItems.find((node) => node.roadmapId === roadmapId)?.roadmapTitle ??
    `로드맵 #${roadmapId}`
  );
}

function getSortedNodeResourceNodeOptions(roadmapId?: number | null) {
  return nodeItems
    .filter((node) => !roadmapId || node.roadmapId === roadmapId)
    .sort((left, right) => {
      const roadmapCompare = left.roadmapTitle.localeCompare(
        right.roadmapTitle,
        "ko-KR",
      );
      if (roadmapCompare !== 0) {
        return roadmapCompare;
      }

      return (
        (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
        left.nodeId - right.nodeId
      );
    });
}

function ensureSelectedRoadmapOption(
  roadmapOptions: Array<{
    roadmapId: number;
    title: string;
    nodeCount: number;
  }>,
  selectedRoadmapId?: number | null,
) {
  if (
    !selectedRoadmapId ||
    roadmapOptions.some((roadmap) => roadmap.roadmapId === selectedRoadmapId)
  ) {
    return roadmapOptions;
  }

  return [
    ...roadmapOptions,
    {
      roadmapId: selectedRoadmapId,
      title: getNodeResourceRoadmapTitle(selectedRoadmapId),
      nodeCount: getSortedNodeResourceNodeOptions(selectedRoadmapId).length,
    },
  ].sort(
    (left, right) =>
      left.title.localeCompare(right.title, "ko-KR") ||
      left.roadmapId - right.roadmapId,
  );
}

function ensureSelectedNodeOption(
  nodeOptions: AdminRoadmapNode[],
  selectedNodeId?: number | null,
) {
  if (
    !selectedNodeId ||
    nodeOptions.some((node) => node.nodeId === selectedNodeId)
  ) {
    return nodeOptions;
  }

  const selectedNode = nodeItems.find((node) => node.nodeId === selectedNodeId);
  return selectedNode ? [...nodeOptions, selectedNode] : nodeOptions;
}

function renderNodeResourceRoadmapOptions(selectedRoadmapId?: number | null) {
  const select = getElement<HTMLSelectElement>("nodeResourceRoadmapSelect");
  const roadmapOptions = ensureSelectedRoadmapOption(
    getNodeResourceRoadmapOptions(),
    selectedRoadmapId,
  );
  const currentValue =
    selectedRoadmapId ?? (select.value ? Number(select.value) : null);
  const validCurrentValue = roadmapOptions.some(
    (roadmap) => roadmap.roadmapId === currentValue,
  )
    ? currentValue
    : null;

  select.innerHTML = [
    '<option value="">로드맵을 선택하세요</option>',
    ...roadmapOptions.map(
      (roadmap) => `
        <option value="${roadmap.roadmapId}" title="${escapeHtml(roadmap.title)}" ${validCurrentValue === roadmap.roadmapId ? "selected" : ""}>
          ${escapeHtml(roadmap.title)} (${formatNumber(roadmap.nodeCount)}개 노드)
        </option>`,
    ),
  ].join("");
  select.value = validCurrentValue ? String(validCurrentValue) : "";
  updateNodeResourceFormReadouts();
}

function renderNodeResourceNodeOptions(
  selectedNodeId?: number | null,
  selectedRoadmapId?: number | null,
) {
  const select = getElement<HTMLSelectElement>("nodeResourceNodeSelect");
  const roadmapSelect = getElement<HTMLSelectElement>(
    "nodeResourceRoadmapSelect",
  );
  const roadmapId =
    selectedRoadmapId ??
    (roadmapSelect.value ? Number(roadmapSelect.value) : null);
  const nodeOptions = roadmapId
    ? ensureSelectedNodeOption(
        getSortedNodeResourceNodeOptions(roadmapId),
        selectedNodeId,
      )
    : [];
  const currentValue =
    selectedNodeId ?? (select.value ? Number(select.value) : null);
  const validCurrentValue = nodeOptions.some(
    (node) => node.nodeId === currentValue,
  )
    ? currentValue
    : null;

  select.innerHTML = [
    `<option value="">${roadmapId ? (nodeOptions.length > 0 ? "노드를 선택하세요" : "선택한 로드맵에 노드가 없습니다") : "로드맵을 먼저 선택하세요"}</option>`,
    ...nodeOptions.map(
      (node) => `
        <option value="${node.nodeId}" title="${escapeHtml(node.roadmapTitle)} · ${escapeHtml(node.title)}" ${validCurrentValue === node.nodeId ? "selected" : ""}>
          ${escapeHtml(formatNodeStructure(node))} · ${escapeHtml(node.title)}
        </option>`,
    ),
  ].join("");

  select.disabled = !roadmapId || nodeOptions.length === 0;
  select.value = validCurrentValue ? String(validCurrentValue) : "";
  updateNodeResourceFormReadouts();
}

function renderNodeResourceFormOptions(
  selectedRoadmapId?: number | null,
  selectedNodeId?: number | null,
) {
  renderNodeResourceRoadmapOptions(selectedRoadmapId);
  const roadmapSelect = getElement<HTMLSelectElement>(
    "nodeResourceRoadmapSelect",
  );
  const roadmapId =
    selectedRoadmapId ??
    (roadmapSelect.value ? Number(roadmapSelect.value) : null);
  renderNodeResourceNodeOptions(selectedNodeId, roadmapId);
}

function renderNodeResourceFilterOptions() {
  const roadmapSelect = getElement<HTMLSelectElement>(
    "nodeResourceRoadmapFilter",
  );
  const nodeSelect = getElement<HTMLSelectElement>("nodeResourceNodeFilter");
  const sourceSelect = getElement<HTMLSelectElement>(
    "nodeResourceSourceFilter",
  );
  const statusSelect = getElement<HTMLSelectElement>(
    "nodeResourceStatusFilter",
  );
  const roadmapOptions = getNodeResourceRoadmapOptions();
  const roadmapIds = new Set(
    roadmapOptions.map((roadmap) => String(roadmap.roadmapId)),
  );

  if (
    nodeResourceFilterState.RoadmapId &&
    !roadmapIds.has(nodeResourceFilterState.RoadmapId)
  ) {
    nodeResourceFilterState.RoadmapId = "";
    nodeResourceFilterState.NodeId = "";
  }

  roadmapSelect.innerHTML = [
    '<option value="">전체 로드맵</option>',
    ...roadmapOptions.map(
      (roadmap) =>
        `<option value="${roadmap.roadmapId}" title="${escapeHtml(roadmap.title)}" ${nodeResourceFilterState.RoadmapId === String(roadmap.roadmapId) ? "selected" : ""}>${escapeHtml(roadmap.title)}</option>`,
    ),
  ].join("");
  roadmapSelect.value = nodeResourceFilterState.RoadmapId;

  const roadmapId = nodeResourceFilterState.RoadmapId
    ? Number(nodeResourceFilterState.RoadmapId)
    : null;
  const nodeOptions = getSortedNodeResourceNodeOptions(roadmapId);
  const nodeIds = new Set(nodeOptions.map((node) => String(node.nodeId)));

  if (
    nodeResourceFilterState.NodeId &&
    !nodeIds.has(nodeResourceFilterState.NodeId)
  ) {
    nodeResourceFilterState.NodeId = "";
  }

  nodeSelect.innerHTML = [
    '<option value="">전체 노드</option>',
    ...nodeOptions.map(
      (node) => `
        <option value="${node.nodeId}" title="${escapeHtml(node.roadmapTitle)} · ${escapeHtml(node.title)}" ${nodeResourceFilterState.NodeId === String(node.nodeId) ? "selected" : ""}>
          ${escapeHtml(node.roadmapTitle)} · ${escapeHtml(node.title)}
        </option>`,
    ),
  ].join("");
  nodeSelect.value = nodeResourceFilterState.NodeId;
  sourceSelect.value = nodeResourceFilterState.SourceType;
  statusSelect.value = nodeResourceFilterState.Status;
  updateNodeResourceFilterReadout();
}

function getSelectLabel(select: HTMLSelectElement) {
  return (
    select.selectedOptions[0]?.textContent?.replace(/\s+/g, " ").trim() ?? ""
  );
}

function updateNodeResourceFormReadouts() {
  const roadmapSelect = document.getElementById(
    "nodeResourceRoadmapSelect",
  ) as HTMLSelectElement | null;
  const nodeSelect = document.getElementById(
    "nodeResourceNodeSelect",
  ) as HTMLSelectElement | null;
  const roadmapReadout = document.getElementById("nodeResourceRoadmapReadout");
  const nodeReadout = document.getElementById("nodeResourceNodeReadout");

  if (!roadmapSelect || !nodeSelect || !roadmapReadout || !nodeReadout) {
    return;
  }

  const roadmapLabel = roadmapSelect.value ? getSelectLabel(roadmapSelect) : "";
  const nodeLabel = nodeSelect.value ? getSelectLabel(nodeSelect) : "";

  roadmapSelect.title = roadmapLabel;
  nodeSelect.title = nodeLabel;
  roadmapReadout.textContent =
    roadmapLabel || "로드맵을 선택하면 전체 이름이 표시됩니다.";

  if (nodeLabel) {
    nodeReadout.textContent = nodeLabel;
    return;
  }

  nodeReadout.textContent = roadmapSelect.value
    ? nodeSelect.disabled
      ? "선택한 로드맵에 등록된 노드가 없습니다."
      : "노드를 선택하면 전체 이름이 표시됩니다."
    : "로드맵을 먼저 선택하세요.";
}

function updateNodeResourceFilterReadout() {
  const filterReadout = document.getElementById("nodeResourceFilterReadout");
  if (!filterReadout) {
    return;
  }

  const roadmapSelect = getElement<HTMLSelectElement>(
    "nodeResourceRoadmapFilter",
  );
  const nodeSelect = getElement<HTMLSelectElement>("nodeResourceNodeFilter");
  const sourceSelect = getElement<HTMLSelectElement>(
    "nodeResourceSourceFilter",
  );
  const statusSelect = getElement<HTMLSelectElement>(
    "nodeResourceStatusFilter",
  );
  const parts = [
    nodeResourceFilterState.Query.trim()
      ? `검색어: ${nodeResourceFilterState.Query.trim()}`
      : "",
    nodeResourceFilterState.RoadmapId
      ? `로드맵: ${getSelectLabel(roadmapSelect)}`
      : "",
    nodeResourceFilterState.NodeId ? `노드: ${getSelectLabel(nodeSelect)}` : "",
    nodeResourceFilterState.SourceType
      ? `유형: ${getSelectLabel(sourceSelect)}`
      : "",
    nodeResourceFilterState.Status
      ? `상태: ${getSelectLabel(statusSelect)}`
      : "",
  ].filter(Boolean);

  roadmapSelect.title = getSelectLabel(roadmapSelect);
  nodeSelect.title = getSelectLabel(nodeSelect);
  filterReadout.textContent =
    parts.length > 0
      ? `적용 중인 필터 · ${parts.join(" · ")}`
      : "전체 추천 자료를 보고 있습니다.";
}

function syncNodeResourceFormState() {
  const form = getElement<HTMLFormElement>("nodeResourceForm");
  const saveButton = getElement<HTMLButtonElement>("nodeResourceSaveButton");
  const cancelButton = getElement<HTMLButtonElement>("nodeResourceCancelEdit");
  const isEditing = nodeResourceEditingId !== null;

  form.classList.toggle("opacity-70", nodeResourceSaving);
  saveButton.disabled = nodeResourceSaving;
  saveButton.classList.toggle("opacity-70", nodeResourceSaving);
  saveButton.classList.toggle("cursor-not-allowed", nodeResourceSaving);
  saveButton.innerHTML = nodeResourceSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : isEditing
      ? '<i class="fas fa-save mr-1"></i> 변경 저장'
      : '<i class="fas fa-plus mr-1"></i> 자료 등록';
  cancelButton.classList.toggle("hidden", !isEditing);
}

function resetNodeResourceForm() {
  nodeResourceEditingId = null;
  getElement<HTMLFormElement>("nodeResourceForm").reset();
  getElement<HTMLSelectElement>("nodeResourceSourceTypeInput").value = "BLOG";
  getElement<HTMLInputElement>("nodeResourceActiveInput").checked = true;
  renderNodeResourceFormOptions(null, null);
  syncNodeResourceFormState();
  applyNodeResourceFilters();
}

function setNodeResourceForm(resource: AdminRoadmapNodeResource) {
  nodeResourceEditingId = resource.resourceId;
  renderNodeResourceFormOptions(resource.roadmapId, resource.nodeId);
  getElement<HTMLSelectElement>("nodeResourceRoadmapSelect").value = String(
    resource.roadmapId,
  );
  getElement<HTMLSelectElement>("nodeResourceNodeSelect").value = String(
    resource.nodeId,
  );
  getElement<HTMLInputElement>("nodeResourceTitleInput").value = resource.title;
  getElement<HTMLInputElement>("nodeResourceUrlInput").value = resource.url;
  getElement<HTMLSelectElement>("nodeResourceSourceTypeInput").value = (
    resource.sourceType ?? "OTHER"
  ).toUpperCase();
  getElement<HTMLInputElement>("nodeResourceSortOrderInput").value = String(
    resource.sortOrder ?? 0,
  );
  getElement<HTMLTextAreaElement>("nodeResourceDescriptionInput").value =
    resource.description ?? "";
  getElement<HTMLInputElement>("nodeResourceActiveInput").checked =
    resource.active;
  syncNodeResourceFormState();
  applyNodeResourceFilters();
}

function getNodeResourceFormPayload(): RoadmapNodeResourcePayload | null {
  const roadmapSelect = getElement<HTMLSelectElement>(
    "nodeResourceRoadmapSelect",
  );
  const nodeSelect = getElement<HTMLSelectElement>("nodeResourceNodeSelect");
  const titleInput = getElement<HTMLInputElement>("nodeResourceTitleInput");
  const urlInput = getElement<HTMLInputElement>("nodeResourceUrlInput");
  const sourceTypeInput = getElement<HTMLSelectElement>(
    "nodeResourceSourceTypeInput",
  );
  const sortOrderInput = getElement<HTMLInputElement>(
    "nodeResourceSortOrderInput",
  );
  const descriptionInput = getElement<HTMLTextAreaElement>(
    "nodeResourceDescriptionInput",
  );
  const activeInput = getElement<HTMLInputElement>("nodeResourceActiveInput");

  if (!roadmapSelect.value.trim()) {
    window.alert("자료를 연결할 로드맵을 선택하세요.");
    roadmapSelect.focus();
    return null;
  }

  const roadmapId = parseRequiredNumber(
    roadmapSelect.value,
    "로드맵 ID는 0 이상의 숫자로 입력하세요.",
  );
  if (roadmapId === null) {
    roadmapSelect.focus();
    return null;
  }

  if (!nodeSelect.value.trim()) {
    window.alert("자료를 연결할 노드를 선택하세요.");
    nodeSelect.focus();
    return null;
  }

  const nodeId = parseRequiredNumber(
    nodeSelect.value,
    "노드 ID는 0 이상의 숫자로 입력하세요.",
  );
  if (nodeId === null) {
    nodeSelect.focus();
    return null;
  }

  const selectedNode = nodeItems.find((node) => node.nodeId === nodeId);
  if (!selectedNode || selectedNode.roadmapId !== roadmapId) {
    window.alert("선택한 로드맵에 속한 노드를 선택하세요.");
    nodeSelect.focus();
    return null;
  }

  const title = titleInput.value.trim();
  if (!title) {
    window.alert("자료 제목을 입력하세요.");
    titleInput.focus();
    return null;
  }

  const url = urlInput.value.trim();
  if (!url) {
    window.alert("자료 링크를 입력하세요.");
    urlInput.focus();
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    window.alert("자료 링크는 http 또는 https URL로 입력하세요.");
    urlInput.focus();
    return null;
  }

  const sortOrder = parseRequiredNumber(
    sortOrderInput.value || "0",
    "정렬 순서는 0 이상의 숫자로 입력하세요.",
  );
  if (sortOrder === null) {
    sortOrderInput.focus();
    return null;
  }

  return {
    nodeId,
    title,
    url,
    description: normalizeOptionalString(descriptionInput.value),
    sourceType: sourceTypeInput.value || "OTHER",
    sortOrder,
    active: activeInput.checked,
  };
}

function renderNodeResourceRows(resources: AdminRoadmapNodeResource[]) {
  const tbody = getElement("nodeResourceTableBody");
  tbody.innerHTML = resources.length
    ? resources
        .map((resource) => {
          const selected = nodeResourceEditingId === resource.resourceId;
          const statusClass = resource.active
            ? "bg-emerald-50 text-emerald-600"
            : "bg-slate-100 text-slate-500";

          return `
            <tr class="border-b border-slate-100 transition-colors ${selected ? "bg-teal-50/60" : "hover:bg-slate-50/70"}">
              <td class="px-5 py-3 align-middle font-mono text-xs whitespace-nowrap text-slate-400">#${resource.resourceId}</td>
              <td class="px-5 py-3 align-middle">
                <div class="truncate font-bold text-slate-800">${escapeHtml(resource.nodeTitle)}</div>
                <div class="mt-1 truncate text-xs text-slate-400">${escapeHtml(resource.roadmapTitle)}</div>
              </td>
              <td class="px-5 py-3 align-middle">
                <div class="truncate font-bold text-slate-800">${escapeHtml(resource.title)}</div>
                <a href="${escapeHtml(resource.url)}" target="_blank" rel="noreferrer" class="mt-1 block truncate text-xs font-medium text-teal-600 hover:text-teal-700">${escapeHtml(resource.url)}</a>
                <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">${escapeHtml(resource.description || "설명 없음")}</div>
              </td>
              <td class="px-5 py-3 align-middle text-xs text-slate-500">
                <span class="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${statusClass}">${resource.active ? "노출" : "비노출"}</span>
                <div class="mt-2">순서 ${resource.sortOrder ?? 0}</div>
                <div class="mt-1">${escapeHtml(nodeResourceSourceLabel(resource.sourceType))}</div>
              </td>
              <td class="px-5 py-3 align-middle text-right">
                <div class="flex flex-wrap justify-end gap-1">
                  <button onclick="editRoadmapNodeResource(${resource.resourceId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">수정</button>
                  <button onclick="deleteRoadmapNodeResource(${resource.resourceId})" class="whitespace-nowrap rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-800" type="button">삭제</button>
                </div>
              </td>
            </tr>`;
        })
        .join("")
    : buildEmptyRow(5, "조건에 맞는 추천 자료가 없습니다.");
}

function applyNodeResourceFilters() {
  const keyword = normalizeText(nodeResourceFilterState.Query);
  const roadmapId = nodeResourceFilterState.RoadmapId.trim();
  const nodeId = nodeResourceFilterState.NodeId.trim();
  const sourceType = nodeResourceFilterState.SourceType.trim().toUpperCase();
  const status = nodeResourceFilterState.Status.trim().toUpperCase();
  const filteredResources = nodeResourceItems.filter((resource) => {
    const matchesText = matchesKeyword(keyword, [
      resource.resourceId,
      resource.nodeId,
      resource.nodeTitle,
      resource.roadmapId,
      resource.roadmapTitle,
      resource.title,
      resource.url,
      resource.description,
      resource.sourceType,
    ]);
    const matchesRoadmap =
      !roadmapId || String(resource.roadmapId) === roadmapId;
    const matchesNode = !nodeId || String(resource.nodeId) === nodeId;
    const matchesSource =
      !sourceType ||
      (resource.sourceType ?? "OTHER").toUpperCase() === sourceType;
    const matchesStatus =
      !status ||
      (status === "ACTIVE" && resource.active) ||
      (status === "INACTIVE" && !resource.active);

    return (
      matchesText &&
      matchesRoadmap &&
      matchesNode &&
      matchesSource &&
      matchesStatus
    );
  });

  renderNodeResourceRows(filteredResources);
  updateFilterSummary(
    "nodeResourceSummary",
    nodeResourceItems.length,
    filteredResources.length,
  );
  updateNodeResourceFilterReadout();
}

export async function fetchNodeResources() {
  const tbody = getElement("nodeResourceTableBody");
  tbody.innerHTML = buildLoadingRow(5);

  try {
    const [resources, nodes, roadmaps] = await Promise.all([
      adminApi.getRoadmapNodeResources(),
      adminApi.getRoadmapNodes(),
      adminApi.getOfficialRoadmapOptions(),
    ]);
    nodeResourceItems = resources;
    nodeItems = nodes;
    officialRoadmapOptions = roadmaps;

    const editingResource = nodeResourceEditingId
      ? (nodeResourceItems.find(
          (resource) => resource.resourceId === nodeResourceEditingId,
        ) ?? null)
      : null;

    if (nodeResourceEditingId && !editingResource) {
      nodeResourceEditingId = null;
    }

    renderNodeResourceFilterOptions();

    if (editingResource) {
      setNodeResourceForm(editingResource);
    } else {
      renderNodeResourceFormOptions(null, null);
      syncNodeResourceFormState();
      applyNodeResourceFilters();
    }
  } catch (error) {
    tbody.innerHTML = buildErrorRow(
      5,
      error instanceof Error
        ? error.message
        : "추천 자료를 불러오지 못했습니다.",
    );
    updateFilterSummary("nodeResourceSummary", 0, 0);
  }
}

async function submitNodeResourceForm() {
  const payload = getNodeResourceFormPayload();
  if (!payload) {
    return;
  }

  nodeResourceSaving = true;
  syncNodeResourceFormState();

  try {
    if (nodeResourceEditingId === null) {
      await adminApi.createRoadmapNodeResource(payload);
      window.alert("추천 자료를 등록했습니다.");
    } else {
      await adminApi.updateRoadmapNodeResource(nodeResourceEditingId, payload);
      window.alert("추천 자료를 수정했습니다.");
    }

    resetNodeResourceForm();
    await fetchNodeResources();
  } finally {
    nodeResourceSaving = false;
    syncNodeResourceFormState();
  }
}

async function deleteNodeResourceById(resourceId: number) {
  const resource = nodeResourceItems.find(
    (item) => item.resourceId === resourceId,
  );
  if (!resource) {
    window.alert("삭제할 추천 자료를 찾지 못했습니다.");
    return;
  }

  if (!window.confirm(`'${resource.title}' 추천 자료를 삭제하시겠습니까?`)) {
    return;
  }

  await adminApi.deleteRoadmapNodeResource(resourceId);
  if (nodeResourceEditingId === resourceId) {
    resetNodeResourceForm();
  }

  await fetchNodeResources();
  window.alert("추천 자료를 삭제했습니다.");
}

export function installNodeResourceBindings(runAdminAction: RunAdminAction) {
  const nodeResourceFilterInput = getElement<HTMLInputElement>(
    "nodeResourceFilterInput",
  );

  nodeResourceFilterInput.addEventListener("input", () => {
    nodeResourceFilterState.Query = nodeResourceFilterInput.value;
    applyNodeResourceFilters();
  });

  const nodeResourceRoadmapFilter = getElement<HTMLSelectElement>(
    "nodeResourceRoadmapFilter",
  );

  nodeResourceRoadmapFilter.addEventListener("change", () => {
    nodeResourceFilterState.RoadmapId = nodeResourceRoadmapFilter.value;
    nodeResourceFilterState.NodeId = "";
    renderNodeResourceFilterOptions();
    applyNodeResourceFilters();
  });

  const nodeResourceNodeFilter = getElement<HTMLSelectElement>(
    "nodeResourceNodeFilter",
  );

  nodeResourceNodeFilter.addEventListener("change", () => {
    nodeResourceFilterState.NodeId = nodeResourceNodeFilter.value;
    applyNodeResourceFilters();
  });

  const nodeResourceSourceFilter = getElement<HTMLSelectElement>(
    "nodeResourceSourceFilter",
  );

  nodeResourceSourceFilter.addEventListener("change", () => {
    nodeResourceFilterState.SourceType = nodeResourceSourceFilter.value;
    applyNodeResourceFilters();
  });

  const nodeResourceStatusFilter = getElement<HTMLSelectElement>(
    "nodeResourceStatusFilter",
  );

  nodeResourceStatusFilter.addEventListener("change", () => {
    nodeResourceFilterState.Status = nodeResourceStatusFilter.value;
    applyNodeResourceFilters();
  });

  getElement<HTMLButtonElement>("nodeResourceFilterReset").addEventListener(
    "click",
    () => {
      nodeResourceFilterState.Query = "";
      nodeResourceFilterState.RoadmapId = "";
      nodeResourceFilterState.NodeId = "";
      nodeResourceFilterState.SourceType = "";
      nodeResourceFilterState.Status = "";
      nodeResourceFilterInput.value = "";
      renderNodeResourceFilterOptions();
      applyNodeResourceFilters();
    },
  );

  const nodeResourceRoadmapSelect = getElement<HTMLSelectElement>(
    "nodeResourceRoadmapSelect",
  );

  nodeResourceRoadmapSelect.addEventListener("change", () => {
    const selectedRoadmapId = nodeResourceRoadmapSelect.value
      ? Number(nodeResourceRoadmapSelect.value)
      : null;
    renderNodeResourceNodeOptions(null, selectedRoadmapId);
    getElement<HTMLInputElement>("nodeResourceSortOrderInput").value = "";
  });

  const nodeResourceNodeSelect = getElement<HTMLSelectElement>(
    "nodeResourceNodeSelect",
  );

  nodeResourceNodeSelect.addEventListener("change", () => {
    const selectedNodeId = nodeResourceNodeSelect.value
      ? Number(nodeResourceNodeSelect.value)
      : null;
    const sortOrderInput = getElement<HTMLInputElement>(
      "nodeResourceSortOrderInput",
    );
    sortOrderInput.value =
      selectedNodeId === null
        ? ""
        : sortOrderInput.value.trim() && nodeResourceEditingId !== null
          ? sortOrderInput.value
          : String(getDefaultNodeResourceSortOrder(selectedNodeId));
  });

  const nodeResourceForm = getElement<HTMLFormElement>("nodeResourceForm");

  nodeResourceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void runAdminAction(async () => {
      await submitNodeResourceForm();
    });
  });

  getElement<HTMLButtonElement>("nodeResourceCancelEdit").addEventListener(
    "click",
    () => {
      resetNodeResourceForm();
    },
  );
}

export function installNodeResourceActions(runAdminAction: RunAdminAction) {
  window.editRoadmapNodeResource = (resourceId: number) => {
    const resource = nodeResourceItems.find(
      (item) => item.resourceId === resourceId,
    );
    if (!resource) {
      window.alert("수정할 추천 자료를 찾지 못했습니다.");
      return;
    }

    setNodeResourceForm(resource);
  };

  window.deleteRoadmapNodeResource = async (resourceId: number) => {
    await runAdminAction(async () => {
      await deleteNodeResourceById(resourceId);
    });
  };
}
