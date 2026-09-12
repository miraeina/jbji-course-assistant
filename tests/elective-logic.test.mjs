import test from 'node:test';
import assert from 'node:assert/strict';
import { timetableEvents } from '../app/timetable-data.ts';
import { detectConflicts } from '../app/schedule-logic.ts';
import { electiveOptions, electiveProfile, parseElectiveSelections, selectedSchedule, toggleElective, isElective } from '../app/elective-logic.ts';

const forProfile=(year,major='MAM',group=1)=>timetableEvents.filter(e=>e.year===year&&(!e.track||e.track==='dual')&&(e.majors==='all'||e.majors.includes(major))&&(!e.groups||e.groups.includes(`${major}${group}`)));
test('year two starts with fixed courses only; IELTS split follows the original teaching groups',()=>{
  for(const [major,group,id,room,teacher] of [['MAM',1,'e1','N432','Henry'],['MAM',2,'e2','N426','Laurence'],['ICS',2,'e4','N426','Laurence'],['Stat',2,'e8','N423','Laurence']]){
    const events=forProfile(2,major,group),fixed=selectedSchedule(events,[]);
    assert.ok(fixed.length); assert.ok(fixed.every(e=>!isElective(e)));
    const ielts=electiveOptions(events).filter(o=>o.courseKey==='y2-ielts');
    assert.equal(ielts.length,1);assert.equal(ielts[0].key,`y2-ielts-${id}`);
    assert.equal(ielts[0].events[0].room,room);assert.equal(ielts[0].events[0].teacher,teacher);
    assert.equal(selectedSchedule(events,[ielts[0].key]).length,fixed.length+1);
  }
});
test('year four only selected courses are scheduled; real electives conflict',()=>{
  const events=forProfile(4,'Econ');
  assert.equal(selectedSchedule(events,[]).length,0);
  const chosen=selectedSchedule(events,['y4-public','y4-modelling']);
  assert.equal(chosen.length,2);
  const conflicts=detectConflicts(chosen,[],new Set(chosen.map(e=>e.id)));
  assert.equal(conflicts.length,1);assert.equal(conflicts[0].severity,'hard');
  assert.equal(selectedSchedule(events,['y4-data']).length,0);
});
test('switching a teaching slot replaces the same module and removing it does not restore the old slot',()=>{
  const options=electiveOptions(forProfile(2));
  const morning=options.find(o=>o.key==='y2-culture-mi'),evening=options.find(o=>o.key==='y2-culture-evening');
  let chosen=toggleElective(['y2-practical-mi'],morning,options);
  chosen=toggleElective(chosen,evening,options);
  assert.deepEqual(chosen,['y2-practical-mi','y2-culture-evening']);
  assert.deepEqual(toggleElective(chosen,evening,options),['y2-practical-mi']);
});
test('electives conflict with fixed and retake courses only when sessions and weeks overlap',()=>{
  const optional=timetableEvents.find(e=>e.id==='y2-practical-mi');
  const fixed={...optional,id:'fixed',kind:'major'};
  const ids=new Set([optional.id]);
  assert.equal(detectConflicts([fixed,optional],[],ids).length,1);
  assert.equal(detectConflicts([optional],[{...fixed,id:'retake',retakeKey:'r'}],ids).length,1);
  assert.equal(detectConflicts([optional],[{...fixed,id:'retake',weeks:'19–20周'}],ids).length,0);
});
test('saved selections are isolated by identity and malformed storage is handled',()=>{
  const p=electiveProfile('dual',2,'MAM',1);
  const keys=[p,electiveProfile('dual',2,'MAM',2),electiveProfile('single',2,'MAM',1),electiveProfile('dual',4,'MAM',1),electiveProfile('dual',2,'ICS',1)];
  assert.equal(new Set(keys).size,keys.length);
  const saved=parseElectiveSelections(JSON.stringify({[p]:['y2-ielts-e1','y2-ielts-e1',null,1]}));
  assert.deepEqual(saved[p],['y2-ielts-e1']); assert.equal(saved[keys[1]],undefined);
  for(const raw of ['not json','null','[]','42'])assert.deepEqual(parseElectiveSelections(raw),{});
});
test('one selection includes all sessions of a course but excludes unscheduled records',()=>{
  const base=timetableEvents.find(e=>e.id==='y4-public');
  const events=[{...base,id:'a',selectionKey:'module'},{...base,id:'b',day:1,selectionKey:'module'},{...base,id:'c',selectionKey:'module',listedOnly:true}];
  assert.equal(electiveOptions(events).length,1);
  assert.deepEqual(selectedSchedule(events,['module']).map(e=>e.id),['a','b']);
});
