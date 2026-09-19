'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { academicCalendar, roomForMajor, coursesForProfile, initialScheduleView, sessionTimeLabel, getAcademicState, dateForWeekDay, formatShortDate, weekDateRange, formatCalendarDate, getDailySchedule, advanceCalendarView, emptyScheduleMessage, detectConflicts, weekNumbers, type ConflictDetail } from './schedule-logic';
import Materials from './materials';
import {timetableFeedbackUrl} from './feedback';
import ExportEditor from './export-editor';
import type {ExportLesson} from './export-edit-logic';
import { ThemePicker } from './theme';
import ElectivePanel from './elective-panel';
import { electiveOptions, electiveProfile, electiveStorageKey, isElective, parseElectiveSelections, selectedSchedule, toggleElective, type ElectiveOption } from './elective-logic';
import { majors, timetableEvents, times, type DegreeTrack, type Major, type TimetableEvent } from './timetable-data';

type DisplaySource='base'|'retake'|'preview';
type DisplayEvent=TimetableEvent&{displaySource?:DisplaySource;retakeKey?:string};
type LaidEvent=DisplayEvent&{lane:number;laneCount:number};
type CourseCategory='uob'|'jnu'|'english'|'general';
type SidebarMode='current'|'retake'|'elective';
type RetakeOption={key:string;year:number;title:string;english?:string;groups:string[];events:TimetableEvent[]};
function arrange(events:DisplayEvent[]):LaidEvent[]{
  const result:LaidEvent[]=[];
  for(let day=0;day<5;day++){
    const sorted=events.filter((event)=>event.day===day).sort((a,b)=>a.start-b.start||b.span-a.span);
    let index=0;
    while(index<sorted.length){
      const cluster:DisplayEvent[]=[sorted[index++]];
      let clusterEnd=cluster[0].start+cluster[0].span;
      while(index<sorted.length&&sorted[index].start<clusterEnd){
        cluster.push(sorted[index]); clusterEnd=Math.max(clusterEnd,sorted[index].start+sorted[index].span); index++;
      }
      const laneEnds:number[]=[]; const assigned:{event:DisplayEvent;lane:number}[]=[];
      cluster.forEach((event)=>{
        let lane=laneEnds.findIndex((end)=>end<=event.start);
        if(lane<0){lane=laneEnds.length;laneEnds.push(0)}
        laneEnds[lane]=event.start+event.span; assigned.push({event,lane});
      });
      assigned.forEach(({event,lane})=>result.push({...event,lane,laneCount:laneEnds.length}));
    }
  }
  return result;
}

const categoryLabels:Record<CourseCategory,string>={uob:'伯大课程',jnu:'暨大课程',english:'英语课程',general:'通识课'};

function courseCategory(event:TimetableEvent):CourseCategory{
  if(event.year===2&&isElective(event))return 'english';
  const searchable=`${event.title} ${event.english||''}`.toLowerCase();
  if(/英语|雅思|英美历史|english|ielts|history and culture of uk/.test(searchable))return 'english';
  if(/思想道德|中国近代史|马克思主义|体育|军事理论|心理健康|艺术体验/.test(event.title))return 'general';
  if(event.track)return 'uob';
  return 'jnu';
}

function retakeOptionKey(event:TimetableEvent){
  if(isElective(event))return `${event.year}:elective:${event.selectionKey||event.id}`;
  return `${event.year}:${event.title}:${event.groups?.slice().sort().join('+')||'all'}`;
}

function buildRetakeOptions(year:number,major:Major):RetakeOption[]{
  const grouped=new Map<string,RetakeOption>();
  timetableEvents.filter((event)=>event.year<year&&!event.listedOnly&&courseCategory(event)!=='uob'&&(event.majors==='all'||event.majors.includes(major))).forEach((event)=>{
    const key=retakeOptionKey(event);
    const current=grouped.get(key);
    if(current)current.events.push(event);
    else grouped.set(key,{key,year:event.year,title:event.title,english:event.english,groups:event.groups||[],events:[event]});
  });
  return Array.from(grouped.values()).sort((a,b)=>b.year-a.year||a.title.localeCompare(b.title,'zh-CN')||a.key.localeCompare(b.key));
}

function formatWeekList(weeks:number[]){
  if(!weeks.length)return '';
  const ranges:string[]=[]; let start=weeks[0]; let previous=weeks[0];
  for(const week of weeks.slice(1)){
    if(week===previous+1){previous=week;continue}
    ranges.push(start===previous?`${start}`:`${start}–${previous}`); start=previous=week;
  }
  ranges.push(start===previous?`${start}`:`${start}–${previous}`);
  return `第${ranges.join('、')}周`;
}

function audienceLabel(event:TimetableEvent){
  if(event.majors==='all')return '';
  const audience=new Set(event.majors);
  if(audience.size===2&&audience.has('MAM')&&audience.has('ICS'))return 'MAM/ICS';
  if(audience.size===2&&audience.has('Econ')&&audience.has('Stat'))return 'ECON/STAT';
  return '';
}

const degreeLabels:Record<DegreeTrack,string>={dual:'双学位',single:'单学位'};
const weekdayNames=['周一','周二','周三','周四','周五'];
const weekdayShort=['MON','TUE','WED','THU','FRI'];

type SavedPreferences={track:DegreeTrack;year:number;major:Major;classNo:number};

const preferencesKey='jbji-course-assistant:preferences:v1';
const retakesKey='jbji-course-assistant:retakes:v1';
const defaultPreferences:SavedPreferences={track:'dual',year:1,major:'MAM',classNo:1};

function loadPreferences():SavedPreferences{
  if(typeof window==='undefined')return defaultPreferences;
  try{
    const saved=JSON.parse(window.localStorage.getItem(preferencesKey)||'null') as Partial<SavedPreferences>|null;
    if(!saved||typeof saved!=='object')return defaultPreferences;
    return {
      track:saved.track==='dual'||saved.track==='single'?saved.track:defaultPreferences.track,
      year:typeof saved.year==='number'&&[1,2,3,4].includes(saved.year)?saved.year:defaultPreferences.year,
      major:typeof saved.major==='string'&&majors.some((item)=>item.id===saved.major)?saved.major as Major:defaultPreferences.major,
      classNo:typeof saved.classNo==='number'&&[1,2,3].includes(saved.classNo)?saved.classNo:defaultPreferences.classNo,
    };
  }catch{
    return defaultPreferences;
  }
}

function trackLabel(event:TimetableEvent){
  return event.track?degreeLabels[event.track]:'';
}

function uniqueValues(values:(string|undefined)[]){
  return Array.from(new Set(values.filter((value):value is string=>Boolean(value))));
}

function courseHeading(course:TimetableEvent){return course.shortTitle||course.title}
function courseSubtitle(course:TimetableEvent){return course.shortTitle?course.title.split(' · ')[0]:course.english}

function courseDetails(course:TimetableEvent,events:TimetableEvent[],major:Major){
  const related=events.filter((event)=>event.title===course.title);
  const teachers=uniqueValues(related.map((event)=>event.teacher));
  const rooms=uniqueValues(related.map((event)=>roomForMajor(event,major)));
  const weeks=uniqueValues(related.map((event)=>event.weeks));
  return [rooms.length&&`教室：${rooms.join(' / ')}`,weeks.length&&`周次：${weeks.join(' / ')}`,teachers.length&&`教师：${teachers.join(' / ')}`].filter(Boolean).join('\n');
}

function loadRetakes(){
  if(typeof window==='undefined')return [] as string[];
  try{const saved=JSON.parse(window.localStorage.getItem(retakesKey)||'[]');return Array.isArray(saved)?saved.filter((item):item is string=>typeof item==='string'):[]}
  catch{return []}
}

