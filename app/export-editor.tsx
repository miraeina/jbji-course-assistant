import {useEffect,useRef,useState} from 'react';
import {times} from './timetable-data';
import {applyExportEdit,editedLesson,editableFields,type ExportFields,type ExportEdits,type ExportLesson} from './export-edit-logic';

type Props={lessons:ExportLesson[];days:{day:number;label:string;date:string}[];context:string;busy:boolean;status:string;onClose:()=>void;onExport:(format:'png'|'pdf',source:HTMLElement)=>Promise<void>};
const dayNames=['周一','周二','周三','周四','周五'];
const slot=(lesson:ExportLesson)=>`${dayNames[lesson.day]} · 第 ${lesson.start+1}${lesson.span>1?`–${lesson.start+lesson.span}`:''} 节`;
export default function ExportEditor({lessons,days,context,busy,status,onClose,onExport}:Props){
  const dialog=useRef<HTMLDialogElement>(null),preview=useRef<HTMLDivElement>(null);
  const [edits,setEdits]=useState<ExportEdits>({});
  const [selected,setSelected]=useState(lessons[0].id);
  const [draft,setDraft]=useState<ExportFields>(lessons[0]);
  const [scope,setScope]=useState<'one'|'course'>('one');
  const [notice,setNotice]=useState('');
  const [confirmExit,setConfirmExit]=useState(false);
  const original=lessons.find(lesson=>lesson.id===selected)!;
  const current=editedLesson(original,edits);
  const pending=editableFields.some(field=>draft[field].trim()!==current[field]);
  const count=Object.keys(edits).length;
  const sameCourse=lessons.filter(lesson=>lesson.group===original.group).length;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const returnFocus=previous?.closest('details')?.querySelector('summary')||previous;
    const element=dialog.current;
    const overflow=document.body.style.overflow;
    element?.showModal();document.body.style.overflow='hidden';
    return ()=>{element?.close();document.body.style.overflow=overflow;returnFocus?.focus()};
  },[]);
  function close(){if(busy)return;if(count||pending)setConfirmExit(true);else onClose()}
  function select(id:string){
    if(pending){setNotice('请先应用修改，或取消尚未应用的输入。');return;}
    const lesson=lessons.find(item=>item.id===id)!;
    setSelected(id);setDraft(editedLesson(lesson,edits));setScope('one');setNotice('');
  }
  function restore(all=false){
    const next=all?{}:{...edits};if(!all)delete next[selected];
    setEdits(next);setDraft(editedLesson(original,next));setNotice(all?'已恢复全部原始信息。':'已恢复此安排的原始信息。');
  }
  return <dialog ref={dialog} className="exportEditor" aria-labelledby="export-editor-title" onCancel={event=>{event.preventDefault();close()}}>
    <header className="editorHeader"><div><h2 id="export-editor-title">编辑后导出</h2><p>修改仅用于本次导出，退出后不保存。</p></div><button type="button" onClick={close} disabled={busy} aria-label="退出编辑">×</button></header>
    {confirmExit?<section className="editorExit" role="alert"><p>退出将放弃本次个人修改，原始课表不受影响。</p><button onClick={()=>setConfirmExit(false)}>继续编辑</button><button onClick={onClose}>放弃修改并退出</button></section>:null}
    <div className="editorWorkspace">
      <form className="editorForm" onSubmit={event=>{event.preventDefault();if(!draft.title.trim()){setNotice('请填写课程显示名称。');return;}const next=applyExportEdit(lessons,edits,selected,draft,scope);setEdits(next);setDraft(editedLesson(original,next));setNotice('修改已应用到预览。')}}>
        <fieldset disabled={busy||confirmExit}>
          <label>选择上课安排<select value={selected} onChange={event=>select(event.target.value)}>{lessons.map(lesson=><option key={lesson.id} value={lesson.id}>{lesson.title} · {slot(lesson)}</option>)}</select></label>
          <p className="editorScopeHint">{context}<br/>周次：{original.weeks}。修改仅作用于当前导出范围，不改变日期和节次。</p>
          <label>应用范围<select value={scope} onChange={event=>setScope(event.target.value as 'one'|'course')}><option value="one">仅此上课安排</option><option value="course">此课程全部安排（{sameCourse} 处）</option></select></label>
          {scope==='course'&&<p className="editorScopeHint">包含此课程在预览中的讲课、Seminar 或 Q&amp;A；仅同步本次改动的字段。</p>}
          <label>课程显示名称<input value={draft.title} maxLength={80} required onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
          <label>教室<input value={draft.room} maxLength={100} placeholder="例如 N315" onChange={event=>setDraft({...draft,room:event.target.value})}/></label>
          <label>教师<input value={draft.teacher} maxLength={160} placeholder="可留空" onChange={event=>setDraft({...draft,teacher:event.target.value})}/></label>
          <label>个人备注<textarea value={draft.note} maxLength={240} rows={3} placeholder="例如：教室调整，以班群通知为准" onChange={event=>setDraft({...draft,note:event.target.value})}/></label>
          <div className="editorFormActions"><button className="primary" type="submit" disabled={!pending}>应用修改</button><button type="button" disabled={!pending} onClick={()=>{setDraft(current);setNotice('已取消尚未应用的输入。')}}>取消输入</button></div>
          <div className="editorFormActions"><button type="button" onClick={()=>restore()} disabled={!edits[selected]&&!pending}>恢复此安排</button><button type="button" onClick={()=>restore(true)} disabled={!count&&!pending}>恢复全部原始信息</button></div>
          <p className="editorMessage" role="status">{notice||'可从右侧课表点击课程，或使用上方列表选择。'}</p>
        </fieldset>
      </form>
      <div className="editorPreviewPane"><p className="editorPreviewLabel">导出预览 · 已修改 {count} 处{pending?' · 输入尚未应用':''}</p>
        <div ref={preview} className="editorPreview">
          <div className="editorPrintHeading"><strong>我的课表 · 个人编辑版</strong><p>{context}</p></div>
          <div className="tableScroll"><div className="timetable" style={{gridTemplateColumns:`72px repeat(${days.length},minmax(0,1fr))`,minWidth:days.length===1?'360px':'900px'}}>
            <div className="corner">节次</div>{days.map((day,index)=><div className="dayHead" key={day.day} style={{gridColumn:index+2}}>{day.label}<small>{day.date}</small></div>)}
            {times.map(([session,from,to],index)=><div className={`timeCell ${session==='5'?'break':''}`} style={{gridRow:index+2}} key={session}><strong>{session}</strong><span>{from}</span>{to&&<small>{to}</small>}</div>)}
            {times.map((_,row)=>days.map((day,index)=><div className={`gridCell ${row===4?'break':''}`} key={`${day.day}-${row}`} style={{gridColumn:index+2,gridRow:row+2}}/>))}
            {lessons.map(base=>{const lesson=editedLesson(base,edits);return <button type="button" key={lesson.id} data-event-id={lesson.id} className={`courseBlock category-${lesson.category} ${selected===lesson.id?'editorSelected':''}`} aria-label={`编辑 ${lesson.title}，${slot(lesson)}`} aria-pressed={selected===lesson.id} disabled={busy||confirmExit} onClick={()=>select(lesson.id)} style={{gridColumn:days.findIndex(day=>day.day===lesson.day)+2,gridRow:`${lesson.start+2} / span ${lesson.span}`,width:`calc((100% - 6px) / ${lesson.laneCount})`,marginLeft:`calc(${lesson.lane} * (100% / ${lesson.laneCount}) + 3px)`}}>
              <strong>{lesson.title}</strong>{lesson.subtitle&&lesson.title===base.title&&<small className="editorSubtitle">{lesson.subtitle}</small>}<small className="courseRoom">教室：{lesson.room||'未填写'}</small><small className="courseWeeks">周次：{lesson.weeks}</small>{lesson.teacher&&<small className="courseTeacher">教师：{lesson.teacher}</small>}{lesson.note&&<small className="editorNote">备注：{lesson.note}</small>}<span className="courseTag">{lesson.categoryLabel}</span>{edits[lesson.id]&&<small className="editorChanged">已编辑</small>}
            </button>})}
          </div></div>
          <p className="editorPrintFootnote">个人编辑版 · {count?'标注“已编辑”的课程含个人修改，非原始 PDF 内容。':'基于原始课表生成。'}临时安排请以学院最新通知为准。</p>
        </div>
      </div>
    </div>
    <footer className="editorFooter"><span role="status">{busy?'正在生成文件…':status|| (pending?'请先应用修改，再导出。':'修改不会上传，也不会影响其他人。')}</span><div><button onClick={close} disabled={busy}>退出编辑</button><button onClick={()=>preview.current&&onExport('png',preview.current)} disabled={busy||pending||confirmExit}>导出图片</button><button className="primary" onClick={()=>preview.current&&onExport('pdf',preview.current)} disabled={busy||pending||confirmExit}>导出 PDF</button></div></footer>
  </dialog>;
}
