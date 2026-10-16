(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) return;
  var WS = R.plannerWorkspace;
  if (!WS) return;
  var PV = R.planVersion;
  var LIB = window.InternshipLib;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }

  WS._renderVersionBrowser = function () {
    if (!PV) return '<div class="pw14-empty">PlanVersion engine در دسترس نیست</div>';
    var list = PV.listDetailed();
    if (list.length === 0) return '<div class="pw14-empty">هیچ نسخه‌ای ثبت نشده</div>';
    var rows = list.map(function (v) {
      return '<div class="pw15-version-row" data-pw15-vid="' + _esc(v.id) + '">' +
        '<span class="pw15-version-num">v' + _fa(v.version) + '</span>' +
        '<span class="pw15-version-trigger">' + _esc(v.triggerType) + '</span>' +
        '<span class="pw15-version-reason">' + _esc((v.reason || "").slice(0, 60)) + '</span>' +
        '<span class="pw15-version-status is-' + _esc(v.status) + '">' + _esc(v.status) + '</span>' +
        '<button class="pw14-mini" data-pw15-v-details="' + _esc(v.id) + '">جزئیات</button>' +
        '<button class="pw14-mini" data-pw15-v-compare="' + _esc(v.id) + '">مقایسه</button>' +
        '<button class="pw14-mini" data-pw15-v-revert="' + _esc(v.id) + '">بازگردانی</button>' +
      '</div>';
    }).join("");
    return '<div class="pw15-versions">' + rows + '</div>' +
      '<div id="pw15-version-detail" class="pw15-version-detail"></div>';
  };

  // Extend proposal tab to include version browser
  var _origPropTab = WS._renderProposalTab;
  WS._renderProposalTab = function () {
    var base = typeof _origPropTab === "function" ? _origPropTab() : "";
    return base + '<div class="pw14-prop-section">' +
      '<div class="pw14-prop-sec-title">📜 PlanVersion Browser</div>' +
      WS._renderVersionBrowser() +
    '</div>';
  };

  // Wire version buttons
  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }
    var o = document.querySelector(".pw14-overlay");
    if (!o) return;

    o.querySelectorAll("[data-pw15-v-details]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-pw15-v-details");
        var v = PV.getById(id);
        var out = o.querySelector("#pw15-version-detail");
        if (!out || !v) return;
        out.innerHTML = '<div class="pw15-v-detail">' +
          '<div class="pw15-v-kv"><span>Version</span><span>v' + _fa(v.version) + '</span></div>' +
          '<div class="pw15-v-kv"><span>Trigger</span><span>' + _esc(v.triggerType) + '</span></div>' +
          '<div class="pw15-v-kv"><span>Status</span><span>' + _esc(v.status) + '</span></div>' +
          '<div class="pw15-v-kv"><span>Reason</span><span>' + _esc(v.reason || "—") + '</span></div>' +
          '<div class="pw15-v-kv"><span>Created</span><span>' + _fa(v.createdAt || "—") + '</span></div>' +
          '<div class="pw15-v-kv"><span>Hash</span><span>' + _esc(v.hash || "—") + '</span></div>' +
        '</div>';
      });
    });

    o.querySelectorAll("[data-pw15-v-compare]").forEach(function (b) {
      b.addEventListener("click", function () {
        var idA = b.getAttribute("data-pw15-v-compare");
        var list = PV.listDetailed();
        var earlier = list.slice().reverse().find(function (x) { return x.id !== idA; });
        if (!earlier) { WS._toast && WS._toast("نسخه‌ی قبلی برای مقایسه نیست"); return; }
        var cmp = PV.compareVersions(earlier.id, idA);
        var out = o.querySelector("#pw15-version-detail");
        if (!out) return;
        var md = cmp.metadataDiff || {};
        var mdRows = Object.keys(md).map(function (k) {
          return '<div class="pw15-v-kv"><span>' + _esc(k) + '</span><span>' + _esc(md[k].before) + ' → ' + _esc(md[k].after) + '</span></div>';
        }).join("");
        out.innerHTML = '<div class="pw15-v-detail">' +
          '<div class="pw15-v-kv"><span>نسخه‌ی قبل</span><span>v' + _fa(cmp.a ? cmp.a.version : "?") + '</span></div>' +
          '<div class="pw15-v-kv"><span>نسخه‌ی بعد</span><span>v' + _fa(cmp.b ? cmp.b.version : "?") + '</span></div>' +
          mdRows +
          '<div class="pw14-prop-sec-title" style="margin-top:10px">Note: activity-level diff requires stored snapshot (not present in Phase 15).</div>' +
        '</div>';
      });
    });

    o.querySelectorAll("[data-pw15-v-revert]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-pw15-v-revert");
        var preview = PV.previewRevert(id);
        var out = o.querySelector("#pw15-version-detail");
        if (!out) return;
        out.innerHTML = '<div class="pw15-v-detail">' +
          '<div class="pw15-v-kv"><span>نسخه‌ی هدف</span><span>v' + _fa(preview.targetVersion) + '</span></div>' +
          '<div class="pw15-v-kv"><span>فعالیت‌های محافظت‌شده</span><span>' + _fa(preview.protectedCount) + '</span></div>' +
          '<div class="pw15-v-note">' + _esc(preview.note) + '</div>' +
        '</div>';
      });
    });
  };

  console.log("[workspace.v15.planversion] loaded");
})();