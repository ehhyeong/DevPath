export function aiWorkspacePageHref(path: string, workspaceId: number | null) {
  return `${path}?workspaceId=${workspaceId}&ai=1`
}
