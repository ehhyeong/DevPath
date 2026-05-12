import { useEffect } from 'react'
import { createProjectAsideHtml, createProjectHeaderHtml } from './project-shell'

const STATIC_MENTORING_HTML = String.raw`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevPath - 멘토링 찾기</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    body { font-family: 'Pretendard', sans-serif; background-color: #F8F9FA; }
    .text-brand { color: #00C471; }
    .bg-brand { background-color: #00C471; }
    .border-brand { border-color: #00C471; }
    .nav-item { display:flex; align-items:center; padding:0.75rem 1rem; border-radius:0.75rem; transition:all 0.2s; color:#6B7280; font-weight:500; cursor:pointer; }
    .nav-item:hover { background-color:#F9FAFB; color:#111827; }
    .nav-item.active { background-color:#F0FDF4; color:#00C471; font-weight:700; }
    .sidebar-text { opacity:0; width:0; overflow:hidden; white-space:nowrap; transition:all 0.3s ease; }
    aside:hover .sidebar-text { opacity:1; width:auto; margin-left:0.75rem; }
    .sidebar-section-title { opacity:0; height:0; overflow:hidden; transition:all 0.3s ease; }
    aside:hover .sidebar-section-title { opacity:1; height:auto; margin-bottom:0.5rem; margin-top:1.5rem; }
    .project-card { transition: all 0.3s ease; }
    .project-card:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); border-color: #00C471; }
    .modal { transition: opacity 0.2s, visibility 0.2s; opacity: 0; visibility: hidden; z-index: 50; }
    .modal.active { opacity: 1; visibility: visible; }
    .modal-enter { animation: modalSlideUp 0.3s ease-out forwards; }
    @keyframes modalSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .hide-scroll::-webkit-scrollbar { display:none; }
    .hide-scroll { -ms-overflow-style:none; scrollbar-width:none; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .chip { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:0 16px; height: 38px; border-radius:999px; font-size:13px; font-weight:700; border:1px solid #E5E7EB; background:#fff; color:#6B7280; transition:all 0.2s; cursor:pointer; }
    .chip.active { border-color:#00C471; background:#00C471; color:#fff; box-shadow: 0 4px 10px rgba(0,196,113,0.2); }
    .chip:hover:not(.active) { background:#F3F4F6; color:#111827; }
  </style>
</head>
<body class="flex h-screen overflow-hidden text-gray-800">
  ${createProjectAsideHtml('mentoring')}

  <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
    ${createProjectHeaderHtml()}

    <template>
      <div class="flex-1"></div>
      <div class="flex items-center gap-10 text-sm font-bold text-gray-500">
        <a href="roadmap-hub.html" class="hover:text-brand transition">로드맵</a>
        <a href="lecture-list.html" class="hover:text-brand transition">강의</a>
        <a href="lounge-dashboard.html" class="text-brand transition border-b-2 border-brand pb-1">프로젝트</a>
        <a href="community-list.html" class="hover:text-brand transition">커뮤니티</a>
        <a href="job-matching.html" class="hover:text-brand transition">채용분석</a>
      </div>

      <div class="flex-1 flex items-center justify-end gap-2">
        <div class="relative">
          <div class="cursor-pointer p-2.5 rounded-full hover:bg-gray-100 transition relative text-gray-500 hover:text-brand" onclick="toggleMsg()">
            <i class="far fa-envelope text-lg"></i>
            <span id="msgBadge" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white hidden"></span>
          </div>
          <div id="msgPopup" class="hidden absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 text-left flex flex-col">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 class="font-extrabold text-sm text-gray-900">받은 메시지</h3>
              <span class="text-[11px] text-gray-500 hover:text-brand cursor-pointer font-bold transition" onclick="markAllMsgRead()">모두 읽음</span>
            </div>
            <div id="msgList" class="max-h-[300px] overflow-y-auto custom-scrollbar bg-white"></div>
          </div>
        </div>

        <div class="relative">
          <div class="cursor-pointer p-2.5 rounded-full hover:bg-gray-100 transition relative text-gray-500 hover:text-brand" onclick="toggleNoti()">
            <i class="far fa-bell text-lg"></i>
            <span id="notiBadge" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white hidden"></span>
          </div>
          <div id="notiPopup" class="hidden absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 text-left flex flex-col">
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 class="font-extrabold text-sm text-gray-900">알림</h3>
              <span class="text-[11px] text-gray-500 hover:text-red-500 cursor-pointer font-bold transition" onclick="clearNotis()">모두 지우기</span>
            </div>
            <div id="notiList" class="max-h-[300px] overflow-y-auto custom-scrollbar bg-white"></div>
          </div>
        </div>

        <div class="w-px h-6 bg-gray-200 mx-4"></div>
        <div class="flex items-center gap-2 cursor-pointer">
          <span id="shellUserName" class="text-sm font-bold text-gray-700">게스트</span>
          <img id="shellUserImage" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Guest" class="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
        </div>
      </div>
    </template>

    <main class="flex-1 overflow-y-auto bg-[#F8F9FA] relative scroll-smooth" id="mainContainer">
      <div class="max-w-7xl mx-auto px-6 py-10">
        <div class="flex flex-col md:flex-row md:justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <span class="text-brand font-bold text-xs bg-green-50 px-3 py-1 rounded-full mb-3 inline-block border border-green-100">Mentoring Program</span>
            <h1 class="text-3xl font-extrabold text-gray-900 mb-2">현업 멘토와 함께하는 실전 프로젝트</h1>
            <p class="text-gray-500 text-sm">단순 강의가 아닙니다. 멘토의 코드 리뷰와 피드백으로 포트폴리오를 완성하세요.</p>
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-8 space-y-5">
          <div class="flex flex-col md:flex-row gap-3">
            <div class="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 h-[46px] focus-within:border-brand focus-within:bg-white transition">
              <i class="fas fa-search text-gray-400"></i>
              <input id="searchInput" type="text" class="bg-transparent outline-none w-full text-sm h-full" placeholder="프로젝트 제목, 기술 스택, 멘토 이름으로 검색해보세요" oninput="applyFilters()">
            </div>
            <div class="flex flex-wrap md:flex-nowrap gap-2 shrink-0">
              <select id="typeSelect" onchange="applyFilters()" class="w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-xl pl-4 pr-10 h-[46px] focus:border-brand outline-none font-bold cursor-pointer transition hover:bg-gray-50 shadow-sm">
                <option value="all">진행방식 전체</option>
                <option value="study">공통 과제형</option>
                <option value="team">팀 프로젝트형</option>
              </select>
              <select id="sortSelect" onchange="applyFilters()" class="w-full md:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-xl pl-4 pr-10 h-[46px] focus:border-brand outline-none font-bold cursor-pointer transition hover:bg-gray-50 shadow-sm">
                <option value="latest">최신 등록순</option>
                <option value="deadline">마감 임박순</option>
              </select>
            </div>
          </div>

          <div class="flex gap-2.5 overflow-x-auto hide-scroll pb-1 -mx-2 px-2 md:mx-0 md:px-0">
            <button class="chip active shrink-0" data-filter="all" onclick="setCategory('all')">전체</button>
            <button class="chip shrink-0" data-filter="Backend" onclick="setCategory('Backend')">Backend</button>
            <button class="chip shrink-0" data-filter="Frontend" onclick="setCategory('Frontend')">Frontend</button>
            <button class="chip shrink-0" data-filter="Fullstack" onclick="setCategory('Fullstack')">Fullstack</button>
            <button class="chip shrink-0" data-filter="App" onclick="setCategory('App')">App (iOS/AOS)</button>
            <button class="chip shrink-0" data-filter="AI" onclick="setCategory('AI')">AI / Data</button>
            <button class="chip shrink-0" data-filter="DevOps" onclick="setCategory('DevOps')">DevOps / Infra</button>
            <button class="chip shrink-0" data-filter="Security" onclick="setCategory('Security')">Security</button>
            <button class="chip shrink-0" data-filter="PM" onclick="setCategory('PM')">PM / 기획</button>
            <button class="chip shrink-0" data-filter="Design" onclick="setCategory('Design')">UI/UX 디자인</button>
          </div>
        </div>

        <div id="project-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]"></div>
        <div id="paginationContainer" class="mt-12 flex justify-center items-center gap-1.5 pb-8"></div>
      </div>
    </main>
  </div>

  <div id="detailModal" class="modal fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeModal('detailModal')"></div>
    <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 flex flex-col max-h-[95vh] modal-enter overflow-hidden">
      <div class="p-8 bg-gradient-to-br from-gray-800 to-gray-900 relative shrink-0 text-white">
        <button onclick="closeModal('detailModal')" class="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center transition">
          <i class="fas fa-times"></i>
        </button>
        <div class="flex flex-wrap gap-2 mb-3 items-center">
          <span class="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded" id="modal-badge">모집중</span>
          <span class="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded" id="modal-tech">Category</span>
          <span id="modal-type" class="bg-purple-500/20 border border-purple-400/50 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded">Type</span>
        </div>
        <h2 class="text-2xl font-extrabold leading-tight" id="modal-title">프로젝트 제목</h2>
      </div>

      <div class="flex-1 overflow-y-auto p-8">
        <div class="flex items-center gap-4 mb-8 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <img id="modal-mentor-img" src="" class="w-14 h-14 rounded-full border border-gray-100 bg-gray-50">
          <div class="flex-1 min-w-0">
            <p class="text-[10px] text-brand font-bold mb-0.5 tracking-wider">MENTOR</p>
            <p class="font-extrabold text-gray-900 text-base" id="modal-mentor-name">멘토 이름</p>
            <p class="text-xs text-gray-500 truncate mt-0.5" id="modal-mentor-desc">멘토 소개</p>
          </div>
          <a id="modal-mentor-link" href="instructor-channel.html" class="shrink-0 bg-white border border-gray-200 text-gray-700 hover:text-brand hover:border-brand text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm flex items-center gap-1.5">
            채널 방문 <i class="fas fa-chevron-right text-[10px]"></i>
          </a>
        </div>
        <div class="space-y-8">
          <div>
            <h3 class="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><i class="fas fa-bullseye text-brand"></i> 프로젝트 소개</h3>
            <p class="text-sm text-gray-600 leading-relaxed" id="modal-desc">설명 텍스트</p>
          </div>
          <div>
            <h3 class="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2 border-b border-gray-100 pb-2"><i class="fas fa-list-ol text-brand"></i> 주차별 커리큘럼</h3>
            <div class="space-y-3" id="modal-curriculum"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
              <p class="text-[10px] text-gray-500 mb-1 font-bold">모집 인원</p>
              <p class="font-extrabold text-gray-900 text-lg" id="modal-capacity">0 / 0명</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl text-center border border-gray-100">
              <p class="text-[10px] text-gray-500 mb-1 font-bold">예상 기간</p>
              <p class="font-extrabold text-gray-900 text-lg" id="modal-duration">4주</p>
            </div>
          </div>
        </div>
      </div>

      <div class="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
        <button onclick="closeModal('detailModal')" class="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition">닫기</button>
        <button id="applyButton" onclick="openApplyForm()" class="px-8 py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition shadow-lg flex items-center gap-2">
          참가 신청하기 <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>

  <div id="applyModal" class="modal fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="closeModal('applyModal')"></div>
    <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden modal-enter">
      <div class="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h2 class="text-lg font-extrabold text-gray-900">참여 신청서 작성</h2>
        <button onclick="closeModal('applyModal')" class="text-gray-400 hover:text-gray-900"><i class="fas fa-times"></i></button>
      </div>
      <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto" id="apply-form-content"></div>
      <div class="p-5 border-t border-gray-100 bg-white flex justify-end gap-2">
        <button onclick="closeModal('applyModal')" class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">취소</button>
        <button onclick="submitApplication()" class="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md">제출하기</button>
      </div>
    </div>
  </div>

  <script>__DEVPATH_MENTORING_RUNTIME__</script>
</body>
</html>`;

