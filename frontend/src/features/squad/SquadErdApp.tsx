import SquadErdView from './SquadErdView'
import { useSquadErdController } from './useSquadErdController'

export default function SquadErdApp() {
  const model = useSquadErdController()

  if (model.status === 'loading') {
    return (
      <div className="squad-dashboard-page squad-erd-page flex h-screen items-center justify-center overflow-hidden bg-[#F8F9FA]! font-['Pretendard',sans-serif] text-[#374151]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-brand" />
      </div>
    )
  }

  return <SquadErdView model={model} />
}
