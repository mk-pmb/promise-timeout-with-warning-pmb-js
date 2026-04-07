import VError from 'verror'
import makeDeferred from 'p-defer'

import parseTimeoutDuration from './src/parseTimeoutDuration'

function neverSolved() {
  // Making a new promise each time _saves_ memory compared to a shared
  // never-resolved promise b/c the latter would accumulate the handlers.
  return new Promise(() => null)
}

function addSuffixToAll(o, s) {
  return (o.map ? o.map(x => `${x}${s}`) : `${o}${s}`)
}

function ensureStringMaybeAddSuffix(orig, suf, defaultSuffix) {
  if (!orig) { return '' }
  const str = String(orig)
  if (suf === '') { return str }
  if (suf === false) { return str }
  return `${str}${suf || defaultSuffix}`
}


function parseTimes(opt, role, ucRole) {
  const { timesCfg, action } = opt
  let tmo = role
  const ptdOpt = { timesCfg: opt, debug: opt.debug }
  if (timesCfg) {
    ptdOpt.timesCfg = timesCfg
    ptdOpt.INTERNAL = { fallbackDuration: opt[role] }
    tmo = action
    const fba = opt.fallbackActions
    if (fba) {
      tmo = [].concat(tmo, fba)
      // ^-- (string|array) + (string|array) -> array
    }
    tmo = addSuffixToAll(tmo, ucRole)
  }
  ptdOpt.max = addSuffixToAll(tmo, 'Max')
  return parseTimeoutDuration(tmo, ptdOpt)
}

function tryCatch(t, c) { try { return t() } catch (e) { return c(e) } }

const ptww = function promiseTimeoutWithWarning(origPr, origOpt) {
  const opt = { ...origOpt }
  const timer = tryCatch(() => ({
    warnSec: parseTimes(opt, 'warn', 'Warn'),
    failSec: parseTimes(opt, 'fail', 'Fail'),
    // defer throw until we can vWrapErr() it if requested:
  }), e => ({ errParseTimes: e }))

  if (!(timer.failSec || timer.warnSec || timer.errParseTimes)) {
    if (opt.unwatched !== undefined) { return opt.unwatched }
  }
  let {
    startMsg,
    doneMsg,
    warnMsg,
    failMsg,
    msg,
    subj,
    logger,
    vErr,
  } = opt

  if (vErr === 'announce') {
    vErr = true
    startMsg = (startMsg || true)
    doneMsg = (doneMsg || true)
  }
  if (!msg) { msg = (opt.descr || opt.action) }
  subj = ensureStringMaybeAddSuffix(subj, opt.subjSuffix, ': ')
  function vWrapErr(orig) {
    if (!orig) { return orig }
    if (vErr !== true) { return orig }
    if (orig.name === 'TimeoutError') { return orig }
    const { errorSubj } = opt
    const errMsg = `${errorSubj ? `${errorSubj}: ` : subj}${msg}`
    return new VError({ cause: orig, name: orig.name }, '%s', [errMsg])
  }
  if (timer.errParseTimes) { throw vWrapErr(timer.errParseTimes) }

  if (!logger) { logger = console }
  if (startMsg === true) { startMsg = `start: ${msg}` }
  if (doneMsg === true) { doneMsg = `done: ${msg}` }
  if (!warnMsg) { warnMsg = `timeout soon: ${msg}` }
  if (!failMsg) { failMsg = `timeout: ${msg}` }
  if (subj) {
    if (startMsg) { startMsg = `${subj}${startMsg}` }
    if (doneMsg) { doneMsg = `${subj}${doneMsg}` }
    warnMsg = `${subj}${warnMsg}`
    failMsg = `${subj}${failMsg}`
  }

  const basePr = Promise.resolve(origPr)
  const race = makeDeferred()
  basePr.then(race.resolve, race.reject)

  function clearTimerSlot(slot) {
    if (timer[slot]) { clearTimeout(timer[slot]) }
    timer[slot] = null
  }

  function stopTimers() {
    clearTimerSlot('warnTimer')
    clearTimerSlot('failTimer')
  }

  race.end = () => {
    stopTimers()
    race.end = null
  }
  const resultPr = race.promise.then((val) => {
    race.end()
    if (doneMsg) { logger.info(doneMsg) }
    return val
  }).then(null, (err) => {
    race.end()
    throw vWrapErr(err)
  })

  timer.warnNow = () => {
    timer.warnTimer = null
    logger.warn(warnMsg)
  }

  timer.failNow = () => {
    timer.failTimer = null
    race.reject(new VError({ name: 'TimeoutError' }, failMsg))
  }

  function startTimerSlot(slot) {
    const sec = timer[`${slot}Sec`]
    if (!sec) { return }
    const tmr = setTimeout(timer[`${slot}Now`], sec * 1e3)
    tmr.unref()
    timer[`${slot}Timer`] = tmr
  }

  function startTimers() {
    stopTimers()
    if (!race.end) { return } // race ended already
    if (startMsg) { logger.info(startMsg) }
    startTimerSlot('warn')
    startTimerSlot('fail')
  }

  function ifWatching() {
    if (timer.warnTimer || timer.failTimer) { return resultPr }
    return false
  }

  Object.assign(resultPr, {
    ifWatching,
    reset: startTimers,
    unTimeout() {
      stopTimers()
      return resultPr
    },
  })
  if (opt.tap) { opt.tap(resultPr) }
  if (opt.autostart !== false) { startTimers() }
  return resultPr
}


function preConfigure(coreCfg, actionCfg) {
  const cc = (coreCfg || false)
  const ac = (actionCfg ? {
    // coreCfg keys can act as fallback for actionCfg keys
    // but not the other way around.
    ...cc,
    ...actionCfg,
  } : cc)
  function pc(origPr, action, optOvr) {
    if (!action) { throw new Error(`no action given!`) }
    const opt = {
      ...cc,
      timesCfg: ac,
      msg: ac[`${action}Msg`],
      warnMsg: ac[`${action}WarnMsg`],
      failMsg: ac[`${action}FailMsg`],
      action,
      ...optOvr,
    }
    const pto = ptww(origPr, opt)
    pto.never = (...args) => pto(neverSolved(), ...args)
    return pto
  }
  return pc
}


Object.assign(ptww, {
  cfg: preConfigure,
  never(...args) { return ptww(neverSolved(), ...args) },
})
export default ptww
