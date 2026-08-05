import SquadMeetingView from './meeting/SquadMeetingView'
import { useSquadMeetingController } from './meeting/useSquadMeetingController'

export default function SquadMeetingApp() {
  const model = useSquadMeetingController()
  return <SquadMeetingView {...model} />
}
