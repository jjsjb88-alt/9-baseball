export const SAVE_KEY = '9zone-lastlight-v1';
export const ZONES = ['좌상', '중상', '우상', '좌중', '한가운데', '우중', '좌하', '중하', '우하'];
export const PITCHERS = [
  { id: 'rookie', name: '한도윤', title: 'THE ROOKIE', number: '17', target: 1, power: 46, color: '#bcea73',
    intro: '빠른 공을 믿는 신인. 위기에 몰리면 익숙한 승부구를 찾는다.',
    tell: '두 스트라이크 이후, 낮은 가운데를 유심히 보세요.',
    habit: '2스트라이크에서 낮은 가운데 직구를 선호한다.' },
  { id: 'adapter', name: '서이준', title: 'THE ADAPTER', number: '32', target: 3, power: 60, color: '#80cbd4',
    intro: '흐름을 바꾸는 좌완. 방금 던진 공이 다음 공의 단서다.',
    tell: '볼을 하나 던진 뒤, 높은 코스로 돌아오는지 관찰하세요.',
    habit: '볼 다음에는 높은 바깥쪽(우상)을 선호하고, 최근 노림은 피한다.' },
  { id: 'fox', name: '차무영', title: 'THE FOX', number: '09', target: 4, power: 72, color: '#e4a783',
    intro: '당신을 관찰해 온 마지막 투수. 확률만 읽어서는 이길 수 없다.',
    tell: '같은 곳만 기다리진 마세요. 그래도 2스트라이크에는 빈틈이 있습니다.',
    habit: '최근 여섯 번의 노림을 피하지만, 2스트라이크 몸쪽(좌중)에 미련이 남는다.' },
];
export const CARDS = {
  drive: { name: '라인 드라이브', en: 'DRIVE', mark: '↗', color: '#c5e892', text: '정확한 읽기에 균형 잡힌 타격.', detail: '접촉 +8 · 타구 질 +6' },
  contact: { name: '끝까지 본다', en: 'CONTACT', mark: '◎', color: '#a8d8e0', text: '한 칸 빗나가도 살아남는다.', detail: '접촉 +22 · 타구 질 −14' },
  power: { name: '담장 너머', en: 'POWER', mark: '↟', color: '#f0b395', text: '정확히 읽었다면, 크게 건다.', detail: '접촉 −16 · 정확한 읽기 타구 질 +28' },
  cover: { name: '넓게 지킨다', en: 'COVER', mark: '⊞', color: '#cebee8', text: '선택한 존과 좌우 한 칸을 커버.', detail: '같은 행 인접 존 보험 · 타구 질 −18' },
  cut: { name: '한 구 더', en: 'CUT', mark: '≋', color: '#e5d59f', text: '놓친 공도 파울로 버텨낸다.', detail: '접촉 +12 · 헛스윙의 65%를 파울로' },
};
export const OUTCOMES = {
  ball: ['BALL', '볼', '한 번 더 기다릴 수 있다.'], strike: ['STRIKE', '스트라이크', '다음 공의 단서로 기억하자.'],
  miss: ['SWING & MISS', '헛스윙', '읽기와 타격은 다르다. 다음 승부를 준비하자.'],
  foul: ['STAY ALIVE', '파울', '아직 이 타석은 끝나지 않았다.'], out: ['BALL IN PLAY', '타구 아웃', '잘 맞힌 공도 잡힐 수 있다.'],
  strikeout: ['STRIKEOUT', '삼진', '이번 승부는 투수의 것.'], walk: ['BASE ON BALLS', '볼넷', '기다림도 공격이다.'],
  single: ['BASE HIT', '안타', '주자를 쌓고, 흐름을 바꾼다.'], double: ['IN THE GAP', '2루타', '수비 사이를 완전히 갈랐다.'],
  triple: ['KEEP RUNNING', '3루타', '멈추지 마. 더 멀리.'], homerun: ['GONE.', '홈런', '이 한 구를 기다렸다.'],
};
export const READ_NAMES = { exact: 'PERFECT READ', deep: 'DEEP READ', covered: 'COVERED', near: 'NEAR READ', wrong: 'MISREAD', chase: 'CHASE', take: 'TAKE' };
