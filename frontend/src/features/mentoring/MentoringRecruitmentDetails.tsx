import { MENTORING_RECRUITMENT_SECTIONS, parseMentoringRecruitmentContent } from './mentoring-recruitment-content'

export default function MentoringRecruitmentDetails({ content, emptyMessage }: { content?: string | null; emptyMessage?: string }) {
  const details = parseMentoringRecruitmentContent(content)
  return <div className="space-y-4">
    {details.intro || emptyMessage ? <p className="whitespace-pre-wrap text-sm leading-7 break-words text-gray-600">{details.intro || emptyMessage}</p> : null}
    {MENTORING_RECRUITMENT_SECTIONS.filter(({ key }) => details[key]).map(({ key, label, icon }) => <section key={key} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-gray-900"><i className={`fas ${icon} text-brand`} aria-hidden="true" />{label}</h4>
      <p className="whitespace-pre-wrap text-sm leading-7 break-words text-gray-600">{details[key]}</p>
    </section>)}
  </div>
}
