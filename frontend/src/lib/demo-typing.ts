export const DEMO_COURSE_TITLE = 'HTML CSS JavaScript 렌더링 입문'

export const DEMO_TEXT = {
  roadmap: '프론트엔드 개발자가 되기 위한 로드맵을 만들어줘 분기를 포함해서 학습 순서를 자유롭게 조절할 수 있게 해줘',
  approval: '강의 정보와 커리큘럼, 학습 콘텐츠를 확인했으며 공개 기준을 충족합니다.',
  questionTitle: 'JavaScript class 변경 시 렌더링 단계 질문',
  questionContent: 'JavaScript로 요소의 class를 바꾸면 DOM, CSSOM, 렌더 트리, layout, paint 중 어느 단계부터 다시 실행되나요?',
  answerTitle: 'class 변경 시 렌더링 흐름',
  answerContent: 'JavaScript로 class를 바꾸면 DOM 구조 자체보다는 요소에 적용되는 스타일이 바뀝니다. 그래서 브라우저는 CSSOM과 렌더 트리를 다시 계산하고, 크기나 위치가 달라지면 layout과 paint까지 다시 실행합니다. 색상처럼 시각 효과만 바뀌면 layout 없이 paint 단계부터 처리될 수 있습니다.',
  quizQuestion: 'JavaScript로 요소의 글자 색상만 바꾸면 항상 레이아웃(layout) 단계부터 다시 실행된다.',
  quizExplanation: '글자 색상만 바뀌면 스타일 재계산과 페인트로 처리될 수 있습니다. 요소의 크기나 위치가 바뀌지 않으면 레이아웃을 다시 계산할 필요가 없습니다.',
  erd: '현재 ERD에 변경 이력을 저장할 AUDIT_LOGS 테이블을 추가하고, 사용자 테이블과 1:N 관계로 연결해줘. id, user_id, action, created_at 컬럼을 포함해줘.',
  meeting: '회의 주제는 스쿼드 프로젝트 발표 전 마무리 작업 정리입니다.\n김태형 2026년 10월 26일 20시까지 PR #24 수정 커밋을 올리고 코드 리뷰를 다시 요청해주고\n박주승 2026년 10월 25일 12시까지 ERD에서 user, course, progress 테이블 관계를 다시 확인해\n다음 회의에서는 코드 리뷰 반영 여부와 ERD 수정 내용을 먼저 확인하겠습니다.',
}

const INITIALS = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const VOWEL_PREFIX: Record<number, number> = { 9: 8, 10: 8, 11: 8, 14: 13, 15: 13, 16: 13, 19: 18 }
const FINAL_PREFIX: Record<number, number> = { 3: 1, 5: 4, 6: 4, 9: 8, 10: 8, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8, 18: 17 }

export function koreanTypingFrames(text: string): string[] {
  const frames: string[] = []
  let prefix = ''
  for (const character of text) {
    const code = character.codePointAt(0)!
    if (code >= 0xac00 && code <= 0xd7a3) {
      // 유니코드 완성형 한글은 초성 19개 × 중성 21개 × 종성 28개 순서로 배열된다.
      const offset = code - 0xac00
      const initial = Math.floor(offset / 588)
      const vowel = Math.floor(offset % 588 / 28)
      const final = offset % 28
      const syllable = code - final
      frames.push(prefix + INITIALS[initial])
      if (VOWEL_PREFIX[vowel] !== undefined) frames.push(prefix + String.fromCharCode(0xac00 + initial * 588 + VOWEL_PREFIX[vowel] * 28))
      frames.push(prefix + String.fromCharCode(syllable))
      if (FINAL_PREFIX[final] !== undefined) frames.push(prefix + String.fromCharCode(syllable + FINAL_PREFIX[final]))
      if (final) frames.push(prefix + character)
    } else {
      frames.push(prefix + character)
    }
    prefix += character
  }
  return frames
}

export function startDemoTyping(text: string, onValue: (value: string) => void, onDone: () => void): () => void {
  const frames = koreanTypingFrames(text)
  // 짧은 제목은 빠르게 끝내되 긴 설명은 글자 수에 비례한 시간을 두어 자연스럽게 입력한다.
  const duration = Math.max(1300, text.length * 35)
  const started = Date.now()
  onValue(frames[0] ?? '')
  const timer = window.setInterval(() => {
    const index = Math.min(frames.length - 1, Math.floor((Date.now() - started) / duration * frames.length))
    onValue(frames[index] ?? '')
    if (Date.now() - started >= duration) {
      window.clearInterval(timer)
      onValue(text)
      onDone()
    }
  }, 16)
  return () => window.clearInterval(timer)
}
