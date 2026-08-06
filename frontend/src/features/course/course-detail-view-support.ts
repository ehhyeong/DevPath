import type { AuthView } from "../../components/AuthModal";
import type {
  CourseQuestionItem,
  CourseQuestionStatus,
} from "./course-detail-support";
import type { QnaQuestionDetail, QnaQuestionSummary } from "../../types/qna";

export function readNumberSearchParam(name: string) {
  const value = new URLSearchParams(window.location.search).get(name);
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function readAuthViewFromLocation(): AuthView | null {
  const value = new URLSearchParams(window.location.search).get("auth");
  return value === "login" || value === "signup" ? value : null;
}

export function readStudentPreviewFromLocation() {
  return (
    new URLSearchParams(window.location.search).get("preview") === "student"
  );
}

export function readStudentPreviewReturnHref(courseId: number | null) {
  const fallbackHref = courseId
    ? `/course-editor?courseId=${courseId}`
    : "/course-editor";
  const value = new URLSearchParams(window.location.search).get("returnTo");

  if (!value) {
    return fallbackHref;
  }

  try {
    const nextUrl = new URL(value, window.location.origin);

    if (nextUrl.origin !== window.location.origin) {
      return fallbackHref;
    }

    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  } catch {
    return fallbackHref;
  }
}

export function readSafeReturnToFromLocation() {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  if (!value) return null;

  try {
    const nextUrl = new URL(value, window.location.origin);
    if (nextUrl.origin !== window.location.origin) return null;
    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  } catch {
    return null;
  }
}

export function syncAuthViewInLocation(view: AuthView | null) {
  const url = new URL(window.location.href);
  if (view) url.searchParams.set("auth", view);
  else url.searchParams.delete("auth");
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function buildQuestionFilterClass(active: boolean) {
  return `qna-filter-btn inline-flex! h-[36px]! items-center! justify-center! rounded-[12px]! border px-[14px]! py-0! text-[13px]! leading-[18px]! font-extrabold! transition ${
    active
      ? "border-[#111827] bg-[#111827] text-white"
      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
  }`;
}

export function buildQuestionBadgeClass(status: CourseQuestionStatus) {
  return `inline-flex items-center gap-[6px] whitespace-nowrap rounded-[999px] border-[1px] border-solid px-[8px] py-[4px] text-[10px] font-[900] ${
    status === "answered"
      ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#065f46] [&_i]:text-[#00c471]"
      : "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412] [&_i]:text-[#f97316]"
  }`;
}

export function buildQuestionCardClass(opened: boolean) {
  return `qna-card cursor-pointer p-6 [transition:transform_0.15s,_box-shadow_0.15s,_border-color_0.15s,_background-color_0.15s] hover:[box-shadow:0_12px_28px_rgba(17,24,39,0.08)]! hover:[transform:translateY(-1px)] ${
    opened ? "hover:border-[#e5e7eb]!" : "hover:border-[rgba(0,196,113,0.35)]!"
  }`;
}

export function buildReviewFilterClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-xs transition ${
    active
      ? "bg-gray-800 font-bold text-white"
      : "bg-gray-100 font-medium text-gray-600 hover:bg-gray-200"
  }`;
}

export function toQuestionSummary(
  question: QnaQuestionDetail,
): QnaQuestionSummary {
  return {
    id: question.id,
    authorId: question.authorId,
    authorName: question.authorName,
    courseId: question.courseId,
    lessonId: question.lessonId,
    templateType: question.templateType,
    difficulty: question.difficulty,
    title: question.title,
    adoptedAnswerId: question.adoptedAnswerId,
    lectureTimestamp: question.lectureTimestamp,
    qnaStatus: question.qnaStatus,
    answerCount: question.answers.length,
    viewCount: question.viewCount,
    createdAt: question.createdAt,
  };
}

export function getQnaQuestionStatus(
  question: QnaQuestionSummary | QnaQuestionDetail,
): CourseQuestionStatus {
  return question.qnaStatus === "ANSWERED" ||
    Boolean(question.adoptedAnswerId) ||
    question.answerCount > 0
    ? "answered"
    : "pending";
}

export function getQnaQuestionTag(question: QnaQuestionSummary) {
  return (
    question.lectureTimestamp ||
    question.templateType ||
    question.difficulty ||
    "Q&A"
  );
}

export function mapQnaQuestionToCourseQuestion(
  question: QnaQuestionSummary,
  detail: QnaQuestionDetail | undefined,
): CourseQuestionItem {
  const answers = detail?.answers ?? [];
  return {
    id: question.id,
    status: getQnaQuestionStatus(detail ?? question),
    authorName: question.authorName,
    tag: getQnaQuestionTag(question),
    title: question.title,
    body: detail?.content ?? "질문 내용을 불러오는 중입니다.",
    views: question.viewCount,
    createdAt: question.createdAt ?? new Date(0).toISOString(),
    commentCount: detail ? answers.length : question.answerCount,
    comments: answers.map((answer) => ({
      id: answer.id,
      authorName: answer.authorName,
      content: answer.content,
      createdAt: answer.createdAt ?? "",
    })),
  };
}

export function createQnaQuestionSearchText(
  question: QnaQuestionSummary,
  detail: QnaQuestionDetail | undefined,
) {
  return `${question.authorName} ${getQnaQuestionTag(question)} ${question.title} ${detail?.content ?? ""}`.toLowerCase();
}

const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

export function getPlainDescription(description: string) {
  return description
    .replace(markdownImagePattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
