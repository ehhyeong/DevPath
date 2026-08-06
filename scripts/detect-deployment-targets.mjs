import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function detectDeploymentTargets(files) {
  let backend = false
  let frontend = false

  for (const file of files) {
    if (file.startsWith('frontend/')) {
      frontend = true
      continue
    }

    if (
      file.startsWith('src/')
      || file === 'build.gradle'
      || file === 'settings.gradle'
      || file.startsWith('gradle/')
      || file === 'gradlew'
      || file === 'gradlew.bat'
    ) {
      backend = true
      continue
    }

    if (
      file === '.github/workflows/deploy.yml'
      || file === 'docker-compose.yml'
      || file === 'scripts/configure-host-nginx-websocket.sh'
      || file === 'scripts/detect-deployment-targets.mjs'
    ) {
      backend = true
      frontend = true
    }
  }

  return { backend, frontend }
}

function run() {
  const files = readFileSync(0, 'utf8').split(/\r?\n/).map((file) => file.trim()).filter(Boolean)
  const targets = process.env.DEPLOY_ALL === 'true'
    ? { backend: true, frontend: true }
    : detectDeploymentTargets(files)
  const lines = [`backend=${targets.backend}`, `frontend=${targets.frontend}`]

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`)
  }

  console.log(`Backend deployment: ${targets.backend}`)
  console.log(`Frontend deployment: ${targets.frontend}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
}
