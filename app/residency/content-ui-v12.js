(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.ui.v12] R missing"); return; }
  var UI = R.contentUI = R.contentUI = R.contentUI || {};
  var LIB = window.InternshipLib;
  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }

  var _overlay = null;
  var _state = { step: "form", def: null, preview: null, error: null, generating: false, applied: null };
  var _formState = {
    areaId: "clinical",
    contentMapId: "",
    contentType: "disease",
    topic: "",
    depth: "intermediate",
    generationMode: "single",
    constraints: "",
    createLinkedTask: false,
    mergeAction: "skip"
  };

  UI.open = function () {
    if (_overlay) _overlay.remove();
    _overlay = document.createElement("div");
    _overlay.className = "cg12-overlay";
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    _render();
  };
  UI.close = function () {
    if (!_overlay) return;
    _overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { if (_overlay) { _overlay.remove(); _overlay = null; } }, 220);
  };

  function _render() {
    if (!_overlay) return;
    var body = _renderHeader();
    if (_state.step === "form") body += _renderForm();
    else if (_state.step === "generating") body += _renderGenerating();
    else if (_state.step === "preview") body += _renderPreview();
    else if (_state.step === "applied") body += _renderApplied();
    _overlay.innerHTML = body + '</div>';
    _wire();
  }

  function _renderHeader() {
    return '<div class="cg12-panel">' +
      '<header class="cg12-header"><div class="cg12-title">🤖 تولید محتوا با AI</div>' +
      '<button class="cg12-close" data-cg12-close>✕</button></header>' +
      '<div class="cg12-body">';
  }

  function _renderForm() {
    var AREAS = ["clinical","study","emergency","procedures","residency","body","income","life"];
    var TYPES = R.contentDomain.TYPES;
    var MODES = R.contentDomain.MODES;
    var AREA_LABELS = {
      clinical: "بالینی", study: "مطالعه", emergency: "اورژانس",
      procedures: "پروسیجرها", residency: "رزیدنتی",
      body: "جسمی", income: "درآمد", life: "زندگی"
    };
    var areaOpts = AREAS.map(function (a) {
      return '<option value="' + a + '"' + (a === _formState.areaId ? " selected" : "") + '>' + _esc(AREA_LABELS[a] || a) + '</option>';
    }).join("");
    var typeOpts = TYPES.map(function (t) {
      return '<option value="' + t + '"' + (t === _formState.contentType ? " selected" : "") + '>' + _esc(t) + '</option>';
    }).join("");
    var modeOpts = MODES.map(function (m) {
      return '<option value="' + m + '"' + (m === _formState.generationMode ? " selected" : "") + '>' + _esc(m) + '</option>';
    }).join("");

    var errBox = _state.error
      ? '<div class="cg12-error">❌ ' + _esc(_state.error) + '</div>'
      : "";

    return '<section class="cg12-section">' +
      errBox +
      _row("Area", '<select data-cg12-field="areaId">' + areaOpts + '</select>') +
      _row("Content Map ID", '<input type="text" data-cg12-field="contentMapId" value="' + _esc(_formState.contentMapId) + '" placeholder="مثال: clinical.0.1.2">') +
      _row("Content Type", '<select data-cg12-field="contentType">' + typeOpts + '</select>') +
      _row("موضوع", '<input type="text" data-cg12-field="topic" value="' + _esc(_formState.topic) + '" placeholder="مثال: Acute MI">') +
      _row("سطح", '<select data-cg12-field="depth">' +
        ['basic','intermediate','advanced'].map(function (d) {
          return '<option value="' + d + '"' + (d === _formState.depth ? " selected" : "") + '>' + _esc(d) + '</option>';
        }).join("") + '</select>') +
      _row("حالت", '<select data-cg12-field="generationMode">' + modeOpts + '</select>') +
      _row("محدودیت‌ها (هر خط یکی)", '<textarea data-cg12-field="constraints" rows="3">' + _esc(_formState.constraints) + '</textarea>') +
      _row("ایجاد تسک مرتبط", '<input type="checkbox" data-cg12-field="createLinkedTask"' + (_formState.createLinkedTask ? " checked" : "") + '>') +
      '</section>' +
      '<div class="cg12-actions">' +
        '<button class="cg12-btn cg12-btn-primary" data-cg12-generate>🚀 تولید</button>' +
        '<button class="cg12-btn" data-cg12-close>انصراف</button>' +
      '</div>';
  }

  function _row(label, html) {
    return '<div class="cg12-row"><label>' + _esc(label) + '</label><div class="cg12-input">' + html + '</div></div>';
  }

  function _renderGenerating() {
    return '<div class="cg12-generating"><div class="cg12-spinner"></div><div>در حال تولید محتوا...</div></div>';
  }

  function _renderPreview() {
    var p = _state.preview;
    if (!p) return '<div class="cg12-error">پیش‌نمایش موجود نیست</div>';
    var v = p.validation;
    var d = p.def;
    var html = "";

    html += '<section class="cg12-section"><div class="cg12-sec-title">اعتبارسنجی</div>';
    if (v.valid) html += '<div class="cg12-ok">✅ معتبر</div>';
    else html += '<div class="cg12-error">❌ ' + _fa(v.errors.length) + ' خطا</div>';
    if (v.warnings.length > 0) {
      html += '<div class="cg12-warn">⚠️ ' + _fa(v.warnings.length) + ' هشدار</div>';
      html += '<ul>' + v.warnings.slice(0, 8).map(function (w) { return '<li>' + _esc(w) + '</li>'; }).join("") + '</ul>';
    }
    html += '</section>';

    if (p.safety.flags.length > 0) {
      html += '<section class="cg12-section"><div class="cg12-sec-title">ایمنی پزشکی</div>' +
        '<div class="cg12-warn">⚠️ ' + _fa(p.safety.flags.length) + ' flag safety</div>' +
        '<ul>' + p.safety.flags.slice(0, 6).map(function (f) {
          return '<li>' + _esc(f.patternId + " (" + f.category + ")") + '</li>';
        }).join("") + '</ul></section>';
    }

    html += '<section class="cg12-section"><div class="cg12-sec-title">مشاهده</div>' +
      '<div class="cg12-preview-title">' + _esc(d.title) + '</div>' +
      '<div class="cg12-preview-desc">' + _esc(d.description) + '</div>' +
      '<div class="cg12-preview-meta">' + _fa(d.sections.length) + ' section · نوع: ' + _esc(d.contentType) + '</div>' +
      '</section>';

    // Sections with checkboxes for partial approval
    html += '<section class="cg12-section"><div class="cg12-sec-title">بخش‌ها (برای تأیید جزئی)</div>' +
      d.sections.map(function (s) {
        return '<label class="cg12-sec-row"><input type="checkbox" data-cg12-sec="' + _esc(s.id) + '" checked>' +
          '<span class="cg12-sec-name">' + _esc(s.title) + '</span>' +
          '<span class="cg12-sec-len">' + _fa(s.content.length) + ' کاراکتر</span></label>';
      }).join("") +
      '</section>';

    // Duplicates
    if (p.duplicates.exact || p.duplicates.similar.length > 0 || p.duplicates.existingHits.length > 0) {
      html += '<section class="cg12-section"><div class="cg12-sec-title">تکرار‌ها</div>';
      if (p.duplicates.exact) html += '<div class="cg12-warn">🔁 duplicate دقیق: ' + _esc(p.duplicates.exact.title) + '</div>';
      if (p.duplicates.similar.length > 0) {
        html += '<div class="cg12-warn">🔍 مشابه:</div><ul>' +
          p.duplicates.similar.slice(0, 5).map(function (s) { return '<li>' + _esc(s.title) + ' — ' + _fa(Math.round(s.score * 100)) + '%</li>'; }).join("") + '</ul>';
      }
      html += _row("رفتار", '<select data-cg12-mergeAction>' +
        ["skip","create","replace","merge"].map(function (a) {
          return '<option value="' + a + '"' + (a === _formState.mergeAction ? " selected" : "") + '>' + _esc(a) + '</option>';
        }).join("") + '</select>');
      html += '</section>';
    }

    // Provenance
    html += '<section class="cg12-section"><div class="cg12-sec-title">منبع</div>' +
      '<div class="cg12-prov">Provider: ' + _esc(d.source.provider || "—") + '</div>' +
      '<div class="cg12-prov">Model: ' + _esc(d.source.model || "—") + '</div>' +
      '<div class="cg12-prov">Prompt: ' + _esc(d.source.promptId || "—") + ' v' + _esc(d.source.promptVersion || "—") + '</div>' +
      '</section>';

    html += '<div class="cg12-actions">' +
      '<button class="cg12-btn cg12-btn-primary" data-cg12-apply' + (v.valid ? "" : " disabled") + '>✅ تأیید و ذخیره</button>' +
      '<button class="cg12-btn" data-cg12-regenerate>🔄 تولید مجدد</button>' +
      '<button class="cg12-btn" data-cg12-discard>🗑️ دور ریختن</button>' +
      '</div>';
    return html;
  }

  function _renderApplied() {
    var a = _state.applied;
    if (!a) return "";
    return '<div class="cg12-applied">' +
      '<div class="cg12-applied-icon">✅</div>' +
      '<div class="cg12-applied-title">محتوا ذخیره شد</div>' +
      '<div class="cg12-applied-desc">' +
      'Stored ID: ' + _esc(a.storedId) + '<br>' +
      'Action: ' + _esc(a.action) +
      (a.createdTaskId ? '<br>Task: ' + _esc(a.createdTaskId) : "") +
      '</div>' +
      '<div class="cg12-actions"><button class="cg12-btn cg12-btn-primary" data-cg12-close>بستن</button></div>' +
      '</div>';
  }

  function _wire() {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-cg12-close]").forEach(function (b) {
      b.addEventListener("click", UI.close);
    });
    _overlay.addEventListener("click", function (e) { if (e.target === _overlay) UI.close(); });
    _overlay.querySelectorAll("[data-cg12-field]").forEach(function (el) {
      el.addEventListener("input", function () { _formState[el.getAttribute("data-cg12-field")] = (el.type === "checkbox" ? el.checked : el.value); });
      el.addEventListener("change", function () { _formState[el.getAttribute("data-cg12-field")] = (el.type === "checkbox" ? el.checked : el.value); });
    });
    _overlay.querySelectorAll("[data-cg12-mergeAction]").forEach(function (el) {
      el.addEventListener("change", function () { _formState.mergeAction = el.value; });
    });
    var genBtn = _overlay.querySelector("[data-cg12-generate]");
    if (genBtn) genBtn.addEventListener("click", _onGenerate);
    var regenBtn = _overlay.querySelector("[data-cg12-regenerate]");
    if (regenBtn) regenBtn.addEventListener("click", function () { _state.step = "form"; _render(); });
    var discardBtn = _overlay.querySelector("[data-cg12-discard]");
    if (discardBtn) discardBtn.addEventListener("click", function () { _state.def = null; _state.preview = null; _state.step = "form"; _render(); });
    var applyBtn = _overlay.querySelector("[data-cg12-apply]");
    if (applyBtn) applyBtn.addEventListener("click", _onApply);
  }

  function _onGenerate() {
    _state.error = null;
    if (!_formState.topic) { _state.error = "موضوع اجباری است"; _render(); return; }
    if (!_formState.contentMapId) { _state.error = "Content Map ID اجباری است"; _render(); return; }

    _state.step = "generating"; _render();

    var req = R.contentRequest.createRequest({
      areaId: _formState.areaId,
      contentMapId: _formState.contentMapId,
      contentType: _formState.contentType,
      topic: _formState.topic,
      depth: _formState.depth,
      generationMode: _formState.generationMode,
      constraints: _formState.constraints.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
    });

    R.contentGenerator.generate(req, {})
      .then(function (def) {
        _state.def = def;
        _state.preview = R.contentPreview.build(def);
        _state.step = "preview"; _render();
      })
      .catch(function (err) {
        _state.step = "form";
        _state.error = (err && err.hint) || (err && err.message) || String(err);
        _render();
      });
  }

  function _onApply() {
    if (!_state.def) return;
    var approvedIds = [];
    _overlay.querySelectorAll("[data-cg12-sec]").forEach(function (cb) {
      if (cb.checked) approvedIds.push(cb.getAttribute("data-cg12-sec"));
    });
    var res = R.contentApply.apply(_state.def, {
      approvedSectionIds: approvedIds,
      createLinkedTask: _formState.createLinkedTask,
      mergeAction: _formState.mergeAction
    });
    if (res.success) {
      _state.applied = res; _state.step = "applied"; _render();
    } else {
      _state.error = res.reason + (res.errors ? ": " + res.errors.join(", ") : "");
      _render();
    }
  }

  console.log("[residency.content.ui.v12] loaded");
})();