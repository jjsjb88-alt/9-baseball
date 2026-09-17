import {describe,expect,it} from 'vitest';
import {
  REQUIRED_IMPACT_CHECKS,
  requiresImpactAnalysis,
  validateImpactAnalysis,
} from '../scripts/impact-analysis-policy.mjs';

function completeBody(){
  const checks=REQUIRED_IMPACT_CHECKS.map(label=>`- [x] ${label}`).join('\n');
  return `
<!-- IMPACT_ANALYSIS_REQUIRED -->
## 영향도 분석 — 필수

### 영향받는 화면 / 시스템
- 직접 영향: 전투 카드 선택 화면
- 간접 영향: 경로 복귀 후 레이아웃
- 영향 없음으로 확인한 주요 영역: 저장 스키마

### 예상 사이드이펙트
- 가능한 회귀: 모바일 가로에서 스크롤 잠김
- 가장 위험한 전역 영향: body overflow
- 모바일/브라우저 특이사항: Android 브라우저 높이

### 격리 / 대응 전략
- 변경 범위를 어떻게 제한했는지: 전투 클래스에만 selector 적용
- 기존 동작을 어떻게 보존했는지: 비전투 화면은 document scroll 유지
- 실패 시 되돌릴 수 있는 단위: 신규 CSS 파일

### 필수 영향도 체크
${checks}

### 회귀 검증
- 추가/수정한 회귀 테스트: landscape layout test
- 직접 확인한 사용자 플로우: 타이틀 → 경로 → 전투 → 보상
- 전체 테스트 결과: pass
- smoke 결과: pass
- production build 결과: pass
- 배포 후 확인: 예정
`;
}

describe('mandatory impact analysis policy',()=>{
  it('문서만 바꾸는 PR은 게이트 대상이 아니다',()=>{
    expect(requiresImpactAnalysis(['README.md','docs/design.md'])).toBe(false);
    expect(validateImpactAnalysis({body:'',files:['README.md']}).required).toBe(false);
  });

  it('src/tests/workflow 등 코드 계약 변경은 영향도 분석을 요구한다',()=>{
    expect(requiresImpactAnalysis(['src/duel/App.jsx'])).toBe(true);
    expect(requiresImpactAnalysis(['tests/v10-ui-shell.test.jsx'])).toBe(true);
    expect(requiresImpactAnalysis(['.github/workflows/deploy-pages.yml'])).toBe(true);
  });

  it('영향도 섹션이나 체크가 빠지면 실패한다',()=>{
    const result=validateImpactAnalysis({body:'기능 추가',files:['src/duel/App.jsx']});
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(5);
  });

  it('체크 하나라도 미완료면 실패한다',()=>{
    const body=completeBody().replace('- [x] 스크롤/오버플로를 확인했다','- [ ] 스크롤/오버플로를 확인했다');
    const result=validateImpactAnalysis({body,files:['src/duel/duel.css']});
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('필수 영향도 체크 미완료: 스크롤/오버플로를 확인했다');
  });

  it('실제 분석 내용과 모든 체크가 있으면 통과한다',()=>{
    const result=validateImpactAnalysis({body:completeBody(),files:['src/duel/App.jsx','tests/v10-ui-shell.test.jsx']});
    expect(result).toEqual({ok:true,required:true,errors:[]});
  });
});
