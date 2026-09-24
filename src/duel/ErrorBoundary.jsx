import React from 'react';
import {V10_SAVE_KEY} from './v10-storage.js';

// 화면이 죽으면 남색 빈 화면만 남고 원인도, 빠져나갈 길도 없었다.
// 여기서 멈추고 무엇이 일어났는지 알린 뒤 손상된 런을 지울 수단을 준다.
export default class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){try{console.error('9ZONE 화면 오류',error,info);}catch{}}

  clearRun(){
    try{globalThis.localStorage?.removeItem(V10_SAVE_KEY);}catch{}
    try{globalThis.location?.reload();}catch{this.setState({error:null});}
  }

  render(){
    if(!this.state.error)return this.props.children;
    return <main role="alert" style={{minHeight:'100dvh',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',gap:16,padding:24,background:'#07120f',
      color:'#ccd8d0',fontFamily:'system-ui,sans-serif',textAlign:'center'}}>
      <strong style={{fontSize:20,color:'#f4ecd8'}}>승부를 이어갈 수 없습니다</strong>
      <p style={{fontSize:15,lineHeight:1.6,maxWidth:420,margin:0}}>
        저장된 런이 손상됐을 수 있습니다. 새 런으로 다시 시작하면 정상 동작합니다.
      </p>
      <code style={{fontSize:12,color:'#7d9388',maxWidth:420,wordBreak:'break-all'}}>
        {String(this.state.error?.message||this.state.error)}
      </code>
      <button type="button" onClick={()=>this.clearRun()} style={{minHeight:44,padding:'0 20px',
        borderRadius:8,border:'1px solid #ffe4a2',background:'#17323a',color:'#ffe4a2',
        fontSize:15,fontWeight:700,cursor:'pointer'}}>저장된 런 지우고 새로 시작</button>
    </main>;
  }
}
