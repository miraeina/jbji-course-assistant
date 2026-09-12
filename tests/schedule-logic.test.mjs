import test from 'node:test';
import assert from 'node:assert/strict';
import { detectConflicts, emptyScheduleMessage } from '../app/schedule-logic.ts';
import { timetableEvents } from '../app/timetable-data.ts';
const event=(id,extra={})=>({id,year:2,title:id,day:1,start:2,span:2,majors:'all',kind:'major',weeks:'4–18周',...extra});
test('retake conflicts and exact overlap',()=>{
 const issues=detectConflicts([event('base')],[event('retake',{displaySource:'retake'})]);
 assert.equal(issues.length,1);assert.equal(issues[0].severity,'hard');assert.deepEqual([issues[0].firstSession,issues[0].lastSession],[3,4]);
});
test('disjoint weeks, days, and adjacent sessions do not conflict',()=>{
 for(const extra of [{weeks:'1–3周'},{day:2},{start:4}])assert.equal(detectConflicts([event('a')],[event('b',extra)]).length,0);
});
test('partial time or weeks classified symmetrically',()=>{
 for(const extra of [{span:1},{weeks:'6–12周'}]){
 const a=event('a'),b=event('b',extra);
 assert.equal(detectConflicts([a],[b])[0].severity,'partial');
 assert.equal(detectConflicts([b],[a])[0].severity,'partial');
 }
});
test('single degree and JNU conflict without retakes',()=>{
 assert.equal(detectConflicts([event('single',{track:'single'}),event('jnu')],[]).length,1);
 assert.equal(detectConflicts([event('dual',{track:'dual'}),event('jnu')],[]).length,0);
});
test('two distinct retakes conflict',()=>{
 assert.equal(detectConflicts([],[event('a',{retakeKey:'a'}),event('b',{retakeKey:'b'})]).length,1);
});
test('actual first-year ICS single-degree RA conflicts with English writing',()=>{
 const events=timetableEvents.filter(e=>e.year===1&&!e.listedOnly&&(!e.track||e.track==='single')&&(e.majors==='all'||e.majors.includes('ICS'))&&(!e.groups||e.groups.includes('ICS2')));
 const issues=detectConflicts(events,[]);
 assert.ok(issues.some(x=>[x.first.title,x.second.title].includes('实分析')&&[x.first.title,x.second.title].includes('英语写作 I')));
});
test('empty messages distinguish not-started, free week/day and filters',()=>{
 const events=[event('a')];
 assert.equal(emptyScheduleMessage(events,1).firstWeek,4);
 assert.equal(emptyScheduleMessage(events,1).action,'start');
 assert.equal(emptyScheduleMessage(events,20).action,'semester');
 assert.equal(emptyScheduleMessage(events,4,0).action,'week');
 assert.equal(emptyScheduleMessage(events,4,1).action,'clear');
});
