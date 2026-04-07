import parseHumanDuration from 'timestring-notsep';
import flatten from 'flatten';
import VError from 'verror';

const maxSignedInt32 = (2 ** 31) - 1;
const maxJsTimeoutSec = maxSignedInt32 / 1e3;
const posInf = Number.POSITIVE_INFINITY;

function noop() {}

function fail(ErrCls, name, msg) {
  const err = new ErrCls(msg);
  err.name = name;
  throw err;
}

function translateOff(opt) {
  if (!opt) { return false; }
  const { off } = opt;
  if (off === 'inf') { return posInf; }
  if (off === 'max') { return maxJsTimeoutSec; }
  if (off === 'err') {
    return fail(Error, 'DurationRequired', 'Timeout duration required');
  }
  return false;
}

function assertValidRange(sec) {
  if (sec < 1e-3) {
    fail(RangeError, 'DurationTooShort',
      'Timeout must be at least 1 ms, or false or "max"');
  }
  if (sec > maxJsTimeoutSec) {
    fail(RangeError, 'DurationTooLong',
      `Maximum supported timeout is ${maxJsTimeoutSec} sec`);
  }
}

function isDecisive(x) {
  return ((x !== undefined)
    && (x !== null)
    && (x !== '')
  );
}

function ptdLookup(role, keyOrDura, opt, cfgDict) {
  let dura = keyOrDura;
  let cfgKey;
  let sourceDescr = 'hard-coded config';
  if (cfgDict) { cfgKey = keyOrDura; }
  let dbg = noop;
  if (opt.debug) {
    console.trace('dict:', { ...cfgDict, logger: typeof logger });
    dbg = (opt.debug
      ? where => console.debug(where, { dura, cfgKey })
      : () => null);
  }
  if (cfgDict && Array.isArray(dura)) {
    dura = flatten(dura);
    cfgKey = dura.find(k => ((k !== undefined)
      && isDecisive(cfgDict[k])));
    // ^- Flat check: Keys that will lead to arrays will be treated
    //    as decision to delegate, and we accept only one delegatee.
    //    If that one is indecisive, either accept it or simplify
    //    your config.
    if (cfgKey === undefined) { [cfgKey] = dura; }
  }
  if (cfgDict) {
    dura = cfgDict[cfgKey];
    sourceDescr = `config key "${cfgKey}"`;
  }
  dbg('looked up');
  if (Array.isArray(dura)) { dura = flatten(dura).find(isDecisive); }

  if (!isDecisive(dura)) {
    const fbd = (opt.INTERNAL || false).fallbackDuration;
    // ^- named "…Duration" b/c it always bypasses cfgDict
    //    i.e. is never used as a cfgKey.
    if (isDecisive(fbd)) {
      dura = fbd;
      sourceDescr = `fallbackDuration for ${sourceDescr}`;
    }
  }
  if (!isDecisive(dura)) {
    if (opt.optional) { return false; }
  }
  if (dura === 'max') { return maxJsTimeoutSec; }
  try {
    if (dura === false) { return translateOff(opt); }
    const sec = parseHumanDuration(dura);
    assertValidRange(sec);
    return sec;
  } catch (inval) {
    throw new VError({ cause: inval, name: inval.name },
      'Invalid %s timeout spec "%s" in %s',
      role, dura, sourceDescr);
  }
}

const ptd = function parseTimeoutDuration(spec, opt) {
  const safeOpt = (opt || false);
  let { timesCfg } = safeOpt;
  if (timesCfg === true) { timesCfg = opt; }
  const sec = ptdLookup('primary', spec, safeOpt, timesCfg);
  const max = ptdLookup('maximum', safeOpt.max, {
    ...safeOpt,
    optional: true,
    secretFallback: undefined,
  }, timesCfg);
  if (max === false) { return sec; }
  if (sec === false) { return max; }
  return Math.min(sec, max);
};


Object.assign(ptd, {
  maxJsTimeoutSec,
});
export default ptd;
