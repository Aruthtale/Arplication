import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerBackHandler, dispatchBackEvent } from '../src/services/backHandler.js';

test('backHandler: registers and unregisters handlers in LIFO order', () => {
  const callOrder = [];

  const unreg1 = registerBackHandler(() => {
    callOrder.push('handler1');
    return true;
  });

  const unreg2 = registerBackHandler(() => {
    callOrder.push('handler2');
    return true;
  });

  // dispatchBackEvent should execute top of stack (handler2)
  const handled = dispatchBackEvent();
  assert.equal(handled, true);
  assert.deepEqual(callOrder, ['handler2']);

  // Unregister handler2
  unreg2();

  // dispatchBackEvent should now execute handler1
  const handled2 = dispatchBackEvent();
  assert.equal(handled2, true);
  assert.deepEqual(callOrder, ['handler2', 'handler1']);

  // Unregister handler1
  unreg1();

  // Now stack is empty, should return false
  const handled3 = dispatchBackEvent();
  assert.equal(handled3, false);
});

test('backHandler: passes to next handler if top handler returns false', () => {
  const callOrder = [];

  const unreg1 = registerBackHandler(() => {
    callOrder.push('first');
    return true;
  });

  const unreg2 = registerBackHandler(() => {
    callOrder.push('second_not_handled');
    return false; // did not handle
  });

  const handled = dispatchBackEvent();
  assert.equal(handled, true);
  assert.deepEqual(callOrder, ['second_not_handled', 'first']);

  unreg1();
  unreg2();
});
