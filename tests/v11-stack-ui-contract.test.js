import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../src/duel/App.jsx',import.meta.url),'utf8');
const board=fs.readFileSync(new URL('../src/duel/StackBoard.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/duel/v11-stack.css',import.meta.url),'utf8');

describe('V11 tactical StackBoard contract',()=>{
  it('keeps PLACE → CONNECT → SWING as the primary grammar',()=>{
    expect(app).toContain('9ZONE STACK · PLACE → CONNECT → SWING');
    expect(app).toContain('같은 카드도 순서가 스윙을 바꾼다.');
  });

  it('routes MAIN RUN through the dedicated StackBoard component',()=>{
    expect(app).toContain("import StackBoard from './StackBoard.jsx'");
    expect(app).toContain('<StackBoard plan={choice?.stackPlan}');
    expect(app).not.toContain('className="v11-stack-path"');
    expect(app).not.toContain('className="v11-order-controls"');
  });

  it('renders a true 3x3 board with ordered tokens and route lines',()=>{
    expect(board).toContain('className="stack-board-zone"');
    expect(board).toContain('Array.from({length:9}');
    expect(board).toContain('className="stack-route-lines"');
    expect(board).toContain('step.order');
    expect(css).toContain('grid-template-columns:repeat(3,1fr)');
  });

  it('distinguishes CONNECT and BREAK by line language as well as color',()=>{
    expect(board).toContain("link.connected?'connected':'broken'");
    expect(css).toContain('.stack-route-lines .connected');
    expect(css).toContain('.stack-route-lines .broken');
    expect(css).toContain('stroke-dasharray:5 4');
  });

  it('keeps MAIN fixed while support cards can reorder',()=>{
    expect(app).toContain('moveStackOrder=(id,delta)');
    expect(board).toContain('SWING ORDER');
    expect(board).toContain('disabled={earlier==null||!!drag}');
    expect(board).toContain('onClick={()=>onMove(step.id,-1)}');
    expect(board).toContain('onClick={()=>onMove(step.id,1)}');
    expect(board).toContain('if(index<1||target<1');
  });

  it('previews reorder value without auto-playing the route',()=>{
    expect(board).toContain('stackMoveConnectDelta');
    expect(board).toContain('≡ 손잡이로 끌거나 버튼으로 이동');
    expect(board).toContain("impactClass(earlier)");
    expect(board).toContain("impactClass(later)");
    expect(css).toContain('.rail-actions button.improves');
    expect(css).toContain('.rail-actions button.worsens');
    expect(css).toContain('.rail-actions button.neutral');
  });

  it('supports pointer drag without removing the accessible arrow controls',()=>{
    expect(board).toContain('className="rail-drag-handle"');
    expect(board).toContain('onPointerDown={e=>beginDrag(e,step,actualIndex)}');
    expect(board).toContain('onPointerMove={moveDrag}');
    expect(board).toContain('onPointerUp={e=>finishDrag(e,false)}');
    expect(board).toContain('onPointerCancel={e=>finishDrag(e,true)}');
    expect(board).toContain('data-stack-index={i}');
    expect(board).toContain('stackReorderPreview');
    expect(board).toContain('disabled={earlier==null||!!drag}');
    expect(board).toContain('disabled={later==null||!!drag}');
    expect(css).toContain('.rail-drag-handle');
    expect(css).toContain('touch-action:none');
    expect(css).toContain('.rail-cards>div.drag-source');
    expect(css).toContain('.rail-cards>div.drag-target');
  });

  it('shows BASE → CONNECT → FINAL HP efficiency without recalculating engine data',()=>{
    expect(board).toContain('BASE');
    expect(board).toContain('CONNECT');
    expect(board).toContain('FINAL');
    expect(board).toContain('Math.round(baseDamageRate*100)');
    expect(board).toContain('Math.round(connectBonus*100)');
    expect(board).toContain('Math.round(damageRate*100)');
  });

  it('keeps portrait and low-height landscape responsive contracts',()=>{
    expect(css).toContain('@media (orientation:portrait) and (max-width:430px)');
    expect(css).toContain('@media (orientation:landscape) and (max-height:430px)');
  });
});
