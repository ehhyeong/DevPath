import SquadMeetingView from './meeting/SquadMeetingView'
import { useSquadMeetingController } from './meeting/useSquadMeetingController'
import type { AiWorkspacePageProps } from './AiWorkspaceDesignPanels'

export default function SquadMeetingApp(props: AiWorkspacePageProps = {}) {
  const model = useSquadMeetingController()
  return <SquadMeetingView {...model} {...props} />
}
