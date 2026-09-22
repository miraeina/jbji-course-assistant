import type { DegreeTrack, Major, TimetableEvent } from './timetable-data';

export type ElectiveOption={key:string;courseKey:string;events:TimetableEvent[]};
export type ElectiveSelections=Record<string,string[]>;
export const electiveStorageKey='jbji-electives-v1';
export function isElective(event:TimetableEvent){return event.year===4||(event.year===2&&event.kind==='optional')}
function selectionTitle(year:number,title:string){
  if(year===1&&title==='C语言程序设计实验')return 'C语言程序设计';
  if(year===2&&title==='Matlab程序设计实验')return 'Matlab程序设计';
  return title;
}
function migrateSelectionKey(key:string){
  try{
    const parts=JSON.parse(key);
    if(Array.isArray(parts)&&parts.length===4&&parts[1]==='jnu'&&typeof parts[2]==='string'){
      parts[2]=selectionTitle(parts[0],parts[2]);return JSON.stringify(parts);
    }
  }catch{/* Older elective IDs are plain strings. */}
  return key;
}
function selectionKey(event:TimetableEvent,manual:boolean){
  if(!manual||isElective(event))return event.selectionKey||event.id;
  return JSON.stringify([event.year,event.track||'jnu',selectionTitle(event.year,event.title),event.groups?.slice().sort()||[]]);
}
export const catalogCategoryLabels={jnu:'暨大课程',general:'通识课程',english:'英语课程',single:'单学位课程'};
export type CatalogCategory=keyof typeof catalogCategoryLabels;
export function catalogCategory(event:TimetableEvent):CatalogCategory{
  if(event.track==='single')return 'single';
  if((event.year===2&&isElective(event))||/英语|雅思|英美历史|english|ielts|history and culture of uk/i.test(`${event.title} ${event.english||''}`))return 'english';
  if(/思想道德|中国近代史|马克思主义|体育|军事理论|心理健康|艺术体验/.test(event.title))return 'general';
  return 'jnu';
}
export function matchesCourseQuery(option:ElectiveOption,query:string){
  const text=option.events.map(event=>`${event.title} ${event.english||''} ${event.teacher||''} ${event.note||''} ${event.groups?.join(' ')||''} ${catalogCategoryLabels[catalogCategory(event)]} ${catalogCategory(event)==='general'?'通识课':''}`).join(' ').toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every(term=>text.includes(term));
}
export function electiveProfile(track:DegreeTrack,year:number,major:Major,classNo:number){
  return `2026-27-1:${track}:${year}:${major}:${year<=2?classNo:0}`;
}
export function parseElectiveSelections(raw:string|null):ElectiveSelections{
  try {
    const value:unknown=JSON.parse(raw||'{}');
    if(!value||typeof value!=='object'||Array.isArray(value))return {};
    return Object.fromEntries(Object.entries(value).filter(([,ids])=>Array.isArray(ids)).map(([key,ids])=>[key,[...new Set((ids as unknown[]).filter((id):id is string=>typeof id==='string').map(id=>key.split(':')[2]==='5'?migrateSelectionKey(id):id))]]));
  } catch {return {}}
}
export function electiveOptions(events:TimetableEvent[],manual=false):ElectiveOption[]{
  const grouped=new Map<string,ElectiveOption>();
  events.filter(event=>manual||isElective(event)).forEach(event=>{
    const key=selectionKey(event,manual);
    const courseKey=manual&&!isElective(event)?JSON.stringify([event.year,event.track||'jnu',selectionTitle(event.year,event.title)]):event.courseKey||key;
    if(!grouped.has(key))grouped.set(key,{key,courseKey,events:[]});
    grouped.get(key)!.events.push(event);
  });
  return [...grouped.values()].sort((a,b)=>
    Number(b.events.some(event=>event.id==='y4-macro'))-Number(a.events.some(event=>event.id==='y4-macro')));
}
export function toggleElective(keys:string[],option:ElectiveOption,options:ElectiveOption[]){
  if(keys.includes(option.key))return keys.filter(key=>key!==option.key);
  const alternatives=new Set(options.filter(item=>item.courseKey===option.courseKey).map(item=>item.key));
  return [...keys.filter(key=>!alternatives.has(key)),option.key];
}
export function selectedSchedule(events:TimetableEvent[],keys:string[],manual=false){
  return events.filter(event=>!event.listedOnly&&((!manual&&!isElective(event))||keys.includes(selectionKey(event,manual))));
}
