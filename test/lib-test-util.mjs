import Promise from 'bluebird'
import omitKeys from 'lodash.omit'
import isRgx from 'is-regex'


function soon(ms, val) {
  if (val === undefined) { return soon(ms, (+ms / 1e3)) }
  return Promise.delay(ms, val)
}

function doom(errName, ms) {
  const err = new Error(errName)
  err.name = errName
  return soon(ms, Promise.reject(err))
}

const vlogChannels = [
  // console-like
  'debug',
  'error',
  'info',
  'log',
  'warn',

  // custom
  'result',
  'solved',
]

function makeVLogger() { // V = virtual, verifiable
  const vlog = []
  vlogChannels.forEach((chn) => {
    function log(...args) { vlog.push([chn, ...args]) }
    log.prep = (...pre) => (...args) => log(...pre, ...args)
    vlog[chn] = log
    return log
  })
  return vlog
}

function recordErrMsg(fmt, err) {
  if (!fmt) { return null }
  const msg = String(err.message || err)
  if (fmt === true) { return { errorMsg: msg } }
  if (isRgx(fmt)) {
    const m = fmt.exec(msg)
    return { errorMsg: (m ? m.slice() : false) }
  }
  return fmt(err)
}

function makePromiseObserver(sharedOpt) {
  async function obs(uniqueOpt) {
    const how = { ...sharedOpt, ...uniqueOpt }
    const report = { id: how.id }
    try {
      report.result = await how.pr
    } catch (rej) {
      report.errorName = (rej.name || null)
      Object.assign(report, recordErrMsg(how.wantErrMsg, rej))
    }
    const finished = Date.now()
    const late = finished - (+how.at || 0)
    const tolerance = (+how.tol || 25)
    if (late < 0) { report.tooEarly = late }
    if (late > tolerance) { report.tooLate = late }
    if (how.verify) {
      how.verify(report, omitKeys(how, [
        'pr',
        'at',
        'verify',
        'wantErrMsg',
      ]))
    }
    return report
  }
  return obs
}

export default {
  doom,
  makePromiseObserver,
  makeVLogger,
  soon,
}
