import { adminApi } from "../../lib/admin-api";
import type {
  AdminRoadmapHubCatalog,
  RoadmapHubItem,
  RoadmapHubSection,
} from "../../types/roadmap-hub";
import type {
  RoadmapHubFilterState,
  RoadmapHubVisibleSection,
} from "./admin-dashboard-support";
import {
  escapeHtml,
  formatNumber,
  matchesKeyword,
  normalizeText,
} from "./admin-dashboard-support";

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`${id} element was not found`);
  return element as T;
}

function moveArrayItem<T>(items: T[], index: number, direction: number) {
  const nextIndex = index + direction;
  if (
    index < 0 ||
    nextIndex < 0 ||
    index >= items.length ||
    nextIndex >= items.length
  )
    return;
  const [item] = items.splice(index, 1);
  items.splice(nextIndex, 0, item);
}

function getRoadmapHubSectionCollapseKey(
  section: RoadmapHubSection,
  sectionIndex: number,
) {
  return section.sectionKey.trim() || `section-${sectionIndex}`;
}

function buildCollapsedKeySet<T>(
  items: T[],
  getKey: (item: T, index: number) => string,
) {
  return new Set(items.map(getKey));
}

export const roadmapHubFilterState: RoadmapHubFilterState = {
  query: "",
  sectionKey: "",
  layoutType: "",
  status: "",
  featured: "",
  linked: "",
  linkedRoadmapId: "",
};

let collapsedRoadmapHubSectionKeys = new Set<string>();

let roadmapHubError: string | null = null;

let roadmapHubSaving = false;

let roadmapHubLoading = false;

let roadmapHubCatalog: AdminRoadmapHubCatalog = {
  sections: [],
  officialRoadmaps: [],
};

function setAllRoadmapHubSectionsCollapsed(collapsed: boolean) {
  collapsedRoadmapHubSectionKeys = collapsed
    ? buildCollapsedKeySet(
        roadmapHubCatalog.sections,
        getRoadmapHubSectionCollapseKey,
      )
    : new Set<string>();
  renderRoadmapHubEditor();
}

function toggleRoadmapHubSectionCollapsed(sectionIndex: number) {
  const section = roadmapHubCatalog.sections[sectionIndex];
  if (!section) {
    return;
  }

  const sectionKey = getRoadmapHubSectionCollapseKey(section, sectionIndex);
  if (collapsedRoadmapHubSectionKeys.has(sectionKey)) {
    collapsedRoadmapHubSectionKeys.delete(sectionKey);
  } else {
    collapsedRoadmapHubSectionKeys.add(sectionKey);
  }
  renderRoadmapHubEditor();
}

function cloneRoadmapHubCatalog(
  catalog: AdminRoadmapHubCatalog,
): AdminRoadmapHubCatalog {
  return {
    sections: catalog.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item })),
    })),
    officialRoadmaps: catalog.officialRoadmaps.map((roadmap) => ({
      ...roadmap,
    })),
  };
}

// 로드맵 허브 섹션과 항목 순서를 화면 표시 순서와 저장 순서로 맞춘다.
function reindexRoadmapHubSections(
  sections: RoadmapHubSection[],
): RoadmapHubSection[] {
  return [...(sections ?? [])].map((section, sectionIndex) => ({
    ...section,
    sectionKey: section.sectionKey ?? `section-${sectionIndex + 1}`,
    title: section.title ?? "",
    description: section.description ?? null,
    layoutType: section.layoutType ?? "CARD_GRID",
    sortOrder: sectionIndex,
    active: section.active ?? true,
    items: [...(section.items ?? [])].map((item, itemIndex) => ({
      ...item,
      title: item.title ?? "",
      subtitle: item.subtitle ?? null,
      category: item.category ?? null,
      iconClass: item.iconClass ?? null,
      iconColor: item.iconColor ?? null,
      sortOrder: itemIndex,
      active: item.active ?? true,
      featured: item.featured ?? false,
      linkedRoadmapId: item.linkedRoadmapId ?? null,
      linkedRoadmapTitle: item.linkedRoadmapTitle ?? null,
    })),
  }));
}

