
<!--#echo json="package.json" key="name" underline="=" -->
@instaffogmbh/promise-timeout-with-warning
==========================================
<!--/#echo -->

<!--#echo json="package.json" key="description" -->
Limit how long to wait for a promise to resolve, with optional earlier
warning.
<!--/#echo -->

* 📣 💼 💰 Looking for a tech job?
  Try our [reverse recruiting service](https://instaffo.com/).



API
---

This module exports one function:

### ptww(origPr[, opts])

Returns a promise `tmoPr` that reflects `origPr`'s resolution or,
if that takes too long, is rejected with a timeout error.

`origPr` can be any value, e.g. a promise.
If it's not already a promise, `ptww` will instead use a new promise
resolved with that value.

`opts` is an optional options object that supports these keys:

* `warn`, `fail`: Each either strings with a human-readable timeout
  specification like `"30 sec"`, or `false` to deactivate that feature.
* `unwatched`: If `warn` and `fail` are both deactivated
  (i.e. no timers would be installed)
  and `unwatched` is set to sth. other than `undefined`,
  immediately return `unwatched` instead of dealing with any promise logic.
* `autostart`: If set to `false`, `ptww` won't start the timers immediately.
* `logger`: An `console`-like object to use for logging. Default: `console`
* `warnMsg`: A message to be logged when the `warn` timeout has elapsed.
* `failMsg`: Error message for the timeout promise rejection.
* `msg`: A message describing what still not happened yet.
  Used to extemporize `warnMsg` and/or `failMsg` if they're missing.
* `descr`: If no `msg` was provided, extemporize one from this noun.
* `startMsg`: If true-y, log this message when timers are (re-)started.
  Boolean `true` = extemporize from `msg`.
* `doneMsg`: If true-y, log this message when `origPr` solves duly.
  Boolean `true` = extemporize from `msg`.
* `vErr`: If set, `msg` must be a non-empty string.
  * `true`: wrap any rejections except TimeoutError in a
    [VError](https://www.npmjs.com/package/verror) using `msg`.
  * `"announce"`: like `true` but also extemporize `startMsg` and `doneMsg`
    in case they're false-y.
* `errorSubj`: If true-y, prefix non-timeout error messages with this
  topic/context description and `': '`.
* `subj`:  Like `errorSubj` but also affects the `…Msg` option values.
* `subjSuffix`: In case `subj` is used and this is neither set to the
  empty string nor false, put this between `subj` and the message.
  (Does not affect `errorSubj`.)
  Defaults to `': '` (a colon and a space).

`tmoPr` will expose these additional methods:

* `ifWatching()`: Returns `tmoPr` if any of the timers is currently installed,
  or `false` otherwise.
* `reset()`: Restart both timers.
  If you were warned already, you might be warned again.
* `unTimeout()`: Uninstall and abandon both timers.
  You can install new ones with `.reset()`.
  Returns `tmoPr`.



<!--#toc stop="scan" -->


&nbsp;


License
-------
<!--#echo json="package.json" key=".license" -->
MIT
<!--/#echo -->
