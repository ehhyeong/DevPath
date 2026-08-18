import { renderAdminMarkup } from './admin-react-renderer'
import { adminActions } from './admin-action-registry'
import { adminApi } from "../../lib/admin-api";
import type {
  CourseCatalogCategory,
  CourseCatalogGroup,
  CourseCatalogGroupItem,
  CourseCatalogMegaMenuItem,
  CourseCatalogMenu,
} from "../../types/course-catalog";
import { escapeHtml, formatNumber } from "./admin-dashboard-support";

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`${id} element was not found`);
  return element as T;
}

let collapsedCatalogCategoryKeys = new Set<string>();

let courseCatalogMenuError: string | null = null;

let courseCatalogMenuSaving = false;

let courseCatalogMenuLoading = false;

let courseCatalogMenu: CourseCatalogMenu = { categories: [] };

function cloneCourseCatalogMenu(menu: CourseCatalogMenu): CourseCatalogMenu {
  return {
    categories: menu.categories.map((category) => ({
      ...category,
      megaMenuItems: category.megaMenuItems.map((item) => ({ ...item })),
      groups: category.groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ ...item })),
      })),
    })),
  };
}

// 배열 순서를 화면 표시 순서와 저장 순서로 그대로 맞춘다.
function reindexCourseCatalogMenu(menu: CourseCatalogMenu): CourseCatalogMenu {
  const categories = [...(menu.categories ?? [])].map(
    (category, categoryIndex) => ({
      ...category,
      sortOrder: categoryIndex,
      megaMenuItems: [...(category.megaMenuItems ?? [])].map(
        (item, itemIndex) => ({
          ...item,
          label: item.label ?? "",
          sortOrder: itemIndex,
        }),
      ),
      groups: [...(category.groups ?? [])].map((group, groupIndex) => ({
        ...group,
        name: group.name ?? "",
        sortOrder: groupIndex,
        items: [...(group.items ?? [])].map((item, itemIndex) => ({
          ...item,
          name: item.name ?? "",
          linkedCategoryKey: item.linkedCategoryKey ?? null,
          sortOrder: itemIndex,
        })),
      })),
    }),
  );

  return { categories };
}

function createEmptyCatalogMegaMenuItem(): CourseCatalogMegaMenuItem {
  return { label: "", sortOrder: 0 };
}

function createEmptyCatalogGroupItem(): CourseCatalogGroupItem {
  return { name: "", linkedCategoryKey: null, sortOrder: 0 };
}

function createEmptyCatalogGroup(): CourseCatalogGroup {
  return { name: "", sortOrder: 0, items: [createEmptyCatalogGroupItem()] };
}

function createEmptyCatalogCategory(nextIndex: number): CourseCatalogCategory {
  return {
    categoryKey: `category-${nextIndex + 1}`,
    label: "새 카테고리",
    title: "새 강의 목록",
    iconClass: "fas fa-folder",
    sortOrder: nextIndex,
    active: true,
    megaMenuItems: [createEmptyCatalogMegaMenuItem()],
    groups: [createEmptyCatalogGroup()],
  };
}

function moveArrayItem<T>(items: T[], index: number, direction: number) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return;
  }

  const [movedItem] = items.splice(index, 1);
  items.splice(nextIndex, 0, movedItem);
}

function getCatalogCategoryCollapseKey(
  category: CourseCatalogCategory,
  categoryIndex: number,
) {
  return (
    String(category.categoryKey ?? "").trim() ||
    `category-index-${categoryIndex}`
  );
}

function buildCollapsedKeySet<T>(
  items: T[],
  getKey: (item: T, index: number) => string,
) {
  return new Set(items.map((item, index) => getKey(item, index)));
}

function setAllCatalogCategoriesCollapsed(collapsed: boolean) {
  collapsedCatalogCategoryKeys = collapsed
    ? buildCollapsedKeySet(
        courseCatalogMenu.categories,
        getCatalogCategoryCollapseKey,
      )
    : new Set<string>();
  renderCourseCatalogMenuEditor();
}

