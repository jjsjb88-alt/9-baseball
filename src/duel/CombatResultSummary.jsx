import React from 'react';
import {RESULT_LABELS,RESULT_ORDER,choiceText,hpChangeText,pitchText,verdictText} from './v10-copy.js';
import './v10-ui.css';

export default function CombatResultSummary({choice,actualPitch,verdict,damage=0,hpAfter=0,cardCount=1,damageRate=1}){
  const values={choice:choiceText(choice),pitch:pitchText(actualPitch),verdict:verdictText(verdict),hp:hpChangeText(hpAfter,damage)};
  return (
    <ol className="v10-result" data-testid="v10-result" aria-label="이번 공 결과">
      {RESULT_ORDER.map(key=>(
        <li key={key} className="v10-result-row" data-row={key}>
          <span className="v10-result-label">{RESULT_LABELS[key]}</span>
          <b className="v10-result-value" data-testid={`v10-result-${key}`}>{values[key]}</b>
        </li>
      ))}
      {cardCount>1&&<li className="v10-result-stack" aria-label={`스윙 스택 ${cardCount}장, HP 피해 효율 ${Math.round(damageRate*100)}퍼센트`}>
        <span>SWING STACK · {cardCount}장</span><b>HP DAMAGE × {Math.round(damageRate*100)}%</b>
      </li>}
    </ol>
  );
}
