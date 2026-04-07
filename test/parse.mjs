import test from 'p-tape';

import parseTimeoutDuration from '../src/parseTimeoutDuration.mjs';

const maxSec = parseTimeoutDuration.maxJsTimeoutSec;
const posInf = Number.POSITIVE_INFINITY;

function ptd(...args) {
  try {
    return parseTimeoutDuration(...args);
  } catch (err) {
    if (err.name === 'Error') { throw err; }
    return String(err.name || err);
  }
}

const invalidDurations = [
  null,
  true,
  0,
  2,
  'hello',
  {},
];

test('parse timeouts', async (t) => {
  t.plan(51);
  t.ok(Number.isFinite(maxSec));
  t.ok(maxSec > 9e3);

  t.equal(ptd(false), false);
  invalidDurations.forEach((inv) => {
    t.equal(ptd(inv), 'InvalidDuration');
    t.equal(ptd(inv, { off: 'inf' }), 'InvalidDuration');
    t.equal(ptd(inv, { off: 'max' }), 'InvalidDuration');
    t.equal(ptd(inv, { off: 'err' }), 'InvalidDuration');
  });

  t.equal(ptd('0 ms'), 'DurationTooShort');
  t.equal(ptd('1 ms'), 1e-3);
  t.equal(ptd('500 ms'), 0.5);
  t.equal(ptd('2 min'), 120);
  t.throws(() => ptd('1 weekend'), /unit.*not supported/i);
  t.equal(ptd(false, { off: 'inf' }), posInf);
  t.equal(ptd(false, { off: 'max' }), maxSec);
  t.equal(ptd(false, { off: 'err' }), 'DurationRequired');

  t.equal(ptd('1 year'), 'DurationTooLong');
  t.equal(ptd('1 year', { off: 'inf' }), 'DurationTooLong');
  t.equal(ptd('1 year', { off: 'max' }), 'DurationTooLong');
  t.equal(ptd('1 year', { off: 'err' }), 'DurationTooLong');

  t.equal(ptd(['3 min', '8 sec']), 180);
  t.equal(ptd(['4 min', false, '8 sec']), 240);
  t.equal(ptd([null, '5 min', false, '8 sec']), 300);
  t.equal(ptd([false, '6 min', false, '8 sec']), false);

  t.equal(ptd(['0 min', '8 sec']), 'DurationTooShort');
  t.equal(ptd(['0 min', false, '8 sec']), 'DurationTooShort');
  t.equal(ptd([null, '0 min', false, '8 sec']), 'DurationTooShort');
  t.equal(ptd([false, '0 min', false, '8 sec']), false);

  t.equal(ptd(['max', '8 sec']), maxSec);
  t.equal(ptd(['max', false]), maxSec);
  t.equal(ptd([null, 'max', false]), maxSec);
  t.equal(ptd([false, 'max', false]), false);
});
