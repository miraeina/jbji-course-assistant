import { useState } from 'react';
import {catalogCategory,catalogCategoryLabels,type CatalogCategory,type ElectiveOption} from './elective-logic';
import {roomForMajor,sessionTimeLabel,type ConflictDetail} from './schedule-logic';
import { times, type Major, type TimetableEvent } from './timetable-data';

const days=['周一','周二','周三','周四','周五'];
export default function ElectivePanel({options,selected,previewed,year,major,issuesFor,onToggle,onPreview,onDetails,onClear}:{
  options:ElectiveOption[];selected:string[];previewed:string[];year:number;major:Major;issuesFor:(option:ElectiveOption)=>ConflictDetail[];
  onToggle:(option:ElectiveOption)=>void;onPreview:(option:ElectiveOption)=>void;onDetails:(event:TimetableEvent)=>void;onClear:()=>void;
}){
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<'all'|'selected'|'safe'>('all');
  const [sourceYear,setSourceYear]=useState<number|'all'>(year===5?1:'all');
  const [category,setCategory]=useState<CatalogCategory|'all'>('all');
  const rows=options.map(option=>({option,issues:issuesFor(option)})).filter(({option,issues})=>{
    if(filter==='selected'&&!selected.includes(option.key))return false;
    if(filter==='safe'&&issues.length)return false;
    if(sourceYear!=='all'&&option.events[0].year!==sourceYear)return false;
    if(category!=='all'&&catalogCategory(option.events[0])!==category)return false;
    return option.events.some(event=>`${event.title} ${event.english||''} ${event.teacher||''} ${event.note||''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  });
  return <>
    <div className="electiveSelectionActions"><span>{year!==5&&'当前身份 · '}已选 {selected.length} 门</span><button type="button" disabled={!selected.length} onClick={onClear}>清空已选</button></div>
    <div className="retakeIntro"><strong>{year===2?'选择英语课程与教学班':year===5?'添加本学期课程':'选择本学期选修课'} · 已选 {selected.length} 门</strong><p>添加到课表后，仍需在学校系统选课。</p>{year===2&&<p>2025级需选 1 门英语模块。同一课程更换班次后，原班次自动移除。</p>}</div>
    <label className="courseSearch"><span>{year===5?'搜索课程':'搜索选修课'}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="课程名、教师或教学班"/></label>
    {year===5&&<div className="catalogFilters">
      <div className="catalogYearTabs" role="group" aria-label="按课程年级筛选">{(['all',1,2,3,4] as const).map(value=>{
        const label=value==='all'?'全部':`大${['一','二','三','四'][value-1]}`;
        const count=options.filter(option=>value==='all'||option.events[0].year===value).length;
        return <button type="button" key={value} aria-pressed={sourceYear===value} aria-label={`${label}年级，${count} 个课程选项`} onClick={()=>setSourceYear(value)}><span>{label}</span><small>{count}</small></button>;
      })}</div>
      <label>课程类别<select aria-label="课程类别" value={category} onChange={event=>setCategory(event.target.value as CatalogCategory|'all')}><option value="all">全部类别</option>{(Object.keys(catalogCategoryLabels) as CatalogCategory[]).map(value=><option value={value} key={value}>{catalogCategoryLabels[value]}</option>)}</select></label>
    </div>}
    <div className="filterPills">{(['all','selected','safe'] as const).map((value,index)=><button key={value} aria-pressed={filter===value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{['全部','已选','无冲突'][index]}</button>)}</div>
    <div className="sidebarCourseList electiveCourseList">{rows.map(({option,issues})=>{
      const event=option.events[0];const chosen=selected.includes(option.key);
      const severity=issues.some(issue=>issue.severity==='hard')?'hard':issues.length?'partial':'safe';
      const replaces=options.some(item=>item.key!==option.key&&item.courseKey===option.courseKey&&selected.includes(item.key));
      return <article className={`retakeCourseCard ${year===2?'category-english':'category-jnu'} ${chosen?'selected':''} ${severity==='hard'?'hasHardConflict':severity==='partial'?'hasPartialConflict':''}`} key={option.key}>
        <span>{year===5?`大${['一','二','三','四'][event.year-1]} · ${catalogCategoryLabels[catalogCategory(event)]}${event.groups?.length?' · '+event.groups.join(' / '):''}${event.note?' · '+event.note:''}`:event.note||'选修课程'}{chosen?' · 已加入':''}</span><strong>{event.title}{event.id==='y4-macro'?'（强推👍）':''}</strong>{event.english&&<small>{event.english}</small>}
        {option.events.map(session=><p className="electiveSession" key={session.id}>{session.listedOnly?'时间待通知':`${days[session.day]} ${sessionTimeLabel(session,times)}`}<br/>教室：{roomForMajor(session,major)}<br/>周次：{session.weeks||'待通知'}{session.teacher&&<><br/>教师：{session.teacher}</>}</p>)}
        {issues.length>0&&<details className="electiveIssues"><summary>{issues.length} 处{severity==='partial'?'部分':''}冲突 · 查看</summary>{issues.map(issue=><p key={issue.key}>{option.events.some(item=>item.id===issue.first.id)?issue.second.title:issue.first.title}<br/>{days[issue.day]} 第{issue.firstSession}–{issue.lastSession}节 · 第{issue.weeks.join('、')}周</p>)}</details>}
        <div className="electiveLinks"><button onClick={()=>onDetails(event)}>详情</button>{!chosen&&<button aria-pressed={previewed.includes(option.key)} onClick={()=>onPreview(option)}>{previewed.includes(option.key)?'取消预览':'预览课表'}</button>}</div>
        <div className="retakeCardFooter"><span className={`conflictStatus ${severity}`}>{severity==='safe'?'无冲突':severity==='hard'?'课程冲突':'部分冲突'}</span><button aria-label={`${chosen?'移除':replaces?'换为':'加入'}${event.title}${event.note?` · ${event.note}`:''}`} onClick={()=>onToggle(option)}>{chosen?'移除':replaces?'换到此班':'加入课表'}</button></div>
      </article>;
    })}{!rows.length&&<p className="sidebarEmpty">{filter==='selected'?'没有符合筛选条件的已选课程':'没有符合条件的课程'}</p>}</div>
  </>;
}
