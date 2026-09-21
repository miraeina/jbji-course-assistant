import test from 'node:test';
import assert from 'node:assert/strict';
import { createLongPress } from '../app/long-press.ts';

test('long press removes once after 600ms and suppresses the trailing click', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const gesture=createLongPress();let removed=0;
  gesture.start(1,100,100,()=>removed++);
  t.mock.timers.tick(599);assert.equal(removed,0);
  t.mock.timers.tick(1);assert.equal(removed,1);
  gesture.cancel();assert.equal(gesture.suppressClick(),true);
  t.mock.timers.tick(1000);assert.equal(removed,1);
  gesture.newGesture();assert.equal(gesture.suppressClick(),false);
});

test('a short tap or pointer cancellation does not remove or consume a click', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const gesture=createLongPress();let removed=0;
  gesture.start(1,0,0,()=>removed++);
  t.mock.timers.tick(200);gesture.cancel();t.mock.timers.tick(600);
  assert.equal(removed,0);assert.equal(gesture.suppressClick(),false);
});

test('scroll movement cancels a hold even when the pointer returns to its origin', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const gesture=createLongPress();let removed=0;
  gesture.start(1,0,0,()=>removed++);
  gesture.move(1,11,0);gesture.move(1,0,0);t.mock.timers.tick(600);
  assert.equal(removed,0);
});

test('small touch jitter is tolerated but a second finger cancels removal', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const gesture=createLongPress();let removed=0;
  gesture.start(1,0,0,()=>removed++);gesture.move(1,3,4);
  t.mock.timers.tick(600);assert.equal(removed,1);
  gesture.newGesture();gesture.start(1,0,0,()=>removed++);
  gesture.newGesture();gesture.move(2,0,0);t.mock.timers.tick(600);
  assert.equal(removed,1);
});

test('identity changes or disposal cancel an unfinished removal', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const gesture=createLongPress();let removed=0;
  gesture.start(1,0,0,()=>removed++);gesture.newGesture();t.mock.timers.tick(600);
  assert.equal(removed,0);assert.equal(gesture.suppressClick(),false);
});
