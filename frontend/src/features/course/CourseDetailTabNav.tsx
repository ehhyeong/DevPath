type CourseDetailTabKey = 'info' | 'news' | 'reviews' | 'qna'

type CourseDetailTabNavProps = {
  activeTab: CourseDetailTabKey
  reviewCount: number
  onChange: (tab: CourseDetailTabKey) => void
}

const tabs: Array<{ key: CourseDetailTabKey; label: string }> = [
  { key: 'info', label: '강의 정보' },
  { key: 'news', label: '새소식' },
  { key: 'reviews', label: '수강평' },
  { key: 'qna', label: '질문 게시판' },
]

export default function CourseDetailTabNav({ activeTab, reviewCount, onChange }: CourseDetailTabNavProps) {
  return (
    <div className="course-detail-tab-bar static! top-auto! z-auto mb-8 flex border-b border-gray-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`course-detail-tab-btn px-6 py-4 font-medium transition ${activeTab === tab.key ? 'border-b-[2px] border-[#00c471] font-bold! text-primary' : 'text-gray-500 hover:text-gray-900'}`}
        >
          {tab.label}
          {tab.key === 'reviews' ? <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs">{reviewCount}</span> : null}
        </button>
      ))}
    </div>
  )
}
