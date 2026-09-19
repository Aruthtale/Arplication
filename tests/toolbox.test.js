import test from 'node:test';
import assert from 'node:assert/strict';
import { getToolboxHistory, addToolboxHistory, deleteToolboxHistoryItem, clearToolboxHistory } from '../src/services/toolboxDb.js';

// Mock localStorage for node environment
const storageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

globalThis.localStorage = storageMock;

test('toolboxDb: adds and retrieves history correctly', () => {
  clearToolboxHistory();
  assert.equal(getToolboxHistory().length, 0);

  const updated1 = addToolboxHistory({
    toolType: 'qr',
    title: 'Test QR',
    dataPayload: 'https://example.com',
  });

  assert.equal(updated1.length, 1);
  assert.equal(updated1[0].toolType, 'qr');
  assert.equal(updated1[0].title, 'Test QR');
  assert.equal(updated1[0].dataPayload, 'https://example.com');
  assert.ok(updated1[0].id.startsWith('tb_'));

  const updated2 = addToolboxHistory({
    toolType: 'calc',
    title: 'Test Calc',
    dataPayload: 'Total: Rp100.000',
  });

  assert.equal(updated2.length, 2);
  assert.equal(updated2[0].toolType, 'calc'); // most recent first
  assert.equal(updated2[1].toolType, 'qr');
});

test('toolboxDb: deletes single item and clears all', () => {
  clearToolboxHistory();
  const list = addToolboxHistory({
    toolType: 'color',
    title: 'Color #38E54D',
    dataPayload: 'HEX: #38E54D',
  });

  const itemId = list[0].id;
  assert.equal(getToolboxHistory().length, 1);

  const afterDelete = deleteToolboxHistoryItem(itemId);
  assert.equal(afterDelete.length, 0);
  assert.equal(getToolboxHistory().length, 0);

  addToolboxHistory({ toolType: 'text', title: 'Text 1', dataPayload: 'payload 1' });
  addToolboxHistory({ toolType: 'text', title: 'Text 2', dataPayload: 'payload 2' });
  assert.equal(getToolboxHistory().length, 2);

  const afterClear = clearToolboxHistory();
  assert.equal(afterClear.length, 0);
  assert.equal(getToolboxHistory().length, 0);
});
