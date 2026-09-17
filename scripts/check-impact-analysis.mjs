import { validateImpactAnalysis } from './impact-analysis-policy.mjs';

const body = process.env.PR_BODY || '';
let files = [];
try {
  files = JSON.parse(process.env.CHANGED_FILES_JSON || '[]');
} catch (error) {
  console.error('CHANGED_FILES_JSON을 파싱하지 못했습니다.', error);
  process.exit(1);
}

const result = validateImpactAnalysis({ body, files });

if (!result.required) {
  console.log('문서 전용 변경입니다. 영향도 분석 게이트를 건너뜁니다.');
  process.exit(0);
}

if (!result.ok) {
  console.error('\n❌ 영향도 분석 게이트 실패\n');
  for (const error of result.errors) console.error(`- ${error}`);
  console.error('\n코드 변경 PR은 구현 전/후 영향도 분석을 완료해야 합니다.');
  process.exit(1);
}

console.log('✅ 영향도 분석 게이트 통과');
