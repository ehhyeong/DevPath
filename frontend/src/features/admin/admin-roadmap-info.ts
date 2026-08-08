import { renderAdminMarkup } from './admin-react-renderer'
import { adminActions } from './admin-action-registry'
import { adminApi } from "../../lib/admin-api";
import type { AdminOfficialRoadmap } from "../../types/admin";
import {
  buildRoadmapInfoContentHtml,
  escapeHtml,
  formatNumber,
  matchesKeyword,
  normalizeOptionalString,
  normalizeText,
  roadmapInfoHtmlToEditableText,
  sanitizePreviewHtml,
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

let roadmapInfoItems: AdminOfficialRoadmap[] = [];
let roadmapInfoEditingId: number | null = null;
let roadmapInfoLoading = false;
let roadmapInfoSaving = false;
let roadmapInfoError: string | null = null;
let roadmapInfoQuery = "";

function roadmapHasInfo(roadmap: AdminOfficialRoadmap) {
  return Boolean(roadmap.infoTitle?.trim() || roadmap.infoContent?.trim());
}

function getFilteredRoadmapInfoItems() {
  const keyword = normalizeText(roadmapInfoQuery);
  return roadmapInfoItems.filter((roadmap) =>
    matchesKeyword(keyword, [
      roadmap.roadmapId,
      roadmap.title,
      roadmap.description,
      roadmap.infoTitle,
      roadmap.infoContent,
    ]),
  );
}

function renderRoadmapInfoOptions() {
  const select = getElement<HTMLSelectElement>("roadmapInfoRoadmapSelect");
  renderAdminMarkup(select, [
    '<option value="">로드맵을 선택하세요</option>',
    ...roadmapInfoItems.map(
      (roadmap) => `
        <option value="${roadmap.roadmapId}" ${roadmapInfoEditingId === roadmap.roadmapId ? "selected" : ""}>
          ${escapeHtml(roadmap.title)}
        </option>`,
    ),
  ].join(""));
  select.value =
    roadmapInfoEditingId === null ? "" : String(roadmapInfoEditingId);
}

function renderRoadmapInfoRows(roadmaps: AdminOfficialRoadmap[]) {
  const tbody = getElement("roadmapInfoTableBody");
  renderAdminMarkup(tbody, roadmaps.length
    ? roadmaps
        .map((roadmap) => {
          const selected = roadmapInfoEditingId === roadmap.roadmapId;
          const hasInfo = roadmapHasInfo(roadmap);
          return `
            <tr class="border-b border-slate-100 transition-colors ${selected ? "bg-teal-50/60" : "hover:bg-slate-50/70"}">
              <td class="px-5 py-3 font-mono text-xs text-slate-400">#${roadmap.roadmapId}</td>
              <td class="px-5 py-3">
                <div class="truncate font-bold text-slate-800">${escapeHtml(roadmap.title)}</div>
                <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">${escapeHtml(roadmap.description || "설명 없음")}</div>
              </td>
              <td class="px-5 py-3">
                <div class="truncate text-sm font-semibold text-slate-700">${escapeHtml(roadmap.infoTitle || "소개 제목 없음")}</div>
                <div class="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">${escapeHtml(roadmapInfoHtmlToEditableText(roadmap.infoContent) || "소개 본문 없음")}</div>
              </td>
              <td class="px-5 py-3">
                <span class="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${hasInfo ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}">
                  ${hasInfo ? "등록됨" : "미등록"}
                </span>
              </td>
              <td class="px-5 py-3 text-right">
                <div class="flex flex-nowrap justify-end gap-1">
                  <button data-admin-click="editRoadmapInfo(${roadmap.roadmapId})" class="whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50" type="button">편집</button>
                  <button data-admin-click="clearRoadmapInfo(${roadmap.roadmapId})" class="whitespace-nowrap rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 hover:text-rose-800 ${hasInfo ? "" : "opacity-50"}" type="button" ${hasInfo ? "" : "disabled"}>삭제</button>
                </div>
              </td>
            </tr>`;
        })
        .join("")
    : buildEmptyRow(5, "조건에 맞는 로드맵 소개가 없습니다."));
}

function syncRoadmapInfoFormState() {
  const selectedRoadmap =
    roadmapInfoItems.find(
      (roadmap) => roadmap.roadmapId === roadmapInfoEditingId,
    ) ?? null;
  const form = getElement<HTMLFormElement>("roadmapInfoForm");
  const titleInput = getElement<HTMLInputElement>("roadmapInfoTitleInput");
  const contentInput = getElement<HTMLTextAreaElement>(
    "roadmapInfoContentInput",
  );
  const saveButton = getElement<HTMLButtonElement>("roadmapInfoSaveButton");
  const deleteButton = getElement<HTMLButtonElement>("roadmapInfoDeleteButton");
  const resetButton = getElement<HTMLButtonElement>("roadmapInfoResetButton");
  const selectedTitle = getElement("roadmapInfoSelectedTitle");
  const selectedDescription = getElement("roadmapInfoSelectedDescription");
  const hasSelection = selectedRoadmap !== null;
  const hasInfo = selectedRoadmap ? roadmapHasInfo(selectedRoadmap) : false;

  form.classList.toggle("opacity-70", roadmapInfoSaving);
  titleInput.disabled = !hasSelection || roadmapInfoSaving;
  contentInput.disabled = !hasSelection || roadmapInfoSaving;
  saveButton.disabled = !hasSelection || roadmapInfoSaving;
  deleteButton.disabled = !hasSelection || !hasInfo || roadmapInfoSaving;
  resetButton.disabled = roadmapInfoSaving;
  deleteButton.classList.toggle("opacity-50", !hasInfo);
  deleteButton.classList.toggle(
    "cursor-not-allowed",
    !hasSelection || !hasInfo || roadmapInfoSaving,
  );
  saveButton.classList.toggle("opacity-70", roadmapInfoSaving);
  saveButton.classList.toggle(
    "cursor-not-allowed",
    !hasSelection || roadmapInfoSaving,
  );
  renderAdminMarkup(saveButton, roadmapInfoSaving
    ? '<i class="fas fa-circle-notch fa-spin mr-1"></i> 저장 중'
    : '<i class="fas fa-save mr-1"></i> 소개 저장');

  selectedTitle.textContent = selectedRoadmap?.title ?? "로드맵을 선택하세요";
  selectedDescription.textContent =
    selectedRoadmap?.description ??
    "목록에서 로드맵을 선택하면 소개 제목과 본문을 수정할 수 있습니다.";
  renderRoadmapInfoPreview();
}

function populateRoadmapInfoForm() {
  const selectedRoadmap =
    roadmapInfoItems.find(
      (roadmap) => roadmap.roadmapId === roadmapInfoEditingId,
    ) ?? null;
  getElement<HTMLInputElement>("roadmapInfoTitleInput").value =
    selectedRoadmap?.infoTitle ?? "";
  getElement<HTMLTextAreaElement>("roadmapInfoContentInput").value =
    roadmapInfoHtmlToEditableText(selectedRoadmap?.infoContent);
  renderRoadmapInfoOptions();
  syncRoadmapInfoFormState();
}

function renderRoadmapInfoPreview() {
  const preview = document.getElementById("roadmapInfoPreview");
  const contentInput = document.getElementById(
    "roadmapInfoContentInput",
  ) as HTMLTextAreaElement | null;
  if (!preview || !contentInput) {
    return;
  }

  const html = buildRoadmapInfoContentHtml(contentInput.value);
  renderAdminMarkup(preview, html.trim()
    ? sanitizePreviewHtml(html)
    : '<p class="text-slate-400">소개 본문을 입력하면 미리보기가 표시됩니다.</p>');
}

function renderRoadmapInfoManager() {
  const summaryElement = getElement("roadmapInfoSummary");
  const filteredRoadmaps = getFilteredRoadmapInfoItems();
  const registeredCount = roadmapInfoItems.filter(roadmapHasInfo).length;

  summaryElement.textContent = `전체 ${formatNumber(roadmapInfoItems.length)}개 · 소개 등록 ${formatNumber(registeredCount)}개`;
  renderRoadmapInfoOptions();

  if (roadmapInfoLoading) {
    renderAdminMarkup(getElement("roadmapInfoTableBody"), buildLoadingRow(5));
    syncRoadmapInfoFormState();
    return;
  }

  if (roadmapInfoError) {
    renderAdminMarkup(getElement("roadmapInfoTableBody"), buildErrorRow(
      5,
      roadmapInfoError,
    ));
    syncRoadmapInfoFormState();
    return;
  }

  renderRoadmapInfoRows(filteredRoadmaps);
  updateFilterSummary(
    "roadmapInfoFilterSummary",
    roadmapInfoItems.length,
    filteredRoadmaps.length,
  );
  syncRoadmapInfoFormState();
}

function setRoadmapInfoForm(roadmapId: number | null) {
  roadmapInfoEditingId = roadmapId;
  populateRoadmapInfoForm();
  renderRoadmapInfoRows(getFilteredRoadmapInfoItems());
}

export async function fetchRoadmapInfoItems() {
  roadmapInfoLoading = true;
  roadmapInfoError = null;
  renderRoadmapInfoManager();

  try {
    roadmapInfoItems = await adminApi.getOfficialRoadmaps();
    if (
      roadmapInfoEditingId &&
      !roadmapInfoItems.some(
        (roadmap) => roadmap.roadmapId === roadmapInfoEditingId,
      )
    ) {
      roadmapInfoEditingId = null;
    }
  } catch (error) {
    roadmapInfoError =
      error instanceof Error
        ? error.message
        : "로드맵 소개 목록을 불러오지 못했습니다.";
  } finally {
    roadmapInfoLoading = false;
    renderRoadmapInfoManager();
    populateRoadmapInfoForm();
  }
}

async function saveRoadmapInfoForm() {
  const roadmapId = roadmapInfoEditingId;
  if (roadmapId === null) {
    window.alert("소개를 수정할 로드맵을 선택하세요.");
    return;
  }

  const infoTitle = normalizeOptionalString(
    getElement<HTMLInputElement>("roadmapInfoTitleInput").value,
  );
  const editableContent = normalizeOptionalString(
    getElement<HTMLTextAreaElement>("roadmapInfoContentInput").value,
  );
  const infoContent = editableContent
    ? buildRoadmapInfoContentHtml(editableContent)
    : null;

  if (!infoTitle && !infoContent) {
    window.alert(
      "소개 제목 또는 소개 본문을 입력하세요. 비우려면 소개 삭제를 사용하세요.",
    );
    return;
  }

  roadmapInfoSaving = true;
  syncRoadmapInfoFormState();

  try {
    await adminApi.updateOfficialRoadmapInfo(roadmapId, {
      infoTitle,
      infoContent,
    });
    window.alert("로드맵 소개를 저장했습니다.");
    await fetchRoadmapInfoItems();
    setRoadmapInfoForm(roadmapId);
  } finally {
    roadmapInfoSaving = false;
    syncRoadmapInfoFormState();
  }
}

async function clearRoadmapInfoById(roadmapId: number) {
  const roadmap = roadmapInfoItems.find((item) => item.roadmapId === roadmapId);
  if (!roadmap) {
    window.alert("소개를 삭제할 로드맵을 찾지 못했습니다.");
    return;
  }

  if (!roadmapHasInfo(roadmap)) {
    window.alert("삭제할 소개 콘텐츠가 없습니다.");
    return;
  }

  if (!window.confirm(`'${roadmap.title}' 로드맵 소개를 삭제하시겠습니까?`)) {
    return;
  }

  roadmapInfoSaving = true;
  syncRoadmapInfoFormState();

  try {
    await adminApi.deleteOfficialRoadmapInfo(roadmapId);
    window.alert("로드맵 소개를 삭제했습니다.");
    await fetchRoadmapInfoItems();
    setRoadmapInfoForm(roadmapId);
  } finally {
    roadmapInfoSaving = false;
    syncRoadmapInfoFormState();
  }
}

export function installRoadmapInfoBindings(runAdminAction: RunAdminAction) {
  const roadmapInfoFilterInput = getElement<HTMLInputElement>(
    "roadmapInfoFilterInput",
  );

  roadmapInfoFilterInput.addEventListener("input", () => {
    roadmapInfoQuery = roadmapInfoFilterInput.value;
    renderRoadmapInfoManager();
  });

  const roadmapInfoRoadmapSelect = getElement<HTMLSelectElement>(
    "roadmapInfoRoadmapSelect",
  );

  roadmapInfoRoadmapSelect.addEventListener("change", () => {
    const selectedValue = roadmapInfoRoadmapSelect.value;
    setRoadmapInfoForm(selectedValue ? Number(selectedValue) : null);
  });

  const roadmapInfoContentInput = getElement<HTMLTextAreaElement>(
    "roadmapInfoContentInput",
  );

  roadmapInfoContentInput.addEventListener("input", () => {
    renderRoadmapInfoPreview();
  });

  const roadmapInfoForm = getElement<HTMLFormElement>("roadmapInfoForm");

  roadmapInfoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void runAdminAction(async () => {
      await saveRoadmapInfoForm();
    });
  });

  getElement<HTMLButtonElement>("roadmapInfoResetButton").addEventListener(
    "click",
    () => {
      setRoadmapInfoForm(null);
    },
  );

  getElement<HTMLButtonElement>("roadmapInfoDeleteButton").addEventListener(
    "click",
    () => {
      if (roadmapInfoEditingId === null) {
        return;
      }

      void runAdminAction(async () => {
        await clearRoadmapInfoById(roadmapInfoEditingId as number);
      });
    },
  );
}

export function installRoadmapInfoActions(runAdminAction: RunAdminAction) {
  adminActions.editRoadmapInfo = (roadmapId: number) => {
    setRoadmapInfoForm(roadmapId);
  };

  adminActions.clearRoadmapInfo = async (roadmapId: number) => {
    await runAdminAction(async () => {
      await clearRoadmapInfoById(roadmapId);
    });
  };
}
