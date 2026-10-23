(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R || !R.studyTogether) {
    console.warn("[study-together-tests] module missing");
    return;
  }
  R.studyTogetherTests = {
    VERSION: "1.0.0",
    run: function () {
      try { return R.studyTogether.__tests(); }
      catch (e) { return { passed: 0, total: 0, results: [{ name: "run", pass: false, error: String(e) }] }; }
    }
  };
  /* Defer bridge install until boot() has created window.__os.
     boot() reassigns window.__os = { getState, ... } — replacing any
     earlier object — so we poll until getState exists, then attach. */
  (function installBridge(tries) {
    if (tries <= 0) { console.warn("[study-together-tests] bridge install timeout"); return; }
    if (window.__os && typeof window.__os.getState === "function") {
      window.__os.studyTogetherTests = R.studyTogetherTests.run;
      return;
    }
    setTimeout(function () { installBridge(tries - 1); }, 100);
  })(50);
  console.log("[study-together-tests] loaded v" + R.studyTogetherTests.VERSION);
})();