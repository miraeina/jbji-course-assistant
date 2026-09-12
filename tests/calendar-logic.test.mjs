import test from 'node:test';
import assert from 'node:assert/strict';
import { weekNumbers,getAcademicState,getDailySchedule,advanceCalendarView } from '../app/schedule-logic.ts';
import { timetableEvents,times } from '../app/timetable-data.ts';
const at=value=>new Date(`${value}+08:00`);
const lesson=(id,extra={})=>({id,year:2,title:id,day:0,start:0,span:2,majors:'all',kind:'major',weeks:'1–18周',...extra});
test('mixed ranges and singleton weeks retain all weeks',()=>{
 assert.deepEqual([...weekNumbers('1–4、9、13-16周')],[1,2,3,4,9,13,14,15,16]);
});
test('all three rotating module pairs have one course at each active session',()=>{
 const cases=[{year:1,weeks:[4,12,13,16],codes:['MFC','MFC','SAS','SAS']},{year:2,weeks:[1,4,5,12,13,16],codes:['FM','FM','MVA','MVA','FM','FM']},{year:3,weeks:[1,4,5,8,9,12,13,16],codes:['IPCO','IPCO','GTMCD','GTMCD','IPCO','IPCO','GTMCD','GTMCD']}];
 for(const c of cases){
  const events=timetableEvents.filter(e=>e.year===c.year&&e.track==='dual'&&(e.majors==='all'||e.majors.includes('ICS')));
  c.weeks.forEach((week,i)=>{
   const active=events.filter(e=>weekNumbers(e.weeks).has(week));
   assert.equal(active.length,7);
   assert.ok(active.every(e=>e.english.startsWith(`${c.codes[i]} · `)));
   assert.equal(new Set(active.map(e=>`${e.day}:${e.start}`)).size,active.length);
   assert.ok(active.some(e=>e.title.includes('Seminar')));assert.ok(active.some(e=>e.title.includes('Q&A')));
  });
  assert.equal(events.filter(e=>weekNumbers(e.weeks).has(17)).length,0);
 }
 assert.equal(new Set(timetableEvents.map(e=>e.id)).size,timetableEvents.length);
 assert.equal(timetableEvents.find(e=>e.id==='y2-single-fm').weeks,'6–17周');
});
test('clock uses Shanghai midnight and Sunday academic week boundary',()=>{
 assert.equal(getAcademicState(at('2026-09-12T23:59:59')).currentWeek,1);
 const next=getAcademicState(at('2026-09-13T00:00:00'));
 assert.equal(next.currentWeek,2);assert.equal(next.weekday,null);
 assert.equal(getAcademicState(at('2026-09-06T23:59:59')).phase,'before');
 assert.equal(getAcademicState(at('2027-01-24T00:00:00')).currentWeek,null);
});
test('day transition follows current view and preserves browsing another week',()=>{
 const old=getAcademicState(at('2026-09-12T23:59:59')),next=getAcademicState(at('2026-09-13T00:00:00'));
 assert.deepEqual(advanceCalendarView(old,next,{week:1,day:5,filterDay:'all'}),{week:2,day:6,filterDay:'all'});
 assert.deepEqual(advanceCalendarView(old,next,{week:5,day:2,filterDay:2}),{week:5,day:2,filterDay:2});
 assert.deepEqual(advanceCalendarView(old,next,{week:'all',day:2,filterDay:'all'}),{week:'all',day:2,filterDay:'all'});
});
test('today panel respects actual start/end, concurrent classes, and future weeks',()=>{
 const events=[lesson('a'),lesson('overlap'),lesson('afternoon',{start:5}),lesson('later',{weeks:'2–18周'}),lesson('listed',{listedOnly:true})];
 const before=getDailySchedule(events,at('2026-09-07T08:29:00'),times);
 assert.equal(before.today.length,3);assert.deepEqual(before.next.map(x=>x.event.id),['a','overlap']);
 const during=getDailySchedule(events,at('2026-09-07T08:30:00'),times);
 assert.equal(during.active.length,2);assert.equal(during.next[0].event.id,'afternoon');
 assert.equal(getDailySchedule(events,at('2026-09-07T10:10:00'),times).active.length,0);
 const ended=getDailySchedule(events,at('2026-09-07T23:00:00'),times);
 assert.equal(ended.remaining.length,0);assert.equal(ended.next[0].date.getUTCDate(),14);
});
test('first-year next lesson waits for week 4, semester end and empty schedule stay empty',()=>{
 const events=[lesson('first-year',{weeks:'4–18周'})];
 const next=getDailySchedule(events,at('2026-09-07T08:00:00'),times);
 assert.equal(next.today.length,0);assert.equal(next.next[0].date.getUTCDate(),28);
 assert.equal(getDailySchedule(events,at('2027-01-25T08:00:00'),times).next.length,0);
 assert.equal(getDailySchedule([],at('2026-09-07T08:00:00'),times).next.length,0);
});
