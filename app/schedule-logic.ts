import type { DegreeTrack, Major, TimetableEvent } from './timetable-data';

export function roomForMajor(event:TimetableEvent,major:Major){
  return event.roomsByMajor?.[major]||event.room||'教室待通知';
}
export function coursesForProfile(events:TimetableEvent[],track:DegreeTrack,year:number,major:Major,classNo:number){
  // The fifth-year planner offers every teaching group for the selected major,
  // including single-degree modules regardless of the student's degree track.
  if(year===5)return events.filter(event=>event.year>=1&&event.year<=4&&event.track!=='dual'&&
    (event.majors==='all'||event.majors.includes(major)));
  return events.filter(event=>!event.retakeOnly&&event.year===year&&(!event.track||event.track===track)&&
    (event.majors==='all'||event.majors.includes(major))&&(!event.groups||event.groups.includes(`${major}${classNo}`)));
}

export function initialScheduleView(events:TimetableEvent[],academic:AcademicState){
  const weeks=events.filter(event=>!event.listedOnly&&!event.retakeOnly).flatMap(event=>[...weekNumbers(event.weeks)]);
  const firstWeek=weeks.length?Math.min(...weeks):null;
  const preview=firstWeek!==null&&(academic.phase==='before'||(academic.currentWeek!==null&&academic.currentWeek<firstWeek));
  const week:number|'all'=preview?firstWeek!:academic.currentWeek??'all';
  return {week,preview,firstWeek};
}

export function sessionTimeLabel(event:TimetableEvent,sessionTimes:string[][]){
  const start=sessionTimes[event.start]?.[1],end=sessionTimes[event.start+event.span-1]?.[2];
  return /^\d{2}:\d{2}$/.test(start||'')&&/^\d{2}:\d{2}$/.test(end||'')?`${start}–${end}`:
    `第 ${event.start+1}–${event.start+event.span} 节（具体时间待确认）`;
}

type DisplayEvent=TimetableEvent&{displaySource?:'base'|'retake'|'preview';retakeKey?:string};
export type ConflictDetail={key:string;first:DisplayEvent;second:DisplayEvent;day:number;firstSession:number;lastSession:number;weeks:number[];severity:'hard'|'partial'};
export function weekNumbers(weeks?:string){
  const result=new Set<number>();
  if(!weeks)return new Set(Array.from({length:18},(_,index)=>index+1));
  const tokens=weeks.matchAll(/(\d+)(?:\s*[–—-]\s*(\d+))?/g);
  for(const match of tokens){
    const first=Number(match[1]);const last=Number(match[2]||match[1]);
    for(let value=first;value<=last;value++)result.add(value);
  }
  return result.size?result:new Set(Array.from({length:18},(_,index)=>index+1));
}

export function detectConflicts(baseEvents:TimetableEvent[],retakeEvents:DisplayEvent[],electiveIds:ReadonlySet<string>=new Set()):ConflictDetail[]{
  const conflicts:ConflictDetail[]=[];
  const compare=(first:DisplayEvent,second:DisplayEvent)=>{
    if(first.id===second.id||first.listedOnly||second.listedOnly)return;
    if(first.day!==second.day)return;
    const start=Math.max(first.start,second.start); const end=Math.min(first.start+first.span,second.start+second.span);
    if(start>=end)return;
    const firstWeeks=weekNumbers(first.weeks); const secondWeeks=weekNumbers(second.weeks);
    const weeks=Array.from(firstWeeks).filter((week)=>secondWeeks.has(week)).sort((a,b)=>a-b);
    if(!weeks.length)return;
    const partial=start>first.start||end<first.start+first.span||weeks.length<firstWeeks.size||start>second.start||end<second.start+second.span||weeks.length<secondWeeks.size;
    conflicts.push({key:`${first.id}:${second.id}:${start}`,first,second,day:first.day,firstSession:start+1,lastSession:end,weeks,severity:partial?'partial':'hard'});
  };
  baseEvents.forEach((first,index)=>baseEvents.slice(index+1).forEach((second)=>{
    if(electiveIds.has(first.id)||electiveIds.has(second.id)||(first.track==='single'&&!second.track)||(second.track==='single'&&!first.track))compare({...first,displaySource:'base'},{...second,displaySource:'base'});
  }));
  retakeEvents.forEach((retake)=>baseEvents.forEach((base)=>compare(retake,{...base,displaySource:'base'})));
  retakeEvents.forEach((first,index)=>retakeEvents.slice(index+1).forEach((second)=>{if(!first.retakeKey||first.retakeKey!==second.retakeKey)compare(first,second)}));
  return conflicts;
}


export function emptyScheduleMessage(events:TimetableEvent[],week:number|'all',day?:number){
  const weeks=events.flatMap(event=>Array.from(weekNumbers(event.weeks)));
  const firstWeek=weeks.length?Math.min(...weeks):null;
  if(week!=='all'&&firstWeek!==null&&week<firstWeek)return {title:'课程还没开始',detail:`本组合课程从第 ${firstWeek} 周开始。`,action:'start' as const,firstWeek};
  const weekly=events.filter(event=>week==='all'||weekNumbers(event.weeks).has(week));
  if(!weekly.length)return {title:week==='all'?'暂无已排课程':`第 ${week} 周没有课`,detail:'可以查看整学期安排，或核对原始课表。',action:'semester' as const,firstWeek};
  if(day!==undefined&&!weekly.some(event=>event.day===day))return {title:'这一天没有课',detail:'换一天看看，或查看本周完整安排。',action:'week' as const,firstWeek};
  return {title:'没有符合筛选条件的课程',detail:'课程可能被搜索词、类别或上课日筛选隐藏。',action:'clear' as const,firstWeek};
}

