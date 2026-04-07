import test from 'p-tape';

import prTimeoutWarn from '../pto.mjs';

const doNothing = Boolean; // cheap built-in no-op
function neverSolved() { return new Promise(doNothing); }

test('short-circuit', async (t) => {
  t.plan(4);
  const logger = { warn() { t.fail(new Error('unexpected log warning')); } };
  const runtimeLimit = false;
  const commonOpts = {
    logger,
    warn: false,
    fail: runtimeLimit,
  };

  let sc = prTimeoutWarn(neverSolved(), commonOpts);
  t.equal(sc.ifWatching(), false);

  sc = prTimeoutWarn(neverSolved(), { ...commonOpts, unwatched: 123 });
  t.equal(sc, 123);

  sc = prTimeoutWarn(neverSolved(), { ...commonOpts, unwatched: false });
  t.equal(sc, false);

  sc = prTimeoutWarn(neverSolved(), { ...commonOpts, unwatched: undefined });
  t.equal(sc.ifWatching(), false);
});
