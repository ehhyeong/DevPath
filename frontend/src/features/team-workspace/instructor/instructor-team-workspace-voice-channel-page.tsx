import { useState } from 'react';
import type { TeamData } from './instructor-types';
import { avatarUrl,buildHref,membersOnly } from './instructor-workspace-support';



export function VoiceChannelPage({ data, workspaceId }: { data: TeamData; workspaceId: number | null }) {
  const [muted, setMuted] = useState(false)
  const learners = membersOnly(data)
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-white">
      <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900 px-6"><div className="flex items-center gap-4"><a href={buildHref('meeting', workspaceId)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400"><i className="fas fa-arrow-left" /></a><h1 className="text-sm font-bold"><i className="fas fa-headset mr-2 text-[#7C3AED]" />팀 음성 채널</h1></div><span className="text-xs text-gray-400">{learners.length + 1}명 접속 가능</span></header>
      <main className="flex flex-1 flex-col items-center justify-center p-8"><div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">{[data.dashboard?.ownerName ?? '멘토', ...learners.map((m) => m.learnerName ?? '팀원')].map((name, index) => <div key={`${name}-${index}`} className="text-center"><div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border border-purple-500/40 bg-gray-900"><img src={avatarUrl(name)} className="h-20 w-20 rounded-full" alt="" /></div><p className="text-sm font-bold">{name}</p><p className="mt-1 text-[10px] text-gray-500">{index === 0 ? 'Host' : '대기 중'}</p></div>)}</div><button onClick={() => setMuted(!muted)} className={`h-16 w-16 rounded-full text-xl ${muted ? 'bg-red-600' : 'bg-[#7C3AED]'}`}><i className={muted ? 'fas fa-microphone-slash' : 'fas fa-microphone'} /></button></main>
    </div>
  )
}
