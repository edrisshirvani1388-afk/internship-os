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
      var hasSnap = PV.hasSnapshot(v.id);
      var snapBadge = hasSnap
        ? '<span class="pw17-badge is-snap">📸 ' + _fa(v.snapshot ? (v.snapshot.activityCount || 0) : 0) + '</span>'
        : '<span class="pw17-badge is-nosnap">Snapshot unavailable</span>';
      var canCompare = hasSnap;
      return '<div class="pw15-version-row" data-pw15-vid="' + _esc(v.id) + '">' +
        '<span class="pw15-version-num">v' + _fa(v.version) + '</span>' +
        '<span class="pw15-version-trigger">' + _esc(v.triggerType) + '</span>' +
        snapBadge +
        '<span class="pw15-version-status is-' + _esc(v.status) + '">' + _esc(v.status) + '</span>' +
        '<button class="pw14-mini" data-pw17-v-compare="' + _esc(v.id) + '"' + (canCompare ? "" : " disabled") + '>مقایسه</button>' +
        '<button class="pw14-mini" data-pw17-v-revert="' + _esc(v.id) + '"' + (canCompare ? "" : " disabled") + '>بازگردانی</button>' +
      '</div>';
    }).join("");
    return '<div class="pw15-versions">' + rows + '</div>' +
      '<div id="pw17-version-detail" class="pw15-version-detail"></div>';
  };

  var _origPropTab = WS._renderProposalTab;
  WS._renderProposalTab = function () {
    var base = typeof _origPropTab === "function" ? _origPropTab() : "";
    return base + '<div class="pw14-prop-section">' +
      '<div class="pw14-prop-sec-title">📜 PlanVersion Browser (Snapshot v17)</div>' +
      WS._renderVersionBrowser() +
    '</div>';
  };

  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }
    var o = document.querySelector(".pw14-overlay");
    if (!o) return;

    o.querySelectorAll("[data-pw17-v-compare]").forEach(function (b) {
      b.addEventListener("click", function () {
        var idA = b.getAttribute("data-pw17-v-compare");
        var list = PV.listDetailed();
        var earlier = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id !== idA && PV.hasSnapshot(list[i].id)) { earlier = list[i]; break; }
        }
        var out = o.querySelector("#pw17-version-detail");
        if (!out) return;
        if (!earlier) { out.innerHTML = '<div class="pw15-v-note">نسخه‌ی دیگری با snapshot برای مقایسه نیست.</div>'; return; }
        var cmp = PV.compare(earlier.id, idA);
        out.innerHTML = _renderCompare(cmp, earlier.version, PV.getById(idA).version);
      });
    });

    o.querySelectorAll("[data-pw17-v-revert]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-pw17-v-revert");
        var prev = PV.previewRevert(id);
        var out = o.querySelector("#pw17-version-detail");
        if (!out) return;
        if (!prev.ok) { out.innerHTML = '<div class="pw15-v-note">' + _esc(prev.error || "خطا") + '</div>'; return; }
        out.innerHTML = _renderRevertPreview(prev);
        out.querySelectorAll("[data-pw17-apply-revert]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!confirm("بازگردانی اعمال شود؟")) return;
            var res = PV.applyRevert(id, { preview: prev });
            if (res.success) {
              out.innerHTML = '<div class="pw15-v-detail">' +
                '<div class="pw15-v-kv"><span>اعمال‌شده</span><span>' + _fa(res.applied.length) + '</span></div>' +
                '<div class="pw15-v-kv"><span>skip شده</span><span>' + _fa(res.skipped.length) + '</span></div>' +
                '<div class="pw15-v-kv"><span>نسخه‌ی جدید</span><span>v' + _fa(res.newVersionNumber) + '</span></div>' +
              '</div>';
              WS._toast && WS._toast("بازگردانی اعمال شد");
            } else {
              out.innerHTML = '<div class="pw15-v-note">خطا: ' + _esc(res.reason) + '</div>';
            }
          });
        });
      });
    });
  };

  function _renderCompare(cmp, vA, vB) {
    if (!cmp || cmp.error) return '<div class="pw15-v-note">' + _esc((cmp && cmp.error) || "no_compare") + '</div>';
    var s = cmp.summary || {};
    var html = '<div class="pw17-cmp">' +
      '<div class="pw17-cmp-head">v' + _fa(vA) + ' → v' + _fa(vB) + '</div>' +
      '<div class="pw17-cmp-strip">' +
        '<span class="pw17-cmp-chip is-added">🟢 ' + _fa(s.addedCount) + '</span>' +
        '<span class="pw17-cmp-chip is-removed">🔴 ' + _fa(s.removedCount) + '</span>' +
        '<span class="pw17-cmp-chip is-modified">🟡 ' + _fa(s.modifiedCount) + '</span>' +
        '<span class="pw17-cmp-chip is-unchanged">🔵 ' + _fa(s.unchangedCount) + '</span>' +
      '</div>';
    if (cmp.modified.length > 0) {
      html += '<div class="pw17-cmp-list">' + cmp.modified.slice(0, 20).map(function (m) {
        var ch = m.changes.map(function (c) {
          return '<span class="pw17-chg">' + _esc(c.field) + ': ' + _esc(c.before) + ' → ' + _esc(c.after) + '</span>';
        }).join("");
        return '<div class="pw17-cmp-row"><div class="pw17-cmp-id">' + _esc(m.activityId) + '</div>' +
          '<div class="pw17-cmp-changes">' + ch + '</div></div>';
      }).join("") + '</div>';
    }
    if (cmp.added.length > 0) {
      html += '<div class="pw17-cmp-list"><div class="pw17-cmp-sub">Added</div>' + cmp.added.slice(0, 10).map(function (a) {
        return '<div class="pw17-cmp-row"><div class="pw17-cmp-id">' + _esc(a.id) + '</div>' +
          '<div>' + _esc(a.title || a.kind || "") + ' @ ' + _esc(a.plannedDate || "") + '</div></div>';
      }).join("") + '</div>';
    }
    if (cmp.removed.length > 0) {
      html += '<div class="pw17-cmp-list"><div class="pw17-cmp-sub">Removed</div>' + cmp.removed.slice(0, 10).map(function (a) {
        return '<div class="pw17-cmp-row"><div class="pw17-cmp-id">' + _esc(a.id) + '</div>' +
          '<div>' + _esc(a.title || a.kind || "") + ' @ ' + _esc(a.plannedDate || "") + '</div></div>';
      }).join("") + '</div>';
    }
    html += '</div>';
    return html;
  }

  function _renderRevertPreview(prev) {
    var s = prev.summary || {};
    var html = '<div class="pw17-revert">' +
      '<div class="pw17-revert-head">پیش‌نمایش بازگردانی به v' + _fa(prev.sourceVersion) + '</div>' +
      '<div class="pw17-cmp-strip">' +
        '<span class="pw17-cmp-chip is-added">restore ' + _fa(s.restoreCount) + '</span>' +
        '<span class="pw17-cmp-chip is-modified">update ' + _fa(s.updateCount) + '</span>' +
        '<span class="pw17-cmp-chip is-removed">remove ' + _fa(s.removeCount) + '</span>' +
        '<span class="pw17-cmp-chip is-unchanged">skipped ' + _fa(s.totalSkipped) + '</span>' +
      '</div>';

    if (prev.changes.length > 0) {
      html += '<div class="pw17-cmp-list"><div class="pw17-cmp-sub">تغییرات</div>' + prev.changes.slice(0, 20).map(function (c) {
        var detail = '';
        if (c.action === "update") {
          detail = c.changes.map(function (ch) { return _esc(ch.field) + ': ' + _esc(ch.before) + ' → ' + _esc(ch.after); }).join(" · ");
        } else if (c.action === "restore") {
          detail = 'بازگردانی ' + _esc((c.target && (c.target.title || c.target.kind)) || "");
        } else if (c.action === "remove") {
          detail = 'لغو ' + _esc((c.before && (c.before.title || c.before.kind)) || "");
        }
        return '<div class="pw17-cmp-row"><div class="pw17-cmp-id is-' + _esc(c.action) + '">' + _esc(c.action) + '</div>' +
          '<div class="pw17-cmp-changes">' + detail + '</div></div>';
      }).join("") + '</div>';
    }

    if (prev.skipped.length > 0) {
      html += '<div class="pw17-cmp-list"><div class="pw17-cmp-sub">skip شده</div>' + prev.skipped.slice(0, 10).map(function (sk) {
        return '<div class="pw17-cmp-row"><div class="pw17-cmp-id">' + _esc(sk.activityId) + '</div>' +
          '<div>' + _esc(sk.reason) + '</div></div>';
      }).join("") + '</div>';
    }

    if (prev.warnings.length > 0) {
      html += '<div class="pw17-warn-list">' + prev.warnings.slice(0, 5).map(function (w) {
        return '<div class="pw17-warn">⚠️ ' + _esc(w) + '</div>';
      }).join("") + '</div>';
    }

    html += '<div class="cg12-actions" style="margin-top:12px">' +
      '<button class="cg12-btn cg12-btn-primary" data-pw17-apply-revert' + (prev.canRevert ? "" : " disabled") + '>✅ اعمال بازگردانی</button>' +
    '</div></div>';
    return html;
  }

  console.log("[workspace.v17.planversion] loaded");
})();