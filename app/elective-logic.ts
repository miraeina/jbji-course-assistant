import type { DegreeTrack, Major, TimetableEvent } from './timetable-data';

export type ElectiveOption={key:string;courseKey:string;events:TimetableEvent[]};
export type ElectiveSelections=Record<string,string[]>;
export const electiveStorageKey='jbji-electives-v1';
export function isElective(event:TimetableEvent){return event.year===4||(event.year===2&&event.kind==='optional')}
export function electiveProfile(track:DegreeTrack,year:number,major:Major,classNo:number){
  return `2026-27-1:${track}:${year}:${major}:${year<=2?classNo:0}`;
}
export function parseElectiveSelections(raw:string|null):ElectiveSelections{
  try {
    const value:unknown=JSON.parse(raw||'{}');
    if(!value||typeof value!=='object'||Array.isArray(value))return {};
    return Object.fromEntries(Object.entries(value).filter(([,ids])=>Array.isArray(ids)).map(([key,ids])=>[key,[...new Set((ids as unknown[]).filter((id):id is string=>typeof id==='string'))]]));
  } catch {return {}}
}
export function electiveOptions(events:TimetableEvent[]):ElectiveOption[]{
  const grouped=new Map<string,ElectiveOption>();
  events.filter(isElective).forEach(event=>{
    const key=event.selectionKey||event.id;
    if(!grouped.has(key))grouped.set(key,{key,courseKey:event.courseKey||key,events:[]});
    grouped.get(key)!.events.push(event);
  });
  return [...grouped.values()];
}
export function toggleElective(keys:string[],option:ElectiveOption,options:ElectiveOption[]){
  if(keys.includes(option.key))return keys.filter(key=>key!==option.key);
  const alternatives=new Set(options.filter(item=>item.courseKey===option.courseKey).map(item=>item.key));
  return [...keys.filter(key=>!alternatives.has(key)),option.key];
}
export function selectedSchedule(events:TimetableEvent[],keys:string[]){
  return events.filter(event=>!event.listedOnly&&(!isElective(event)||keys.includes(event.selectionKey||event.id)));
}
