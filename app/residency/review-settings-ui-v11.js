(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.settings.ui.v11] R missing"); return; }
  var SU = R.reviewSettingsUI = R.reviewSettingsUI || {};
  var LIB = window.InternshipLib;
  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }

  var _overlay = null;

  SU.open = function () {
    if (_overlay) _overlay.remove();
    _overlay = document.createElement("div");
    _overlay.className = "rv11-overlay";
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    _render();
  };

  SU.close = function () {
    if (!_overlay) return;
    _overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { if (_overlay) { _overlay.remove(); _overlay = null; } }, 220);
  };

  function _render() {
    if (!_overlay) return;
    var s = R.store.getReviewSettings();
    var html = '';
    html += '<div class="rv11-panel">';
    html += '<header class="rv11-header"><div class="rv11-title">⚙️ تنظیمات مرور</div><button class="rv11-close" data-rv11-close>✕</button></header>';
    html += '<div class="rv11-body">';
    html += _row("فعال", "enabled", "checkbox", s.enabled);
    html += _row("حداقل فاصله (روز)", "minIntervalDays", "number", s.minIntervalDays, { min: 1, max: 365 });
    html += _row("حداکثر فاصله (روز)", "maxIntervalDays", "number", s.maxIntervalDays, { min: 1, max: 3650 });
    html += _row("سقف روزانه مرور", "dailyReviewLimit", "number", s.dailyReviewLimit, { min: 1, max: 200 });
    html += _row("حداکثر دقیقه در روز", "maxReviewMinutesPerDay", "number", s.maxReviewMinutesPerDay, { min: 5, max: 600 });
    html += _row("سیاست Overdue", "overduePolicy", "select", s.overduePolicy, { options: ["spread","priority","all"] });
    html += _row("افق پیش‌بینی (روز)", "horizonDays", "number", s.horizonDays, { min: 1, max: 180 });
    html += _row("ثبت خودکار از Study", "autoRegisterOnStudyComplete", "checkbox", s.autoRegisterOnStudyComplete);
    html += '<div id="rv11-error" class="rv11-error" style="display:none"></div>';
    html += '<div class="rv11-actions">';
    html += '<button class="rv11-btn rv11-btn-primary" data-rv11-save>💾 ذخیره</button>';
    html += '<button class="rv11-btn" data-rv11-reset>↺ پیش‌فرض</button>';
    html += '<button class="rv11-btn" data-rv11-close>انصراف</button>';
    html += '</div>';
    html += '</div></div>';
    _overlay.innerHTML = html;
    _wire();
  }

  function _row(label, key, type, value, extra) {
    extra = extra || {};
    var input = "";
    if (type === "checkbox") {
      input = '<input type="checkbox" data-rv11-key="' + _esc(key) + '"' + (value ? " checked" : "") + '>';
    } else if (type === "number") {
      input = '<input type="number" data-rv11-key="' + _esc(key) + '" value="' + _esc(value) + '"' +
        (extra.min != null ? ' min="' + extra.min + '"' : "") +
        (extra.max != null ? ' max="' + extra.max + '"' : "") + '>';
    } else if (type === "select") {
      var opts = (extra.options || []).map(function (o) {
        return '<option value="' + _esc(o) + '"' + (o === value ? " selected" : "") + '>' + _esc(o) + '</option>';
      }).join("");
      input = '<select data-rv11-key="' + _esc(key) + '">' + opts + '</select>';
    }
    return '<div class="rv11-row"><label>' + _esc(label) + '</label><div class="rv11-input">' + input + '</div></div>';
  }

  function _wire() {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-rv11-close]").forEach(function (b) {
      b.addEventListener("click", SU.close);
    });
    _overlay.addEventListener("click", function (e) { if (e.target === _overlay) SU.close(); });
    var saveBtn = _overlay.querySelector("[data-rv11-save]");
    if (saveBtn) saveBtn.addEventListener("click", _onSave);
    var resetBtn = _overlay.querySelector("[data-rv11-reset]");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      if (!confirm("بازگشت به مقادیر پیش‌فرض؟")) return;
      R.store.updateReviewSettings(R.createDefaultReviewSettings());
      _render();
    });
  }

  function _onSave() {
    var payload = {};
    _overlay.querySelectorAll("[data-rv11-key]").forEach(function (el) {
      var key = el.getAttribute("data-rv11-key");
      if (el.type === "checkbox") payload[key] = el.checked;
      else if (el.type === "number") payload[key] = parseInt(el.value, 10);
      else payload[key] = el.value;
    });
    var errs = _validate(payload);
    if (errs.length > 0) {
      var e = _overlay.querySelector("#rv11-error");
      if (e) { e.style.display = "block"; e.textContent = "❌ " + errs.join(" · "); }
      return;
    }
    R.store.updateReviewSettings(payload);
    SU.close();
  }

  function _validate(p) {
    var e = [];
    if (p.minIntervalDays != null && p.minIntervalDays < 1) e.push("min < 1");
    if (p.maxIntervalDays != null && p.maxIntervalDays < 1) e.push("max < 1");
    if (p.minIntervalDays != null && p.maxIntervalDays != null && p.minIntervalDays > p.maxIntervalDays) {
      e.push("min > max");
    }
    if (p.dailyReviewLimit != null && p.dailyReviewLimit < 1) e.push("limit < 1");
    if (p.maxReviewMinutesPerDay != null && p.maxReviewMinutesPerDay < 1) e.push("minutes < 1");
    if (p.horizonDays != null && p.horizonDays < 1) e.push("horizon < 1");
    if (p.overduePolicy != null && ["spread","priority","all"].indexOf(p.overduePolicy) === -1) {
      e.push("invalid policy");
    }
    return e;
  }

  console.log("[residency.review.settings.ui.v11] loaded");
})();