import assert from 'node:assert/strict'
import test from 'node:test'
import { detectDeploymentTargets } from './detect-deployment-targets.mjs'

test('frontend-only changes deploy only the frontend', () => {
  assert.deepEqual(detectDeploymentTargets(['frontend/src/App.tsx']), { backend: false, frontend: true })
})

test('backend-only changes deploy only the backend', () => {
  assert.deepEqual(detectDeploymentTargets(['src/main/java/com/devpath/App.java']), { backend: true, frontend: false })
})

test('full-stack changes preserve backend then frontend deployment targets', () => {
  assert.deepEqual(
    detectDeploymentTargets(['src/main/java/com/devpath/App.java', 'frontend/src/App.tsx']),
    { backend: true, frontend: true },
  )
})

test('shared deployment configuration deploys both applications', () => {
  assert.deepEqual(detectDeploymentTargets(['docker-compose.yml']), { backend: true, frontend: true })
})

test('documentation-only changes skip application deployment', () => {
  assert.deepEqual(detectDeploymentTargets(['README.md', 'docs/operations.md']), { backend: false, frontend: false })
})
