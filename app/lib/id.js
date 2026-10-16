/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — ID Generation  ·  v1.0.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var LIB = window.InternshipLib = window.InternshipLib || {};
  var ID = LIB.id = LIB.id || {};

  function _rand() {
    return Math.random().toString(36).slice(2, 6);
  }

  function _mk(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + _rand();
  }

  function makeTaskId()      { return _mk("t"); }
  function makeRotationId()  { return _mk("r"); }
  function makeShiftId()     { return _mk("s"); }
  function makeCaseId()      { return _mk("c"); }
  function makeContentId(prefix) { return _mk(prefix || "id"); }

  ID.task = makeTaskId;
  ID.rotation = makeRotationId;
  ID.shift = makeShiftId;
  ID.case = makeCaseId;
  ID.content = makeContentId;
})();