function toggleCatalogCategoryCollapsed(categoryIndex: number) {
  const category = courseCatalogMenu.categories[categoryIndex];
  if (!category) {
    return;
  }

  const categoryKey = getCatalogCategoryCollapseKey(category, categoryIndex);
  if (collapsedCatalogCategoryKeys.has(categoryKey)) {
    collapsedCatalogCategoryKeys.delete(categoryKey);
  } else {
    collapsedCatalogCategoryKeys.add(categoryKey);
  }
  renderCourseCatalogMenuEditor();
}

function updateCatalogMenu(mutator: (menu: CourseCatalogMenu) => void) {
  const nextMenu = cloneCourseCatalogMenu(courseCatalogMenu);
  mutator(nextMenu);
  courseCatalogMenu = reindexCourseCatalogMenu(nextMenu);
  courseCatalogMenuError = null;
  renderCourseCatalogMenuEditor();
}

function updateCatalogMenuSaveButton() {
  const button = document.getElementById(
    "catalogMenuSaveButton",
  ) as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  button.disabled = courseCatalogMenuSaving;
  button.classList.toggle("opacity-70", courseCatalogMenuSaving);
  button.classList.toggle("cursor-not-allowed", courseCatalogMenuSaving);
  renderAdminMarkup(button, courseCatalogMenuSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : '<i class="fas fa-save mr-1"></i> 전체 저장');
}

function updateCatalogMenuSummary() {
  const summaryElement = document.getElementById("catalogMenuSummary");
  if (!summaryElement) {
    return;
  }

  const categoryCount = courseCatalogMenu.categories.length;
  const groupCount = courseCatalogMenu.categories.reduce(
    (sum, category) => sum + category.groups.length,
    0,
  );
  const itemCount = courseCatalogMenu.categories.reduce(
    (sum, category) =>
      sum +
      category.groups.reduce(
        (groupSum, group) => groupSum + group.items.length,
        0,
      ),
    0,
  );
  summaryElement.textContent = `카테고리 ${formatNumber(categoryCount)}개 · 그룹 ${formatNumber(groupCount)}개 · 항목 ${formatNumber(itemCount)}개`;
}

function renderCourseCatalogMenuEditor() {
  const container = getElement("catalogMenuEditor");
  updateCatalogMenuSaveButton();
  updateCatalogMenuSummary();

  if (courseCatalogMenuLoading) {
    renderAdminMarkup(container, `
      <div class="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
        <i class="fas fa-circle-notch fa-spin mr-2"></i> 강의 메뉴를 불러오는 중입니다.
      </div>
    `);
    return;
  }

  if (courseCatalogMenuError) {
    renderAdminMarkup(container, `
      <div class="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm text-rose-600">
        <div class="font-semibold">${escapeHtml(courseCatalogMenuError)}</div>
        <button data-admin-click="refreshCurrentTab()" class="mt-4 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50" type="button">
          다시 불러오기
        </button>
      </div>
    `);
    return;
  }

  if (courseCatalogMenu.categories.length === 0) {
    renderAdminMarkup(container, `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
        등록된 강의 메뉴가 없습니다.
      </div>
    `);
    return;
  }

  renderAdminMarkup(container, courseCatalogMenu.categories
    .map((category, categoryIndex) =>
      renderCatalogCategoryCard(category, categoryIndex),
    )
    .join(""));
}

