import { useLayoutEffect, useRef } from 'react';
import { times, type TimetableEvent } from './timetable-data';

type PreviewEvent=TimetableEvent&{lane:number;laneCount:number};
export default function MobileSelectionPreview({events,previewIds,conflictIds,focus,expanded,count,onExpand,onClose,onDetails}:{
  events:PreviewEvent[];previewIds:Set<string>;conflictIds:Set<string>;
  focus:{id:string;stamp:number}|null;expanded:boolean;count:number;
  onExpand:()=>void;onClose:()=>void;onDetails:(event:TimetableEvent)=>void;
}) {
  const viewport=useRef<HTMLDivElement>(null);
  const target=useRef<HTMLButtonElement>(null);
  useLayoutEffect(()=>{
    const scroll=viewport.current,card=target.current;
    if(!scroll||!card||!scroll.clientHeight)return;
    scroll.scrollTop=card.offsetTop-scroll.clientHeight/2+card.offsetHeight/2;
  },[focus]);
  return <div className="mobileSelectionPreview">
    <header><div><strong>边选边看</strong><span>整学期 · 已选 {count} 门</span></div><button className="mobilePlannerDone" onClick={onClose}>完成</button></header>
    <div className="selectionMiniScroll" ref={viewport} role="region" aria-label="选课时的整学期课表" tabIndex={0}>
      <div className="selectionMiniGrid">
        <div className="miniCorner">时间</div>{['一','二','三','四','五'].map((day,index)=><div className="miniDay" style={{gridColumn:index+2}} key={day}>周{day}</div>)}
        {times.map(([,from],row)=><div className="miniTime" style={{gridRow:row+2}} key={row}>{from}</div>)}
        {times.flatMap((_,row)=>[0,1,2,3,4].map(day=><div className={`miniCell ${row===4?'miniBreak':''}`} style={{gridRow:row+2,gridColumn:day+2}} key={`${day}-${row}`}/>))}
        {events.map(event=><button key={event.id} ref={event.id===focus?.id?target:undefined}
          className={`miniCourse ${previewIds.has(event.id)?'miniPreview':''} ${conflictIds.has(event.id)?'miniConflict':''} ${event.id===focus?.id?'miniFocused':''}`}
          style={{gridColumn:event.day+2,gridRow:`${event.start+2} / span ${event.span}`,width:`calc((100% - 4px) / ${event.laneCount})`,marginLeft:`calc(${event.lane} * (100% / ${event.laneCount}) + 2px)`}}
          aria-label={`${previewIds.has(event.id)?'预览：':''}${event.title}，周${['一','二','三','四','五'][event.day]}，${event.weeks}${conflictIds.has(event.id)?'，存在冲突':''}，查看详情`}
          onClick={()=>onDetails(event)}><span>{event.shortTitle||event.title}</span>{previewIds.has(event.id)&&<small>预览</small>}{conflictIds.has(event.id)&&<small>冲突</small>}</button>)}
      </div>
    </div>
    <div className="selectionSplitBar"><span>{events.length?'虚线为预览 · 点击课程看详情':'在下方选课，上方同步显示'}</span><button aria-expanded={expanded} onClick={onExpand}>{expanded?`继续选课 · ${count} 门已选`:'放大课表'}</button></div>
  </div>;
}
