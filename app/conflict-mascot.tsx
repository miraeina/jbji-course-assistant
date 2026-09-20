import {useEffect,useRef,useState} from 'react';
import type {ConflictDetail} from './schedule-logic';

export default function ConflictMascot({conflicts,previewIds}:{conflicts:ConflictDetail[];previewIds:Set<string>}){
  const fingerprint=JSON.stringify(conflicts.map(issue=>({
    key:[issue.first.id,issue.second.id].sort().join(':')+':'+issue.firstSession,
    preview:previewIds.has(issue.first.id)||previewIds.has(issue.second.id),
  })).sort((a,b)=>a.key.localeCompare(b.key)));
  const previous=useRef(fingerprint);
  const [notice,setNotice]=useState<{preview:boolean;stamp:number}|null>(null);
  useEffect(()=>{
    const before=new Set((JSON.parse(previous.current) as {key:string}[]).map(item=>item.key));
    const current=JSON.parse(fingerprint) as {key:string;preview:boolean}[];
    previous.current=fingerprint;
    const added=current.filter(item=>!before.has(item.key));
    if(!current.length)setNotice(null);
    else if(added.length)setNotice({preview:added.every(item=>item.preview),stamp:Date.now()});
  },[fingerprint]);
  useEffect(()=>{
    if(!notice)return;
    const timer=window.setTimeout(()=>setNotice(null),3000);
    return ()=>window.clearTimeout(timer);
  },[notice]);
  return notice?<aside className="conflictMascotToast" data-export-exclude key={notice.stamp}>
    <button className="conflictMascotClose" aria-label="关闭奶龙提醒" onClick={()=>setNotice(null)}>×</button>
    <img src="./conflict-nailong.png" alt="奶龙：惊鸿一瞥"/>
    <div role="status"><strong>你最好真的会分身。</strong><p>{notice.preview?'预览课程存在冲突，尚未加入课表。':'新增课程冲突，请检查重叠时间。'}</p></div>
  </aside>:null;
}
