(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) return;
  var WS = R.plannerWorkspace;
  if (!WS) return;
  var NAV = R.calendarNavigation;

  WS._tryMoveActivityTime = function (id, newDate, newStartTime) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return;
    var a = (s.residency.activities || []).find(function (x) { return x.id === id; });
    if (!a) { WS._toast && WS._toast("فعالیت یافت نشد"); return; }

    if (a.locked) { WS._toast && WS._toast("🔒 فعالیت قفل است"); return; }
    if (a.status === "completed" || a.status === "cancelled" || a.status === "skipped") {
      WS._toast && WS._toast("این فعالیت قابل جابه‌جایی نیست"); return;
    }
    var today = (window.InternshipLib && window.InternshipLib.date)
      ? window.InternshipLib.date.todayJalaliString() : "";
    if (a.plannedDate && today && window.InternshipLib.date.compareJalaliDate(a.plannedDate, today) < 0) {
      WS._toast && WS._toast("فعالیت گذشته قابل جابه‌جایی نیست"); return;
    }

    var snapped = newStartTime ? NAV.snapToGrid(newStartTime) : null;
    if (newStartTime && !snapped) { WS._toast && WS._toast("ساعت نامعتبر"); return; }

    // Overlap check
    var candidate = Object.assign({}, a, { plannedDate: newDate, plannedStartTime: snapped });
    var overlaps = NAV.findOverlaps(candidate, s.residency.activities || []);
    if (overlaps.length > 0) {
      WS._toast && WS._toast("⚠️ تداخل با " + overlaps.length + " فعالیت دیگر");
      return;
    }

    var patch = { plannedDate: newDate };
    if (snapped !== null) patch.plannedStartTime = snapped;
    var res = R.store.updateActivity(id, patch);
    if (res) {
      WS._toast && WS._toast("منتقل شد" + (snapped ? " به " + snapped : ""));
      WS.rerender && WS.rerender();
    } else {
      WS._toast && WS._toast("جابه‌جایی رد شد");
    }
  };

  console.log("[workspace.v15.move] loaded");
})();