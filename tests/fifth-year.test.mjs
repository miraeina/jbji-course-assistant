import test from 'node:test';
import assert from 'node:assert/strict';
import { timetableEvents } from '../app/timetable-data.ts';
import { coursesForProfile, detectConflicts } from '../app/schedule-logic.ts';
import { electiveOptions, selectedSchedule, toggleElective, electiveProfile, parseElectiveSelections, catalogCategory, matchesCourseQuery } from '../app/elective-logic.ts';

const catalog=(major='MAM',track='dual')=>coursesForProfile(timetableEvents,track,5,major,1);
test('C and MATLAB lectures and labs are selected, previewed and removed together',()=>{
  for(const major of ['MAM','ICS']){
    const events=catalog(major),options=electiveOptions(events,true);
    for(const title of ['C语言程序设计','Matlab程序设计']){
      const matches=options.filter(o=>o.events.some(e=>e.title.startsWith(title)));
      assert.equal(matches.length,1);
      const option=matches[0];
      assert.equal(option.events.length,2);
      const keys=toggleElective([],option,options);
      assert.deepEqual(selectedSchedule(events,keys,true),option.events);
      assert.deepEqual(selectedSchedule(events,toggleElective(keys,option,options),true),[]);
      const lab=option.events.find(e=>e.title.endsWith('实验'));
      const overlap={...lab,id:'other-course',title:'Another course'};
      assert.ok(detectConflicts([...option.events,overlap],[],new Set(option.events.map(e=>e.id))).some(issue=>issue.first.id===lab.id||issue.second.id===lab.id));
    }
  }
});
test('existing fifth-year lab selections migrate to the whole course and deduplicate',()=>{
  const profile=electiveProfile('dual',5,'MAM',1),oldProfile=electiveProfile('dual',4,'MAM',1);
  for(const [year,title] of [[1,'C语言程序设计'],[2,'Matlab程序设计']]){
    const lecture=JSON.stringify([year,'jnu',title,[]]),lab=JSON.stringify([year,'jnu',title+'实验',[]]);
    for(const keys of [[lab],[lecture],[lecture,lab]]){
      const restored=parseElectiveSelections(JSON.stringify({[profile]:keys,[oldProfile]:[lab]}));
      assert.deepEqual(restored[profile],[lecture]);
      assert.equal(selectedSchedule(catalog(),restored[profile],true).length,2);
      assert.deepEqual(restored[oldProfile],[lab]);
    }
  }
});
test('search accepts course categories, general-course aliases and combined terms',()=>{
  const options=electiveOptions(catalog(),true);
  for(const [query,category] of [['暨大课程','jnu'],['英语课程','english'],['通识课','general'],['通识课程','general'],['单学位课程','single']]){
    const found=options.filter(o=>matchesCourseQuery(o,query));
    assert.ok(found.length);
    assert.ok(found.every(o=>catalogCategory(o.events[0])===category));
  }
  const found=options.filter(o=>matchesCourseQuery(o,'暨大课程 MATLAB 实验'));
  assert.equal(found.length,1);
  assert.equal(found[0].events.length,2);
});
test('fifth year includes all four course categories and teaching groups, but no dual-degree modules',()=>{
  const events=catalog();
  assert.deepEqual(new Set(events.map(catalogCategory)),new Set(['jnu','general','english','single']));
  assert.ok(events.every(e=>e.track!=='dual'));
  assert.ok(events.some(e=>e.id==='y1-geometry-retake'));
  assert.deepEqual(new Set(events.map(e=>e.year)),new Set([1,2,3,4]));
  assert.ok(events.some(e=>e.groups?.includes('MAM1')));
  assert.ok(events.some(e=>e.groups?.includes('MAM3')));
  assert.deepEqual(events,catalog('MAM','single'));
  assert.ok(events.every(e=>e.majors==='all'||e.majors.includes('MAM')));
  assert.deepEqual(selectedSchedule(events,[],true),[]);
});
test('cross-year selection includes every session and can replace an English teaching group',()=>{
  const events=catalog(),options=electiveOptions(events,true);
  const physics=options.find(o=>o.events.some(e=>e.id==='y2-physics'));
  assert.deepEqual(new Set(selectedSchedule(events,[physics.key],true).map(e=>e.id)),new Set(['y2-physics','y2-physics-2']));
  const writing=options.filter(o=>o.events[0].title==='英语写作 I');
  assert.equal(writing.length,3);
  let keys=toggleElective([physics.key],writing[0],options);
  keys=toggleElective(keys,writing[1],options);
  assert.deepEqual(keys,[physics.key,writing[1].key]);
  assert.deepEqual(toggleElective(keys,writing[1],options),[physics.key]);
});
test('single-degree modules conflict with English and saved fifth-year choices stay isolated',()=>{
  const events=catalog('ICS'),options=electiveOptions(events,true);
  const ra=options.find(o=>o.events.some(e=>e.id==='y1-single-ra'));
  const writing=options.find(o=>o.events.some(e=>e.title==='英语写作 I'&&e.groups?.includes('ICS1')));
  const chosen=selectedSchedule(events,[ra.key,writing.key],true);
  assert.ok(detectConflicts(chosen,[],new Set(chosen.map(e=>e.id))).length);
  const profile=electiveProfile('dual',5,'ICS',1);
  const saved=parseElectiveSelections(JSON.stringify({[profile]:[ra.key,writing.key]}));
  assert.deepEqual(selectedSchedule(events,saved[profile],true),chosen);
  assert.equal(saved[electiveProfile('dual',4,'ICS',1)],undefined);
});
test('unscheduled courses can be selected without inventing weekly sessions',()=>{
  const events=catalog(),options=electiveOptions(events,true);
  const art=options.find(o=>o.events.some(e=>e.id==='y1-art'));
  assert.ok(art);
  assert.deepEqual(selectedSchedule(events,[art.key],true),[]);
});
