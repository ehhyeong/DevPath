import { useEffect } from 'react'
import { createProjectAsideHtml, createProjectHeaderHtml } from './project-shell'

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

    ${createProjectAsideHtml('lounge')}

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
                    <span id="shellUserName" class="text-sm font-bold text-gray-700">나(사용자)</span>
                    <img id="shellUserImage" src="https://api.dicebear.com/7.x/avataaars/svg?seed=MyUser" class="w-9 h-9 rounded-full border border-gray-200 shadow-sm" />
                </div>
            </div>
        </template>

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
                            <button class="tab-btn px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition whitespace-nowrap" onclick="filterTab('my_posts', this)">💪 내가 쓴 글</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]" id="cardList"></div>

                    <div id="paginationContainer" class="mt-10 flex justify-center items-center gap-1.5 pb-8"></div>
                </div>
            </div>
        </main>
    </div>

    <div id="detailModal" class="modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] modal-enter">
            <div class="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                <div class="flex items-center gap-4">
                    <div id="d-icon" class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm"></div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <h2 id="d-title" class="text-xl font-bold text-gray-900 mb-1"></h2>
                            <span id="d-type" class="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold uppercase"></span>
                        </div>
                        <p id="d-author" class="text-sm text-gray-500 font-medium"></p>
                    </div>
                </div>
                <button onclick="toggleModal('detailModal')" class="text-gray-400 hover:text-gray-900 text-lg"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-8 overflow-y-auto space-y-8 flex-1">
                <div>
                    <h3 class="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">소개</h3>
                    <div class="bg-white border border-gray-100 p-5 rounded-xl text-sm text-gray-700 leading-loose shadow-sm whitespace-pre-wrap font-medium" id="d-desc"></div>
                </div>
                <div>
                    <h3 class="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">기술 스택</h3>
                    <div id="d-tags" class="flex flex-wrap gap-2"></div>
                </div>
            </div>
            <div class="p-5 border-t border-gray-100 bg-white flex justify-end gap-3" id="detailModalFooter"></div>
        </div>
    </div>

    <div id="applyModal" class="modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden modal-enter">
            <div class="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h2 class="text-lg font-bold text-gray-900">📝 신청서 / 제안서 작성</h2>
                <button onclick="toggleModal('applyModal')" class="text-gray-400 hover:text-gray-900"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto" id="apply-form-content"></div>
            <div class="p-5 border-t border-gray-100 bg-white flex justify-end gap-2">
                <button onclick="toggleModal('applyModal')" class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">취소</button>
                <button onclick="submitApplication()" class="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md">보내기</button>
            </div>
        </div>
    </div>

    <div id="memberProfileModal" class="modal fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden modal-enter">
            <div class="relative bg-brand/10 h-24">
                <button onclick="toggleModal('memberProfileModal')" class="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><i class="fas fa-times"></i></button>
            </div>
            <div class="px-6 pb-6 -mt-10 text-center">
                <img id="mp-img" src="" class="w-20 h-20 rounded-full border-4 border-white shadow-md mx-auto mb-3">
                <h3 id="mp-name" class="text-xl font-bold text-gray-900"></h3>
                <p id="mp-role" class="text-sm text-gray-500 mb-6"></p>
                <div class="space-y-3">
                    <textarea id="mp-msg" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:border-brand outline-none" placeholder="간단한 메시지를 남겨보세요..."></textarea>
                    <button onclick="sendDM()" class="w-full py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-green-600 shadow-lg transition flex items-center justify-center gap-2">
                        <i class="fas fa-paper-plane"></i> 메시지 보내기
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="viewMsgModal" class="modal fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl relative overflow-hidden modal-enter">
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div class="flex items-center gap-3">
                    <img id="vm-img" src="" class="w-10 h-10 rounded-full border">
                    <div>
                        <h3 id="vm-sender" class="font-bold text-sm text-gray-900"></h3>
                        <p id="vm-date" class="text-xs text-gray-400"></p>
                    </div>
                </div>
                <button onclick="toggleModal('viewMsgModal')" class="text-gray-400 hover:text-gray-900"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6">
                <div class="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-line border border-gray-100" id="vm-content"></div>
            </div>
            <div class="p-5 border-t border-gray-100 bg-white">
                <button onclick="toggleModal('viewMsgModal'); openMemberProfile(document.getElementById('vm-sender').innerText, 'Member', 'ReplyUser')" class="w-full py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-green-600 shadow-sm transition">
                    <i class="fas fa-reply mr-2"></i>답장하기
                </button>
            </div>
        </div>
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
                <div id="rolesContainer">
                    <label class="block text-xs font-bold text-gray-500 mb-1.5 uppercase">모집 역할</label>
                    <input type="text" id="c-roles" class="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" placeholder="Frontend Backend Designer">
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

    <div id="receivedAppModal" class="modal fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden modal-enter">
            <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 class="text-lg font-bold text-gray-900">📄 받은 신청서 확인</h2>
                <button onclick="toggleModal('receivedAppModal')" class="text-gray-400 hover:text-gray-900"><i class="fas fa-times"></i></button>
            </div>
            <div class="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <img id="ra-img" src="" class="w-12 h-12 rounded-full border">
                    <div>
                        <p id="ra-name" class="font-bold text-gray-900"></p>
                        <p id="ra-date" class="text-xs text-gray-400"></p>
                    </div>
                </div>
                <div>
                    <p class="text-xs font-bold text-gray-500 mb-1">지원 제목</p>
                    <p id="ra-title" class="text-sm font-medium"></p>
                </div>
                <div id="ra-type-badge" class="inline-block"></div>
                <div id="ra-content" class="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed whitespace-pre-line border border-gray-100"></div>
            </div>
            <div class="p-5 border-t border-gray-100 bg-white flex gap-2">
                <button onclick="processRequest('reject')" class="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition">거절하기</button>
                <button onclick="processRequest('approve')" class="flex-1 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 shadow-md transition">승인하기</button>
            </div>
        </div>
    </div>

    <script>__DEVPATH_LOUNGE_RUNTIME__</script>
