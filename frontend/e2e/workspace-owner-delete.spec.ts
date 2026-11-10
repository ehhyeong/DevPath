import { expect, test } from '@playwright/test'

test('AI 프로젝트를 팀장이 삭제하면 열린 팀원 허브와 사이드바에서도 제거된다', async ({ browser, baseURL }) => {
  test.setTimeout(60_000)
  const ownerContext = await browser.newContext({ baseURL })
  const memberContext = await browser.newContext({ baseURL })
  let deleted = false
  const deletes: string[] = []
  let memberReads = 0
  for (const [context, userId] of [[ownerContext, 7], [memberContext, 8]] as const) {
    await context.addInitScript((id) => {
      const exp = Math.floor(Date.now() / 1000) + 3600
      const role = 'ROLE_LEARNER'
      const claims = btoa(JSON.stringify({ sub: String(id), role, exp }))
      localStorage.setItem('devpath.auth.session', JSON.stringify({ tokenType: 'Bearer', accessToken: `test.${claims}.test`, refreshToken: 'test-only', userId: id, name: id === 7 ? '팀장' : '초대 팀원', role, exp, storage: 'local' }))
    }, userId)
    await context.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (!path.startsWith('/api/')) return route.continue()
      if (route.request().method() === 'DELETE') {
        deletes.push(path)
        if (userId !== 7 || path !== '/api/workspaces/42/settings') {
          await route.fulfill({ status: 403, json: { success: false, message: '삭제 권한이 없습니다.' } })
          return
        }
        deleted = true
      }
      const projects = (deleted ? [43] : [42, 43]).map(id => ({
        projectId: id, domId: `workspace-${id}`, menuId: `workspace-menu-${id}`, type: 'squad', status: 'progress',
        owner: id === 42 && userId === 7, canDelete: id === 42 && userId === 7,
        title: id === 42 ? 'AI 공유 프로젝트' : '남겨 둘 프로젝트', description: '팀 프로젝트',
        dashboardUrl: `/squad-dashboard?workspaceId=${id}&ai=1`, progressPercent: 0, footerKind: 'avatars', memberAvatarSeeds: [],
      }))
      let data: unknown = []
      if (path === '/api/workspaces/hub/projects') {
        if (userId === 8) memberReads++
        data = projects
      } else if (path === '/api/lounge/shell') data = {
        user: { name: '워크스페이스 멤버', profileImage: null },
        mySquads: projects.map(project => ({ id: project.projectId, name: project.title, href: project.dashboardUrl })),
      }
      await route.fulfill({ json: { success: true, data } })
    })
  }
  try {
    const owner = await ownerContext.newPage()
    const member = await memberContext.newPage()
    await owner.goto('/workspace-hub')
    await member.goto('/workspace-hub')
    await expect(owner.locator('#workspace-42')).toBeVisible()
    await expect(member.locator('#workspace-42')).toBeVisible()
    await member.locator('#workspace-42 button').click()
    await expect(member.locator('#workspace-menu-42').getByRole('link', { name: /나가기$/ })).toBeVisible()
    await expect(member.locator('#workspace-menu-42').getByRole('link', { name: /삭제하기$/ })).toHaveCount(0)
    const readsBeforeDeletion = memberReads
    owner.on('dialog', dialog => dialog.accept())
    await owner.bringToFront()
    await owner.locator('#workspace-42 button').click()
    await owner.locator('#workspace-menu-42').getByRole('link', { name: /삭제하기$/ }).click()
    await expect(owner.locator('#workspace-42')).toHaveCount(0)
    expect(deletes).toEqual(['/api/workspaces/42/settings'])
    await member.bringToFront()
    await expect(member.locator('#workspace-42')).toHaveCount(0, { timeout: 10_000 })
    expect(memberReads).toBeGreaterThan(readsBeforeDeletion)
    await expect(member.getByRole('complementary').locator('a[href*="workspaceId=42"]')).toHaveCount(0)
    await expect(member.locator('#workspace-43')).toBeVisible()
    await expect(owner.locator('#workspace-43')).toBeVisible()
  } finally {
    await ownerContext.close()
    await memberContext.close()
  }
})
