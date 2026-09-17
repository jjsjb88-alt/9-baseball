export const REQUIRED_IMPACT_CHECKS = [
  '변경 전 영향 범위를 식별했다',
  'UI/레이아웃 영향을 확인했다',
  '입력/제스처 영향을 확인했다',
  '게임 로직/밸런스 영향을 확인했다',
  '저장/불러오기 호환성을 확인했다',
  '모바일 가로/세로·뷰포트를 확인했다',
  '스크롤/오버플로를 확인했다',
  '기존 사용자 플로우 회귀를 확인했다',
  '테스트/회귀 검증을 확인했다',
  '빌드/배포 영향을 확인했다',
];

export const REQUIRED_SECTIONS = [
  '### 영향받는 화면 / 시스템',
  '### 예상 사이드이펙트',
  '### 격리 / 대응 전략',
  '### 회귀 검증',
];

const CODE_PREFIXES = [
  'src/',
  'scripts/',
  'tests/',
  'public/',
  '.github/workflows/',
];

const CODE_FILES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'vite.config.js',
  'vite.config.mjs',
  'vite.config.ts',
  'index.html',
]);

export function requiresImpactAnalysis(files = []) {
  return files.some((file) => CODE_FILES.has(file) || CODE_PREFIXES.some((prefix) => file.startsWith(prefix)));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sectionBody(body, heading) {
  const start = body.indexOf(heading);
  if (start < 0) return '';
  const after = body.slice(start + heading.length);
  const next = after.search(/\n###\s+/);
  return (next < 0 ? after : after.slice(0, next)).trim();
}

function looksFilled(value) {
  if (!value) return false;
  const meaningful = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-*]\s*(직접 영향|간접 영향|영향 없음으로 확인한 주요 영역|가능한 회귀|가장 위험한 전역 영향|모바일\/브라우저 특이사항|변경 범위를 어떻게 제한했는지|기존 동작을 어떻게 보존했는지|실패 시 되돌릴 수 있는 단위|추가\/수정한 회귀 테스트|직접 확인한 사용자 플로우|전체 테스트 결과|smoke 결과|production build 결과|배포 후 확인):?\s*$/.test(line));
  return meaningful.length > 0;
}

export function validateImpactAnalysis({ body = '', files = [] } = {}) {
  if (!requiresImpactAnalysis(files)) {
    return { ok: true, required: false, errors: [] };
  }

  const errors = [];
  if (!body.includes('<!-- IMPACT_ANALYSIS_REQUIRED -->')) {
    errors.push('PR 본문에 IMPACT_ANALYSIS_REQUIRED 마커가 없습니다. PR 템플릿의 영향도 분석 섹션을 유지하세요.');
  }

  for (const heading of REQUIRED_SECTIONS) {
    if (!body.includes(heading)) {
      errors.push(`필수 섹션이 없습니다: ${heading}`);
      continue;
    }
    if (!looksFilled(sectionBody(body, heading))) {
      errors.push(`필수 섹션의 실제 분석 내용이 비어 있습니다: ${heading}`);
    }
  }

  for (const label of REQUIRED_IMPACT_CHECKS) {
    const checked = new RegExp(`-\\s*\\[[xX]\\]\\s*${escapeRegex(label)}`).test(body);
    if (!checked) errors.push(`필수 영향도 체크 미완료: ${label}`);
  }

  return { ok: errors.length === 0, required: true, errors };
}
