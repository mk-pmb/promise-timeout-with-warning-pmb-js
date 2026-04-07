import test from 'p-tape';

import libTestUtil from './lib-test-util.mjs';
import prTimeoutWarn from '../pto.node.js';

const { makePromiseObserver } = libTestUtil;

test('verror fmtstr quirks', async (t) => {
  const verifyPr = makePromiseObserver({ verify: t.deepEqual });
  const logger = libTestUtil.makeVLogger();
  const commonOpt = {
    warn: '0.2 sec',
    fail: '0.4 sec',
    logger,
    vErr: true,
  };

  const started = Date.now();
  const specs = [
    { id: 'percentSigns',
      pr: Promise.reject(new Error('0% % %40 %%')),
      at: started + 0.1,
      errorName: 'Error',
      ovr: {
        msg: 'test[id=percentSigns]: % 42% %% {%7C%7D}',
      },
      wantErrMsg: true,
      errorMsg: 'test[id=percentSigns]: % 42% %% {%7C%7D}: 0% % %40 %%',
    },
  ];
  t.plan(specs.length + 1); // +1 = log verification

  await Promise.all(specs.map((spec) => {
    const tmoOpt = {
      ...commonOpt,
      msg: `test[id=${spec.id}]`,
      ...spec.ovr,
    };
    const tmoPr = (spec.pr
      ? prTimeoutWarn(spec.pr, tmoOpt)
      : prTimeoutWarn.never(tmoOpt));
    const veriOpt = { ...spec, pr: tmoPr };
    delete veriOpt.ovr;
    return verifyPr(veriOpt);
  }));

  t.deepEqual(logger.slice(), [
  ]);
});
