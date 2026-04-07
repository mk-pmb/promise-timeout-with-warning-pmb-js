import test from 'p-tape';

import libTestUtil from './lib-test-util.mjs';
import prTimeoutWarn from '../pto.mjs';

const { soon, makePromiseObserver } = libTestUtil;
const errTmo = { errorName: 'TimeoutError' };

test('basics', async (t) => {
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
    { id: 'instant',
      pr: 'some plain value',
      at: started,
      result: 'some plain value',
    },
    { id: 'good',
      pr: soon(100),
      at: started + 100,
      result: 0.1,
    },
    { id: 'almost',
      pr: soon(420),
      at: started + 400,
      ...errTmo,
    },
    { id: 'extended',
      pr: soon(550),
      at: started + 550,
      result: 0.55,
      ovr: {
        tap(tmoPr) {
          setTimeout(() => {
            logger.log('extending');
            tmoPr.reset();
          }, 250);
        },
      },
    },
    { id: 'tooLate',
      pr: soon(500),
      at: started + 400,
      ...errTmo,
    },
    { id: 'never',
      pr: null,
      at: started + 400,
      ...errTmo,
    },
    { id: 'unTimeouted',
      pr: soon(500),
      at: started + 500,
      result: 0.5,
      ovr: { tap(tmoPr) { setTimeout(() => tmoPr.unTimeout(), 150); } },
    },
    { id: 'multiDirectWarn',
      pr: soon(200),
      at: started + 200,
      result: 0.2,
      ovr: {
        warn: [null, undefined, '0.1 sec', false],
        fail: [undefined, null, undefined, false],
      },
    },
    { id: 'multiDirectFail',
      pr: soon(800),
      at: started + 100,
      ...errTmo,
      ovr: {
        warn: [null, undefined, false],
        fail: [undefined, null, '0.1 sec', false],
      },
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
    ['warn', 'timeout soon: test[id=multiDirectWarn]'],
    ['warn', 'timeout soon: test[id=almost]'],
    ['warn', 'timeout soon: test[id=extended]'],
    ['warn', 'timeout soon: test[id=tooLate]'],
    ['warn', 'timeout soon: test[id=never]'],
    ['log', 'extending'],
    ['warn', 'timeout soon: test[id=extended]'],
  ]);
});
