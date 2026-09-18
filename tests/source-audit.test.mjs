import test from 'node:test';
import assert from 'node:assert/strict';
import { timetableEvents, times } from '../app/timetable-data.ts';
import { coursesForProfile, roomForMajor, weekNumbers, initialScheduleView, getAcademicState, sessionTimeLabel } from '../app/schedule-logic.ts';
import { selectedSchedule, electiveOptions, isElective } from '../app/elective-logic.ts';
import { sourceRows, sourceRooms } from './fixtures/source-timetable.mjs';

test('every source session agrees with the independent PDF transcription',()=>{
 assert.equal(new Set(sourceRows.map(e=>e.id)).size,sourceRows.length);
 assert.deepEqual(timetableEvents.map(e=>e.id).sort(),sourceRows.map(e=>e.id).sort());
 const keys=['id','year','day','start','span','room','teacher','weeks','track','groups','listedOnly','retakeOnly'];
 for(const expected of sourceRows){
  const actual=timetableEvents.find(e=>e.id===expected.id);
  for(const key of keys)assert.deepEqual(actual[key],expected[key],`${expected.id}: ${key}`);
  assert.deepEqual(actual.majors,expected.majors,`${expected.id}: majors`);
  assert.equal(isElective(actual),expected.year===4||!!expected.optional,`${expected.id}: optional`);
  assert.deepEqual(actual.roomsByMajor,sourceRooms[expected.id],`${expected.id}: room mapping`);
 }
});

test('56 degree/year/major/class combinations retain exactly their source sessions in all 20 weeks',()=>{
 let combinations=0;
 for(const track of ['dual','single'])for(let year=1;year<=4;year++)for(const major of ['MAM','ICS','Econ','Stat'])for(let classNo=1;classNo<=(year===1?3:year===2?2:1);classNo++){
  combinations++;
  const label=`${track}/${year}/${major}/${classNo}`;
  const expected=sourceRows.filter(e=>e.year===year&&!e.retakeOnly&&(!e.track||e.track===track)&&(e.majors==='all'||e.majors.includes(major))&&(!e.groups||e.groups.includes(`${major}${classNo}`)));
  const actual=coursesForProfile(timetableEvents,track,year,major,classNo);
  assert.deepEqual(actual.map(e=>e.id).sort(),expected.map(e=>e.id).sort(),label);
  const base=selectedSchedule(actual,[]);
  const wantedBase=expected.filter(e=>!e.listedOnly&&e.year!==4&&!e.optional);
  for(let week=1;week<=20;week++){
   assert.deepEqual(base.filter(e=>weekNumbers(e.weeks).has(week)).map(e=>e.id).sort(),wantedBase.filter(e=>weekNumbers(e.weeks).has(week)).map(e=>e.id).sort(),`${label}/week${week}`);
  }
  // Check each available elective independently, not just the default empty selection.
  for(const option of electiveOptions(actual))assert.deepEqual(selectedSchedule(actual,[option.key]).map(e=>e.id).sort(),[...base,...option.events.filter(e=>!e.listedOnly)].map(e=>e.id).sort(),`${label}/${option.key}`);
  for(const event of actual){
   assert.equal(roomForMajor(event,major),sourceRooms[event.id]?.[major]||event.room||'教室待通知');
   if(event.roomsByMajor)assert.ok(!/MAM|ICS|Econ|Stat/.test(roomForMajor(event,major)));
  }
 }
 assert.equal(combinations,56);
});

test('first visit previews the first teaching week only before courses start',()=>{
 const firstYear=selectedSchedule(coursesForProfile(timetableEvents,'dual',1,'MAM',1),[]);
 for(const date of ['2026-08-20','2026-09-19'])assert.deepEqual(initialScheduleView(firstYear,getAcademicState(new Date(`${date}T12:00:00+08:00`))),{week:4,preview:true,firstWeek:4});
 assert.deepEqual(initialScheduleView(firstYear,getAcademicState(new Date('2026-09-28T12:00:00+08:00'))),{week:4,preview:false,firstWeek:4});
 assert.equal(initialScheduleView(firstYear,getAcademicState(new Date('2027-01-25T12:00:00+08:00'))).week,'all');
 const secondYear=selectedSchedule(coursesForProfile(timetableEvents,'dual',2,'MAM',1),[]);
 assert.equal(initialScheduleView(secondYear,getAcademicState(new Date('2026-09-19T12:00:00+08:00'))).week,2);
 assert.deepEqual(initialScheduleView([],getAcademicState(new Date('2026-09-19T12:00:00+08:00'))),{week:2,preview:false,firstWeek:null});
});

test('source ambiguities stay explicit and retake-only geometry is excluded from new students',()=>{
 assert.equal(timetableEvents.find(e=>e.id==='y1-geometry-retake').retakeOnly,true);
 assert.ok(!coursesForProfile(timetableEvents,'dual',1,'ICS',1).some(e=>e.id==='y1-geometry-retake'));
 const art=timetableEvents.find(e=>e.id==='y1-art');assert.equal(art.weeks,undefined);assert.ok(art.sourceNote);
 assert.equal(sessionTimeLabel(timetableEvents.find(e=>e.id==='y2-single-mva'),times),'第 3–5 节（具体时间待确认）');
 assert.match(timetableEvents.find(e=>e.id==='y3-single-gtmcd').sourceNote,/不一致/);
 assert.equal(roomForMajor(timetableEvents.find(e=>e.id==='y1-c-mam-lab'),'MAM'),'N503/504');
});
