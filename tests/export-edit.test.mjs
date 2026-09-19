import test from 'node:test';
import assert from 'node:assert/strict';
import {applyExportEdit,editedLesson} from '../app/export-edit-logic.ts';
const lessons=[{id:'a',group:'module',title:'Module',room:'N315',teacher:'Alice',note:''},{id:'b',group:'module',title:'Module · Q&A',room:'N415',teacher:'Bob',note:''},{id:'c',group:'other',title:'Other',room:'N217',teacher:'Carol',note:''}];
test('personal edits leave source lessons unchanged and only affect the selected arrangement',()=>{
  const source=structuredClone(lessons);
  const edits=applyExportEdit(lessons,{},'a',{...lessons[0],room:'N999'},'one');
  assert.deepEqual(edits,{a:{room:'N999'}});assert.deepEqual(lessons,source);
  assert.equal(editedLesson(lessons[1],edits).room,'N415');
});
test('bulk edits copy changed fields only and keep other course information intact',()=>{
  const edits=applyExportEdit(lessons,{},'a',{...lessons[0],room:' N999 '},'course');
  assert.deepEqual(edits,{a:{room:'N999'},b:{room:'N999'}});
  assert.equal(editedLesson(lessons[1],edits).teacher,'Bob');assert.equal(editedLesson(lessons[1],edits).title,'Module · Q&A');assert.ok(!edits.c);
});
test('subsequent bulk changes preserve previously edited fields in other arrangements',()=>{
  const edits=applyExportEdit(lessons,{b:{note:'Keep this note',teacher:'New teacher'}},'a',{...lessons[0],room:'N999'},'course');
  assert.deepEqual(edits.b,{note:'Keep this note',teacher:'New teacher',room:'N999'});
});
test('returning fields to their original values removes edit markers and empty teachers are allowed',()=>{
  const edits=applyExportEdit(lessons,{a:{room:'N999'}},'a',lessons[0],'one');assert.deepEqual(edits,{});
  const cleared=applyExportEdit(lessons,{},'a',{...lessons[0],teacher:''},'one');assert.equal(editedLesson(lessons[0],cleared).teacher,'');
});
test('a fresh export has no prior edits and unknown lesson ids are ignored',()=>{
  const edits={a:{note:'Personal only'}};
  assert.equal(editedLesson(lessons[0],{}).note,'');
  assert.equal(applyExportEdit(lessons,edits,'unknown',lessons[0],'course'),edits);
});