function createEmptyRoadmapHubItem(layoutType: string): RoadmapHubItem {
  return {
    title: "",
    subtitle: layoutType === "CARD_GRID" ? "공식 로드맵" : null,
    category: null,
    iconClass: layoutType === "CARD_GRID" ? "fas fa-map" : null,
    iconColor: layoutType === "CARD_GRID" ? "#64748B" : null,
    sortOrder: 0,
    active: true,
    featured: false,
    linkedRoadmapId: null,
    linkedRoadmapTitle: null,
  };
}

function createEmptyRoadmapHubSection(nextIndex: number): RoadmapHubSection {
  return {
    sectionKey: `section-${nextIndex + 1}`,
    title: "새 로드맵 섹션",
    description: null,
    layoutType: "CARD_GRID",
    sortOrder: nextIndex,
    active: true,
    items: [createEmptyRoadmapHubItem("CARD_GRID")],
  };
}

function updateRoadmapHubCatalog(
  mutator: (catalog: AdminRoadmapHubCatalog) => void,
) {
  const nextCatalog = cloneRoadmapHubCatalog(roadmapHubCatalog);
  mutator(nextCatalog);
  roadmapHubCatalog = {
    ...nextCatalog,
    sections: reindexRoadmapHubSections(nextCatalog.sections),
  };
  roadmapHubError = null;
  renderRoadmapHubEditor();
}

function updateRoadmapHubSaveButton() {
  const button = document.getElementById(
    "roadmapHubSaveButton",
  ) as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  button.disabled = roadmapHubSaving;
  button.classList.toggle("opacity-70", roadmapHubSaving);
  button.classList.toggle("cursor-not-allowed", roadmapHubSaving);
  button.innerHTML = roadmapHubSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : '<i class="fas fa-save mr-1"></i> 전체 저장';
}

function updateRoadmapHubSummary() {
  const summaryElement = document.getElementById("roadmapHubSummary");
  if (!summaryElement) {
    return;
  }

  const sectionCount = roadmapHubCatalog.sections.length;
  const itemCount = roadmapHubCatalog.sections.reduce(
    (sum, section) => sum + section.items.length,
    0,
  );
  summaryElement.textContent = `섹션 ${formatNumber(sectionCount)}개 · 항목 ${formatNumber(itemCount)}개`;
}

function hasRoadmapHubFilter() {
  return Boolean(
    roadmapHubFilterState.query.trim() ||
    roadmapHubFilterState.sectionKey ||
    roadmapHubFilterState.layoutType ||
    roadmapHubFilterState.status ||
    roadmapHubFilterState.featured ||
    roadmapHubFilterState.linked ||
    roadmapHubFilterState.linkedRoadmapId,
  );
}

function matchesRoadmapHubItem(
  section: RoadmapHubSection,
  item: RoadmapHubItem,
) {
  const keyword = normalizeText(roadmapHubFilterState.query);
  const matchesText = matchesKeyword(keyword, [
    section.sectionKey,
    section.title,
    section.description,
    item.title,
    item.subtitle,
    item.category,
    item.iconClass,
    item.iconColor,
    item.linkedRoadmapId,
    item.linkedRoadmapTitle,
  ]);
  const matchesStatus =
    !roadmapHubFilterState.status ||
    (roadmapHubFilterState.status === "ACTIVE" && item.active) ||
    (roadmapHubFilterState.status === "INACTIVE" && !item.active);
  const matchesFeatured =
    !roadmapHubFilterState.featured ||
    (roadmapHubFilterState.featured === "FEATURED" && item.featured) ||
    (roadmapHubFilterState.featured === "NORMAL" && !item.featured);
  const hasLinkedRoadmap =
    item.linkedRoadmapId !== null && item.linkedRoadmapId !== undefined;
  const matchesLinked =
    !roadmapHubFilterState.linked ||
    (roadmapHubFilterState.linked === "LINKED" && hasLinkedRoadmap) ||
    (roadmapHubFilterState.linked === "UNLINKED" && !hasLinkedRoadmap);
  const matchesLinkedRoadmap =
    !roadmapHubFilterState.linkedRoadmapId ||
    String(item.linkedRoadmapId ?? "") ===
      roadmapHubFilterState.linkedRoadmapId;

  return (
    matchesText &&
    matchesStatus &&
    matchesFeatured &&
    matchesLinked &&
    matchesLinkedRoadmap
  );
}

