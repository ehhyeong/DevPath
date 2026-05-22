(function () {
  const AUTH_STORAGE_KEY = 'devpath.auth.session';
  const AUTH_TOAST_STORAGE_KEY = 'devpath.auth.toast';
  const AUTH_TOAST_EVENT = 'devpath:auth-toast';
  const EXPIRED_AUTH_TOAST_MESSAGE = '세션이 만료되어 로그아웃되었습니다.';
  const EXPIRY_SKEW_MS = 1000;
  const AUTH_TOAST_DURATION_MS = 2200;
  const AUTH_TOAST_ROOT_ID = 'devpath-auth-toast-root';
  const headerLinks = [
    { href: 'roadmap-hub.html', label: '로드맵' },
    { href: '/lecture-list', label: '강의' },
    { href: 'lounge-dashboard.html', label: '프로젝트' },
    { href: 'community-list.html', label: '커뮤니티' },
    { href: 'job-matching.html', label: '채용분석' },
  ];

  let expiryTimeoutId = null;
  let toastTimeoutId = null;

  function readSessionFromStorage(storage) {
    try {
      const raw = storage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getStoredSessionRaw() {
    return readSessionFromStorage(window.localStorage) || readSessionFromStorage(window.sessionStorage);
  }

  function clearExpiryTimer() {
    if (expiryTimeoutId !== null) {
      window.clearTimeout(expiryTimeoutId);
      expiryTimeoutId = null;
    }
  }

  function clearQueuedAuthToast() {
    window.sessionStorage.removeItem(AUTH_TOAST_STORAGE_KEY);
  }

  function queueAuthToast(message) {
    window.sessionStorage.setItem(AUTH_TOAST_STORAGE_KEY, message);
  }

  function consumeQueuedAuthToast() {
    const message = window.sessionStorage.getItem(AUTH_TOAST_STORAGE_KEY);

    if (!message) {
      return null;
    }

    clearQueuedAuthToast();
    return message;
  }

  function isSessionExpired(session) {
    if (!session || !session.exp) {
      return false;
    }

    return session.exp * 1000 <= Date.now() + EXPIRY_SKEW_MS;
  }

  function ensureToastRoot() {
    let toastRoot = document.getElementById(AUTH_TOAST_ROOT_ID);

    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.id = AUTH_TOAST_ROOT_ID;
      toastRoot.className = 'pointer-events-none fixed top-20 left-1/2 z-[1000] -translate-x-1/2';
      document.body.appendChild(toastRoot);
    }

    return toastRoot;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function hideAuthToast() {
    const toastRoot = document.getElementById(AUTH_TOAST_ROOT_ID);

    if (toastTimeoutId !== null) {
      window.clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }

    if (toastRoot) {
      toastRoot.innerHTML = '';
    }
  }

  function showAuthToast(message) {
    if (!message) {
      return;
    }

    clearQueuedAuthToast();

    const toastRoot = ensureToastRoot();
    toastRoot.innerHTML = [
      '<div role="status" aria-live="polite" class="rounded-xl border border-gray-700 bg-gray-900/90 px-5 py-3 text-sm font-bold text-white shadow-xl backdrop-blur-sm">',
      '  <i class="fas fa-info-circle mr-2 text-[#00C471]"></i>',
      `  ${escapeHtml(message)}`,
      '</div>',
    ].join('\n');

    if (toastTimeoutId !== null) {
      window.clearTimeout(toastTimeoutId);
    }

    toastTimeoutId = window.setTimeout(hideAuthToast, AUTH_TOAST_DURATION_MS);
  }

  function expireSession(reload) {
    const session = getStoredSessionRaw();
    clearExpiryTimer();

    if (!session) {
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    queueAuthToast(EXPIRED_AUTH_TOAST_MESSAGE);

    if (!reload) {
      showAuthToast(EXPIRED_AUTH_TOAST_MESSAGE);
    }

    if (reload) {
      window.location.reload();
    }
  }

  function scheduleSessionExpiry(session) {
    clearExpiryTimer();

    if (!session || !session.exp) {
      return;
    }

    const delayMs = session.exp * 1000 - Date.now() - EXPIRY_SKEW_MS;

    if (delayMs <= 0) {
      expireSession(false);
      return;
    }

    expiryTimeoutId = window.setTimeout(function () {
      expireSession(true);
    }, delayMs);
  }

  function readStoredAuthSession() {
    const session = getStoredSessionRaw();

    if (!session) {
      clearExpiryTimer();
      return null;
    }

    if (isSessionExpired(session)) {
      expireSession(false);
      return null;
    }

    scheduleSessionExpiry(session);
    return session;
  }

  function buildBrandMarkup() {
    return [
      '<a href="/home" class="group flex items-center gap-2 text-xl font-bold text-gray-900" style="transform: translate(15px, 0px)">',
      '  <i class="fas fa-code-branch text-brand inline-block transition group-hover:rotate-12"></i>',
      '  <span class="inline-block">DevPath</span>',
      '</a>',
    ].join('');
  }

  function buildAuthMarkup(session) {
    if (!session) {
      return '<a href="/home?auth=login" class="rounded-full bg-gray-900 px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black">로그인</a>';
    }

    const name = escapeHtml(session.name || '내 계정');
    const initial = escapeHtml((session.name || 'D').trim().charAt(0).toUpperCase());

    return [
      '<button type="button" onclick="window.location.href=\'profile.html\'" class="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-gray-300 hover:shadow-md">',
      `  <span class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600 shadow-sm">${initial}</span>`,
      '  <span class="min-w-0">',
      `    <span class="block truncate text-sm font-bold text-gray-900">${name}</span>`,
      '  </span>',
      '  <i class="fas fa-chevron-right hidden text-xs text-gray-400 sm:block"></i>',
      '</button>',
    ].join('');
  }

  function renderHeader(mount) {
    const session = readStoredAuthSession();
    const showInstructorDashboard = session?.role === 'ROLE_INSTRUCTOR';
    const instructorHeaderLinks = showInstructorDashboard
      ? [{ href: 'instructor-dashboard.html', label: '강사 대시보드' }]
      : [];
    const authMarkup = buildAuthMarkup(session);

    mount.innerHTML = [
      '<div class="app-header-rail"></div>',
      '<nav class="app-header">',
      '  <div class="mx-auto flex h-full w-full max-w-[1600px] items-center gap-8 px-8">',
      '    <div class="hidden items-center px-4 lg:flex" style="width: 240px; transform: translateX(-54px)">',
      `      ${buildBrandMarkup()}`,
      '    </div>',
      '    <div class="flex items-center lg:hidden">',
      `      ${buildBrandMarkup()}`,
      '    </div>',
      '    <div class="hidden flex-1 items-center justify-center text-sm font-bold text-gray-500 md:flex">',
      '      <div class="relative inline-flex items-center" style="gap: 40px; transform: translate(15px, 0px)">',
      ...headerLinks.map(
        (item) =>
          `        <a href="${item.href}" class="inline-block whitespace-nowrap transition hover:text-brand">${item.label}</a>`,
      ),
      showInstructorDashboard
        ? `        <div class="absolute top-1/2 left-full inline-flex -translate-y-1/2 whitespace-nowrap" style="margin-left: 40px; gap: 24px">${instructorHeaderLinks
            .map(
              (item) =>
                `<a href="${item.href}" class="inline-block transition hover:text-brand">${item.label}</a>`,
            )
            .join('')}</div>`
        : '',
      '      </div>',
      '    </div>',
      '    <div class="flex items-center justify-end gap-2 md:w-60">',
      '      <div class="hidden md:block" style="transform: translate(-12.5px, 0px)">',
      `        ${authMarkup}`,
      '      </div>',
      '      <div class="md:hidden" style="transform: translate(-12.5px, 0px)">',
      `        ${authMarkup}`,
      '      </div>',
      '    </div>',
      '  </div>',
      '</nav>',
    ].join('\n');
  }

  function initStaticSiteHeader() {
    document.querySelectorAll('[data-devpath-site-header]').forEach(renderHeader);

    const queuedMessage = consumeQueuedAuthToast();

    if (queuedMessage) {
      showAuthToast(queuedMessage);
    }
  }

  window.addEventListener('storage', initStaticSiteHeader);
  window.addEventListener(AUTH_TOAST_EVENT, function (event) {
    showAuthToast(event?.detail?.message);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStaticSiteHeader);
    return;
  }

  initStaticSiteHeader();
})();
