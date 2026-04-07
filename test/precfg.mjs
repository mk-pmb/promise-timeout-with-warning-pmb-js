import test from 'p-tape'

import libTestUtil from './lib-test-util'
import prTimeoutWarn from '../pto.node'

const { soon, makePromiseObserver } = libTestUtil
const errTmo = { errorName: 'TimeoutError' }

test('preconfigured', async(t) => {
  const verifyPr = makePromiseObserver({ verify: t.deepEqual })
  const logger = libTestUtil.makeVLogger()
  const cfgSect = {
    quickDbReadWarn: '0.2 sec',
    quickDbReadFail: '0.4 sec',
    slowDbReadWarn: '0.2 sec',
    slowDbReadFail: '0.4 sec',
    transferWarn: '0.3 sec',
    transferFail: '0.5 sec',
    uploadWarn: null,
    downloadWarn: null,
  }
  const prTmo = prTimeoutWarn.cfg({ logger }, cfgSect)
  function obs(spec, ovr) {
    return verifyPr({ ...spec, pr: prTmo(spec.pr, spec.id, ovr) })
  }
  function provokeErrInval(id, ovr) {
    return () => obs({ id, pr: soon(100) }, { vErr: true, ...ovr })
  }
  function throwsPr(f, e) { return (async() => t.throws(f, e))() }
  const started = Date.now()

  const observed = [
    obs({ id: 'quickDbRead',
      pr: soon(100),
      at: started + 100,
      result: 0.1,
    }, { vErr: 'announce' }),
    obs({ id: 'slowDbRead',
      pr: soon(500),
      at: started + 400,
      ...errTmo,
    }, { vErr: 'announce' }),
    obs({ id: 'transfer',
      pr: soon(600),
      at: started + 500,
      ...errTmo,
    }, { msg: 'still transfering' }),
    throwsPr(
      provokeErrInval('unconfigured'),
      /^InvalidDuration: .* primary .* in config key "unconfiguredWarn"/
    ),
    throwsPr(
      provokeErrInval('unconfigured', { subj: 'FailWhale' }),
      /^InvalidDuration: FailWhale: .* primary .* in config/
    ),
    throwsPr(
      provokeErrInval('unconfigured', { warn: false }),
      /^InvalidDuration: .* primary .* in config key "unconfiguredFail"/
    ),
    throwsPr(
      provokeErrInval('unconfigured', { warn: 'bogus' }),
      /^InvalidDuration: .* primary .* in fallback.* for .*"unconfiguredWarn"/
    ),
    throwsPr(
      provokeErrInval('upload'),
      /Invalid primary timeout spec "null" in config key "uploadWarn"/
    ),
    obs({ id: 'download',
      pr: soon(100),
      at: started + 100,
      result: 0.1,
    }, { fallbackActions: 'transfer' }),
  ]

  t.plan(observed.length + 1) // +1 = log verification

  await Promise.all(observed)
  t.deepEqual(logger.slice(), [
    ['info', 'start: quickDbRead'],
    ['info', 'start: slowDbRead'],
    ['info', 'done: quickDbRead'],
    ['warn', 'timeout soon: slowDbRead'],
    ['warn', 'timeout soon: still transfering'],
  ])
})
