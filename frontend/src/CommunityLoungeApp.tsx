const STATIC_LOUNGE_HTML = String.raw`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DevPath - 스쿼드 라운지</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
    <style>
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        body { font-family: 'Pretendard', sans-serif; background-color: #F8F9FA; }
        .text-brand { color: #00C471; }
        .bg-brand { background-color: #00C471; }
        .border-brand { border-color: #00C471; }

        /* 사이드바 */
        .nav-item { display:flex; align-items:center; padding:0.75rem 1rem; border-radius:0.75rem; transition:all 0.2s; color:#6B7280; font-weight:500; cursor:pointer; }
        .nav-item:hover { background-color:#F9FAFB; color:#111827; }
        .nav-item.active { background-color:#F0FDF4; color:#00C471; font-weight:700; }

        .sidebar-text { opacity:0; width:0; overflow:hidden; white-space:nowrap; transition:all 0.3s ease; }
        aside:hover .sidebar-text { opacity:1; width:auto; margin-left:0.75rem; }
        .sidebar-section-title { opacity:0; height:0; overflow:hidden; transition:all 0.3s ease; }
        aside:hover .sidebar-section-title { opacity:1; height:auto; margin-bottom:0.5rem; margin-top:1.5rem; }

        .rank-1 { background: linear-gradient(135deg, #FFD700, #FDB931); color: white; border: none; }
        .rank-2 { background: linear-gradient(135deg, #E0E0E0, #BDBDBD); color: white; border: none; }

        .hide-scroll::-webkit-scrollbar { display:none; }
        .hide-scroll { -ms-overflow-style:none; scrollbar-width:none; }

        .modal { transition: opacity 0.2s, visibility 0.2s; opacity: 0; visibility: hidden; z-index: 50; }
        .modal.active { opacity: 1; visibility: visible; }

        .tab-btn.active { border-bottom: 2px solid #00C471; color: #00C471; font-weight: 700; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .modal-enter { animation: modalScaleIn 0.2s ease-out forwards; }
        @keyframes modalScaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        /* 체크박스 커스텀 테마 */
        input[type="checkbox"]:checked { background-color: #00C471; border-color: #00C471; }
    </style>
</head>

<body class="flex h-screen overflow-hidden text-gray-800">

    <aside class="w-20 hover:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out group shadow-xl">
        <div class="h-20 flex items-center px-5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 shrink-0" onclick="location.href='home.html'">
            <div class="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-brand text-xl shrink-0 shadow-md">
                <i class="fas fa-layer-group"></i>
            </div>
            <div class="sidebar-text flex flex-col">
                <p class="font-bold text-gray-900 text-lg tracking-tight">DevSquad</p>
                <p class="text-[10px] text-gray-400">Team Building</p>
            </div>
        </div>

        <nav class="flex-1 px-3 space-y-2 mt-4 overflow-y-auto overflow-x-hidden">
            <p class="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MENU</p>

            <a href="lounge-dashboard.html" class="nav-item">
                <i class="fas fa-home w-6 text-center text-lg"></i>
                <span class="sidebar-text">대시보드</span>
            </a>

            <a href="project-lounge.html" class="nav-item active" id="navLounge">
                <i class="fas fa-rocket w-6 text-center text-lg"></i>
                <span class="sidebar-text">라운지 (팀 찾기)</span>
            </a>

            <a href="mentoring-hub.html" class="nav-item">
                <i class="fas fa-chalkboard-teacher w-6 text-center text-lg"></i>
                <span class="sidebar-text">멘토링 찾기</span>
            </a>

            <a href="workspace-hub.html" class="nav-item">
                <i class="fas fa-laptop-code w-6 text-center text-lg"></i>
                <span class="sidebar-text">워크스페이스</span>
            </a>

            <a href="dev-showcase.html" class="nav-item">
                <i class="fas fa-trophy w-6 text-center text-lg"></i>
                <span class="sidebar-text">런칭 쇼케이스</span>
            </a>

            <p class="px-4 text-xs font-bold text-gray-400 sidebar-section-title">MY SQUADS</p>
            <div id="mySquadList">
                <a href="squad-dashboard.html" class="nav-item">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mx-2"></span>
                    <span class="sidebar-text truncate">🔥 배달비 절약팀</span>
                </a>
                <a href="squad-dashboard.html" class="nav-item">
                    <span class="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 mx-2"></span>
                    <span class="sidebar-text truncate">CS 전공지식 스터디</span>
                </a>
            </div>
        </nav>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        <header class="h-16 bg-white border-b border-gray-100 flex items-center px-8 sticky top-0 z-30 shrink-0">
            <div class="flex-1"></div>

            <div class="flex items-center gap-10 text-sm font-bold text-gray-500">
                <a href="roadmap-hub.html" class="hover:text-brand transition">로드맵</a>
                <a href="lecture-list.html" class="hover:text-brand transition">강의</a>
                <a href="project-lounge.html" class="text-brand transition border-b-2 border-brand pb-1">프로젝트</a>
                <a href="community-list.html" class="hover:text-brand transition">커뮤니티</a>
                <a href="job-matching.html" class="hover:text-brand transition">채용분석</a>
            </div>

            <div class="flex-1 flex items-center justify-end gap-2">
                <div class="relative">
                    <div class="cursor-pointer p-2.5 rounded-full hover:bg-gray-100 transition relative text-gray-500 hover:text-brand" onclick="toggleMsg()">
                        <i class="far fa-envelope text-lg"></i>
                        <span id="msgBadge" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </div>
                    <div id="msgPopup" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 text-left">
                        <div class="p-4 border-b border-gray-50 flex justify-between items-center">
                            <h3 class="font-bold text-sm">받은 메시지</h3>
                            <span class="text-xs text-gray-400 cursor-pointer">모두 읽음</span>
                        </div>
                        <div id="msgList" class="max-h-60 overflow-y-auto"></div>
                    </div>
                </div>

                <div class="relative">
                    <div class="cursor-pointer p-2.5 rounded-full hover:bg-gray-100 transition relative text-gray-500 hover:text-brand" onclick="toggleNoti()">
                        <i class="far fa-bell text-lg"></i>
                        <span id="notiBadge" class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </div>
                    <div id="notiPopup" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 text-left">
                        <div class="p-4 border-b border-gray-50 flex justify-between items-center">
                            <h3 class="font-bold text-sm">알림</h3>
                            <span class="text-xs text-gray-400 cursor-pointer" onclick="clearNoti()">지우기</span>
                        </div>
                        <div id="notiList" class="max-h-60 overflow-y-auto">
                            <div class="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer">
                                <p class="text-xs text-gray-800">🎉 <strong>데브강</strong>님이 신청을 수락했습니다.</p>
                                <span class="text-[10px] text-gray-400">방금 전</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="w-px h-6 bg-gray-200 mx-4"></div>

                <div class="flex items-center gap-2 cursor-pointer">
                    <span class="text-sm font-bold text-gray-700">나(사용자)</span>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=MyUser" class="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
                </div>
            </div>
        </header>

        <main class="flex-1 overflow-hidden flex flex-col bg-[#F8F9FA] relative">
            <div id="viewLounge" class="flex-1 overflow-y-auto">
                <div class="bg-gray-900 text-white p-12 relative overflow-hidden">
                    <div class="absolute right-0 top-0 w-96 h-96 bg-brand opacity-10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
                    <div class="relative z-10 max-w-5xl mx-auto">
                        <span class="bg-brand/20 border border-brand/30 text-brand text-[11px] font-extrabold px-3 py-1 rounded-full mb-3 inline-block uppercase tracking-wider"><i class="fas fa-rocket mr-1"></i> DevSquad Lounge</span>
                        <h1 class="text-4xl font-extrabold mb-3 leading-tight">함께 성장할 <span class="text-brand">최고의 동료</span>를 찾으세요.</h1>
                        <p class="text-gray-400 text-sm mb-8">사이드 프로젝트부터 전공 스터디, 모각코까지. 당신의 열정을 함께 나눌 팀원들을 만나보세요.</p>
                        <div class="flex gap-3">
                            <button onclick="openCreateModal()" class="bg-brand hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg flex items-center gap-2 transform hover:-translate-y-1">
                                <i class="fas fa-plus"></i> 스쿼드 생성
                            </button>
                            <button onclick="updateStatusList(); toggleModal('statusModal')" class="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold text-sm transition backdrop-blur-sm relative">
                                내 지원 현황 확인
                            </button>
                        </div>
                    </div>
                </div>

                <div class="max-w-6xl mx-auto p-8 -mt-8">
                    <div class="bg-white p-2 rounded-2xl shadow-lg border border-gray-100 mb-8 flex items-center gap-2 flex-wrap lg:flex-nowrap">

                        <div class="flex-1 relative w-full lg:w-auto">
                            <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="searchInput" onkeyup="applyFilters()" placeholder="기술 스택, 제목, 태그 검색..." class="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:bg-gray-50 transition">
                        </div>

                        <div class="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                        <div class="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start px-2 lg:px-0">
                            <select id="sortSelect" onchange="applyFilters()" class="py-2 text-sm font-bold text-gray-600 bg-transparent outline-none cursor-pointer hover:text-gray-900 border-none focus:ring-0">
                                <option value="latest">최신순</option>
                                <option value="views">조회순</option>
                                <option value="deadline">마감 임박순</option>
                                <option value="available">잔여 자리순</option>
                            </select>

                            <label class="flex items-center gap-1.5 text-sm font-bold text-gray-600 cursor-pointer hover:text-gray-900 shrink-0">
                                <input type="checkbox" id="hideClosedCheckbox" onchange="applyFilters()" class="w-4 h-4 text-brand focus:ring-brand rounded border-gray-300 cursor-pointer appearance-none border checked:bg-brand checked:border-brand flex items-center justify-center relative after:content-[''] after:absolute after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45 after:-mt-0.5 checked:after:block after:hidden">
                                <span>모집중만 보기</span>
                            </label>
                        </div>

                        <div class="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                        <div class="flex gap-2 overflow-x-auto hide-scroll w-full lg:w-auto pb-2 lg:pb-0">
                            <button class="tab-btn active px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap" onclick="filterTab('all', this)">전체</button>
                            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition whitespace-nowrap" onclick="filterTab('project', this)">🚀 프로젝트</button>
                            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition whitespace-nowrap" onclick="filterTab('join_wish', this)">🙋 참여 희망</button>
                            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition whitespace-nowrap" onclick="filterTab('study', this)">📚 스터디</button>
                            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition whitespace-nowrap" onclick="filterTab('networking', this)">☕ 모각코</button>
                            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-brand hover:bg-gray-50 transition whitespace-nowrap" onclick="filterTab('my_posts', this)">💪 내가 쓴 글</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]" id="cardList"></div>

                    <div id="paginationContainer" class="mt-10 flex justify-center items-center gap-1.5 pb-8"></div>
                </div>
            </div>
        </main>
    </div>

    <div id="createModal" class="modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 p-8 modal-enter overflow-y-auto max-h-[90vh]">
            <h2 class="text-2xl font-bold text-gray-900 mb-6" id="createModalTitle">새 스쿼드 만들기</h2>
            <div class="space-y-5">
                <input type="hidden" id="edit-id">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">스쿼드 제목</label>
                    <input type="text" id="c-title" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" placeholder="제목을 입력하세요">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">유형</label>
                        <select id="c-type" onchange="applyTemplate()" class="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm outline-none bg-white font-medium">
                            <option value="project">🚀 프로젝트 모집</option>
                            <option value="join_wish">🙋 참여 희망 (Hire Me)</option>
                            <option value="study">📚 스터디 모집</option>
                            <option value="networking">☕ 모각코</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 마감일</label>
                        <input type="date" id="c-deadline" class="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:border-brand outline-none bg-white">
                    </div>
                </div>
                <div id="maxMemberContainer">
                    <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 인원</label>
                    <input type="number" id="c-max" min="1" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" placeholder="예: 4">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">기술 스택</label>
                    <input type="text" id="c-tags" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" placeholder="#React #Spring">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">소개글</label>
                    <textarea id="c-desc" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm h-56 resize-none focus:border-brand outline-none"></textarea>
                </div>
            </div>
            <div class="mt-8 flex justify-end gap-3">
                <button onclick="toggleModal('createModal')" class="px-6 py-3 bg-gray-100 rounded-xl text-sm font-bold text-gray-600">취소</button>
                <button onclick="submitSquad()" class="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-xl transition hover:bg-black" id="createSubmitBtn">생성하기</button>
            </div>
        </div>
    </div>

    <div id="statusModal" class="modal fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh] modal-enter">
            <div class="p-4 border-b border-gray-100 flex flex-col bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold">지원 및 요청 현황</h2>
                    <button onclick="toggleModal('statusModal')" class="text-gray-400 hover:text-gray-900"><i class="fas fa-times"></i></button>
                </div>
                <div class="flex bg-gray-100 p-1 rounded-xl">
                    <button id="tabSent" onclick="switchStatusTab('sent')" class="flex-1 py-2 text-xs font-bold rounded-lg transition bg-white shadow-sm text-brand">보낸 신청</button>
                    <button id="tabReceived" onclick="switchStatusTab('received')" class="flex-1 py-2 text-xs font-bold rounded-lg transition text-gray-500">받은 요청</button>
                </div>
            </div>
            <div id="statusListContent" class="p-5 space-y-3 overflow-y-auto bg-gray-50 flex-1"></div>
        </div>
    </div>

    <script>
        let currentPage = 1;
        const itemsPerPage = 6;
        let activeStatusTab = 'sent';
        let myMessages = [{ id: 1, sender: "김데브", senderImg: "Felix", text: "안녕하세요! 포트폴리오 잘 봤습니다.", date: "방금 전", read: false }];
        let myApplications = [];
        let receivedRequests = [
            { id: 101, type: "project_apply", title: "사이드 프로젝트 백엔드 구함", sender: "열정맨", senderImg: "Newbie", date: "2026-05-11", status: "대기중", content: "[희망 직군]: Backend\n[지원 동기]: 열심히 하겠습니다!" }
        ];

        let squads = [
            { id: 1, author: "김데브", authorImg: "Felix", title: "여행 기록 공유 서비스 모집", type: "project", deadline: "2026-06-01", icon: '<i class="fas fa-plane"></i>', iconBg: 'bg-blue-50', iconCol: 'text-blue-600', tags: ["React", "Spring"], desc: "[프로젝트 핵심 목표 (한줄 소개)]\n- 여행 경로를 시각화하여 공유하는 SNS 개발\n\n[상세 기획 및 주요 기능]\n- 지도 API 연동 및 마커 표시\n- 소셜 로그인 및 피드 기능\n\n[모집 역할 및 진행 방식]\n- 프론트엔드 1명\n- 주 2회 디스코드 회의", roles: ["Frontend", "Backend", "Designer"], members: [], current: 1, max: 4, views: 1250, date: "2026-05-10", isClosed: false },
            { id: 2, author: "나(사용자)", authorImg: "MyUser", title: "사이드 프로젝트 백엔드 구함", type: "project", deadline: "2026-05-20", icon: '<i class="fas fa-user-check"></i>', iconBg: 'bg-green-50', iconCol: 'text-brand', tags: ["Node.js", "Express"], desc: "[프로젝트 핵심 목표 (한줄 소개)]\n- 일상생활에 쓰일 간단한 투두앱 만들기\n\n[상세 기획 및 주요 기능]\n- CRUD 기본 기능 충실히 구현\n\n[모집 역할 및 진행 방식]\n- 백엔드 1명 구합니다.", roles: ["Backend"], members: [{name: "코딩왕", role: "Backend", img: "Bob"}, {name: "디자이너A", role: "Designer", img: "Alice"}], current: 2, max: 3, views: 500, date: "2026-05-08", isClosed: false },
            { id: 3, author: "이코드", authorImg: "Ana", title: "CS 전공지식 스터디", type: "study", deadline: "2026-05-15", icon: '<i class="fas fa-book"></i>', iconBg: 'bg-purple-50', iconCol: 'text-purple-600', tags: ["CS", "면접"], desc: "[스터디 목표]\n- 목표: CS 완전 정복\n- 시간: 매주 화요일 8시", roles: [], members: [], current: 5, max: 6, views: 2300, date: "2026-05-01", isClosed: false },
            { id: 4, author: "최모각", authorImg: "Zoe", title: "강남 주말 모각코", type: "networking", deadline: "2026-05-12", icon: '<i class="fas fa-coffee"></i>', iconBg: 'bg-orange-50', iconCol: 'text-orange-600', tags: ["강남", "주말"], desc: "[모임 주제]\n- 장소: 강남역 투썸\n- 시간: 토요일 13시", roles: [], members: [], current: 1, max: 4, views: 890, date: "2026-05-05", isClosed: false }
        ];

        const dummyTypes = ['project', 'join_wish', 'study', 'networking'];
        const dummyAvatars = ['Aneka', 'Jocelyn', 'Destiny', 'George', 'Jasper'];
        for(let i=5; i<=25; i++) {
            const randomType = dummyTypes[i % 4];
            squads.push({
                id: i,
                author: '데브유저' + i,
                authorImg: dummyAvatars[i % 5],
                title: '[테스트] ' + randomType.toUpperCase() + ' 스쿼드 모집 ' + i + '번',
                type: randomType,
                deadline: '2026-05-' + (i%20+10).toString().padStart(2,'0'),
                icon: '<i class="fas fa-star"></i>',
                iconBg: 'bg-gray-100',
                iconCol: 'text-gray-500',
                tags: ['React', 'Spring', 'UI/UX', 'Figma', 'AWS'].slice(0, (i%3)+2),
                desc: '이것은 페이지네이션 테스트를 위해 자동 생성된 ' + i + '번째 스쿼드 데이터입니다.\n페이지네이션과 필터가 함께 잘 연동되는지 확인해보세요!',
                roles: [],
                members: [],
                current: (i%3)+1,
                max: (i%3)+4,
                views: i * 37,
                date: '2026-05-' + (i%10+1).toString().padStart(2,'0'),
                isClosed: i % 6 === 0
            });
        }

        let filteredSquads = [];

        const templates = {
            project: "[프로젝트 핵심 목표 (한줄 소개)]\n- \n\n[상세 기획 및 주요 기능]\n- \n\n[모집 역할 및 진행 방식]\n- ",
            join_wish: "[자기소개]\n- 보유 기술: \n- 가용 시간: \n\n[희망 프로젝트]\n- ",
            study: "[스터디 목표]\n- \n- 진행 시간: \n\n[모집 대상]\n- ",
            networking: "[모임 주제]\n- \n- 일시 및 장소: "
        };

        function toggleModal(id) { document.getElementById(id).classList.toggle('active'); }
        function toggleNoti() { document.getElementById('notiPopup').classList.toggle('hidden'); document.getElementById('msgPopup').classList.add('hidden'); }
        function toggleMsg() { document.getElementById('msgPopup').classList.toggle('hidden'); document.getElementById('notiPopup').classList.add('hidden'); renderMessages(); }
        function clearNoti() { document.getElementById('notiList').innerHTML = '<p class="p-3 text-xs text-gray-400 text-center">알림이 없습니다.</p>'; const badge = document.getElementById('notiBadge'); if (badge) badge.style.display = 'none'; }

        function renderMessages() {
            const list = document.getElementById('msgList');
            if (!list) return;
            list.innerHTML = myMessages.map(msg =>
                '<div class="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer flex gap-3 items-start">' +
                    '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + msg.senderImg + '" class="w-8 h-8 rounded-full border border-gray-200">' +
                    '<div class="flex-1"><div class="flex justify-between items-center mb-0.5"><span class="text-xs font-bold text-gray-900">' + msg.sender + '</span><span class="text-[9px] text-gray-400">' + msg.date + '</span></div><p class="text-xs text-gray-600 line-clamp-1">' + msg.text + '</p></div>' +
                    (!msg.read ? '<span class="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></span>' : '') +
                '</div>'
            ).join('');
        }

        function applyFilters(resetPage = true) {
            if(resetPage) currentPage = 1;
            const activeBtn = document.querySelector('.tab-btn.active');
            let activeFilter = 'all';
            if (activeBtn) {
                const match = activeBtn.getAttribute('onclick').match(/'([^']+)'/);
                if (match) activeFilter = match[1];
            }
            const sortCriteria = document.getElementById('sortSelect').value;
            const hideClosed = document.getElementById('hideClosedCheckbox')?.checked;
            const searchText = document.getElementById('searchInput').value.toLowerCase().trim();
            filteredSquads = squads.slice();
            if(activeFilter !== 'all') {
                if(activeFilter === 'my_posts') filteredSquads = filteredSquads.filter(s => s.author === "나(사용자)");
                else filteredSquads = filteredSquads.filter(s => s.type === activeFilter);
            }
            if(hideClosed) filteredSquads = filteredSquads.filter(s => !s.isClosed);
            if(searchText) {
                filteredSquads = filteredSquads.filter(s =>
                    s.title.toLowerCase().includes(searchText) ||
                    s.tags.join(' ').toLowerCase().includes(searchText) ||
                    s.desc.toLowerCase().includes(searchText)
                );
            }
            filteredSquads.sort((a, b) => {
                if (a.isClosed && !b.isClosed) return 1;
                if (!a.isClosed && b.isClosed) return -1;
                if (sortCriteria === 'views') return b.views - a.views;
                if (sortCriteria === 'deadline') return new Date(a.deadline) - new Date(b.deadline);
                if (sortCriteria === 'available') return (a.max - a.current) - (b.max - b.current);
                return new Date(b.date) - new Date(a.date);
            });
            renderCardsList();
        }

        function filterTab(type, btn) {
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active', 'text-brand');
                b.classList.add('text-gray-500');
            });
            btn.classList.add('active', 'text-brand');
            applyFilters(true);
        }

        function renderCardsList() {
            const container = document.getElementById('cardList');
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedCards = filteredSquads.slice(startIndex, startIndex + itemsPerPage);
            if (paginatedCards.length === 0) {
                container.innerHTML = '<div class="col-span-full py-20 flex flex-col items-center justify-center text-gray-400"><i class="fas fa-folder-open text-4xl mb-3 opacity-50"></i><p class="font-bold text-sm">조건에 맞는 스쿼드가 없습니다.</p></div>';
                renderPagination(0);
                return;
            }
            container.innerHTML = paginatedCards.map(s => {
                const isJoin = s.type === 'join_wish';
                const isMyPost = s.author === "나(사용자)";
                let membersHtml = '';
                if(isMyPost && s.members && s.members.length > 0) {
                    membersHtml = '<div class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2"><span class="text-[10px] font-bold text-gray-400">참여 멤버:</span><div class="flex -space-x-2">' +
                        s.members.map(m => '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + m.img + '" class="w-6 h-6 rounded-full border border-white cursor-pointer hover:scale-110 transition" title="' + m.name + '">').join('') +
                        '</div></div>';
                }
                const badgeSpan = s.isClosed
                    ? '<span class="bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm">마감완료</span>'
                    : (isJoin
                        ? '<span class="bg-green-50 border border-green-200 text-brand text-[10px] font-bold px-2 py-1 rounded shadow-sm">참여희망</span>'
                        : '<span class="bg-red-50 border border-red-200 text-red-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm">모집중</span>');
                const editBtn = isMyPost && !s.isClosed
                    ? '<button onclick="event.stopPropagation(); openCreateModal(' + s.id + ')" class="bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 w-6 h-6 rounded flex items-center justify-center transition shadow-sm" title="수정"><i class="fas fa-edit text-[10px]"></i></button>'
                    : '';
                return '<div class="bg-white rounded-2xl p-6 border ' + (isJoin ? 'border-brand/30' : 'border-gray-200') + ' shadow-[0_2px_10px_rgba(0,0,0,0.02)] card-hover transition cursor-pointer relative flex flex-col group ' + (s.isClosed ? 'opacity-70 grayscale-[0.3]' : '') + '">' +
                    '<div class="absolute top-5 right-5 flex items-center gap-1.5 z-10">' + editBtn + badgeSpan + '</div>' +
                    '<div class="flex items-center gap-3 mb-4 pr-16"><div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ' + s.iconBg + ' ' + s.iconCol + '">' + s.icon + '</div><div class="min-w-0"><h3 class="font-bold text-gray-900 leading-tight truncate">' + s.title + '</h3><span class="text-[10px] text-gray-400 font-bold">' + s.type.toUpperCase().replace('_',' ') + '</span></div></div>' +
                    '<p class="text-sm text-gray-500 mb-4 line-clamp-2 h-10 font-medium whitespace-pre-line">' + s.desc.substring(0,60) + '...</p>' +
                    '<div class="mt-auto pt-4 border-t flex justify-between items-center"><div class="flex items-center gap-2"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.authorImg + '" class="w-6 h-6 rounded-full border shadow-sm"><span class="text-xs font-bold text-gray-600">' + s.author + '</span></div><div class="flex items-center gap-3"><span class="text-[10px] text-gray-400 font-medium"><i class="far fa-eye mr-1"></i>' + (s.views > 1000 ? (s.views/1000).toFixed(1)+'k' : s.views) + '</span><span class="text-xs font-bold text-gray-500"><i class="fas fa-user-friends mr-1"></i>' + s.current + '/' + s.max + '</span><span class="text-[10px] text-red-500 font-bold">~ ' + s.deadline + '</span></div></div>' + membersHtml +
                    '</div>';
            }).join('');
            renderPagination(Math.ceil(filteredSquads.length / itemsPerPage));
        }

        function renderPagination(totalPages) {
            const container = document.getElementById('paginationContainer');
            if (totalPages <= 1) { container.innerHTML = ''; return; }
            let html = '';
            const prevDisabled = currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600 cursor-pointer';
            html += '<button onclick="changePage(' + (currentPage - 1) + ')" class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition ' + prevDisabled + '" ' + (currentPage === 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>';
            for(let i=1; i<=totalPages; i++) {
                const activeClass = i === currentPage ? 'bg-gray-900 text-white shadow-md cursor-default' : 'text-gray-500 hover:bg-gray-100 cursor-pointer';
                html += '<button onclick="changePage(' + i + ')" class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition ' + activeClass + '">' + i + '</button>';
            }
            const nextDisabled = currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-600 cursor-pointer';
            html += '<button onclick="changePage(' + (currentPage + 1) + ')" class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition ' + nextDisabled + '" ' + (currentPage === totalPages ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>';
            container.innerHTML = html;
        }

        function changePage(page) {
            const totalPages = Math.ceil(filteredSquads.length / itemsPerPage);
            if(page < 1 || page > totalPages) return;
            currentPage = page;
            renderCardsList();
            document.getElementById('viewLounge').scrollTo({ top: 400, behavior: 'smooth' });
        }

        function openCreateModal(editId = null) {
            document.getElementById('createModalTitle').innerText = editId ? "스쿼드 수정하기" : "새 스쿼드 만들기";
            document.getElementById('createSubmitBtn').innerText = editId ? "수정 완료" : "생성하기";
            document.getElementById('edit-id').value = editId || "";
            if(!editId) {
                document.getElementById('c-title').value = "";
                document.getElementById('c-type').value = "project";
                document.getElementById('c-deadline').value = "";
                document.getElementById('c-max').value = "";
                document.getElementById('c-tags').value = "";
                document.getElementById('c-desc').value = templates.project;
            }
            toggleModal('createModal');
        }

        function applyTemplate() {
            const type = document.getElementById('c-type').value;
            if (!document.getElementById('edit-id').value) document.getElementById('c-desc').value = templates[type] || "";
            document.getElementById('maxMemberContainer').style.display = 'block';
        }

        function submitSquad() { alert("등록되었습니다."); toggleModal('createModal'); }

        function switchStatusTab(tab) {
            activeStatusTab = tab;
            document.getElementById('tabSent').className = tab==='sent'
                ? "flex-1 py-2 text-xs font-bold rounded-lg transition bg-white shadow-sm text-brand"
                : "flex-1 py-2 text-xs font-bold rounded-lg transition text-gray-500";
            document.getElementById('tabReceived').className = tab==='received'
                ? "flex-1 py-2 text-xs font-bold rounded-lg transition bg-white shadow-sm text-brand"
                : "flex-1 py-2 text-xs font-bold rounded-lg transition text-gray-500";
            updateStatusList();
        }

        function updateStatusList() {
            const container = document.getElementById('statusListContent');
            const data = activeStatusTab === 'sent' ? myApplications : receivedRequests;
            if(!data.length) {
                container.innerHTML = '<p class="text-center text-gray-400 text-xs py-10">내역이 없습니다.</p>';
                return;
            }
            container.innerHTML = data.map(item => '<div class="p-4 border rounded-xl bg-white flex flex-col gap-2 shadow-sm"><div class="flex justify-between items-center"><span class="text-[9px] font-extrabold text-gray-400 uppercase">' + item.date + '</span><span class="text-[10px] font-bold text-brand bg-green-50 px-2 py-0.5 rounded">' + item.status + '</span></div><p class="text-sm font-bold text-gray-900">' + item.title + '</p></div>').join('');
        }

        window.onload = function() {
            renderMessages();
            applyFilters();
        };
    </script>
</body>
</html>`

export default function CommunityLoungeApp() {
  return (
    <iframe
      title="DevPath - 스쿼드 라운지"
      className="w-full h-screen border-0 block"
      srcDoc={STATIC_LOUNGE_HTML}
    />
  )
}
