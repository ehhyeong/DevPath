import { ErrorView, LoadingOverlay, LoginRequiredView } from './learning-player-states'
import LearningPlayerView from './LearningPlayerView'
import { useLearningPlayerController } from './useLearningPlayerController'

export default function LearningPlayerApp() {
  const model = useLearningPlayerController()

  if (model.status === 'login') return <LoginRequiredView />
  if (model.status === 'loading') return <LoadingOverlay />
  if (model.status === 'error') {
    return (
      <ErrorView
        title={model.title}
        message={model.message}
        actionHref={model.actionHref}
        actionLabel={model.actionLabel}
      />
    )
  }

  return <LearningPlayerView model={model} />
}