function getRoadmapHubFilterResult() {
  const visibleSections: RoadmapHubVisibleSection[] = [];
  let totalItemCount = 0;
  let visibleItemCount = 0;
  const filtered = hasRoadmapHubFilter();
  const sectionOnlySelected = Boolean(
    (roadmapHubFilterState.sectionKey || roadmapHubFilterState.layoutType) &&
    !roadmapHubFilterState.query.trim() &&
    !roadmapHubFilterState.status &&
    !roadmapHubFilterState.featured &&
    !roadmapHubFilterState.linked &&
    !roadmapHubFilterState.linkedRoadmapId,
  );

  roadmapHubCatalog.sections.forEach((section, sectionIndex) => {
    if (
      roadmapHubFilterState.sectionKey &&
      section.sectionKey !== roadmapHubFilterState.sectionKey
    ) {
      return;
    }

    if (
      roadmapHubFilterState.layoutType &&
      section.layoutType !== roadmapHubFilterState.layoutType
    ) {
      return;
    }

    const visibleItems = section.items
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => matchesRoadmapHubItem(section, item));

    totalItemCount += section.items.length;
    visibleItemCount += visibleItems.length;

    if (!filtered || visibleItems.length > 0 || sectionOnlySelected) {
      visibleSections.push({ section, sectionIndex, visibleItems });
    }
  });

  return {
    filtered,
    totalItemCount,
    visibleItemCount,
    visibleSections,
  };
}

function updateRoadmapHubFilterSummary(
  totalItemCount: number,
  visibleItemCount: number,
  filtered: boolean,
) {
  const summaryElement = document.getElementById("roadmapHubFilterSummary");
  if (!summaryElement) {
    return;
  }

  summaryElement.textContent = filtered
    ? `조건에 맞는 항목 ${formatNumber(visibleItemCount)}개 / 대상 ${formatNumber(totalItemCount)}개`
    : `전체 항목 ${formatNumber(totalItemCount)}개`;
}

function updateRoadmapHubSectionFilterOptions() {
  const select = document.getElementById(
    "roadmapHubSectionFilter",
  ) as HTMLSelectElement | null;
  if (!select) {
    return;
  }

  const sectionKeys = new Set(
    roadmapHubCatalog.sections.map((section) => section.sectionKey),
  );
  if (
    roadmapHubFilterState.sectionKey &&
    !sectionKeys.has(roadmapHubFilterState.sectionKey)
  ) {
    roadmapHubFilterState.sectionKey = "";
  }

  select.innerHTML = [
    '<option value="">전체 섹션</option>',
    ...roadmapHubCatalog.sections.map(
      (section) => `
        <option value="${escapeHtml(section.sectionKey)}" ${roadmapHubFilterState.sectionKey === section.sectionKey ? "selected" : ""}>
          ${escapeHtml(section.title)} (${escapeHtml(section.sectionKey)})
        </option>`,
    ),
  ].join("");
  select.value = roadmapHubFilterState.sectionKey;
}

function updateRoadmapHubRoadmapFilterOptions() {
  const select = document.getElementById(
    "roadmapHubRoadmapFilter",
  ) as HTMLSelectElement | null;
  if (!select) {
    return;
  }

  const linkedRoadmapById = new Map<number, string>();
  roadmapHubCatalog.sections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.linkedRoadmapId !== null && item.linkedRoadmapId !== undefined) {
        linkedRoadmapById.set(
          item.linkedRoadmapId,
          item.linkedRoadmapTitle ?? `로드맵 #${item.linkedRoadmapId}`,
        );
      }
    });
  });

  if (
    roadmapHubFilterState.linkedRoadmapId &&
    !linkedRoadmapById.has(Number(roadmapHubFilterState.linkedRoadmapId))
  ) {
    roadmapHubFilterState.linkedRoadmapId = "";
  }

  select.innerHTML = [
    '<option value="">전체 연결 로드맵</option>',
    ...Array.from(linkedRoadmapById.entries())
      .sort(([, leftTitle], [, rightTitle]) =>
        leftTitle.localeCompare(rightTitle, "ko"),
      )
      .map(
        ([roadmapId, title]) =>
          `<option value="${roadmapId}" ${roadmapHubFilterState.linkedRoadmapId === String(roadmapId) ? "selected" : ""}>${escapeHtml(title)}</option>`,
      ),
  ].join("");
  select.value = roadmapHubFilterState.linkedRoadmapId;
}