const MENTORING_RUNTIME_SCRIPT = String.raw`
const AUTH_STORAGE_KEY = 'devpath.auth.session';
let myMessages = [];
let myNotis = [];
let projects = [];
let currentCategory = 'all';
let currentPage = 1;
let filteredProjects = [];
let currentProjectId = null;
const itemsPerPage = 6;

function readSession() {
  for (const storage of [localStorage, sessionStorage]) {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    if (!raw) continue;
    try { return JSON.parse(raw); } catch { storage.removeItem(AUTH_STORAGE_KEY); }
  }
  return null;
}

function buildHeaders(requireAuth) {
  const headers = new Headers({ Accept: 'application/json' });
  const session = readSession();
  if (session && session.accessToken) headers.set('Authorization', 'Bearer ' + session.accessToken);
  if (requireAuth && (!session || !session.accessToken)) throw new Error('로그인이 필요합니다.');
  return headers;
}

async function apiRequest(path, init, requireAuth) {
  const headers = buildHeaders(Boolean(requireAuth));
  if (init && init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, Object.assign({}, init || {}, { headers }));
  if (!response.ok) {
    let message = '요청에 실패했습니다.';
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  const body = await response.json();
  return body.data || body;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dice(seed) {
  return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(seed || 'DevPath');
}

function typeIcon(type) {
  return type === 'team' ? 'fa-puzzle-piece' : 'fa-users';
}

function badgeFor(post) {
  if (post.closed) return { text: '마감완료', color: 'text-gray-500 bg-gray-200' };
  if (typeof post.deadlineDaysLeft === 'number' && post.deadlineDaysLeft <= 3) {
    return { text: '마감임박', color: 'text-red-600 bg-red-100' };
  }
  return { text: '모집중', color: 'text-green-600 bg-green-100' };
}

function mapProject(post) {
  const badge = badgeFor(post);
  const stacks = Array.isArray(post.stacks) && post.stacks.length ? post.stacks : String(post.requiredStacks || '').split(',').map(t => t.trim()).filter(Boolean);
  return {
    id: Number(post.postId),
    category: post.category || 'Backend',
    mType: post.mentoringType || 'study',
    mTypeLabel: post.mentoringTypeLabel || (post.mentoringType === 'team' ? '팀 프로젝트형' : '공통 과제형'),
    mTypeIcon: typeIcon(post.mentoringType),
    title: post.title || '제목 없음',
    tech: stacks.join(', '),
    badge: badge.text,
    badgeColor: badge.color,
    mentor: {
      id: post.mentorId,
      name: post.mentorName || '멘토',
      desc: post.mentorDescription || 'DevPath 멘토',
      img: post.mentorImage || dice('mentor-' + post.mentorId)
    },
    desc: post.content || '',
    curriculum: Array.isArray(post.curriculum) && post.curriculum.length ? post.curriculum : ['오리엔테이션', '핵심 기능 구현', '멘토 리뷰', '최종 발표'],
    capacity: (Number(post.currentParticipants) || 0) + ' / ' + (Number(post.maxParticipants) || 1) + '명',
    duration: (Number(post.durationWeeks) || 4) + '주',
    createdAt: post.createdAt || '',
    deadlineLeft: typeof post.deadlineDaysLeft === 'number' ? post.deadlineDaysLeft : 999,
    closed: post.closed === true
  };
}

function renderShell(shell) {
  if (!shell) return;
  const user = shell.user || {};
  const nameEl = document.getElementById('shellUserName');
  const imgEl = document.getElementById('shellUserImage');
  if (nameEl) nameEl.innerText = user.name || '게스트';
  if (imgEl) imgEl.src = user.profileImage || dice(user.name || 'Guest');

  const menu = document.getElementById('shellMenuList');
  if (menu && Array.isArray(shell.menu)) {
    menu.innerHTML = shell.menu.map(item => {
      const active = item.key === 'mentoring' ? ' active' : '';
      return '<a href="' + escapeHtml(item.href) + '" class="nav-item' + active + '"><i class="fas ' + escapeHtml(item.icon) + ' w-6 text-center text-lg"></i><span class="sidebar-text">' + escapeHtml(item.label) + '</span></a>';
    }).join('');
  }

  const squads = document.getElementById('mySquadList');
  if (squads && Array.isArray(shell.mySquads)) {
    squads.innerHTML = shell.mySquads.length
      ? shell.mySquads.map(s => '<a href="squad-dashboard.html?squadId=' + encodeURIComponent(s.id) + '" class="nav-item"><span class="w-2.5 h-2.5 rounded-full ' + escapeHtml(s.colorClass || 'bg-blue-500') + ' shrink-0 mx-2"></span><span class="sidebar-text truncate">' + escapeHtml(s.name) + '</span></a>').join('')
      : '<p class="px-4 py-3 text-xs text-gray-400 sidebar-text">참여 중인 스쿼드가 없습니다.</p>';
  }

  myMessages = Array.isArray(shell.messages) ? shell.messages.map(m => ({
    id: m.id,
    sender: m.sender || '사용자',
    senderImg: m.senderImage || ('message-' + m.senderId),
    text: m.text || '',
    date: m.dateText || '',
    read: Boolean(m.read)
  })) : [];
  myNotis = Array.isArray(shell.notifications) ? shell.notifications.map(n => ({
    id: n.id,
    type: n.type || 'SYSTEM',
    text: n.text || '',
    date: n.dateText || '',
    read: Boolean(n.read)
  })) : [];
  renderMessages();
  renderNotis();
}

function toggleMsg() {
  document.getElementById('msgPopup').classList.toggle('hidden');
  document.getElementById('notiPopup').classList.add('hidden');
  renderMessages();
}

function toggleNoti() {
  document.getElementById('notiPopup').classList.toggle('hidden');
  document.getElementById('msgPopup').classList.add('hidden');
  renderNotis();
}

function markAllMsgRead() {
  myMessages.forEach(m => m.read = true);
  renderMessages();
}

function clearNotis() {
  myNotis = [];
  renderNotis();
}

function renderMessages() {
  const list = document.getElementById('msgList');
  if (!list) return;
  if (!myMessages.length) {
    list.innerHTML = '<div class="py-10 text-center flex flex-col items-center"><i class="far fa-envelope-open text-3xl text-gray-300 mb-2"></i><p class="text-xs text-gray-400 font-bold">받은 메시지가 없습니다.</p></div>';
  } else {
    list.innerHTML = myMessages.slice(0, 4).map(msg =>
      '<div class="p-4 border-b border-gray-50 cursor-pointer flex gap-3 items-start transition ' + (msg.read ? 'bg-white hover:bg-gray-50' : 'bg-green-50/30 hover:bg-green-50/50') + '">' +
      '<img src="' + dice(msg.senderImg) + '" class="w-9 h-9 rounded-full border border-gray-200 bg-white shrink-0 shadow-sm">' +
      '<div class="flex-1 min-w-0"><div class="flex justify-between items-center mb-1"><span class="text-[13px] font-extrabold text-gray-900">' + escapeHtml(msg.sender) + '</span><span class="text-[10px] text-gray-400 font-bold">' + escapeHtml(msg.date) + '</span></div><p class="text-xs text-gray-600 line-clamp-1 leading-relaxed">' + escapeHtml(msg.text) + '</p></div>' +
      (!msg.read ? '<span class="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0 shadow-sm"></span>' : '') +
      '</div>'
    ).join('');
  }
  const badge = document.getElementById('msgBadge');
  if (badge) badge.style.display = myMessages.some(m => !m.read) ? 'block' : 'none';
}

function renderNotis() {
  const list = document.getElementById('notiList');
  if (!list) return;
  if (!myNotis.length) {
    list.innerHTML = '<div class="py-10 text-center flex flex-col items-center"><i class="far fa-bell-slash text-3xl text-gray-300 mb-2"></i><p class="text-xs text-gray-400 font-bold">새 알림이 없습니다.</p></div>';
  } else {
    list.innerHTML = myNotis.slice(0, 4).map(noti =>
      '<div class="p-4 border-b border-gray-50 cursor-pointer flex gap-3 items-start transition ' + (noti.read ? 'bg-white hover:bg-gray-50' : 'bg-brand/5 hover:bg-brand/10') + '">' +
      '<div class="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm shrink-0"><i class="fas fa-info-circle"></i></div>' +
      '<div class="flex-1 min-w-0"><p class="text-xs text-gray-800 leading-relaxed mb-1">' + escapeHtml(noti.text) + '</p><span class="text-[10px] text-gray-400 font-bold">' + escapeHtml(noti.date) + '</span></div>' +
      (!noti.read ? '<span class="w-1.5 h-1.5 bg-brand rounded-full mt-2 shrink-0"></span>' : '') +
      '</div>'
    ).join('');
  }
  const badge = document.getElementById('notiBadge');
  if (badge) badge.style.display = myNotis.some(n => !n.read) ? 'block' : 'none';
}

function setCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.chip').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector('.chip[data-filter="' + cat + '"]');
  if (activeBtn) activeBtn.classList.add('active');
  applyFilters(true);
}

function applyFilters(resetPage) {
  if (resetPage !== false) currentPage = 1;
  const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const sortVal = document.getElementById('sortSelect').value;
  const typeVal = document.getElementById('typeSelect').value;
  filteredProjects = projects.slice();

  if (currentCategory !== 'all') filteredProjects = filteredProjects.filter(p => p.category === currentCategory);
  if (typeVal !== 'all') filteredProjects = filteredProjects.filter(p => p.mType === typeVal);
  if (q) {
    filteredProjects = filteredProjects.filter(p => (p.title + ' ' + p.tech + ' ' + p.mentor.name + ' ' + p.desc).toLowerCase().includes(q));
  }

  filteredProjects.sort((a, b) => {
    if (a.closed && !b.closed) return 1;
    if (!a.closed && b.closed) return -1;
    if (sortVal === 'deadline') return a.deadlineLeft - b.deadlineLeft;
    return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
  });
  renderProjects();
}

function renderProjects() {
  const container = document.getElementById('project-list');
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCards = filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  if (!paginatedCards.length) {
    container.innerHTML = '<div class="col-span-full bg-white border border-gray-200 rounded-2xl p-16 text-center text-gray-500 shadow-sm"><i class="fas fa-folder-open text-4xl text-gray-300 mb-4 opacity-50"></i><p class="font-bold text-sm">조건에 맞는 멘토링 프로젝트가 없습니다.</p></div>';
    renderPagination(0);
    return;
  }

  container.innerHTML = paginatedCards.map(p => {
    const techHtml = p.tech.split(',').map(t => t.trim()).filter(Boolean).map(t => '<span class="text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-100 px-2 py-1 rounded shadow-sm">' + escapeHtml(t) + '</span>').join('');
    const closedStyle = p.closed ? 'opacity-70 grayscale-[0.3]' : '';
    return '<div class="project-card bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer group flex flex-col h-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 ' + closedStyle + '" onclick="openDetail(' + p.id + ')">' +
      '<div class="flex justify-between items-start mb-4"><div class="flex gap-1.5 flex-wrap"><span class="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded border border-gray-200 shadow-sm">' + escapeHtml(p.category) + '</span><span class="' + p.badgeColor + ' text-[10px] font-bold px-2 py-1 rounded border border-current shadow-sm">' + escapeHtml(p.badge) + '</span><span class="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded border border-purple-200 shadow-sm"><i class="fas ' + p.mTypeIcon + ' mr-1"></i>' + escapeHtml(p.mTypeLabel) + '</span></div><i class="fas fa-bookmark text-gray-300 hover:text-brand transition text-lg"></i></div>' +
      '<div class="flex-1"><h3 class="font-extrabold text-xl text-gray-900 mb-2 group-hover:text-brand transition line-clamp-1">' + escapeHtml(p.title) + '</h3><p class="text-sm text-gray-500 mb-5 line-clamp-2 leading-relaxed h-10">' + escapeHtml(p.desc) + '</p><div class="flex flex-wrap gap-2 mb-6">' + techHtml + '</div></div>' +
      '<div class="flex items-center justify-between mt-auto pt-4 border-t border-gray-100"><div class="flex items-center gap-3"><img src="' + p.mentor.img + '" class="w-9 h-9 rounded-full border border-gray-200 shadow-sm"><div class="min-w-0"><p class="text-xs font-extrabold text-gray-900">' + escapeHtml(p.mentor.name) + ' <span class="font-normal text-brand text-[10px] ml-1"><i class="fas fa-check-circle"></i> 검증됨</span></p><p class="text-[10px] text-gray-400 truncate w-40 mt-0.5">' + escapeHtml(p.mentor.desc) + '</p></div></div><div class="text-gray-300 group-hover:text-brand transition transform group-hover:translate-x-1"><i class="fas fa-chevron-right text-sm"></i></div></div>' +
      '</div>';
  }).join('');
  renderPagination(Math.ceil(filteredProjects.length / itemsPerPage));
}

function renderPagination(totalPages) {
  const container = document.getElementById('paginationContainer');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    const activeClass = i === currentPage ? 'bg-gray-900 text-white shadow-md cursor-default' : 'text-gray-500 hover:bg-gray-100 cursor-pointer';
    html += '<button onclick="changePage(' + i + ')" class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition ' + activeClass + '">' + i + '</button>';
  }
  container.innerHTML = html;
}

function changePage(page) {
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderProjects();
  document.getElementById('mainContainer').scrollTo({ top: 0, behavior: 'smooth' });
}

function openDetail(id) {
  const p = projects.find(item => item.id === id);
  if (!p) return;
  currentProjectId = id;
  const badgeEl = document.getElementById('modal-badge');
  badgeEl.innerText = p.badge;
  badgeEl.className = p.badgeColor + ' text-[10px] font-bold px-2 py-0.5 rounded border border-current';
  document.getElementById('modal-tech').innerText = p.category;
  document.getElementById('modal-type').innerHTML = '<i class="fas ' + p.mTypeIcon + ' mr-1"></i>' + escapeHtml(p.mTypeLabel);
  document.getElementById('modal-title').innerText = p.title;
  document.getElementById('modal-mentor-img').src = p.mentor.img;
  document.getElementById('modal-mentor-name').innerText = p.mentor.name;
  document.getElementById('modal-mentor-desc').innerText = p.mentor.desc;
  document.getElementById('modal-desc').innerText = p.desc;
  document.getElementById('modal-capacity').innerText = p.capacity;
  document.getElementById('modal-duration').innerText = p.duration;
  document.getElementById('applyButton').disabled = p.closed;
  document.getElementById('applyButton').classList.toggle('opacity-40', p.closed);
  document.getElementById('applyButton').classList.toggle('cursor-not-allowed', p.closed);
  document.getElementById('modal-curriculum').innerHTML = p.curriculum.map((c, i) =>
    '<div class="flex gap-3 items-start"><div class="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">' + (i + 1) + '</div><p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl w-full border border-gray-100">' + escapeHtml(c) + '</p></div>'
  ).join('');
  document.getElementById('detailModal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function openApplyForm() {
  const p = projects.find(item => item.id === currentProjectId);
  if (!p || p.closed) return;
  const roleSelectHtml = p.mType === 'team'
    ? '<div class="mb-5"><label class="block text-xs font-bold text-gray-600 mb-1.5">지원할 직군 <span class="text-red-500">*</span></label><select id="applyRole" class="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-brand outline-none"><option>Frontend 개발자</option><option>Backend 개발자</option><option>디자이너 / 기획자</option></select></div>'
    : '';
  document.getElementById('apply-form-content').innerHTML =
    roleSelectHtml +
    '<div><label class="block text-xs font-bold text-gray-600 mb-1.5">참여 동기 <span class="text-red-500">*</span></label><textarea id="applyMessage" class="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-brand outline-none h-32 resize-none" placeholder="이 프로젝트를 통해 얻고 싶은 것과 현재 역량을 적어주세요."></textarea></div>' +
    '<div class="mt-5"><label class="block text-xs font-bold text-gray-600 mb-1.5">포트폴리오 / GitHub URL</label><input id="applyPortfolio" type="text" class="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-brand outline-none" placeholder="https://github.com/username"></div>';
  document.getElementById('applyModal').classList.add('active');
}

async function submitApplication() {
  const p = projects.find(item => item.id === currentProjectId);
  const messageEl = document.getElementById('applyMessage');
  const portfolioEl = document.getElementById('applyPortfolio');
  const roleEl = document.getElementById('applyRole');
  const message = (messageEl ? messageEl.value : '').trim();
  if (!message) {
    alert('참여 동기를 입력해주세요.');
    return;
  }
  const extra = [];
  if (roleEl && roleEl.value) extra.push('지원 직군: ' + roleEl.value);
  if (portfolioEl && portfolioEl.value.trim()) extra.push('포트폴리오: ' + portfolioEl.value.trim());
  try {
    await apiRequest('/api/mentoring-posts/' + p.id + '/applications', {
      method: 'POST',
      body: JSON.stringify({ message: extra.length ? message + '\\n\\n' + extra.join('\\n') : message })
    }, true);
    alert('신청이 완료되었습니다.');
    closeModal('applyModal');
    closeModal('detailModal');
  } catch (error) {
    alert(error.message || '신청에 실패했습니다.');
  }
}

async function loadPage() {
  const results = await Promise.allSettled([
    apiRequest('/api/lounge/shell'),
    apiRequest('/api/mentorings/hub')
  ]);
  if (results[0].status === 'fulfilled') renderShell(results[0].value);
  if (results[1].status === 'fulfilled') {
    const hub = results[1].value || {};
    projects = Array.isArray(hub.openPosts) ? hub.openPosts.map(mapProject) : [];
  }
  applyFilters(false);
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.relative')) {
    const msg = document.getElementById('msgPopup');
    const noti = document.getElementById('notiPopup');
    if (msg) msg.classList.add('hidden');
    if (noti) noti.classList.add('hidden');
  }
});

window.onload = function () {
  loadPage().catch(error => {
    console.error(error);
    projects = [];
    applyFilters(false);
  });
};
`;

const MENTORING_HTML = STATIC_MENTORING_HTML.replace(
  '__DEVPATH_MENTORING_RUNTIME__',
  MENTORING_RUNTIME_SCRIPT,
)

export default function MentoringHubApp() {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyMargin = document.body.style.margin

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.margin = '0'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.margin = previousBodyMargin
    }
  }, [])

  return (
    <iframe
      title="DevPath 멘토링 찾기"
      srcDoc={MENTORING_HTML}
      className="fixed inset-0 block h-dvh w-dvw border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
    />
  )
}
