import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSemver, APP_VERSION } from '../src/services/updater.js';

test('compareSemver correctly compares semantic versions', () => {
  assert.equal(compareSemver('0.2.0', '0.1.0'), 1);
  assert.equal(compareSemver('v0.2.0', '0.1.0'), 1);
  assert.equal(compareSemver('1.0.0', '0.1.0'), 1);
  assert.equal(compareSemver('0.1.0', '0.1.0'), 0);
  assert.equal(compareSemver('v0.1.0', 'v0.1.0'), 0);
  assert.equal(compareSemver('0.1.0', '0.2.0'), -1);
  assert.equal(compareSemver('0.1.0', '1.0.0'), -1);
});

test('APP_VERSION is valid semver string', () => {
  assert.ok(/^v?\d+\.\d+\.\d+/.test(APP_VERSION));
});