function courseScheduleDetails(course:TimetableEvent,events:TimetableEvent[]){
  return uniqueValues(events.filter((event)=>event.title===course.title).map((event)=>{
    const first=event.start+1; const last=event.start+event.span;
    return `${weekdayNames[event.day]} · 第${first}${last>first?`–${last}`:''}节`;
  })).join(' / ');
}

function downloadFile(url:string,fileName:string){
  const link=document.createElement('a');
  link.href=url; link.download=fileName; link.style.display='none';
  document.body.appendChild(link); link.click(); link.remove();
}

export default function App(){
  const [materials,setMaterials]=useState(()=>window.location.hash==='#materials');
  const scrollPosition=useRef(0);
  const showingMaterials=useRef(materials);
  useEffect(()=>{
    const remember=()=>{if(!showingMaterials.current)scrollPosition.current=window.scrollY};
    const update=()=>{
      const next=window.location.hash==='#materials';
      const returning=showingMaterials.current&&!next;
      showingMaterials.current=next; setMaterials(next);
      if(next)window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
      else if(returning)window.requestAnimationFrame(()=>window.scrollTo({top:scrollPosition.current,behavior:'instant'}));
    };
    window.addEventListener('scroll',remember,{passive:true});
    window.addEventListener('hashchange',update);
    return ()=>{window.removeEventListener('hashchange',update);window.removeEventListener('scroll',remember)};
  },[]);
  return <><div hidden={materials}><Home/></div>{materials&&<Materials/>}</>;
}

