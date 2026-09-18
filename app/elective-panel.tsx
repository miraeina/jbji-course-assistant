import { useState } from 'react';
import type { ElectiveOption } from './elective-logic';
import type { ConflictDetail } from './schedule-logic';
import { times, type TimetableEvent } from './timetable-data';

const days=['周一','周二','周三','周四','周五'];
export default function ElectivePanel({options,selected,year,issuesFor,onToggle,onPreview,onDetails}:{
  options:ElectiveOption[];selected:string[];year:number;issuesFor:(option:ElectiveOption)=>ConflictDetail[];
  onToggle:(option:ElectiveOption)=>void;onPreview:(option:ElectiveOption)=>void;onDetails:(event:TimetableEvent)=>void;
}){
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'all'|'selected'|'safe'>('all');
  const rows=options.map(option=>({option,issues:issuesFor(option)})).filter(({option,issues})=>{
    if(filter==='selected'&&!selected.includes(option.key))return false;
    if(filter==='safe'&&issues.length)return false;
    return option.events.some(event=>`${event.title} ${event.english||''} ${event.teacher||''} ${event.note||''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  });
  return <>
    <div className="retakeIntro"><strong>{year===2?'选择英语课程与教学班':'选择本学期选修课'} · 已选 {selected.length} 门</strong><p>添加到课表后，仍需在学校系统选课。</p>{year===2&&<p>2025级需选 1 门英语模块。同一课程更换班次后，原班次自动移除。</p>}</div>
    <label className="courseSearch"><span>搜索选修课</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="课程名、教师或教学班"/></label>
    <div className="filterPills">{(['all','selected','safe'] as const).map((value,index)=><button key={value} aria-pressed={filter===value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{['全部','已选','无冲突'][index]}</button>)}</div>
    <div className="sidebarCourseList electiveCourseList">{rows.map(({option,issues})=>{
      const event=option.events[0];const chosen=selected.includes(option.key);
      const severity=issues.some(issue=>issue.severity==='hard')?'hard':issues.length?'partial':'safe';
      const replaces=options.some(item=>item.key!==option.key&&item.courseKey===option.courseKey&&selected.includes(item.key));
      return <article className={`retakeCourseCard ${year===2?'category-english':'category-jnu'} ${chosen?'selected':''} ${severity==='hard'?'hasHardConflict':severity==='partial'?'hasPartialConflict':''}`} key={option.key}>
        <span>{event.note||'选修课程'}{chosen?' · 已加入':''}</span><strong>{event.title}</strong>{event.english&&<small>{event.english}</small>}
        {option.events.map(session=><p className="electiveSession" key={session.id}>{session.listedOnly?'时间待通知':`${days[session.day]} ${times[session.start]?.[1]}–${times[session.start+session.span-1]?.[2]}`}<br/>教室：{session.room||'待通知'}<br/>周次：{session.weeks||'待通知'}{session.teacher&&<><br/>教师：{session.teacher}</>}</p>)}
        {issues.length>0&&<details className="electiveIssues"><summary>{issues.length} 处{severity==='partial'?'部分':''}冲突 · 查看</summary>{issues.map(issue=><p key={issue.key}>{option.events.some(item=>item.id===issue.first.id)?issue.second.title:issue.first.title}<br/>{days[issue.day]} 第{issue.firstSession}–{issue.lastSession}节 · 第{issue.weeks.join('、')}周</p>)}</details>}
        <div className="electiveLinks"><button onClick={()=>onDetails(event)}>详情</button>{!chosen&&<button onClick={()=>onPreview(option)}>预览课表</button>}</div>
        <div className="retakeCardFooter"><span className={`conflictStatus ${severity}`}>{severity==='safe'?'无冲突':severity==='hard'?'课程冲突':'部分冲突'}</span><button aria-label={`${chosen?'移除':replaces?'换为':'加入'}${event.title}${event.note?` · ${event.note}`:''}`} onClick={()=>onToggle(option)}>{chosen?'移除':replaces?'换到此班':'加入课表'}</button></div>
      </article>;
    })}{!rows.length&&<p className="sidebarEmpty">{filter==='selected'?'尚未添加选修课':'没有符合条件的选修课'}</p>}</div>
  </>;
}