export type AcademicState={today:Date;currentWeek:number|null;weekday:number|null;phase:'before'|'teaching'|'review'|'between'|'break';daysUntilStart:number};

export const academicCalendar={
  academicYear:'2026–2027',
  semesterLabel:'第一学期',
  weekOneStart:'2026-09-06',
  studentStart:'2026-09-07',
  semesterEnd:'2027-01-23',
  winterBreakStart:'2027-01-25',
  totalWeeks:20,
  reviewExamWeeks:[17,18,19,20],
} as const;
const oneDay=24*60*60*1000;

export function calendarDate(value:string){
  const [year,month,day]=value.split('-').map(Number);
  return new Date(Date.UTC(year,month-1,day,4));
}

function shanghaiToday(now:Date){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter((part)=>part.type!=='literal').map((part)=>[part.type,part.value]));
  return calendarDate(`${parts.year}-${parts.month}-${parts.day}`);
}

export function addDays(date:Date,days:number){
  return new Date(date.getTime()+days*oneDay);
}

export function daysBetween(first:Date,second:Date){
  return Math.round((second.getTime()-first.getTime())/oneDay);
}

export function getAcademicState(now:Date=new Date()):AcademicState{
  const today=shanghaiToday(now);
  const weekOneStart=calendarDate(academicCalendar.weekOneStart);
  const studentStart=calendarDate(academicCalendar.studentStart);
  const semesterEnd=calendarDate(academicCalendar.semesterEnd);
  const winterBreakStart=calendarDate(academicCalendar.winterBreakStart);
  const jsDay=today.getUTCDay();
  const weekday=jsDay>=1&&jsDay<=5?jsDay-1:null;
  if(today<studentStart)return {today,currentWeek:null,weekday,phase:'before',daysUntilStart:daysBetween(today,studentStart)};
  if(today<=semesterEnd){
    const currentWeek=Math.min(academicCalendar.totalWeeks,Math.floor(daysBetween(weekOneStart,today)/7)+1);
    return {today,currentWeek,weekday,phase:academicCalendar.reviewExamWeeks.includes(currentWeek as 17|18|19|20)?'review':'teaching',daysUntilStart:0};
  }
  return {today,currentWeek:null,weekday,phase:today<winterBreakStart?'between':'break',daysUntilStart:0};
}

export function dateForWeekDay(week:number,day:number){
  return addDays(calendarDate(academicCalendar.weekOneStart),(week-1)*7+day+1);
}

export function formatCalendarDate(date:Date){
  return `${date.getUTCMonth()+1}月${date.getUTCDate()}日`;
}

export function formatShortDate(date:Date){
  return `${date.getUTCMonth()+1}/${date.getUTCDate()}`;
}

export function weekDateRange(week:number){
  const start=addDays(calendarDate(academicCalendar.weekOneStart),(week-1)*7);
  return `${formatCalendarDate(start)}–${formatCalendarDate(addDays(start,6))}`;
}

type CalendarView={week:number|'all';day:number;filterDay:number|'all'};
export function advanceCalendarView(previous:AcademicState,next:AcademicState,view:CalendarView):CalendarView{
  if(previous.currentWeek===null||view.week!==previous.currentWeek)return view;
  const oldDay=(previous.today.getUTCDay()+6)%7;
  const newDay=(next.today.getUTCDay()+6)%7;
  return {week:next.currentWeek??'all',day:view.day===oldDay?newDay:view.day,
    filterDay:view.filterDay===oldDay?(newDay<5?newDay:'all'):view.filterDay};
}

type LessonOccurrence={event:TimetableEvent;date:Date;start:number;end:number};
export function getDailySchedule(events:TimetableEvent[],now:Date,sessionTimes:string[][]){
  const academic=getAcademicState(now);
  const occurrences:LessonOccurrence[]=[];
  for(const event of new Map(events.filter(item=>!item.listedOnly).map(item=>[item.id,item])).values()){
    const startText=sessionTimes[event.start]?.[1];
    const endText=sessionTimes[event.start+event.span-1]?.[2];
    if(!/^\d{2}:\d{2}$/.test(startText||'')||!/^\d{2}:\d{2}$/.test(endText||''))continue;
    const minutes=(value:string)=>{const [h,m]=value.split(':').map(Number);return h*60+m};
    for(const week of weekNumbers(event.weeks)){
      if(week<1||week>academicCalendar.totalWeeks)continue;
      const date=dateForWeekDay(week,event.day);
      if(date<academic.today||date>calendarDate(academicCalendar.semesterEnd))continue;
      // calendarDate represents noon in Shanghai; class times also use Shanghai time.
      occurrences.push({event,date,start:date.getTime()+(minutes(startText)-720)*60000,end:date.getTime()+(minutes(endText)-720)*60000});
    }
  }
  occurrences.sort((a,b)=>a.start-b.start||a.event.id.localeCompare(b.event.id));
  const today=occurrences.filter(item=>item.date.getTime()===academic.today.getTime());
  const active=today.filter(item=>item.start<=now.getTime()&&item.end>now.getTime());
  const future=occurrences.filter(item=>item.start>now.getTime());
  return {today,remaining:today.filter(item=>item.end>now.getTime()),active,
    next:future.filter(item=>item.start===future[0]?.start)};
}

