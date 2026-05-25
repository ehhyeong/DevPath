import { useState } from 'react'

type Category = 'qa' | 'tech' | 'career' | 'free'

const templates: Record<Category, { placeholder: string; content: string }> = {
  qa: {
    placeholder: '핵심적인 에러 메시지나 질문 내용을 요약해주세요.',
    content: `### 1. 문제 상황\n- 어떤 에러가 발생했나요? (에러 메시지를 붙여넣어 주세요)\n- 어떤 환경에서 실행 중인가요? (OS, 언어 버전, 프레임워크 등)\n\n### 2. 시도해본 방법\n- 문제를 해결하기 위해 어떤 노력을 하셨나요?\n- 검색해본 키워드나 참고한 링크가 있다면 알려주세요.\n\n### 3. 코드 첨부\n\`\`\`java\n// 문제가 되는 코드를 여기에 붙여넣어 주세요.\n\`\`\`\n`,
  },
  tech: {
    placeholder: '공유하고 싶은 기술 주제를 입력해주세요.',
    content: `### 💡 주제 요약\n- 공유하고자 하는 기술이나 경험을 한 문장으로 요약해주세요.\n\n### 📝 상세 내용\n1. 배경 (왜 이 기술을 사용했나요?)\n2. 적용 과정 (어떻게 구현했나요?)\n3. 결과 및 배운 점 (성능 개선, 트러블 슈팅 등)\n\n### 🔗 참고 자료\n- 관련 문서나 링크\n`,
  },
  career: {
    placeholder: '고민이 있거나 조언을 구하고 싶은 내용을 입력해주세요.',
    content: `### 🧑‍💻 현재 상황\n- 직무 / 연차 / 전공 여부 등 (예: 백엔드 1년차 비전공자)\n\n### 💬 고민 내용\n- 구체적인 고민이나 궁금한 점을 적어주세요.\n- (예: 이직 타이밍, 포트폴리오 피드백, 연봉 협상 등)\n\n### 🎯 목표\n- 앞으로 어떤 개발자가 되고 싶으신가요?\n`,
  },
  free: {
    placeholder: '자유롭게 이야기를 나누어보세요.',
    content: `자유롭게 이야기를 나누어보세요!\n(개발 관련 잡담, 스터디 모집, 사는 이야기 등)\n`,
  },
}

export default function CommunityWritePage() {
  const [category, setCategory] = useState<Category>('qa')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [content, setContent] = useState(templates.qa.content)

  function handleCategoryChange(next: Category) {
    const currentContent = content.trim()
    const isTemplate = Object.values(templates).some((t) => t.content.trim() === currentContent)
    setCategory(next)
    if (currentContent === '' || isTemplate) {
      setContent(templates[next].content)
    }
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const val = tagInput.trim().replace(/^#/, '')
      if (val && !tags.includes(val)) {
        setTags([...tags, val])
        setTagInput('')
      }
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleSubmit() {
    if (confirm('게시글을 등록하시겠습니까?')) {
      alert('등록되었습니다!')
      window.location.href = '/community-list'
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA] text-gray-800">
      {/* 글쓰기 전용 헤더 */}
      <nav className="fixed z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="/home" className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <i className="fas fa-code-branch text-[#00C471]" /> DevPath
          </a>
          <button
            type="button"
            onClick={() => history.back()}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
          >
            <i className="fas fa-times" /> 나가기
          </button>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-20 pt-24 lg:flex-row">
        <section className="flex-1">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* 카테고리 + 제목 */}
            <div className="space-y-4 border-b border-gray-100 p-6">
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as Category)}
                className="w-40 cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-600 outline-none transition focus:border-[#00C471]"
              >
                <option value="qa">Q&A</option>
                <option value="tech">기술 공유</option>
                <option value="career">커리어/이직</option>
                <option value="free">자유게시판</option>
              </select>
              <input
                type="text"
                placeholder={templates[category].placeholder}
                className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 outline-none"
              />
            </div>

            {/* 태그 입력 */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-6 py-3">
              {tags.map((tag) => (
                <span key={tag} className="community-tag-badge">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-green-700">
                    <i className="fas fa-times" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="#태그 입력 (Enter)"
                className="min-w-[120px] py-1 text-sm outline-none placeholder-gray-400"
              />
            </div>

            {/* 에디터 툴바 */}
            <div className="community-editor-toolbar flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50/50 px-6 py-3">
              <button type="button" title="굵게"><i className="fas fa-bold" /></button>
              <button type="button" title="기울임"><i className="fas fa-italic" /></button>
              <button type="button" title="취소선"><i className="fas fa-strikethrough" /></button>
              <div className="mx-2 h-4 w-px self-center bg-gray-300" />
              <button type="button" title="제목1">H1</button>
              <button type="button" title="제목2">H2</button>
              <button type="button" title="제목3">H3</button>
              <div className="mx-2 h-4 w-px self-center bg-gray-300" />
              <button type="button" title="코드블럭"><i className="fas fa-code" /></button>
              <button type="button" title="인용구"><i className="fas fa-quote-right" /></button>
              <button type="button" title="이미지"><i className="far fa-image" /></button>
              <button type="button" title="링크"><i className="fas fa-link" /></button>
            </div>

            {/* 본문 에디터 */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="community-editor-area w-full resize-none p-6 text-gray-700 outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => history.back()}
              className="rounded-lg border border-gray-200 bg-white px-6 py-3 font-bold text-gray-600 transition hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-[#00C471] px-8 py-3 font-bold text-white shadow-md transition hover:bg-green-600"
            >
              <i className="fas fa-paper-plane" /> 등록하기
            </button>
          </div>
        </section>

        {/* 우측 사이드바 */}
        <aside className="hidden w-80 shrink-0 space-y-6 lg:block">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
              <i className="fas fa-lightbulb text-yellow-500" /> 작성 꿀팁
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="font-bold text-[#00C471]">1.</span>
                <span>코드는 반드시 <strong>코드블럭</strong>을 사용해서 가독성을 높여주세요.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#00C471]">2.</span>
                <span>에러 질문 시 <strong>에러 로그 전문</strong>을 첨부하면 답변 확률이 올라갑니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-[#00C471]">3.</span>
                <span>이미지나 스크린샷을 적극 활용해보세요.</span>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-sm font-bold text-gray-900">마크다운 사용법</h3>
            <div className="space-y-2 font-mono text-xs text-gray-600">
              <p># 제목 1</p>
              <p>## 제목 2</p>
              <p>**굵게**</p>
              <p>{"`인라인 코드`"}</p>
              <p>{"``` 코드 블럭 ```"}</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