function renderCatalogCategoryCard(
  category: CourseCatalogCategory,
  categoryIndex: number,
) {
  const categoryKey = getCatalogCategoryCollapseKey(category, categoryIndex);
  const collapsed = collapsedCatalogCategoryKeys.has(categoryKey);
  const filterItemCount = category.groups.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  const summaryBadgesHtml = `
    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">메가메뉴 ${formatNumber(category.megaMenuItems.length)}개</span>
    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">그룹 ${formatNumber(category.groups.length)}개</span>
    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">필터 ${formatNumber(filterItemCount)}개</span>
  `;

  let categoryBodyHtml = "";
  if (!collapsed) {
    const groupsHtml = category.groups.length
      ? category.groups
          .map((group, groupIndex) =>
            renderCatalogGroupCard(categoryIndex, group, groupIndex),
          )
          .join("")
      : `
        <div class="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400">
          등록된 그룹이 없습니다.
        </div>
      `;

    const megaMenuHtml = category.megaMenuItems.length
      ? category.megaMenuItems
          .map(
            (item, itemIndex) => `
              <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <input
                  value="${escapeHtml(item.label)}"
                  oninput="updateCatalogMegaMenuItemLabel(${categoryIndex}, ${itemIndex}, this.value)"
                  type="text"
                  class="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                  placeholder="메가메뉴 라벨"
                />
                <div class="flex items-center gap-1 text-slate-400">
                  <button data-admin-click="moveCatalogMegaMenuItem(${categoryIndex}, ${itemIndex}, -1)" class="rounded p-1 transition hover:bg-slate-100 hover:text-slate-700" type="button">
                    <i class="fas fa-arrow-up text-xs"></i>
                  </button>
                  <button data-admin-click="moveCatalogMegaMenuItem(${categoryIndex}, ${itemIndex}, 1)" class="rounded p-1 transition hover:bg-slate-100 hover:text-slate-700" type="button">
                    <i class="fas fa-arrow-down text-xs"></i>
                  </button>
                  <button data-admin-click="removeCatalogMegaMenuItem(${categoryIndex}, ${itemIndex})" class="rounded p-1 transition hover:bg-rose-50 hover:text-rose-600" type="button">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>`,
          )
          .join("")
      : `
        <div class="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
          등록된 메가메뉴 항목이 없습니다.
        </div>
      `;

    categoryBodyHtml = `
      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">key</span>
          <input
            value="${escapeHtml(category.categoryKey)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'categoryKey', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: dev"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">라벨</span>
          <input
            value="${escapeHtml(category.label)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'label', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 개발"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">타이틀</span>
          <input
            value="${escapeHtml(category.title)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'title', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 개발 강의"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">아이콘 클래스</span>
          <input
            value="${escapeHtml(category.iconClass)}"
            oninput="updateCatalogCategoryField(${categoryIndex}, 'iconClass', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: fas fa-laptop-code"
          />
        </label>
        <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            ${category.active ? "checked" : ""}
            data-admin-change="updateCatalogCategoryActive(${categoryIndex}, this.checked)"
            type="checkbox"
            class="h-4 w-4 accent-indigo-600"
          />
          <span class="text-sm font-medium text-slate-700">공개 메뉴에서 사용</span>
        </label>
      </div>

      <div class="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-bold text-slate-800">메가메뉴 항목</h4>
            <button data-admin-click="addCatalogMegaMenuItem(${categoryIndex})" class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50" type="button">
              <i class="fas fa-plus mr-1"></i> 항목 추가
            </button>
          </div>
          <div class="space-y-2">${megaMenuHtml}</div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div class="mb-3 flex items-center justify-between">
            <h4 class="text-sm font-bold text-slate-800">필터 그룹</h4>
            <button data-admin-click="addCatalogGroup(${categoryIndex})" class="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50" type="button">
              <i class="fas fa-plus mr-1"></i> 그룹 추가
            </button>
          </div>
          <div class="space-y-4">${groupsHtml}</div>
        </div>
      </div>
    `;
  }

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 ${collapsed ? "" : "border-b border-slate-100 pb-5"} xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">카테고리 ${categoryIndex + 1}</span>
            <span class="rounded-full px-2.5 py-1 text-[11px] font-bold ${category.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}">${category.active ? "활성" : "비활성"}</span>
            ${summaryBadgesHtml}
          </div>
          <h3 class="mt-3 text-lg font-bold text-slate-900">${escapeHtml(category.label || "새 카테고리")}</h3>
          <p class="mt-1 text-xs text-slate-500">key: ${escapeHtml(category.categoryKey || "-")}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button data-admin-click="toggleCatalogCategoryCollapsed(${categoryIndex})" aria-expanded="${!collapsed}" class="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100" type="button">
            <i class="fas ${collapsed ? "fa-chevron-down" : "fa-chevron-up"} mr-1"></i> ${collapsed ? "펼치기" : "접기"}
          </button>
          <button data-admin-click="moveCatalogCategory(${categoryIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button data-admin-click="moveCatalogCategory(${categoryIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button data-admin-click="deleteCatalogCategory(${categoryIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 삭제
          </button>
        </div>
      </div>
      ${categoryBodyHtml}
    </section>
  `;
}

function buildCatalogCategoryOptions(selectedValue: string | null) {
  const normalizedValue = selectedValue ?? "";

  return [
    `<option value="">직접 텍스트 필터</option>`,
    ...courseCatalogMenu.categories.map(
      (category) => `
        <option value="${escapeHtml(category.categoryKey)}" ${normalizedValue === category.categoryKey ? "selected" : ""}>
          ${escapeHtml(category.label)} (${escapeHtml(category.categoryKey)})
        </option>`,
    ),
  ].join("");
}

function renderCatalogGroupCard(
  categoryIndex: number,
  group: CourseCatalogGroup,
  groupIndex: number,
) {
  const itemsHtml = group.items.length
    ? group.items
        .map((item, itemIndex) =>
          renderCatalogGroupItemRow(categoryIndex, groupIndex, item, itemIndex),
        )
        .join("")
    : `
      <div class="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
        등록된 필터 항목이 없습니다.
      </div>
    `;

  return `
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">그룹 ${groupIndex + 1}</span>
          <input
            value="${escapeHtml(group.name)}"
            oninput="updateCatalogGroupField(${categoryIndex}, ${groupIndex}, 'name', this.value)"
            type="text"
            class="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: 언어 (Language)"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button data-admin-click="moveCatalogGroup(${categoryIndex}, ${groupIndex}, -1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up mr-1"></i> 위로
          </button>
          <button data-admin-click="moveCatalogGroup(${categoryIndex}, ${groupIndex}, 1)" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down mr-1"></i> 아래로
          </button>
          <button data-admin-click="addCatalogGroupItem(${categoryIndex}, ${groupIndex})" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50" type="button">
            <i class="fas fa-plus mr-1"></i> 항목 추가
          </button>
          <button data-admin-click="removeCatalogGroup(${categoryIndex}, ${groupIndex})" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100" type="button">
            <i class="fas fa-trash mr-1"></i> 그룹 삭제
          </button>
        </div>
      </div>

      <div class="mt-4 space-y-3">${itemsHtml}</div>
    </div>
  `;
}

function renderCatalogGroupItemRow(
  categoryIndex: number,
  groupIndex: number,
  item: CourseCatalogGroupItem,
  itemIndex: number,
) {
  return `
    <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px_auto]">
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">항목명</span>
          <input
            value="${escapeHtml(item.name)}"
            oninput="updateCatalogGroupItemField(${categoryIndex}, ${groupIndex}, ${itemIndex}, 'name', this.value)"
            type="text"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="예: Java"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-[11px] font-bold text-slate-500">연결 카테고리</span>
          <select
            data-admin-change="updateCatalogGroupItemField(${categoryIndex}, ${groupIndex}, ${itemIndex}, 'linkedCategoryKey', this.value)"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            ${buildCatalogCategoryOptions(item.linkedCategoryKey)}
          </select>
        </label>
        <div class="flex items-end justify-end gap-1 text-slate-400">
          <button data-admin-click="moveCatalogGroupItem(${categoryIndex}, ${groupIndex}, ${itemIndex}, -1)" class="rounded p-2 transition hover:bg-white hover:text-slate-700" type="button">
            <i class="fas fa-arrow-up text-xs"></i>
          </button>
          <button data-admin-click="moveCatalogGroupItem(${categoryIndex}, ${groupIndex}, ${itemIndex}, 1)" class="rounded p-2 transition hover:bg-white hover:text-slate-700" type="button">
            <i class="fas fa-arrow-down text-xs"></i>
          </button>
          <button data-admin-click="removeCatalogGroupItem(${categoryIndex}, ${groupIndex}, ${itemIndex})" class="rounded p-2 transition hover:bg-rose-50 hover:text-rose-600" type="button">
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      </div>
      <p class="mt-2 text-[11px] text-slate-400">
        연결 카테고리를 지정하면 상위 메뉴에서 해당 카테고리 필터로 바로 연결됩니다.
      </p>
    </div>
  `;
}

export async function fetchCourseCatalogMenu() {
  courseCatalogMenuLoading = true;
  courseCatalogMenuError = null;
  renderCourseCatalogMenuEditor();

  try {
    const response = await adminApi.getCourseCatalogMenu();
    courseCatalogMenu = reindexCourseCatalogMenu(response);
    collapsedCatalogCategoryKeys = buildCollapsedKeySet(
      courseCatalogMenu.categories,
      getCatalogCategoryCollapseKey,
    );
  } catch (error) {
    courseCatalogMenuError =
      error instanceof Error
        ? error.message
        : "강의 메뉴를 불러오지 못했습니다.";
  } finally {
    courseCatalogMenuLoading = false;
    renderCourseCatalogMenuEditor();
  }
}

async function saveCourseCatalogMenu() {
  if (courseCatalogMenu.categories.length === 0) {
    window.alert("최소 한 개 이상의 카테고리가 필요합니다.");
    return;
  }

  courseCatalogMenuSaving = true;
  renderCourseCatalogMenuEditor();

  try {
    const savedMenu = await adminApi.updateCourseCatalogMenu(
      reindexCourseCatalogMenu(courseCatalogMenu),
    );
    courseCatalogMenu = reindexCourseCatalogMenu(savedMenu);
    courseCatalogMenuError = null;
    renderCourseCatalogMenuEditor();
    window.alert("강의 메뉴를 저장했습니다.");
  } catch (error) {
    courseCatalogMenuError =
      error instanceof Error
        ? error.message
        : "강의 메뉴를 저장하지 못했습니다.";
    renderCourseCatalogMenuEditor();
    window.alert(courseCatalogMenuError);
  } finally {
    courseCatalogMenuSaving = false;
    renderCourseCatalogMenuEditor();
  }
}

export function installCourseCatalogActions() {
  adminActions.createCatalogCategory = () => {
    updateCatalogMenu((menu) => {
      menu.categories.push(createEmptyCatalogCategory(menu.categories.length));
    });
  };

  adminActions.saveCourseCatalogMenu = async () => {
    await saveCourseCatalogMenu();
  };

  adminActions.setAllCatalogCategoriesCollapsed = (collapsed: boolean) => {
    setAllCatalogCategoriesCollapsed(collapsed);
  };

  adminActions.toggleCatalogCategoryCollapsed = (categoryIndex: number) => {
    toggleCatalogCategoryCollapsed(categoryIndex);
  };

  adminActions.moveCatalogCategory = (categoryIndex: number, direction: number) => {
    updateCatalogMenu((menu) => {
      moveArrayItem(menu.categories, categoryIndex, direction);
    });
  };

  adminActions.deleteCatalogCategory = (categoryIndex: number) => {
    if (!window.confirm("이 카테고리를 삭제하시겠습니까?")) {
      return;
    }

    updateCatalogMenu((menu) => {
      menu.categories.splice(categoryIndex, 1);
    });
  };

  adminActions.updateCatalogCategoryField = (
    categoryIndex: number,
    field: string,
    value: string,
  ) => {
    updateCatalogMenu((menu) => {
      const category = menu.categories[categoryIndex];
      if (!category) {
        return;
      }

      switch (field) {
        case "categoryKey":
          category.categoryKey = value.trim();
          break;
        case "label":
          category.label = value;
          break;
        case "title":
          category.title = value;
          break;
        case "iconClass":
          category.iconClass = value;
          break;
      }
    });
  };

  adminActions.updateCatalogCategoryActive = (
    categoryIndex: number,
    checked: boolean,
  ) => {
    updateCatalogMenu((menu) => {
      const category = menu.categories[categoryIndex];
      if (category) {
        category.active = checked;
      }
    });
  };

  adminActions.addCatalogMegaMenuItem = (categoryIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.megaMenuItems.push(
        createEmptyCatalogMegaMenuItem(),
      );
    });
  };

  adminActions.updateCatalogMegaMenuItemLabel = (
    categoryIndex: number,
    itemIndex: number,
    value: string,
  ) => {
    updateCatalogMenu((menu) => {
      const item = menu.categories[categoryIndex]?.megaMenuItems[itemIndex];
      if (item) {
        item.label = value;
      }
    });
  };

  adminActions.moveCatalogMegaMenuItem = (
    categoryIndex: number,
    itemIndex: number,
    direction: number,
  ) => {
    updateCatalogMenu((menu) => {
      const items = menu.categories[categoryIndex]?.megaMenuItems;
      if (items) {
        moveArrayItem(items, itemIndex, direction);
      }
    });
  };

  adminActions.removeCatalogMegaMenuItem = (
    categoryIndex: number,
    itemIndex: number,
  ) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.megaMenuItems.splice(itemIndex, 1);
    });
  };

  adminActions.addCatalogGroup = (categoryIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups.push(createEmptyCatalogGroup());
    });
  };

  adminActions.updateCatalogGroupField = (
    categoryIndex: number,
    groupIndex: number,
    field: string,
    value: string,
  ) => {
    updateCatalogMenu((menu) => {
      const group = menu.categories[categoryIndex]?.groups[groupIndex];
      if (!group) {
        return;
      }

      if (field === "name") {
        group.name = value;
      }
    });
  };

  adminActions.moveCatalogGroup = (
    categoryIndex: number,
    groupIndex: number,
    direction: number,
  ) => {
    updateCatalogMenu((menu) => {
      const groups = menu.categories[categoryIndex]?.groups;
      if (groups) {
        moveArrayItem(groups, groupIndex, direction);
      }
    });
  };

  adminActions.removeCatalogGroup = (categoryIndex: number, groupIndex: number) => {
    if (!window.confirm("이 그룹을 삭제하시겠습니까?")) {
      return;
    }

    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups.splice(groupIndex, 1);
    });
  };

  adminActions.addCatalogGroupItem = (categoryIndex: number, groupIndex: number) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups[groupIndex]?.items.push(
        createEmptyCatalogGroupItem(),
      );
    });
  };

  adminActions.updateCatalogGroupItemField = (
    categoryIndex: number,
    groupIndex: number,
    itemIndex: number,
    field: string,
    value: string,
  ) => {
    updateCatalogMenu((menu) => {
      const item =
        menu.categories[categoryIndex]?.groups[groupIndex]?.items[itemIndex];
      if (!item) {
        return;
      }

      if (field === "name") {
        item.name = value;
      }

      if (field === "linkedCategoryKey") {
        item.linkedCategoryKey = value.trim() ? value.trim() : null;
      }
    });
  };

  adminActions.moveCatalogGroupItem = (
    categoryIndex: number,
    groupIndex: number,
    itemIndex: number,
    direction: number,
  ) => {
    updateCatalogMenu((menu) => {
      const items = menu.categories[categoryIndex]?.groups[groupIndex]?.items;
      if (items) {
        moveArrayItem(items, itemIndex, direction);
      }
    });
  };

  adminActions.removeCatalogGroupItem = (
    categoryIndex: number,
    groupIndex: number,
    itemIndex: number,
  ) => {
    updateCatalogMenu((menu) => {
      menu.categories[categoryIndex]?.groups[groupIndex]?.items.splice(
        itemIndex,
        1,
      );
    });
  };
}