function buildRoadmapHubLayoutOptions(selectedValue: string) {
  return [
    ["CARD_GRID", "카드 그리드"],
    ["CHIP_GRID", "칩 그리드"],
    ["LINK_LIST", "링크 리스트"],
  ]
    .map(
      ([value, label]) =>
        `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${label}</option>`,
    )
    .join("");
}

function buildRoadmapHubOfficialRoadmapOptions(
  selectedRoadmapId: number | null,
) {
  const selectedValue =
    selectedRoadmapId === null ? "" : String(selectedRoadmapId);

  return [
    '<option value="">연결 안 함</option>',
    ...roadmapHubCatalog.officialRoadmaps.map(
      (roadmap) => `
        <option value="${roadmap.roadmapId}" ${selectedValue === String(roadmap.roadmapId) ? "selected" : ""}>
          ${escapeHtml(roadmap.title)}
        </option>`,
    ),
  ].join("");
}

export function renderRoadmapHubEditor() {
  const container = getElement("roadmapHubEditor");
  updateRoadmapHubSaveButton();
  updateRoadmapHubSummary();
  updateRoadmapHubSectionFilterOptions();
  updateRoadmapHubRoadmapFilterOptions();

  if (roadmapHubLoading) {
    updateRoadmapHubFilterSummary(0, 0, hasRoadmapHubFilter());
    container.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
        <i class="fas fa-circle-notch fa-spin mr-2"></i> 로드맵 허브 구성을 불러오는 중입니다.
      </div>
    `;
    return;
  }

  if (roadmapHubError) {
    updateRoadmapHubFilterSummary(0, 0, hasRoadmapHubFilter());
    container.innerHTML = `
      <div class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-600">
        <div class="font-semibold">${escapeHtml(roadmapHubError)}</div>
        <button onclick="refreshCurrentTab()" class="mt-4 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50" type="button">
          다시 불러오기
        </button>
      </div>
    `;
    return;
  }

  if (roadmapHubCatalog.sections.length === 0) {
    updateRoadmapHubFilterSummary(0, 0, hasRoadmapHubFilter());
    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        등록된 로드맵 허브 섹션이 없습니다.
      </div>
    `;
    return;
  }

  const filterResult = getRoadmapHubFilterResult();
  updateRoadmapHubFilterSummary(
    filterResult.totalItemCount,
    filterResult.visibleItemCount,
    filterResult.filtered,
  );

  if (filterResult.visibleSections.length === 0) {
    container.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        조건에 맞는 섹션이 없습니다.
      </div>
    `;
    return;
  }

  container.innerHTML = filterResult.visibleSections
    .map(({ section, sectionIndex, visibleItems }) =>
      renderRoadmapHubSectionCard(
        section,
        sectionIndex,
        visibleItems,
        filterResult.filtered,
      ),
    )
    .join("");
}

function renderRoadmapHubSectionCard(
  section: RoadmapHubSection,
  sectionIndex: number,
  visibleItems = section.items.map((item, itemIndex) => ({ item, itemIndex })),
  filtered = false,
) {
  const sectionKey = getRoadmapHubSectionCollapseKey(section, sectionIndex);
  const collapsed = collapsedRoadmapHubSectionKeys.has(sectionKey);
  const emptyItemsMessage = filtered
    ? "필터 조건에 맞는 항목이 없습니다."
    : "등록된 항목이 없습니다.";
  const itemCountText = filtered
    ? `표시 ${formatNumber(visibleItems.length)}개 / 전체 ${formatNumber(section.items.length)}개`
    : `항목 ${formatNumber(section.items.length)}개`;
  let sectionBodyHtml = "";
  if (!collapsed) {
    const itemsHtml = visibleItems.length
      ? visibleItems
          .map(({ item, itemIndex }) =>
            renderRoadmapHubItemRow(sectionIndex, item, itemIndex),
          )
          .join("")
      : `
        <div class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400">
          ${escapeHtml(emptyItemsMessage)}
        </div>
      `;

    sectionBodyHtml = `
      <div class="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-medium leading-5 text-emerald-700">
        공개 로드맵 허브의 상단 탭은 섹션 제목으로 표시됩니다. CARD_GRID는 카드형 탭, CHIP_GRID는 기술 버튼형 탭으로 보이고, 항목 카테고리 값이 탭 안의 그룹 제목이 됩니다.
      </div>
      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">섹션 key</span>
          <input
            value="${escapeHtml(section.sectionKey)}"
            oninput="updateRoadmapHubSectionField(${sectionIndex}, 'sectionKey', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: role-based"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">섹션 제목</span>
          <input
            value="${escapeHtml(section.title)}"
            oninput="updateRoadmapHubSectionField(${sectionIndex}, 'title', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 역할 기반 로드맵"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">레이아웃</span>
          <select
            onchange="updateRoadmapHubSectionField(${sectionIndex}, 'layoutType', this.value)"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            ${buildRoadmapHubLayoutOptions(section.layoutType)}
          </select>
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${section.active ? "checked" : ""}
            onchange="updateRoadmapHubSectionActive(${sectionIndex}, this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">공개 허브에서 사용</span>
        </label>
      </div>

      <label class="mt-4 block">
        <span class="mb-1 block text-[11px] font-bold text-slate-500">설명</span>
        <textarea
          oninput="updateRoadmapHubSectionField(${sectionIndex}, 'description', this.value)"
          class="min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          placeholder="섹션 설명이 필요하면 입력하세요."
        >${escapeHtml(section.description ?? "")}</textarea>
      </label>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h4 class="text-sm font-bold text-slate-800">섹션 항목</h4>
            <p class="mt-1 text-xs text-slate-500">항목 제목, 아이콘, 연결 로드맵, 강조 여부를 수정합니다.</p>
          </div>
          <button onclick="addRoadmapHubItem(${sectionIndex})" class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50" type="button">
            <i class="fas fa-plus mr-1"></i> 항목 추가
          </button>
        </div>
        <div class="space-y-3">${itemsHtml}</div>
      </div>
    `;
  }

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 ${collapsed ? "" : "border-b border-slate-100 pb-5"} xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">섹션 ${sectionIndex + 1}</span>
            <span class="rounded-full px-2.5 py-1 text-[11px] font-bold ${section.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}">${section.active ? "활성" : "비활성"}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">${escapeHtml(section.layoutType)}</span>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">${escapeHtml(itemCountText)}</span>
          </div>
          <h3 class="mt-3 text-lg font-bold text-slate-900">${escapeHtml(section.title || "새 로드맵 섹션")}</h3>
          <p class="mt-1 text-xs text-slate-500">key: ${escapeHtml(section.sectionKey || "-")}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="toggleRoadmapHubSectionCollapsed(${sectionIndex})" aria-expanded="${!collapsed}" class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100" type="button">
            <i class="fas ${collapsed ? "fa-chevron-down" : "fa-chevron-up"} mr-1"></i> ${collapsed ? "펼치기" : "접기"}
          </button>
          <button onclick="moveRoadmapHubSection(${sectionIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button onclick="moveRoadmapHubSection(${sectionIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button onclick="deleteRoadmapHubSection(${sectionIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 삭제
          </button>
        </div>
      </div>
      ${sectionBodyHtml}
    </section>
  `;
}

function renderRoadmapHubItemRow(
  sectionIndex: number,
  item: RoadmapHubItem,
  itemIndex: number,
) {
  return `
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">항목 ${itemIndex + 1}</span>
          <span class="rounded-full px-2.5 py-1 text-[11px] font-bold ${item.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}">${item.active ? "활성" : "비활성"}</span>
          ${item.featured ? '<span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">강조</span>' : ""}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="moveRoadmapHubItem(${sectionIndex}, ${itemIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button onclick="moveRoadmapHubItem(${sectionIndex}, ${itemIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button onclick="removeRoadmapHubItem(${sectionIndex}, ${itemIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 삭제
          </button>
        </div>
      </div>

      <div class="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_260px]">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">항목 제목</span>
          <input
            value="${escapeHtml(item.title)}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'title', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: Frontend"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">부제</span>
          <input
            value="${escapeHtml(item.subtitle ?? "")}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'subtitle', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: Frontend Roadmap"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">카테고리</span>
          <input
            value="${escapeHtml(item.category ?? "")}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'category', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 웹 개발"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">연결 공식 로드맵</span>
          <select
            onchange="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'linkedRoadmapId', this.value)"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            ${buildRoadmapHubOfficialRoadmapOptions(item.linkedRoadmapId)}
          </select>
        </label>
      </div>

      <div class="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_auto_auto]">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">아이콘 클래스</span>
          <input
            value="${escapeHtml(item.iconClass ?? "")}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'iconClass', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: fas fa-server"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">아이콘 색상</span>
          <input
            value="${escapeHtml(item.iconColor ?? "")}"
            oninput="updateRoadmapHubItemField(${sectionIndex}, ${itemIndex}, 'iconColor', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: #00C471"
          />
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${item.active ? "checked" : ""}
            onchange="updateRoadmapHubItemToggle(${sectionIndex}, ${itemIndex}, 'active', this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">노출</span>
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${item.featured ? "checked" : ""}
            onchange="updateRoadmapHubItemToggle(${sectionIndex}, ${itemIndex}, 'featured', this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">강조 카드</span>
        </label>
      </div>
    </div>
  `;
}

export async function fetchRoadmapHubCatalog() {
  roadmapHubLoading = true;
  roadmapHubError = null;
  renderRoadmapHubEditor();

  try {
    const response = await adminApi.getRoadmapHubCatalog();
    roadmapHubCatalog = {
      ...response,
      sections: reindexRoadmapHubSections(response.sections),
    };
    collapsedRoadmapHubSectionKeys = buildCollapsedKeySet(
      roadmapHubCatalog.sections,
      getRoadmapHubSectionCollapseKey,
    );
  } catch (error) {
    roadmapHubError =
      error instanceof Error
        ? error.message
        : "로드맵 허브 구성을 불러오지 못했습니다.";
  } finally {
    roadmapHubLoading = false;
    renderRoadmapHubEditor();
  }
}

async function saveRoadmapHubCatalog() {
  if (roadmapHubCatalog.sections.length === 0) {
    window.alert("최소 한 개 이상의 섹션이 필요합니다.");
    return;
  }

  roadmapHubSaving = true;
  renderRoadmapHubEditor();

  try {
    const savedCatalog = await adminApi.updateRoadmapHubCatalog({
      sections: reindexRoadmapHubSections(roadmapHubCatalog.sections),
    });
    roadmapHubCatalog = {
      ...savedCatalog,
      sections: reindexRoadmapHubSections(savedCatalog.sections),
    };
    roadmapHubError = null;
    renderRoadmapHubEditor();
    window.alert("로드맵 허브 구성을 저장했습니다.");
  } catch (error) {
    roadmapHubError =
      error instanceof Error
        ? error.message
        : "로드맵 허브 구성을 저장하지 못했습니다.";
    renderRoadmapHubEditor();
    window.alert(roadmapHubError);
  } finally {
    roadmapHubSaving = false;
    renderRoadmapHubEditor();
  }
}

export function installRoadmapHubActions() {
  window.createRoadmapHubSection = () => {
    updateRoadmapHubCatalog((catalog) => {
      catalog.sections.push(
        createEmptyRoadmapHubSection(catalog.sections.length),
      );
    });
  };

  window.saveRoadmapHubCatalog = async () => {
    await saveRoadmapHubCatalog();
  };

  window.setAllRoadmapHubSectionsCollapsed = (collapsed: boolean) => {
    setAllRoadmapHubSectionsCollapsed(collapsed);
  };

  window.toggleRoadmapHubSectionCollapsed = (sectionIndex: number) => {
    toggleRoadmapHubSectionCollapsed(sectionIndex);
  };

  window.moveRoadmapHubSection = (sectionIndex: number, direction: number) => {
    updateRoadmapHubCatalog((catalog) => {
      moveArrayItem(catalog.sections, sectionIndex, direction);
    });
  };

  window.deleteRoadmapHubSection = (sectionIndex: number) => {
    if (!window.confirm("이 로드맵 허브 섹션을 삭제하시겠습니까?")) {
      return;
    }

    updateRoadmapHubCatalog((catalog) => {
      catalog.sections.splice(sectionIndex, 1);
    });
  };

  window.updateRoadmapHubSectionField = (
    sectionIndex: number,
    field: string,
    value: string,
  ) => {
    updateRoadmapHubCatalog((catalog) => {
      const section = catalog.sections[sectionIndex];
      if (!section) {
        return;
      }

      switch (field) {
        case "sectionKey":
          section.sectionKey = value.trim();
          break;
        case "title":
          section.title = value;
          break;
        case "description":
          section.description = value.trim() ? value : null;
          break;
        case "layoutType":
          section.layoutType = value;
          break;
      }
    });
  };

  window.updateRoadmapHubSectionActive = (
    sectionIndex: number,
    checked: boolean,
  ) => {
    updateRoadmapHubCatalog((catalog) => {
      const section = catalog.sections[sectionIndex];
      if (section) {
        section.active = checked;
      }
    });
  };

  window.addRoadmapHubItem = (sectionIndex: number) => {
    updateRoadmapHubCatalog((catalog) => {
      const section = catalog.sections[sectionIndex];
      if (!section) {
        return;
      }

      section.items.push(createEmptyRoadmapHubItem(section.layoutType));
    });
  };

  window.moveRoadmapHubItem = (
    sectionIndex: number,
    itemIndex: number,
    direction: number,
  ) => {
    updateRoadmapHubCatalog((catalog) => {
      const items = catalog.sections[sectionIndex]?.items;
      if (items) {
        moveArrayItem(items, itemIndex, direction);
      }
    });
  };

  window.removeRoadmapHubItem = (sectionIndex: number, itemIndex: number) => {
    updateRoadmapHubCatalog((catalog) => {
      catalog.sections[sectionIndex]?.items.splice(itemIndex, 1);
    });
  };

  window.updateRoadmapHubItemField = (
    sectionIndex: number,
    itemIndex: number,
    field: string,
    value: string,
  ) => {
    updateRoadmapHubCatalog((catalog) => {
      const item = catalog.sections[sectionIndex]?.items[itemIndex];
      if (!item) {
        return;
      }

      switch (field) {
        case "title":
          item.title = value;
          break;
        case "subtitle":
          item.subtitle = value.trim() ? value : null;
          break;
        case "category":
          item.category = value.trim() ? value : null;
          break;
        case "iconClass":
          item.iconClass = value.trim() ? value : null;
          break;
        case "iconColor":
          item.iconColor = value.trim() ? value : null;
          break;
        case "linkedRoadmapId":
          item.linkedRoadmapId =
            value.trim() && Number.isFinite(Number(value))
              ? Number(value)
              : null;
          item.linkedRoadmapTitle =
            catalog.officialRoadmaps.find(
              (roadmap) => String(roadmap.roadmapId) === value,
            )?.title ?? null;
          break;
      }
    });
  };

  window.updateRoadmapHubItemToggle = (
    sectionIndex: number,
    itemIndex: number,
    field: string,
    checked: boolean,
  ) => {
    updateRoadmapHubCatalog((catalog) => {
      const item = catalog.sections[sectionIndex]?.items[itemIndex];
      if (!item) {
        return;
      }

      if (field === "active") {
        item.active = checked;
      }

      if (field === "featured") {
        item.featured = checked;
      }
    });
  };
}