</body>
</html>`

const LOUNGE_RUNTIME_SCRIPT = String.raw`
        const AUTH_STORAGE_KEY = 'devpath.auth.session';
        let currentPage = 1;
        const itemsPerPage = 6;
        let activeStatusTab = 'sent';
        let myMessages = [];
        let myNotis = [];
        let myApplications = [];
        let receivedRequests = [];
        let squads = [];
        let filteredSquads = [];
        let currentSelectedId = null;
        let currentRequestId = null;

        const templates = {
            project: "[프로젝트 핵심 목표 (한줄 소개)]\n- \n\n[상세 기획 및 주요 기능]\n- \n\n[모집 역할 및 진행 방식]\n- ",
            join_wish: "[자기소개]\n- 보유 기술: \n- 가용 시간: \n\n[희망 프로젝트]\n- ",
            study: "[스터디 목표]\n- \n- 진행 시간: \n\n[모집 대상]\n- ",
            networking: "[모임 주제]\n- \n- 일시 및 장소: "
        };

        const typeConfig = {
            project: { icon: '<i class="fas fa-plane"></i>', iconBg: 'bg-blue-50', iconCol: 'text-blue-600' },
            join_wish: { icon: '<i class="fas fa-user-check"></i>', iconBg: 'bg-green-50', iconCol: 'text-brand' },
            study: { icon: '<i class="fas fa-book"></i>', iconBg: 'bg-purple-50', iconCol: 'text-purple-600' },
            networking: { icon: '<i class="fas fa-coffee"></i>', iconBg: 'bg-orange-50', iconCol: 'text-orange-600' }
        };

        function readSession() {
            for (const storage of [localStorage, sessionStorage]) {
                const raw = storage.getItem(AUTH_STORAGE_KEY);
                if (!raw) continue;
                try { return JSON.parse(raw); } catch { storage.removeItem(AUTH_STORAGE_KEY); }
            }
            return null;
        }

        function parseJwtUserId(accessToken) {
            try {
                const payload = accessToken.split('.')[1];
                if (!payload) return null;
                const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = JSON.parse(atob(normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, '=')));
                const userId = Number(decoded.sub);
                return Number.isFinite(userId) ? userId : null;
            } catch {
                return null;
            }
        }

        function getSessionUserId() {
            const session = readSession();
            if (!session) return null;
            const directId = Number(session.userId);
            if (Number.isFinite(directId)) return directId;
            return session.accessToken ? parseJwtUserId(session.accessToken) : null;
        }

        function buildHeaders(requireAuth = false) {
            const headers = new Headers({ Accept: 'application/json' });
            const session = readSession();
            if (session?.accessToken) headers.set('Authorization', 'Bearer ' + session.accessToken);
            if (requireAuth && !session?.accessToken) throw new Error('로그인이 필요합니다.');
            return headers;
        }

        async function apiRequest(path, init = {}, requireAuth = false) {
            const headers = buildHeaders(requireAuth);
            if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
            const response = await fetch(path, { ...init, headers });
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
            return body.data ?? body;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function toDateText(value) {
            if (!value) return '';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '';
            return date.toISOString().slice(0, 10);
        }

        function toDateTime(value) {
            const time = Date.parse(value || '');
            return Number.isFinite(time) ? time : 0;
        }

        function toDeadlineTime(value) {
            const time = Date.parse(value || '');
            return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
        }

        function isMyUser(userId) {
            const currentUserId = getSessionUserId();
            return currentUserId !== null && Number(userId) === currentUserId;
        }

        function diceAvatar(seed) {
            return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(seed || 'DevPath');
        }

        function renderShell(shell) {
            if (!shell) return;
            const user = shell.user || {};
            const userName = document.getElementById('shellUserName');
            const userImage = document.getElementById('shellUserImage');
            if (userName) userName.innerText = user.name || '게스트';
            if (userImage) userImage.src = user.profileImage || diceAvatar(user.name || 'Guest');

            const menuList = document.getElementById('shellMenuList');
            if (menuList && Array.isArray(shell.menu)) {
                menuList.innerHTML = shell.menu.map(item => {
                    const active = item.key === 'lounge' ? ' active' : '';
                    return '<a href="' + escapeHtml(item.href) + '" class="nav-item' + active + '">' +
                        '<i class="fas ' + escapeHtml(item.icon) + ' w-6 text-center text-lg"></i>' +
                        '<span class="sidebar-text">' + escapeHtml(item.label) + '</span>' +
                    '</a>';
                }).join('');
            }

            const squadList = document.getElementById('mySquadList');
            if (squadList && Array.isArray(shell.mySquads)) {
                squadList.innerHTML = shell.mySquads.length
                    ? shell.mySquads.map(squad =>
                        '<a href="squad-dashboard.html?squadId=' + encodeURIComponent(squad.id) + '" class="nav-item">' +
                            '<span class="w-2.5 h-2.5 rounded-full ' + escapeHtml(squad.colorClass || 'bg-blue-500') + ' shrink-0 mx-2"></span>' +
                            '<span class="sidebar-text truncate">' + escapeHtml(squad.name) + '</span>' +
                        '</a>'
                    ).join('')
                    : '<p class="px-4 py-3 text-xs text-gray-400 sidebar-text">참여 중인 스쿼드가 없습니다.</p>';
            }

            myMessages = Array.isArray(shell.messages) ? shell.messages.map(message => ({
                id: message.id,
                sender: message.sender || '사용자',
                senderImg: message.senderImage || ('message-' + message.senderId),
                text: message.text || '',
                date: message.dateText || '',
                read: Boolean(message.read)
            })) : [];

            myNotis = Array.isArray(shell.notifications) ? shell.notifications.map(notification => ({
                id: notification.id,
                type: notification.type || 'SYSTEM',
                text: notification.text || '',
                date: notification.dateText || '',
                read: Boolean(notification.read)
            })) : [];

            renderMessages();
            renderNotis();
        }

        function mapApplication(item) {
            return {
                id: item.applicationId,
                type: item.type === 'SQUAD_APPLICATION' ? 'project_apply' : 'scout',
                title: item.targetTitle || item.title || '제목 없음',
                sender: item.senderName || '사용자',
                senderImg: 'sender-' + item.senderId,
                date: toDateText(item.createdAt),
                status: item.status === 'APPROVED' ? '승인됨' : (item.status === 'REJECTED' ? '거절됨' : '대기중'),
                content: item.title || ''
            };
        }

        function mapSquadPost(post) {
            const type = post.type || 'project';
            const cfg = typeConfig[type] || typeConfig.project;
            const members = Array.isArray(post.members) ? post.members : [];
            return {
                id: Number(post.id),
                authorId: post.authorId ?? null,
                author: post.authorName || '사용자',
                authorImg: 'squad-' + (post.authorId ?? post.id),
                title: post.title || '제목 없음',
                type,
                deadline: post.deadline || '',
                icon: cfg.icon,
                iconBg: cfg.iconBg,
                iconCol: cfg.iconCol,
                tags: Array.isArray(post.tags) ? post.tags : [],
                desc: post.description || '',
                roles: Array.isArray(post.roles) ? post.roles : [],
                members: members.map(member => ({
                    name: member.userName || ('사용자 #' + member.userId),
                    role: member.role || 'Member',
                    img: 'member-' + member.userId
                })),
                current: Number(post.currentMembers) || members.length || 0,
                max: Number(post.maxMembers) || Math.max(members.length, 1),
                views: Number(post.views) || 0,
                date: toDateText(post.createdAt),
                sortDate: post.createdAt || post.updatedAt,
                isClosed: post.closed === true,
                isMine: isMyUser(post.authorId)
            };
        }

        async function loadLoungeData() {
            const [shellResult, squadsResult, sentResult, receivedResult] = await Promise.allSettled([
                apiRequest('/api/lounge/shell'),
                apiRequest('/api/lounge/squads'),
                apiRequest('/api/lounge/applications/sent', {}, true),
                apiRequest('/api/lounge/applications/received', {}, true)
            ]);

            if (shellResult.status === 'fulfilled') {
                renderShell(shellResult.value);
            }

            squads = squadsResult.status === 'fulfilled' && Array.isArray(squadsResult.value)
                ? squadsResult.value.map(mapSquadPost)
                : [];
            myApplications = sentResult.status === 'fulfilled' && Array.isArray(sentResult.value)
                ? sentResult.value.map(mapApplication)
                : [];
            receivedRequests = receivedResult.status === 'fulfilled' && Array.isArray(receivedResult.value)
                ? receivedResult.value.map(mapApplication)
                : [];

            applyFilters(false);
            updateStatusList();
            renderMessages();
        }

        function toggleModal(id) { document.getElementById(id).classList.toggle('active'); }
        function toggleNoti() { document.getElementById('notiPopup').classList.toggle('hidden'); document.getElementById('msgPopup').classList.add('hidden'); renderNotis(); }
        function toggleMsg() { document.getElementById('msgPopup').classList.toggle('hidden'); document.getElementById('notiPopup').classList.add('hidden'); renderMessages(); }
        function clearNoti() { document.getElementById('notiList').innerHTML = '<p class="p-3 text-xs text-gray-400 text-center">알림이 없습니다.</p>'; const badge = document.getElementById('notiBadge'); if (badge) badge.style.display = 'none'; }
        function markAllMsgRead() { myMessages.forEach(msg => msg.read = true); renderMessages(); }

        function renderMessages() {
            const list = document.getElementById('msgList');
            if (!list) return;
            if (!myMessages.length) {
                list.innerHTML = '<p class="p-4 text-xs text-gray-400 text-center">받은 메시지가 없습니다.</p>';
            } else {
                list.innerHTML = myMessages.map(msg =>
                    '<div class="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer flex gap-3 items-start">' +
                        '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(msg.senderImg) + '" class="w-8 h-8 rounded-full border border-gray-200">' +
                        '<div class="flex-1"><div class="flex justify-between items-center mb-0.5"><span class="text-xs font-bold text-gray-900">' + escapeHtml(msg.sender) + '</span><span class="text-[9px] text-gray-400">' + escapeHtml(msg.date) + '</span></div><p class="text-xs text-gray-600 line-clamp-1">' + escapeHtml(msg.text) + '</p></div>' +
                        (!msg.read ? '<span class="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5"></span>' : '') +
                    '</div>'
                ).join('');
            }
            const badge = document.getElementById('msgBadge');
            if (badge) badge.style.display = myMessages.some(msg => !msg.read) ? 'block' : 'none';
        }

        function renderNotis() {
            const list = document.getElementById('notiList');
            if (!list) return;
            if (!myNotis.length) {
                list.innerHTML = '<p class="p-4 text-xs text-gray-400 text-center">새 알림이 없습니다.</p>';
            } else {
                list.innerHTML = myNotis.map(noti =>
                    '<div class="p-3 hover:bg-gray-50 border-b border-gray-50 cursor-pointer flex gap-3 items-start">' +
                        '<div class="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm shrink-0"><i class="fas fa-info-circle"></i></div>' +
                        '<div class="flex-1"><p class="text-xs text-gray-800 line-clamp-2">' + escapeHtml(noti.text) + '</p><span class="text-[10px] text-gray-400">' + escapeHtml(noti.date) + '</span></div>' +
                        (!noti.read ? '<span class="w-1.5 h-1.5 bg-brand rounded-full mt-1.5"></span>' : '') +
                    '</div>'
                ).join('');
            }
            const badge = document.getElementById('notiBadge');
            if (badge) badge.style.display = myNotis.some(noti => !noti.read) ? 'block' : 'none';
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
                if(activeFilter === 'my_posts') filteredSquads = filteredSquads.filter(s => s.isMine);
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
                if (sortCriteria === 'deadline') return toDeadlineTime(a.deadline) - toDeadlineTime(b.deadline);
                if (sortCriteria === 'available') return (a.max - a.current) - (b.max - b.current);
                return toDateTime(b.sortDate || b.date) - toDateTime(a.sortDate || a.date);
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
                const isMyPost = s.isMine === true;
                let membersHtml = '';
                if(isMyPost && s.members && s.members.length > 0) {
                    membersHtml = '<div class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2"><span class="text-[10px] font-bold text-gray-400">참여 멤버:</span><div class="flex -space-x-2">' +
                        s.members.map(m => '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(m.img) + '" class="w-6 h-6 rounded-full border border-white cursor-pointer hover:scale-110 transition" title="' + escapeHtml(m.name) + '" data-name="' + escapeHtml(m.name) + '" data-role="' + escapeHtml(m.role) + '" data-img="' + escapeHtml(m.img) + '" onclick="event.stopPropagation(); openMemberProfileFromElement(this)">').join('') +
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
                return '<div class="bg-white rounded-2xl p-6 border ' + (isJoin ? 'border-brand/30' : 'border-gray-200') + ' shadow-[0_2px_10px_rgba(0,0,0,0.02)] card-hover transition cursor-pointer relative flex flex-col group ' + (s.isClosed ? 'opacity-70 grayscale-[0.3]' : '') + '" onclick="openDetailModal(' + s.id + ')">' +
                    '<div class="absolute top-5 right-5 flex items-center gap-1.5 z-10">' + editBtn + badgeSpan + '</div>' +
                    '<div class="flex items-center gap-3 mb-4 pr-16"><div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ' + s.iconBg + ' ' + s.iconCol + '">' + s.icon + '</div><div class="min-w-0"><h3 class="font-bold text-gray-900 leading-tight truncate">' + escapeHtml(s.title) + '</h3><span class="text-[10px] text-gray-400 font-bold">' + escapeHtml(s.type.toUpperCase().replace('_',' ')) + '</span></div></div>' +
                    '<p class="text-sm text-gray-500 mb-4 line-clamp-2 h-10 font-medium whitespace-pre-line">' + escapeHtml((s.desc || '').substring(0,60)) + '...</p>' +
                    '<div class="mt-auto pt-4 border-t flex justify-between items-center"><div class="flex items-center gap-2"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(s.authorImg) + '" class="w-6 h-6 rounded-full border shadow-sm"><span class="text-xs font-bold text-gray-600">' + escapeHtml(s.author) + '</span></div><div class="flex items-center gap-3"><span class="text-[10px] text-gray-400 font-medium"><i class="far fa-eye mr-1"></i>' + (s.views > 1000 ? (s.views/1000).toFixed(1)+'k' : s.views) + '</span><span class="text-xs font-bold text-gray-500"><i class="fas fa-user-friends mr-1"></i>' + s.current + '/' + s.max + '</span><span class="text-[10px] text-red-500 font-bold">~ ' + escapeHtml(s.deadline) + '</span></div></div>' + membersHtml +
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
            const data = squads.find(s => Number(s.id) === Number(editId));
            document.getElementById('createModalTitle').innerText = editId ? "스쿼드 수정하기" : "새 스쿼드 만들기";
            document.getElementById('createSubmitBtn').innerText = editId ? "수정 완료" : "생성하기";
            document.getElementById('edit-id').value = editId || "";
            if(data) {
                document.getElementById('c-title').value = data.title;
                document.getElementById('c-type').value = data.type;
                document.getElementById('c-deadline').value = data.deadline || "";
                document.getElementById('c-max').value = data.max || "";
                document.getElementById('c-tags').value = data.tags.map(tag => '#' + tag).join(' ');
                document.getElementById('c-roles').value = data.roles.join(' ');
                document.getElementById('c-desc').value = data.desc;
            } else {
                document.getElementById('c-title').value = "";
                document.getElementById('c-type').value = "project";
                document.getElementById('c-deadline').value = "";
                document.getElementById('c-max').value = "";
                document.getElementById('c-tags').value = "";
                document.getElementById('c-roles').value = "";
                document.getElementById('c-desc').value = templates.project;
            }
            applyTemplate();
            toggleModal('createModal');
        }

        function applyTemplate() {
            const type = document.getElementById('c-type').value;
            if (!document.getElementById('edit-id').value) document.getElementById('c-desc').value = templates[type] || "";
            document.getElementById('maxMemberContainer').style.display = 'block';
            document.getElementById('rolesContainer').style.display = type === 'project' ? 'block' : 'none';
        }

        function readCreatePayload() {
            const tags = document.getElementById('c-tags').value
                .split(/\s+/)
                .map(tag => tag.replace(/^#/, '').trim())
                .filter(Boolean);
            const roles = document.getElementById('c-roles').value
                .split(/\s+/)
                .map(role => role.trim())
                .filter(Boolean);
            return {
                title: document.getElementById('c-title').value.trim(),
                type: document.getElementById('c-type').value,
                deadline: document.getElementById('c-deadline').value || null,
                maxMembers: Number(document.getElementById('c-max').value || 1),
                tags,
                description: document.getElementById('c-desc').value.trim(),
                roles: document.getElementById('c-type').value === 'project' ? roles : []
            };
        }

        async function submitSquad() {
            const editId = document.getElementById('edit-id').value;
            const existing = editId ? squads.find(s => Number(s.id) === Number(editId)) : null;
            const payload = readCreatePayload();
            if(!payload.title || !payload.description) return alert("필수 항목을 입력해주세요.");
            const path = existing ? '/api/lounge/squads/' + existing.id : '/api/lounge/squads';
            const method = existing ? 'PUT' : 'POST';

            try {
                await apiRequest(path, { method, body: JSON.stringify(payload) }, true);
                alert(existing ? "수정되었습니다." : "등록되었습니다.");
                toggleModal('createModal');
                await loadLoungeData();
            } catch (error) {
                alert(error.message || "저장에 실패했습니다.");
            }
        }

        async function openDetailModal(id) {
            currentSelectedId = id;
            const existing = squads.find(s => Number(s.id) === Number(id));
            let data = existing;
            try {
                const detail = await apiRequest('/api/lounge/squads/' + id);
                data = mapSquadPost(detail);
                squads = squads.map(item => Number(item.id) === Number(id) ? data : item);
            } catch {}
            if (!data) return;

            document.getElementById('d-title').innerText = data.title;
            document.getElementById('d-type').innerText = data.type;
            document.getElementById('d-author').innerText = 'Leader: ' + data.author;
            document.getElementById('d-desc').innerText = data.desc;
            document.getElementById('d-icon').innerHTML = data.icon;
            document.getElementById('d-icon').className = 'w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm ' + data.iconBg + ' ' + data.iconCol;
            document.getElementById('d-tags').innerHTML = data.tags.map(t => '<span class="text-xs bg-gray-100 px-2 py-1 rounded font-bold mr-1">#' + escapeHtml(t) + '</span>').join('');

            const footer = document.getElementById('detailModalFooter');
            footer.innerHTML = '<button onclick="toggleModal(\'detailModal\')" class="px-6 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">닫기</button>';
            if (data.isMine) {
                if (!data.isClosed) {
                    footer.innerHTML += '<button onclick="closeSquadOnly()" class="px-4 py-3 rounded-xl text-red-400 text-sm font-bold hover:bg-red-50 transition">단순 마감</button>';
                    footer.innerHTML += '<button onclick="openCreateModal(' + data.id + '); toggleModal(\'detailModal\')" class="px-4 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition">수정</button>';
                    footer.innerHTML += '<button onclick="closeAndCreateWorkspace()" class="px-6 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 transition shadow-sm flex items-center gap-2"><i class="fas fa-rocket"></i> 마감 및 워크스페이스 생성</button>';
                }
            } else if (!data.isClosed) {
                const btnText = data.type === 'join_wish' ? "스카우트 제안하기" : "참여 신청하기";
                footer.innerHTML += '<button onclick="openApplyForm()" class="px-8 py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-green-600 transition flex items-center gap-2"><i class="fas fa-hand-sparkles"></i> ' + btnText + '</button>';
            }
            toggleModal('detailModal');
            applyFilters(false);
        }

        async function closeSquadOnly() {
            if(!currentSelectedId || !confirm("모집을 단순 마감 처리하시겠습니까?")) return;
            await apiRequest('/api/lounge/squads/' + currentSelectedId + '/close', { method: 'PATCH' }, true);
            toggleModal('detailModal');
            await loadLoungeData();
        }

        async function closeAndCreateWorkspace() {
            const data = squads.find(s => Number(s.id) === Number(currentSelectedId));
            if(!data) return;
            if(confirm("모집을 마감하고, 팀원들과 함께할 '워크스페이스'를 바로 생성하시겠습니까?\n(작성하신 스쿼드 제목, 기술 스택, 소개글이 자동으로 넘어갑니다.)")) {
                await apiRequest('/api/lounge/squads/' + currentSelectedId + '/close', { method: 'PATCH' }, true);
                const params = new URLSearchParams({ title: data.title, tech: data.tags.join(','), desc: data.desc });
                location.href = 'project-create.html?' + params.toString();
            }
        }

        function openApplyForm() {
            const container = document.getElementById('apply-form-content');
            const data = squads.find(s => Number(s.id) === Number(currentSelectedId));
            if(!data) return;
            if(data.type === 'project') {
                const roleOptions = data.roles && data.roles.length ? data.roles.map(r => '<option value="' + escapeHtml(r) + '">' + escapeHtml(r) + '</option>').join('') : '<option>직군 미정</option>';
                container.innerHTML = '<div><label class="block text-xs font-bold text-gray-500 mb-1">희망 직군 <span class="text-red-500">*</span></label><select id="apply-role" class="w-full border rounded-xl px-3 py-2 text-sm bg-white">' + roleOptions + '</select></div><div><label class="block text-xs font-bold text-gray-500 mb-1">포트폴리오</label><input id="apply-portfolio" class="w-full border rounded-xl px-3 py-2 text-sm" placeholder="https://..."></div><div><label class="block text-xs font-bold text-gray-500 mb-1">지원 동기</label><textarea id="apply-content" class="w-full border rounded-xl px-3 py-2 text-sm h-24"></textarea></div>';
            } else if(data.type === 'study') {
                container.innerHTML = '<div><label class="block text-xs font-bold text-gray-500 mb-1">학습 수준</label><input id="apply-role" class="w-full border rounded-xl px-3 py-2 text-sm"></div><div><label class="block text-xs font-bold text-gray-500 mb-1">목표</label><textarea id="apply-content" class="w-full border rounded-xl px-3 py-2 text-sm h-24"></textarea></div>';
            } else {
                container.innerHTML = '<div><label class="block text-xs font-bold text-gray-500 mb-1">자기소개</label><textarea id="apply-content" class="w-full border rounded-xl px-3 py-2 text-sm h-24"></textarea></div>';
            }
            toggleModal('applyModal');
        }

        async function submitApplication() {
            const data = squads.find(s => Number(s.id) === Number(currentSelectedId));
            if(!data || !data.authorId) return alert("신청 대상을 찾을 수 없습니다.");
            const contentInput = document.getElementById('apply-content');
            const roleInput = document.getElementById('apply-role');
            const portfolioInput = document.getElementById('apply-portfolio');
            const content = [
                roleInput ? '[희망 직군]: ' + roleInput.value : '',
                portfolioInput ? '[포트폴리오]: ' + portfolioInput.value : '',
                contentInput ? contentInput.value : ''
            ].filter(Boolean).join('\n');
            await apiRequest('/api/lounge/applications', {
                method: 'POST',
                body: JSON.stringify({
                    receiverId: data.authorId,
                    type: data.type === 'join_wish' ? 'SQUAD_PROPOSAL' : 'SQUAD_APPLICATION',
                    targetId: data.id,
                    targetTitle: data.title,
                    title: (data.type === 'join_wish' ? '스카우트 제안: ' : '참여 신청: ') + data.title,
                    content: content || '참여하고 싶습니다.'
                })
            }, true);
            alert("전송되었습니다!");
            toggleModal('applyModal');
            toggleModal('detailModal');
            await loadLoungeData();
        }

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
            if (!container) return;
            const data = activeStatusTab === 'sent' ? myApplications : receivedRequests;
            if(!data.length) {
                container.innerHTML = '<p class="text-center text-gray-400 text-xs py-10">내역이 없습니다.</p>';
                return;
            }
            container.innerHTML = data.map(item => '<div class="p-4 border rounded-xl bg-white flex flex-col gap-2 shadow-sm ' + (activeStatusTab==='received' ? 'cursor-pointer hover:border-brand' : '') + '" onclick="' + (activeStatusTab==='received' ? 'openReceivedRequest(' + item.id + ')' : '') + '"><div class="flex justify-between items-center"><span class="text-[9px] font-extrabold text-gray-400 uppercase">' + escapeHtml(item.date) + '</span><span class="text-[10px] font-bold text-brand bg-green-50 px-2 py-0.5 rounded">' + escapeHtml(item.status) + '</span></div><p class="text-sm font-bold text-gray-900">' + escapeHtml(item.title) + '</p></div>').join('');
        }

        async function openReceivedRequest(id) {
            let req = receivedRequests.find(r => Number(r.id) === Number(id));
            try {
                const detail = await apiRequest('/api/lounge/applications/' + id, {}, true);
                req = {
                    id: detail.applicationId,
                    type: detail.type === 'SQUAD_APPLICATION' ? 'project_apply' : 'scout',
                    title: detail.targetTitle || detail.title || '제목 없음',
                    sender: detail.senderName || '사용자',
                    senderImg: 'sender-' + detail.senderId,
                    date: toDateText(detail.createdAt),
                    status: detail.status === 'APPROVED' ? '승인됨' : (detail.status === 'REJECTED' ? '거절됨' : '대기중'),
                    content: detail.content || ''
                };
            } catch {}
            if (!req) return;
            currentRequestId = id;
            document.getElementById('ra-name').innerText = req.sender;
            document.getElementById('ra-date').innerText = req.date;
            document.getElementById('ra-img').src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(req.senderImg);
            document.getElementById('ra-title').innerText = req.title;
            document.getElementById('ra-type-badge').innerHTML = req.type === 'project_apply'
                ? '<span class="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded">프로젝트 지원</span>'
                : '<span class="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded">스카우트 제안</span>';
            document.getElementById('ra-content').innerText = req.content;
            toggleModal('receivedAppModal');
        }

        async function processRequest(action) {
            if (!currentRequestId) return;
            await apiRequest('/api/lounge/applications/' + currentRequestId + '/' + (action === 'approve' ? 'approve' : 'reject'), { method: 'PATCH', body: JSON.stringify({}) }, true);
            toggleModal('receivedAppModal');
            await loadLoungeData();
        }

        function openMemberProfile(name, role, img) {
            document.getElementById('mp-name').innerText = name;
            document.getElementById('mp-role').innerText = role || 'Member';
            document.getElementById('mp-img').src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(img);
            document.getElementById('mp-msg').value = '';
            toggleModal('memberProfileModal');
        }

        function openMemberProfileFromElement(element) {
            openMemberProfile(element.dataset.name || '', element.dataset.role || 'Member', element.dataset.img || 'Member');
        }

        function sendDM() {
            if(!document.getElementById('mp-msg').value.trim()) return alert("메시지 입력...");
            alert("메시지 전송됨!");
            toggleModal('memberProfileModal');
        }

        window.onload = function() {
            renderMessages();
            applyFilters();
            loadLoungeData().catch(error => {
                console.error(error);
                renderCardsList();
            });
        };
`

const LOUNGE_HTML = STATIC_LOUNGE_HTML.replace(
  '__DEVPATH_LOUNGE_RUNTIME__',
  LOUNGE_RUNTIME_SCRIPT,
)

export default function CommunityLoungeApp() {
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
      title="DevPath - 스쿼드 라운지"
      className="fixed inset-0 block h-dvh w-dvw border-0"
      srcDoc={LOUNGE_HTML}
    />
  )
}