function Home(){
  const [savedPreferences]=useState(loadPreferences);
  const [track,setTrack]=useState<DegreeTrack>(savedPreferences.track); const [year,setYear]=useState(savedPreferences.year); const [major,setMajor]=useState<Major>(savedPreferences.major); const [classNo,setClassNo]=useState(savedPreferences.classNo);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [identityOpen,setIdentityOpen]=useState(()=>{try{return !window.localStorage.getItem(preferencesKey)}catch{return true}});
  const [mobileViewChoice,setMobileView]=useState<'day'|'week'|null>(null);
  const [now,setNow]=useState(()=>new Date());
  const academicState=useMemo(()=>getAcademicState(now),[now]);
  const todayIndex=(academicState.today.getUTCDay()+6)%7;
  const [mobileDay,setMobileDay]=useState(todayIndex);
  const [sidebarMode,setSidebarMode]=useState<SidebarMode>('current');
  const [selectedRetakeKeys,setSelectedRetakeKeys]=useState<string[]>(loadRetakes);
  const [previewRetakeKey,setPreviewRetakeKey]=useState<string|null>(null);
  const [electiveSelections,setElectiveSelections]=useState(()=>{try{return parseElectiveSelections(localStorage.getItem(electiveStorageKey))}catch{return {}}});
  const [previewElectiveKey,setPreviewElectiveKey]=useState<string|null>(null);
  const profile=electiveProfile(track,year,major,classNo);
  const hasElectives=year===2||year===4;
  useEffect(()=>{try{localStorage.setItem(electiveStorageKey,JSON.stringify(electiveSelections))}catch{/* Keep session selections when storage is unavailable. */}},[electiveSelections]);
  useEffect(()=>{setPreviewElectiveKey(null);setPreviewRetakeKey(null);setCourseQuery('');setSelectedCategory('all');setSelectedDay('all');setSidebarMode(year===2||year===4?'elective':'current')},[profile,year]);
  const selectedMajor=majors.find((item)=>item.id===major)!;
  const classCount=year===1?3:year===2?2:0;
  useEffect(()=>{if(classCount&&classNo>classCount)setClassNo(1)},[classCount,classNo]);
  useEffect(()=>{
    try{
      window.localStorage.setItem(preferencesKey,JSON.stringify({track,year,major,classNo} satisfies SavedPreferences));
    }catch{
      // Storage may be unavailable in private browsing or under restrictive browser settings.
    }
  },[track,year,major,classNo]);
  useEffect(()=>{
    try{window.localStorage.setItem(retakesKey,JSON.stringify(selectedRetakeKeys))}catch{/* Local storage may be unavailable. */}
  },[selectedRetakeKeys]);
  const filtered=useMemo(()=>coursesForProfile(timetableEvents,track,year,major,classNo),[track,year,major,classNo]);
  const electiveChoices=useMemo(()=>electiveOptions(filtered),[filtered]);
  const selectedElectiveKeys=(electiveSelections[profile]||[]).filter(key=>electiveChoices.some(option=>option.key===key));
  const scheduled=selectedSchedule(filtered,selectedElectiveKeys);
  const selectedElectiveIds=new Set(scheduled.filter(isElective).map(event=>event.id));
  const courses=useMemo(()=>Array.from(new Map(filtered.map((event)=>[event.title,event])).values()).sort((a,b)=>a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title,'zh-CN')),[filtered]);
  const groupLabel=classCount?`${selectedMajor.label}${classNo}`:selectedMajor.label;
  const scheduleRef=useRef<HTMLElement>(null);
  const [selectedDay,setSelectedDay]=useState<number|'all'>('all');
  const [selectedCategory,setSelectedCategory]=useState<CourseCategory|'all'>('all');
  const [courseQuery,setCourseQuery]=useState('');

  const defaultView=initialScheduleView(scheduled,academicState);
  const [weekChoice,setWeekChoice]=useState<{profile:string;week:number|'all'}|null>(null);
  const automaticWeek=weekChoice?.profile!==profile;
  const selectedWeek=automaticWeek?defaultView.week:weekChoice!.week;
  const isFirstWeekPreview=automaticWeek&&defaultView.preview;
  const mobileView=mobileViewChoice??(isFirstWeekPreview?'week':'day');
  function setSelectedWeek(week:number|'all'){setWeekChoice({profile,week})}

  const previousAcademic=useRef(academicState);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const refresh=()=>{
      clearTimeout(timer);
      const next=new Date();setNow(next);
      // Refresh on minute boundaries, including midnight; catch up after sleep/backgrounding.
      timer=setTimeout(refresh,60000-next.getTime()%60000);
    };
    const visible=()=>{if(document.visibilityState==='visible')refresh()};
    refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);
    return ()=>{clearTimeout(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)};
  },[]);
  useEffect(()=>{
    const previous=previousAcademic.current;
    if(previous.today.getTime()!==academicState.today.getTime()){
      const next=advanceCalendarView(previous,academicState,{week:selectedWeek,day:mobileDay,filterDay:selectedDay});
      if(next.week!==selectedWeek)setSelectedWeek(next.week);
      if(next.day!==mobileDay)setMobileDay(next.day);
      if(next.filterDay!==selectedDay)setSelectedDay(next.filterDay);
    }
    previousAcademic.current=academicState;
  },[academicState,selectedWeek,mobileDay,selectedDay]);
  const [retakeYear,setRetakeYear]=useState<number|'all'>('all');
  const [retakeCategory,setRetakeCategory]=useState<Exclude<CourseCategory,'uob'>|'all'>('all');
  const [retakeDay,setRetakeDay]=useState<number|'all'>('all');
  const [retakeQuery,setRetakeQuery]=useState('');
  const [exporting,setExporting]=useState<'png'|'pdf'|null>(null);
  const [exportMessage,setExportMessage]=useState('');
  const [exportDraft,setExportDraft]=useState<{lessons:ExportLesson[];days:{day:number;label:string;date:string}[];context:string;fileName:string}|null>(null);
  const [detailCourse,setDetailCourse]=useState<TimetableEvent|null>(null);
  const detailCloseRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!sidebarOpen||detailCourse)return;
    const drawerMedia=window.matchMedia('(max-width:1319px)');
    const panel=document.getElementById('course-panel');
    const previousFocus=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;
    const syncDrawer=()=>{
      document.body.style.overflow=drawerMedia.matches?'hidden':previousOverflow;
      if(drawerMedia.matches)panel?.querySelector<HTMLButtonElement>('.sheetClose')?.focus();
    };
    const handleKey=(event:KeyboardEvent)=>{
      if(!drawerMedia.matches)return;
      if(event.key==='Escape'){
        event.preventDefault();setSidebarOpen(false);setPreviewRetakeKey(null);setPreviewElectiveKey(null);
      }
      if(event.key==='Tab'&&panel){
        const controls=Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href],[tabindex="0"]')).filter(element=>element.getClientRects().length>0);
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
    };
    syncDrawer();
    drawerMedia.addEventListener('change',syncDrawer);
    window.addEventListener('keydown',handleKey);
    return ()=>{
      document.body.style.overflow=previousOverflow;
      drawerMedia.removeEventListener('change',syncDrawer);
      window.removeEventListener('keydown',handleKey);
      previousFocus?.focus();
    };
  },[sidebarOpen,detailCourse]);
  useEffect(()=>{
    if(!detailCourse)return;
    detailCloseRef.current?.focus();
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setDetailCourse(null)};
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    window.addEventListener('keydown',closeOnEscape);
    return ()=>{
      document.body.style.overflow=previousOverflow;
      window.removeEventListener('keydown',closeOnEscape);
    };
  },[detailCourse]);
  const retakeOptions=useMemo(()=>buildRetakeOptions(year,major),[year,major]);
  const activeSelectedOptions=retakeOptions.filter((option)=>selectedRetakeKeys.includes(option.key));
  const selectedRetakeEvents:DisplayEvent[]=activeSelectedOptions.flatMap((option)=>option.events.map((event)=>({...event,displaySource:'retake' as const,retakeKey:option.key})));
  const dailySchedule=getDailySchedule([...scheduled,...selectedRetakeEvents],now,times);
  const previewOption=previewRetakeKey&&!selectedRetakeKeys.includes(previewRetakeKey)?retakeOptions.find((option)=>option.key===previewRetakeKey):undefined;
  const previewRetakeEvents:DisplayEvent[]=previewOption?previewOption.events.map((event)=>({...event,displaySource:'preview' as const,retakeKey:previewOption.key})):[];
  const conflicts=detectConflicts(scheduled,selectedRetakeEvents,selectedElectiveIds).filter(issue=>selectedWeek==='all'||issue.weeks.includes(selectedWeek));
  const electivePreview=electiveChoices.find(option=>option.key===previewElectiveKey&&!selectedElectiveKeys.includes(option.key));
  const hardConflictEventIds=new Set(conflicts.filter((conflict)=>conflict.severity==='hard').flatMap((conflict)=>[conflict.first.id,conflict.second.id]));
  const partialConflictEventIds=new Set(conflicts.filter((conflict)=>conflict.severity==='partial').flatMap((conflict)=>[conflict.first.id,conflict.second.id]));
  const displayedDays=selectedDay==='all'?[0,1,2,3,4]:[selectedDay];
  const normalizedQuery=courseQuery.trim().toLocaleLowerCase('zh-CN');
  const matchingEvents=scheduled.filter((event)=>{
    if(selectedWeek!=='all'&&!weekNumbers(event.weeks).has(selectedWeek))return false;
    if(selectedDay!=='all'&&event.day!==selectedDay)return false;
    if(sidebarMode==='current'&&selectedCategory!=='all'&&courseCategory(event)!==selectedCategory)return false;
    if(sidebarMode==='current'&&normalizedQuery&&!`${event.title} ${event.english||''}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery))return false;
    return true;
  });
  const visibleRetakeEvents=selectedRetakeEvents.filter((event)=>{
    if(selectedWeek!=='all'&&!weekNumbers(event.weeks).has(selectedWeek))return false;
    if(selectedDay!=='all'&&event.day!==selectedDay)return false;
    if(sidebarMode==='current'&&selectedCategory!=='all'&&courseCategory(event)!==selectedCategory)return false;
    if(sidebarMode==='current'&&normalizedQuery&&!`${event.title} ${event.english||''}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery))return false;
    return true;
  });
  const visiblePreviewEvents=[...previewRetakeEvents,...(electivePreview?.events.filter(event=>!event.listedOnly).map(event=>({...event,displaySource:'preview' as const}))||[])].filter((event)=>(selectedWeek==='all'||weekNumbers(event.weeks).has(selectedWeek))&&(selectedDay==='all'||event.day===selectedDay));
  const displayedEvents=arrange([...matchingEvents.map((event)=>({...event,displaySource:'base' as const})),...visibleRetakeEvents,...visiblePreviewEvents]);
  const sidebarCourses=Array.from(new Map(matchingEvents.map((event)=>[event.title,event])).values()).sort((a,b)=>a.title.localeCompare(b.title,'zh-CN'));
  const normalizedRetakeQuery=retakeQuery.trim().toLocaleLowerCase('zh-CN');
  const availableRetakeYears=Array.from(new Set(retakeOptions.map((option)=>option.year))).sort((a,b)=>b-a);
  const visibleRetakeOptions=retakeOptions.filter((option)=>{
    if(retakeYear!=='all'&&option.year!==retakeYear)return false;
    if(retakeCategory!=='all'&&courseCategory(option.events[0])!==retakeCategory)return false;
    if(retakeDay!=='all'&&!option.events.some((event)=>event.day===retakeDay))return false;
    if(normalizedRetakeQuery&&!`${option.title} ${option.english||''} ${option.groups.join(' ')}`.toLocaleLowerCase('zh-CN').includes(normalizedRetakeQuery))return false;
    return true;
  });
  const activeFilterLabel=[selectedWeek==='all'?'':`第${selectedWeek}周`,selectedDay==='all'?'':weekdayNames[selectedDay],selectedCategory==='all'?'':categoryLabels[selectedCategory],courseQuery.trim()].filter(Boolean).join('-');
  const exportFileName=`JBJI-${degreeLabels[track]}-大${['一','二','三','四'][year-1]}-${selectedMajor.label}${classCount?`-${classNo}班`:''}${activeSelectedOptions.length?`-含${activeSelectedOptions.length}门重修`:''}${activeFilterLabel?`-${activeFilterLabel}`:''}-2026-27第一学期`;
  const calendarStatus=academicState.phase==='before'?`距离学生开课还有 ${academicState.daysUntilStart} 天`:academicState.phase==='teaching'?`当前为第 ${academicState.currentWeek} 教学周`:academicState.phase==='review'?`当前为第 ${academicState.currentWeek} 周 · 复习考试阶段`:academicState.phase==='between'?'第一学期教学与考试已结束':'当前为寒假';
  const selectedWeekIsReview=selectedWeek!=='all'&&academicCalendar.reviewExamWeeks.includes(selectedWeek as 17|18|19|20);

  function changeSidebarMode(mode:SidebarMode){
    setSidebarMode(mode); setPreviewRetakeKey(null);setPreviewElectiveKey(null);
    if(mode!=='current'){setSelectedDay('all');setSelectedCategory('all');setCourseQuery('')}
  }

  function chooseElective(option:ElectiveOption){
    setElectiveSelections(current=>({...current,[profile]:toggleElective(current[profile]||[],option,electiveChoices)}));
    setPreviewElectiveKey(null);
  }
  function electiveConflicts(option:ElectiveOption){
    const alternativeIds=new Set(electiveChoices.filter(item=>item.courseKey===option.courseKey).flatMap(item=>item.events.map(event=>event.id)));
    const candidateIds=new Set(option.events.map(event=>event.id));
    return detectConflicts([...scheduled.filter(event=>!alternativeIds.has(event.id)),...option.events],selectedRetakeEvents,new Set([...selectedElectiveIds,...candidateIds])).filter(issue=>candidateIds.has(issue.first.id)||candidateIds.has(issue.second.id));
  }
  function openElectives(){setSidebarOpen(true);changeSidebarMode('elective')}
  function previewElective(option:ElectiveOption){
    setPreviewElectiveKey(option.key);setPreviewRetakeKey(null);setSelectedDay('all');
    if(window.matchMedia('(max-width:700px)').matches){setMobileView('week');setSidebarOpen(false)}
  }

  function toggleRetake(option:RetakeOption){
    setSelectedRetakeKeys((current)=>current.includes(option.key)?current.filter((key)=>key!==option.key):[...current,option.key]);
    setPreviewRetakeKey(null);
  }

  function optionConflicts(option:RetakeOption){
    const otherSelected=selectedRetakeEvents.filter((event)=>event.retakeKey!==option.key);
    const candidate=option.events.map((event)=>({...event,displaySource:'retake' as const,retakeKey:option.key}));
    const candidateIds=new Set(candidate.map((event)=>event.id));
    return detectConflicts(scheduled,[...otherSelected,...candidate],selectedElectiveIds).filter((conflict)=>candidateIds.has(conflict.first.id)||candidateIds.has(conflict.second.id));
  }

  function showCurrentWeek(){
    if(!academicState.currentWeek)return;
    setSelectedWeek(academicState.currentWeek); setSelectedDay('all'); setSidebarMode('current');
  }

  function showToday(){
    if(!academicState.currentWeek)return;
    setSelectedWeek(academicState.currentWeek);setSelectedDay(academicState.weekday??'all');setMobileDay(todayIndex);setMobileView('day');setSidebarMode('current');setSelectedCategory('all');setCourseQuery('');
  }

  async function renderScheduleCanvas(source:HTMLElement|null=scheduleRef.current,personal=false){
    if(!source)throw new Error('找不到课表区域');
    await document.fonts?.ready;
    const clone=source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.editorSelected').forEach(element=>element.classList.remove('editorSelected'));
    clone.classList.add('exportLayout');
    clone.querySelectorAll('.previewBlock').forEach(element=>element.remove());
    const exportEvents=personal?[]:arrange(displayedEvents.filter(event=>event.displaySource!=='preview'));
    clone.querySelectorAll<HTMLElement>('.courseBlock').forEach(element=>{
      const event=exportEvents.find(item=>item.id===element.dataset.eventId);
      if(event){element.style.width=`calc((100% - 6px) / ${event.laneCount})`;element.style.marginLeft=`calc(${event.lane} * (100% / ${event.laneCount}) + 3px)`}
    });
    clone.querySelectorAll<HTMLElement>('[data-export-exclude]').forEach((element)=>element.remove());
    clone.querySelectorAll<HTMLElement>('[data-export-only]').forEach((element)=>{element.style.display='block'});
    Object.assign(clone.style,{position:'fixed',left:'-10000px',top:'0',width:'1240px',maxWidth:'none',margin:'0',boxShadow:'none',zIndex:'-1'});
    const scheduleBody=clone.querySelector<HTMLElement>('.scheduleBody');
    if(scheduleBody)scheduleBody.style.gridTemplateColumns='1fr';
    const tableScroll=clone.querySelector<HTMLElement>('.tableScroll');
    if(tableScroll){tableScroll.style.overflow='visible';tableScroll.style.maxHeight='none';}
    const timetable=clone.querySelector<HTMLElement>('.timetable');
    if(timetable)timetable.style.gridTemplateRows='52px repeat(12,minmax(80px,auto))';
    document.body.appendChild(clone);
    try{
      // Resolve intrinsic dimensions explicitly: canvas renderers may ignore object-fit.
      await Promise.all(Array.from(clone.querySelectorAll<HTMLImageElement>('img')).map(async(image)=>{
        await image.decode();
        if(!image.naturalWidth||!image.naturalHeight)throw new Error('图片尚未加载完成');
        const height=360;
        image.style.width=`${height*image.naturalWidth/image.naturalHeight}px`;
        image.style.height=`${height}px`;
        image.style.maxWidth='none';
      }));
      const {default:html2canvas}=await import('html2canvas');
      return await html2canvas(clone,{backgroundColor:'#ffffff',scale:3,useCORS:true,logging:false,windowWidth:1440});
    }finally{
      clone.remove();
    }
  }

  async function exportSchedule(format:'png'|'pdf',source?:HTMLElement,personal=false){
    const filename=personal?`${exportDraft?.fileName||exportFileName}-个人编辑版`:exportFileName;
    setExporting(format); setExportMessage(format==='png'?'正在生成图片…':'正在生成 PDF…');
    try{
      const canvas=await renderScheduleCanvas(source,personal);
      if(format==='png'){
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob((value)=>value?resolve(value):reject(new Error('图片生成失败')),'image/png'));
        const url=URL.createObjectURL(blob);
        downloadFile(url,`${filename}.png`); URL.revokeObjectURL(url);
      }else{
        const {jsPDF}=await import('jspdf');
        const landscape=canvas.width>=canvas.height;
        const pdf=new jsPDF({orientation:landscape?'landscape':'portrait',unit:'mm',format:'a4',compress:true});
        const pageWidth=pdf.internal.pageSize.getWidth(); const pageHeight=pdf.internal.pageSize.getHeight(); const margin=8;
        const ratio=Math.min((pageWidth-margin*2)/canvas.width,(pageHeight-margin*2)/canvas.height);
        const width=canvas.width*ratio; const height=canvas.height*ratio;
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',(pageWidth-width)/2,(pageHeight-height)/2,width,height,undefined,'FAST');
        pdf.save(`${filename}.pdf`);
      }
      setExportMessage(format==='png'?'图片已导出':'PDF 已导出');
    }catch(error){
      console.error(error); setExportMessage('导出失败，请稍后重试');
    }finally{
      setExporting(null);
    }
  }

  function openExportEditor(){
    const lessons=arrange(displayedEvents.filter(event=>event.displaySource!=='preview')).map(event=>({
      id:event.id,group:`${event.year}:${event.courseKey||event.title}`,title:courseHeading(event),subtitle:event.shortTitle&&event.span>1?courseSubtitle(event):undefined,
      room:roomForMajor(event,major),teacher:event.teacher||'',note:'',weeks:event.weeks||'按学期安排',
      day:event.day,start:event.start,span:event.span,lane:event.lane,laneCount:event.laneCount,
      category:courseCategory(event),categoryLabel:`${event.displaySource==='retake'?'重修 · ':isElective(event)?'选修 · ':''}${categoryLabels[courseCategory(event)]}${event.note?' · '+event.note:''}`
    }));
    if(!lessons.length)return;
    setExportMessage('');
    setExportDraft({lessons,days:displayedDays.map(day=>({day,label:weekdayNames[day],date:selectedWeek==='all'?weekdayShort[day]:formatShortDate(dateForWeekDay(selectedWeek,day))})),
      context:`2026–27 第一学期 · 大${['一','二','三','四'][year-1]} · ${selectedMajor.name}${classCount?' '+classNo+' 班':''} · ${degreeLabels[track]} · ${selectedWeek==='all'?'整学期':`第 ${selectedWeek} 周 · ${weekDateRange(selectedWeek)}`}${selectedDay!=='all'?' · '+weekdayNames[selectedDay]:''}${courseQuery||selectedCategory!=='all'?' · 已应用课程筛选':''}`,fileName:exportFileName});
  }

  function feedbackUrl(course?:TimetableEvent){
    return timetableFeedbackUrl({profile:`${degreeLabels[track]} · 大${['一','二','三','四'][year-1]} · ${selectedMajor.name}${classCount?' '+classNo+' 班':''}`,week:selectedWeek==='all'?'整学期':`第 ${selectedWeek} 周`,major,course});
  }

  function openCourseDetails(course:TimetableEvent){
    setDetailCourse(course);
  }

  function renderEmpty(day?:number){
    if(year===4&&!selectedElectiveKeys.length&&!selectedRetakeEvents.length)return <div className="emptyState"><strong>尚未添加选修课</strong><p>点击下方按钮，添加本学期课程。</p><button onClick={openElectives}>选择课程</button></div>;
    const info=emptyScheduleMessage([...scheduled,...selectedRetakeEvents],selectedWeek,day);
    const activate=()=>{
      setSelectedDay('all');setSelectedCategory('all');setCourseQuery('');
      if(info.action==='start'&&info.firstWeek!==null)setSelectedWeek(info.firstWeek);
      if(info.action==='semester')setSelectedWeek('all');
      if(info.action==='week')setMobileView('week');
    };
    return <div className="emptyState"><img src="./jbji-nailong-guardian.png" alt=""/><strong>{info.title}</strong><p>{info.detail}</p><button onClick={activate}>{info.action==='start'?`查看第 ${info.firstWeek} 周`:info.action==='semester'?'查看整学期':info.action==='week'?'查看本周':'清除筛选'}</button></div>;
  }

  return <main className={`mobileView-${mobileView}`}>
    <header className="topbar" id="top"><a className="brand" href="#top" aria-label="JBJI课表助手首页"><span className="brandMark"><img className="brandLogo" src="./jbji-logo.png" alt="暨南大学与伯明翰大学院徽"/></span><span className="brandCopy"><strong>JBJI 课表助手</strong><small>2026–27 第一学期</small></span></a><nav className="topLinks"><ThemePicker/><a href="#materials">原始资料</a><a href="#help">帮助</a><a href="https://github.com/miraeina/jbji-course-assistant" target="_blank" rel="noreferrer">GitHub ↗</a><a className="mascotDownload" href={`${import.meta.env.BASE_URL}jbji-nailong-guardian.png`} download="暨伯奶龙.png" title="下载奶龙原图（PNG）">JBJI奶龙 <span aria-hidden="true">↓</span></a></nav></header>
    <button className="identityToggle mobileOnly" aria-expanded={identityOpen} aria-controls="identity-filters" onClick={()=>setIdentityOpen(!identityOpen)}>{degreeLabels[track]} · 大{['一','二','三','四'][year-1]} · {groupLabel}<span>{identityOpen?'收起':'切换'}⌄</span></button>
    <section id="identity-filters" className={`filterPanel ${identityOpen?'identityOpen':'identityClosed'}`} aria-label="课表筛选">
      <div className="filterGroup trackGroup"><span>学位</span><div className="segmented">{(['dual','single'] as DegreeTrack[]).map((item)=><button key={item} className={track===item?'active':''} onClick={()=>setTrack(item)}>{degreeLabels[item]}</button>)}</div></div>
      <div className="filterGroup"><span>年级</span><div className="segmented">{[1,2,3,4].map((item)=><button key={item} className={year===item?'active':''} onClick={()=>setYear(item)}>大{['一','二','三','四'][item-1]}</button>)}</div></div>
      <div className="filterGroup majorGroup"><span>专业</span><div className="segmented">{majors.map((item)=><button key={item.id} className={major===item.id?'active':''} onClick={()=>setMajor(item.id)}><b>{item.label}</b><small>{item.name}</small></button>)}</div></div>
      {classCount>0&&<div className="filterGroup classGroup"><span>班级</span><div className="segmented">{Array.from({length:classCount},(_,i)=>i+1).map((item)=><button key={item} className={classNo===item?'active':''} onClick={()=>setClassNo(item)}>{item} 班</button>)}</div></div>}
      <button className="identityDone mobileOnly" onClick={()=>setIdentityOpen(false)}>查看课表</button>
    </section>
    {sidebarOpen&&<button className="sheetBackdrop mobileOnly" aria-label="关闭课程面板" onClick={()=>{setSidebarOpen(false);setPreviewRetakeKey(null);setPreviewElectiveKey(null)}}/>}
    <section className="scheduleSection" ref={scheduleRef}><p className="exportContext" data-export-only>{academicCalendar.academicYear} 学年第一学期 · {degreeLabels[track]} · 大{['一','二','三','四'][year-1]} · {selectedMajor.name}{classCount?` · ${classNo} 班`:''}<br/>{selectedWeek==='all'?'整学期':`第 ${selectedWeek} 周 · ${weekDateRange(selectedWeek)}`}{selectedDay!=='all'?` · ${weekdayNames[selectedDay]}`:''}{courseQuery||selectedCategory!=='all'?' · 已应用课程筛选':''}{hasElectives?` · 已选 ${selectedElectiveKeys.length} 门选修`:''}</p><div className={`scheduleBody ${sidebarOpen?"sidebarOpen":"sidebarClosed"}`}>
      <aside hidden={!sidebarOpen} id="course-panel" className="courseSidebar" aria-label="浏览和筛选课程" data-export-exclude>
        <button className="sheetClose mobileOnly" onClick={()=>{setSidebarOpen(false);setPreviewRetakeKey(null);setPreviewElectiveKey(null)}}>完成</button>
        <div className="sidebarHead sidebarTabs" role="tablist" aria-label="课程面板">
          {hasElectives&&<button role="tab" aria-selected={sidebarMode==='elective'} className={sidebarMode==='elective'?'active':''} onClick={()=>changeSidebarMode('elective')}>选修课<span>{selectedElectiveKeys.length}</span></button>}
          <button role="tab" aria-selected={sidebarMode==='current'} className={sidebarMode==='current'?'active':''} onClick={()=>changeSidebarMode('current')}>本学期课程<span>{sidebarCourses.length}</span></button>
          <button role="tab" aria-selected={sidebarMode==='retake'} className={sidebarMode==='retake'?'active':''} onClick={()=>changeSidebarMode('retake')}>重修课程<span>{activeSelectedOptions.length}</span></button>
        </div>
        <div className="sidebarPanel">
          {sidebarMode==='elective'&&hasElectives?<ElectivePanel key={profile} options={electiveChoices} selected={selectedElectiveKeys} year={year} issuesFor={electiveConflicts} onToggle={chooseElective} onPreview={previewElective} onDetails={course=>openCourseDetails(course)}/>:sidebarMode==='current'?<>
            <label className="courseSearch" htmlFor="course-search"><span>搜索课程</span><input id="course-search" type="search" value={courseQuery} onChange={(event)=>setCourseQuery(event.target.value)} placeholder="搜索中文名或英文名" autoComplete="off"/></label>
            <div className="sidebarFilter"><span>课程类别</span><div className="filterPills"><button className={selectedCategory==='all'?'active':''} aria-pressed={selectedCategory==='all'} onClick={()=>setSelectedCategory('all')}>全部</button>{(Object.keys(categoryLabels) as CourseCategory[]).map((category)=><button className={selectedCategory===category?'active':''} aria-pressed={selectedCategory===category} onClick={()=>setSelectedCategory(category)} key={category}>{categoryLabels[category]}</button>)}</div></div>
            <div className="sidebarFilter"><span>上课日</span><div className="filterPills"><button className={selectedDay==='all'?'active':''} aria-pressed={selectedDay==='all'} onClick={()=>setSelectedDay('all')}>全部</button>{weekdayNames.map((day,index)=><button className={selectedDay===index?'active':''} aria-pressed={selectedDay===index} onClick={()=>setSelectedDay(index)} key={day}>{['一','二','三','四','五'][index]}</button>)}</div></div>
            {(selectedDay!=='all'||selectedCategory!=='all'||courseQuery)&&<button className="clearFilters" onClick={()=>{setSelectedDay('all');setSelectedCategory('all');setCourseQuery('')}}>清除全部筛选</button>}
            <div className="sidebarCourseList" aria-live="polite">{sidebarCourses.map((course)=><button className={`sidebarCourseCard category-${courseCategory(course)} ${normalizedQuery===course.title.toLocaleLowerCase('zh-CN')?'selected':''}`} onClick={()=>setCourseQuery(course.title)} key={course.title}><span>{categoryLabels[courseCategory(course)]}{audienceLabel(course)&&` · ${audienceLabel(course)}`}</span><strong>{courseHeading(course)}</strong>{courseSubtitle(course)&&<small>{courseSubtitle(course)}</small>}<em>{courseScheduleDetails(course,matchingEvents)}</em><i>教室：{roomForMajor(course,major)}</i></button>)}{sidebarCourses.length===0&&<p className="sidebarEmpty">没有符合条件的课程</p>}</div>
          </>:<>
            <div className="retakeIntro"><strong>添加重修课</strong><p>按今年低年级课表安排；仅提供暨大课程。</p></div>
            <label className="courseSearch" htmlFor="retake-search"><span>搜索重修课程</span><input id="retake-search" type="search" value={retakeQuery} onChange={(event)=>setRetakeQuery(event.target.value)} placeholder="搜索课程名称或班组" autoComplete="off"/></label>
            <div className="sidebarFilter"><span>原课程年级</span><div className="filterPills"><button className={retakeYear==='all'?'active':''} aria-pressed={retakeYear==='all'} onClick={()=>setRetakeYear('all')}>全部</button>{availableRetakeYears.map((item)=><button className={retakeYear===item?'active':''} aria-pressed={retakeYear===item} onClick={()=>setRetakeYear(item)} key={item}>大{['一','二','三','四'][item-1]}</button>)}</div></div>
            <div className="sidebarFilter"><span>课程类别</span><div className="filterPills"><button className={retakeCategory==='all'?'active':''} aria-pressed={retakeCategory==='all'} onClick={()=>setRetakeCategory('all')}>全部</button>{(['jnu','english','general'] as const).map((category)=><button className={retakeCategory===category?'active':''} aria-pressed={retakeCategory===category} onClick={()=>setRetakeCategory(category)} key={category}>{categoryLabels[category]}</button>)}</div></div>
            <div className="sidebarFilter"><span>上课日</span><div className="filterPills"><button className={retakeDay==='all'?'active':''} aria-pressed={retakeDay==='all'} onClick={()=>setRetakeDay('all')}>全部</button>{weekdayNames.map((day,index)=><button className={retakeDay===index?'active':''} aria-pressed={retakeDay===index} onClick={()=>setRetakeDay(index)} key={day}>{['一','二','三','四','五'][index]}</button>)}</div></div>
            {(retakeYear!=='all'||retakeCategory!=='all'||retakeDay!=='all'||retakeQuery)&&<button className="clearFilters" onClick={()=>{setRetakeYear('all');setRetakeCategory('all');setRetakeDay('all');setRetakeQuery('')}}>清除重修筛选</button>}
            <div className="sidebarCourseList retakeCourseList" aria-live="polite">{visibleRetakeOptions.map((option)=>{
              const optionIssues=optionConflicts(option); const selected=selectedRetakeKeys.includes(option.key); const hasHard=optionIssues.some((issue)=>issue.severity==='hard'); const status=hasHard?'hard':optionIssues.length?'partial':'safe';
              return <article className={`retakeCourseCard category-${courseCategory(option.events[0])} ${selected?'selected':''} ${status==='hard'?'hasHardConflict':status==='partial'?'hasPartialConflict':''}`} onMouseEnter={()=>setPreviewRetakeKey(option.key)} onMouseLeave={()=>setPreviewRetakeKey(null)} key={option.key}>
                <span>重修大{['一','二','三','四'][option.year-1]} · {categoryLabels[courseCategory(option.events[0])]}{option.groups.length?` · ${option.groups.join(' / ')}`:''}</span><strong>{option.title}</strong>{option.english&&<small>{option.english}</small>}<em>{courseScheduleDetails(option.events[0],option.events)}</em><i>{uniqueValues(option.events.map((event)=>roomForMajor(event,major))).length?`教室：${uniqueValues(option.events.map((event)=>roomForMajor(event,major))).join(' / ')}`:'教室待定'}</i>
                <div className="retakeCardFooter"><span className={`conflictStatus ${status}`}>{status==='hard'?`${optionIssues.length} 处冲突`:status==='partial'?`${optionIssues.length} 处部分冲突`:'无冲突'}</span><button onClick={()=>toggleRetake(option)}>{selected?'移除':'加入课表'}</button></div>
              </article>;
            })}{visibleRetakeOptions.length===0&&<p className="sidebarEmpty">{year===1?'大一暂无可重修的往年课程':'没有符合条件的重修课程'}</p>}</div>
          </>}
        </div>
      </aside>
      <div className="timetablePanel"><div className="sectionHead"><div><h2>我的课表</h2><p className="scheduleIdentity">大{['一','二','三','四'][year-1]} · {selectedMajor.name}{classCount?` ${classNo} 班`:''} · {degreeLabels[track]}</p></div><div className="sectionTools"><div className="panelActions" data-export-exclude>{hasElectives&&<button className="electivePrimary" aria-controls="course-panel" onClick={openElectives}>{year===2?'英语选课':'选择课程'} · {selectedElectiveKeys.length}</button>}<button aria-expanded={sidebarOpen} aria-controls="course-panel" onClick={()=>{setSidebarOpen(!sidebarOpen);changeSidebarMode('current');setCourseQuery('');setSelectedCategory('all');setSelectedDay('all');setPreviewRetakeKey(null)}}>{sidebarOpen?'收起':'查课'}</button>{year>1&&<button onClick={()=>{setSidebarOpen(true);changeSidebarMode('retake')}}>重修{activeSelectedOptions.length?` · ${activeSelectedOptions.length}`:''}</button>}</div><div className="exportActions" data-export-exclude><details className="exportMenu"><summary>导出课表</summary><div><button disabled={exporting!==null||(!scheduled.length&&!selectedRetakeEvents.length)} onClick={()=>exportSchedule('png')}>{exporting==='png'?'生成中…':'导出图片'}</button><button disabled={exporting!==null||(!scheduled.length&&!selectedRetakeEvents.length)} onClick={()=>exportSchedule('pdf')}>{exporting==='pdf'?'生成中…':'导出 PDF'}</button><button disabled={exporting!==null||!displayedEvents.some(event=>event.displaySource!=='preview')} onClick={event=>{event.currentTarget.closest('details')?.removeAttribute('open');openExportEditor()}}>编辑后导出</button></div></details><span className="exportStatus" role="status" aria-live="polite">{exportMessage}</span></div></div></div>
    <section className="calendarPanel" aria-label="校历与教学周" data-export-exclude>
      <div className="calendarStatus"><strong>{calendarStatus}</strong>{isFirstWeekPreview&&<small className="firstWeekHint">课程从第 {defaultView.firstWeek} 周开始，已显示首个有课周。</small>}{selectedWeekIsReview&&<small>所选周为复习考试周</small>}</div>
      <div className="calendarControls">
        <button aria-label="上一周" disabled={selectedWeek==='all'||selectedWeek<=1} onClick={()=>{if(selectedWeek!=='all'){setSelectedWeek(selectedWeek-1);setSelectedDay('all')}}}>‹</button><label htmlFor="week-select"><span>查看周次</span><select aria-label="查看周次" id="week-select" value={selectedWeek} onChange={(event)=>{setSelectedWeek(event.target.value==='all'?'all':Number(event.target.value));setSelectedDay('all')}}><option value="all">整学期</option>{Array.from({length:academicCalendar.totalWeeks},(_,index)=>index+1).map((week)=><option value={week} key={week}>第 {week} 周 · {formatShortDate(dateForWeekDay(week,-1))}–{formatShortDate(dateForWeekDay(week,5))}</option>)}</select></label><button aria-label="下一周" disabled={selectedWeek==='all'||selectedWeek>=academicCalendar.totalWeeks} onClick={()=>{if(selectedWeek!=='all'){setSelectedWeek(selectedWeek+1);setSelectedDay('all')}}}>›</button>
        <button onClick={showCurrentWeek} disabled={!academicState.currentWeek}>本周</button><button className="primary" onClick={showToday} disabled={!academicState.currentWeek||academicState.weekday===null}>今天</button>
      </div>
    </section>
    <div className="scheduleMeta">
    <div className="legend"><span><i className="dot uob"/>{categoryLabels.uob}</span><span><i className="dot jnu"/>{categoryLabels.jnu}</span><span><i className="dot english"/>{categoryLabels.english}</span><span><i className="dot general"/>通识课</span></div>
    <details className="todayPanel" data-export-exclude>
      <summary>{formatCalendarDate(academicState.today)} · 今天{dailySchedule.today.length?` ${dailySchedule.today.length} 堂课`:'没课'}<span>查看今日安排</span></summary>
      <div className="nextLesson">{[{label:'正在上课',items:dailySchedule.active},{label:'下一节课',items:dailySchedule.next}].filter(group=>group.items.length).map(group=><div className="lessonGroup" key={group.label}><span>{group.label}</span>{group.items.map(item=><button key={item.event.id} onClick={()=>openCourseDetails(item.event)}><strong>{courseHeading(item.event)}</strong><small>{formatCalendarDate(item.date)} · {times[item.event.start][1]}–{times[item.event.start+item.event.span-1][2]} · {roomForMajor(item.event,major)}</small></button>)}</div>)}{!dailySchedule.active.length&&!dailySchedule.next.length&&<p>暂无后续课程</p>}</div>
    </details>
    </div>
    <div className="mobileNavigation mobileOnly">
      <div className="viewSwitch"><button aria-pressed={mobileView==='day'} onClick={()=>{setMobileView('day');setSelectedDay('all')}}>日</button><button aria-pressed={mobileView==='week'} onClick={()=>{setMobileView('week');setSelectedDay('all')}}>周</button><button onClick={()=>{showCurrentWeek();setMobileDay(todayIndex);setMobileView('day')}}>回到今天</button></div>
      {mobileView==='day'&&<div className="dayPicker" aria-label="选择星期">{['一','二','三','四','五','六','日'].map((name,day)=><button key={day} aria-pressed={mobileDay===day} onClick={()=>{setMobileDay(day);setSelectedDay('all')}}><span>{name}{day===todayIndex&&selectedWeek===academicState.currentWeek?' · 今':''}</span><small>{selectedWeek==='all'?'':formatShortDate(dateForWeekDay(selectedWeek,day===6?-1:day))}</small></button>)}</div>}
    </div>
      {hasElectives&&!selectedElectiveKeys.length&&<p className="electiveHint" data-export-exclude>{year===2?'英语课需自行添加，点击“英语选课”选择。':'点击“选择课程”添加本学期选修课。'}</p>}
      {electivePreview&&<div className="electivePreviewNotice" data-export-exclude><span>正在预览：{electivePreview.events[0].title}<small>预览中，尚未加入。{selectedWeek!=='all'&&!electivePreview.events.some(event=>weekNumbers(event.weeks).has(selectedWeek))?'本周无课，可查看整学期。':''}</small></span><button onClick={()=>chooseElective(electivePreview)}>加入课表</button><button onClick={()=>setPreviewElectiveKey(null)}>结束预览</button></div>}
      <div hidden={!conflicts.length} className={`conflictSummary ${conflicts.length?'hasConflicts':'clear'}`}>
        <div className="conflictSummaryLead"><strong>{conflicts.length?`发现 ${conflicts.length} 处课程冲突`:activeSelectedOptions.length?'已加入的重修课程暂无冲突':'尚未加入重修课程'}</strong><span>{conflicts.length?'红色表示整段冲突，橙色表示部分节次或部分周次重叠。':activeSelectedOptions.length?`当前已加入 ${activeSelectedOptions.length} 门重修课程。`:'可在左侧“重修课程”中选择低年级课程。'}</span></div>
        {conflicts.length>0&&<div className="conflictList">{conflicts.map((conflict)=><button key={conflict.key} className={conflict.severity} onClick={()=>setSelectedDay(conflict.day)}><b>{courseHeading(conflict.first)} × {courseHeading(conflict.second)}</b><span>{weekdayNames[conflict.day]} · 第{conflict.firstSession}{conflict.lastSession>conflict.firstSession?`–${conflict.lastSession}`:''}节 · {formatWeekList(conflict.weeks)}</span></button>)}</div>}
      </div>
      {selectedWeek==='all'&&displayedEvents.length>0&&<p className="semesterHint">并排课程可能分周上课，请留意周次。</p>}
      <div className="dayAgenda mobileOnly" data-export-exclude>
        <h3>{selectedWeek==='all'?'整学期':`第 ${selectedWeek} 周`} · 周{['一','二','三','四','五','六','日'][mobileDay]}</h3>
        {displayedEvents.filter(event=>event.day===mobileDay&&event.displaySource!=='preview').sort((a,b)=>a.start-b.start).map(event=><button key={`${event.displaySource}-${event.id}`} className={`agendaCard category-${courseCategory(event)} ${hardConflictEventIds.has(event.id)?'agendaConflict':partialConflictEventIds.has(event.id)?'agendaPartial':''}`} onClick={()=>openCourseDetails(event)}><span className="agendaTime">{times[event.start]?.[1]}<small>{times[event.start+event.span-1]?.[2]||'结束时间待确认'}</small></span><span><strong>{courseHeading(event)}</strong>{event.shortTitle&&<small>{courseSubtitle(event)}</small>}<small className="agendaRoom">教室：{roomForMajor(event,major)}</small><small className="agendaWeeks">周次：{event.weeks||'按学期安排'}</small>{event.teacher&&<small className="agendaTeacher">教师：{event.teacher}</small>}<small>{event.displaySource==='retake'?'重修 · ':isElective(event)?'选修 · ':''}{hardConflictEventIds.has(event.id)?'课程冲突':partialConflictEventIds.has(event.id)?'部分冲突':categoryLabels[courseCategory(event)]}</small></span></button>)}
        {!displayedEvents.some(event=>event.day===mobileDay&&event.displaySource!=='preview')&&renderEmpty(mobileDay)}
      </div>
      <div className="scheduleContent"><div className="tableScroll" hidden={displayedEvents.length===0}><div className="timetable" style={{gridTemplateColumns:displayedDays.length===1?'72px minmax(0,1fr)':'72px repeat(5,minmax(0,1fr))',minWidth:displayedDays.length===1?'360px':'900px'}}><div className="corner">节次</div>{displayedDays.map((day,index)=><div className="dayHead" style={{gridColumn:index+2}} key={day}>{weekdayNames[day]}<small>{selectedWeek==='all'?weekdayShort[day]:formatShortDate(dateForWeekDay(selectedWeek,day))}</small></div>)}
        {times.map(([session,from,to],index)=><div className={`timeCell ${session==='5'?'break':''}`} style={{gridRow:index+2}} key={session}><strong>{session}</strong><span>{from}</span>{to&&<small>{to}</small>}</div>)}
        {times.map((_,row)=>displayedDays.map((day,index)=><div className={`gridCell ${row===4?'break':''}`} style={{gridColumn:index+2,gridRow:row+2}} key={`${day}-${row}`}/>))}
        {displayedEvents.map((event)=>{
          const hasHard=hardConflictEventIds.has(event.id); const hasPartial=!hasHard&&partialConflictEventIds.has(event.id);
          return <article className={`courseBlock ${event.shortTitle?'abbreviatedModule':''} ${event.shortTitle&&event.span===1?'shortModuleSession':''} category-${courseCategory(event)} ${event.displaySource==='retake'?'retakeBlock':''} ${event.displaySource==='preview'?'previewBlock':''} ${hasHard?'conflictBlock':hasPartial?'partialConflictBlock':''}`} style={{gridColumn:displayedDays.indexOf(event.day)+2,gridRow:`${event.start+2} / span ${event.span}`,width:`calc((100% - 6px) / ${event.laneCount})`,marginLeft:`calc(${event.lane} * (100% / ${event.laneCount}) + 3px)`}} key={`${event.displaySource}-${event.id}`} data-event-id={event.id} title="查看课程详情" role="button" tabIndex={0} onClick={()=>openCourseDetails(event)} onKeyDown={(key)=>{if(key.key==='Enter'||key.key===' '){key.preventDefault();openCourseDetails(event)}}}><strong>{courseHeading(event)}</strong>{courseSubtitle(event)&&<small className="courseEnglish">{courseSubtitle(event)}</small>}<small className="courseRoom">教室：{roomForMajor(event,major)}</small><small className="courseWeeks">周次：{event.weeks||'按学期安排'}</small>{event.teacher&&<small className="courseTeacher">教师：{event.teacher}</small>}<span className="courseTag">{event.displaySource==='retake'?'重修 · ':event.displaySource==='preview'?'课程预览 · ':isElective(event)?'选修 · ':''}{categoryLabels[courseCategory(event)]}{event.note&&` · ${event.note}`}</span></article>;
        })}
      </div></div>
      {displayedEvents.length===0&&renderEmpty(selectedDay==='all'?undefined:selectedDay)}</div></div></div>
      <p className="exportFootnote" data-export-only>JBJI STUDENT TIMETABLE · 2026–27 学年第一学期 · 依据学院课表及学校校历生成，最终安排以学院最新通知为准。</p>
    </section>
    <details className="courseSection"><summary>全部课程 · {courses.length} 门</summary>

      <div className="courseList">{courses.map((course)=>{
        return <article className={`courseItem category-${courseCategory(course)}`} key={course.title}>
          <div><span>{categoryLabels[courseCategory(course)]}{trackLabel(course)&&` · ${trackLabel(course)}`}{audienceLabel(course)&&` · (${audienceLabel(course)})`}</span><strong>{courseHeading(course)}</strong>{courseSubtitle(course)&&<small className="courseEnglish">{courseSubtitle(course)}</small>}{courseDetails(course,filtered,major)&&<small className="courseDetails">{courseDetails(course,filtered,major)}</small>}{course.sourceNote&&<small>{course.sourceNote}</small>}</div>
          <div className="courseItemActions"><button type="button" onClick={()=>openCourseDetails(course)}>查看详情</button></div>
        </article>;
      })}</div>
    </details>
    <details className="notice" id="help"><summary>使用帮助</summary><div className="helpContent"><p>选好学位、年级、专业和班级，即可查看课表。点击课程可看详情。</p><p>切换周次查看当周安排；“整学期”显示所有课程。英语选课和重修课程需手动添加，选择仅保存在当前浏览器，不代替学校选课。</p><p>在“导出课表”中选择“编辑后导出”，可临时修改名称、教室、教师和备注。修改只用于个人副本，退出后不保存。</p><p>课表与教学周来自学院课表、单学位授课安排和学校校历。临时调课请以学院通知为准。</p><p>发现课程信息有误或遗漏？<a href={feedbackUrl()} target="_blank" rel="noreferrer">提交课表纠错 ↗</a>（需登录 GitHub）。请补充正确信息及学院通知链接或截图，由维护者核实后更新。</p><a href="#materials">查看原始课表与校历 ↗</a></div></details>
    <footer><span>JBJI 课表助手 · 学生自制</span><a className="feedbackLink" href={feedbackUrl()} target="_blank" rel="noreferrer" title="在 GitHub 提交课表纠错，需要登录">课表纠错（GitHub）↗</a><a href="https://birmingham.jnu.edu.cn/" target="_blank" rel="noreferrer">学院官网 ↗</a></footer>
    {exportDraft&&<ExportEditor {...exportDraft} busy={exporting!==null} status={exportMessage} onClose={()=>{setExportDraft(null);setExportMessage('')}} onExport={(format,source)=>exportSchedule(format,source,true)}/>}
    {detailCourse&&<div className="detailOverlay" onMouseDown={()=>setDetailCourse(null)}>
      <section className="detailDialog" role="dialog" aria-modal="true" aria-labelledby="course-detail-title" onMouseDown={(event)=>event.stopPropagation()}>
        <header><div><p>课程详情</p><h2 id="course-detail-title">{courseHeading(detailCourse)}</h2>{courseSubtitle(detailCourse)&&<small>{courseSubtitle(detailCourse)}</small>}</div><button ref={detailCloseRef} type="button" aria-label="关闭课程详情" onClick={()=>setDetailCourse(null)}>×</button></header>
        <dl className="detailFacts"><div><dt>上课时间</dt><dd>{`${weekdayNames[detailCourse.day]} · ${sessionTimeLabel(detailCourse,times)}`}{times[detailCourse.start+detailCourse.span-1]?.[2]&&` · 第 ${detailCourse.start+1}–${detailCourse.start+detailCourse.span} 节`}</dd></div><div><dt>教室</dt><dd>{roomForMajor(detailCourse,major)}</dd></div>{detailCourse.roomsByMajor&&detailCourse.room&&<div><dt>完整分组安排</dt><dd>{detailCourse.room}</dd></div>}<div><dt>教师</dt><dd>{detailCourse.teacher||'原始资料未注明'}</dd></div><div><dt>周次</dt><dd>{detailCourse.weeks||'原始资料未注明'}</dd></div>{detailCourse.sourceNote&&<div><dt>资料说明</dt><dd>{detailCourse.sourceNote}</dd></div>}{detailCourse.note&&<div><dt>备注</dt><dd>{detailCourse.note}</dd></div>}</dl><div className="detailFeedback"><a href={feedbackUrl(detailCourse)} target="_blank" rel="noreferrer">反馈这门课的信息 ↗</a><small>需登录 GitHub，已带上课程和班级信息；请补充通知依据。</small></div>

      </section>
    </div>}
  </main>;
}
