(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) return;
  var UI = R.contentUI = R.contentUI || {};
  var CB = R.contentBatch;
  var IO = R.contentIO;
  var LIB = window.InternshipLib;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }

  var _mode = "single";  // single | batch | import | export
  var _batch = null;
  var _batchProgress = null;
  var _importPreview = null;
  var _lastExportInfo = null;

  // Extend WS-side UI extension — reuse open()
  var _origOpen = UI.open;
  var _origClose = UI.close;

  // Patch: we'll wrap render to switch on mode
  UI.open = function (planId) {
    if (typeof _origOpen === "function") {
      _origOpen(planId);
      _injectModeBar();
    }
  };

  function _injectModeBar() {
    var panel = document.querySelector(".cg12-panel");
    if (!panel) return;
    if (panel.querySelector(".cg16-modes")) return;
    var header = panel.querySelector(".cg12-header");
    if (!header) return;
    var modesBar = document.createElement("div");
    modesBar.className = "cg16-modes";
    modesBar.innerHTML = ["single","batch","import","export"].map(function (m) {
      var labels = { single: "تولید تک", batch: "تولید گروهی", import: "📥 Import", export: "📤 Export" };
      return '<button class="cg16-mode-btn' + (_mode === m ? " is-active" : "") + '" data-cg16-mode="' + m + '">' + _esc(labels[m]) + '</button>';
    }).join("");
    header.parentNode.insertBefore(modesBar, header.nextSibling);
    modesBar.querySelectorAll("[data-cg16-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        _mode = b.getAttribute("data-cg16-mode");
        _renderMode();
        _injectModeBar();
      });
    });
    _renderMode();
  }

  function _renderMode() {
    var body = document.querySelector(".cg12-body");
    if (!body) return;
    if (_mode === "single") {
      // leave existing single-topic form as-is
      return;
    }
    if (_mode === "batch") return _renderBatch(body);
    if (_mode === "import") return _renderImport(body);
    if (_mode === "export") return _renderExport(body);
  }

  /* ═══ BATCH ═══ */
  function _renderBatch(body) {
    if (!_batch) _batch = CB.createBatch({ items: [] });
    var items = _batch.items.map(function (it, idx) {
      var statusBadge = '<span class="cg16-badge is-' + _esc(it.status || "pending") + '">' + _esc(it.status || "pending") + '</span>';
      return '<div class="cg16-item" data-cg16-item="' + _esc(it.itemId) + '">' +
        '<div class="cg16-item-head">' +
          '<span class="cg16-item-idx">#' + _fa(idx + 1) + '</span>' +
          '<input class="cg16-inp" data-cg16-field="topic" value="' + _esc(it.topic) + '" placeholder="Topic">' +
          '<input class="cg16-inp" data-cg16-field="contentMapId" value="' + _esc(it.contentMapId) + '" placeholder="clinical.0.1">' +
          '<select class="cg16-inp" data-cg16-field="contentType">' + R.contentDomain.TYPES.map(function (t) {
            return '<option value="' + t + '"' + (it.contentType === t ? " selected" : "") + '>' + _esc(t) + '</option>';
          }).join("") + '</select>' +
          '<input class="cg16-inp" data-cg16-field="areaId" value="' + _esc(it.areaId) + '" placeholder="clinical">' +
          statusBadge +
          '<button class="cg16-mini is-warn" data-cg16-remove="' + _esc(it.itemId) + '">✕</button>' +
        '</div>' +
        (it.error ? '<div class="cg16-item-error">' + _esc(it.error) + '</div>' : '') +
        (it.warnings && it.warnings.length > 0 ? '<div class="cg16-item-warn">' + it.warnings.slice(0, 3).map(_esc).join(" · ") + '</div>' : '') +
        (it.dedupe && it.dedupe.similar ? '<div class="cg16-item-dup">🔁 ' + _esc(it.dedupe.explanation) + '</div>' : '') +
      '</div>';
    }).join("");

    body.innerHTML = '' +
      '<section class="cg12-section">' +
        '<div class="cg16-batch-head">' +
          '<div class="cg16-batch-title">تولید گروهی (' + _fa(_batch.items.length) + ' مورد)</div>' +
          '<button class="cg16-mini" data-cg16-add>➕ افزودن</button>' +
        '</div>' +
        '<div class="cg16-items">' + (items || '<div class="cg12-empty">هنوز موردی اضافه نشده</div>') + '</div>' +
      '</section>' +
      (_batchProgress ? _renderProgress() : '') +
      '<div class="cg12-actions">' +
        '<button class="cg12-btn cg12-btn-primary" data-cg16-batch-run>🚀 تولید گروهی</button>' +
        '<button class="cg12-btn" data-cg16-approve-valid>✅ تأیید همه‌ی معتبرها</button>' +
        '<button class="cg12-btn" data-cg16-batch-apply>📥 اعمال تأییدشده‌ها</button>' +
        '<button class="cg12-btn" data-cg16-batch-discard>🗑️ دور ریختن</button>' +
      '</div>';
    _wireBatch();
  }

  function _renderProgress() {
    var p = _batchProgress;
    return '<section class="cg12-section cg16-progress">' +
      '<div class="cg16-progress-head">' + _fa(p.index + 1) + ' از ' + _fa(p.total) + ' — ' + _esc(p.item.topic || "") + '</div>' +
      '<div class="cg16-progress-bar"><div class="cg16-progress-fill" style="width:' + Math.round((p.index + (p.done ? 1 : 0)) / p.total * 100) + '%"></div></div>' +
    '</section>';
  }

  function _wireBatch() {
    var panel = document.querySelector(".cg12-panel");
    if (!panel) return;
    panel.querySelectorAll("[data-cg16-add]").forEach(function (b) {
      b.addEventListener("click", function () {
        CB.addItem(_batch, { topic: "", contentMapId: "", contentType: "topic", areaId: "" });
        _renderBatch(document.querySelector(".cg12-body"));
      });
    });
    panel.querySelectorAll("[data-cg16-remove]").forEach(function (b) {
      b.addEventListener("click", function () {
        CB.removeItem(_batch, b.getAttribute("data-cg16-remove"));
        _renderBatch(document.querySelector(".cg12-body"));
      });
    });
    panel.querySelectorAll("[data-cg16-item]").forEach(function (row) {
      var id = row.getAttribute("data-cg16-item");
      var it = _batch.items.find(function (x) { return x.itemId === id; });
      if (!it) return;
      row.querySelectorAll("[data-cg16-field]").forEach(function (inp) {
        inp.addEventListener("change", function () {
          it[inp.getAttribute("data-cg16-field")] = inp.value;
        });
      });
    });
    panel.querySelectorAll("[data-cg16-batch-run]").forEach(function (b) {
      b.addEventListener("click", _onBatchRun);
    });
    panel.querySelectorAll("[data-cg16-approve-valid]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = CB.approveAllValid(_batch);
        _renderBatch(document.querySelector(".cg12-body"));
        _toast(n + " مورد تأیید شد");
      });
    });
    panel.querySelectorAll("[data-cg16-batch-apply]").forEach(function (b) {
      b.addEventListener("click", _onBatchApply);
    });
    panel.querySelectorAll("[data-cg16-batch-discard]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("کل Batch دور ریخته شود؟")) return;
        _batch = null; _batchProgress = null;
        _renderBatch(document.querySelector(".cg12-body"));
      });
    });
  }

  function _onBatchRun() {
    var v = CB.validateBatch(_batch);
    if (!v.valid) { alert("خطا:\n" + v.errors.join("\n")); return; }
    _batchProgress = { index: 0, total: _batch.items.length, item: _batch.items[0], done: false };
    _renderBatch(document.querySelector(".cg12-body"));
    CB.executeBatch(_batch, function (p) {
      _batchProgress = p;
      _renderBatch(document.querySelector(".cg12-body"));
    }).then(function (res) {
      _batchProgress = null;
      _renderBatch(document.querySelector(".cg12-body"));
      _toast("تمام: " + res.success + " موفق · " + res.failed + " خطا");
    }).catch(function (err) {
      _batchProgress = null;
      _renderBatch(document.querySelector(".cg12-body"));
      alert("خطا: " + ((err && err.message) || err));
    });
  }

  function _onBatchApply() {
    if (!confirm("محتواهای تأییدشده اعمال شوند؟")) return;
    var res = CB.applyBatch(_batch, {});
    if (res.success) {
      _toast("✅ " + res.statistics.appliedCount + " اعمال شد");
      _batch = null;
      _renderBatch(document.querySelector(".cg12-body"));
    } else {
      _toast("اعمال نشد: " + JSON.stringify(res.statistics));
    }
  }

  /* ═══ IMPORT ═══ */
  function _renderImport(body) {
    body.innerHTML = '' +
      '<section class="cg12-section">' +
        '<div class="cg16-batch-title">📥 ورود JSON</div>' +
        '<textarea class="cg16-textarea" data-cg16-json placeholder="JSON را اینجا paste کن..." rows="10"></textarea>' +
        '<div class="cg12-actions">' +
          '<button class="cg12-btn cg12-btn-primary" data-cg16-import-preview>🔍 بررسی</button>' +
          '<button class="cg12-btn" data-cg16-import-file>📂 انتخاب فایل</button>' +
          '<input type="file" accept=".json" style="display:none" data-cg16-file>' +
        '</div>' +
      '</section>' +
      (_importPreview ? _renderImportPreview() : '');
    _wireImport();
  }

  function _renderImportPreview() {
    var p = _importPreview;
    if (!p || !p.ok) return '<div class="cg12-error">' + _esc((p && p.error) || "invalid") + ' ' + _esc((p && p.hint) || "") + '</div>';
    var rows = p.results.map(function (r) {
      var cls = r.valid ? "is-valid" : "is-invalid";
      return '<div class="cg16-import-row ' + cls + '">' +
        '<span class="cg16-import-idx">#' + _fa(r.index + 1) + '</span>' +
        '<span class="cg16-import-title">' + _esc((r.def && r.def.title) || "—") + '</span>' +
        (r.valid ? '<span class="cg16-badge is-validated">valid</span>' : '<span class="cg16-badge is-failed">' + _esc((r.errors && r.errors[0]) || "error") + '</span>') +
        (r.dedupe && r.dedupe.similar ? '<span class="cg16-badge is-dup" title="' + _esc(r.dedupe.explanation) + '">🔁 dup</span>' : '') +
      '</div>';
    }).join("");
    return '<section class="cg12-section">' +
      '<div class="cg16-import-summary">' +
        '<span>✅ ' + _fa(p.validCount) + '</span>' +
        '<span>❌ ' + _fa(p.errorCount) + '</span>' +
        '<span>⚠️ ' + _fa(p.warningCount) + '</span>' +
        '<span>🔁 ' + _fa(p.duplicateCount) + '</span>' +
      '</div>' +
      '<div class="cg16-import-list">' + rows + '</div>' +
      '<div class="cg12-actions">' +
        '<button class="cg12-btn cg12-btn-primary" data-cg16-import-apply>✅ اعمال معتبرها</button>' +
        '<button class="cg12-btn" data-cg16-import-cancel>انصراف</button>' +
      '</div>' +
    '</section>';
  }

  function _wireImport() {
    var panel = document.querySelector(".cg12-panel");
    if (!panel) return;
    var ta = panel.querySelector("[data-cg16-json]");
    if (ta) ta.addEventListener("input", function () { });
    panel.querySelectorAll("[data-cg16-import-preview]").forEach(function (b) {
      b.addEventListener("click", function () {
        var str = ta ? ta.value : "";
        _importPreview = IO.previewImport(str);
        _renderImport(document.querySelector(".cg12-body"));
      });
    });
    panel.querySelectorAll("[data-cg16-import-file]").forEach(function (b) {
      b.addEventListener("click", function () {
        var f = panel.querySelector("[data-cg16-file]");
        if (f) f.click();
      });
    });
    var fi = panel.querySelector("[data-cg16-file]");
    if (fi) fi.addEventListener("change", function () {
      var file = fi.files && fi.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        if (ta) ta.value = e.target.result;
        _importPreview = IO.previewImport(e.target.result);
        _renderImport(document.querySelector(".cg12-body"));
      };
      reader.readAsText(file);
    });
    panel.querySelectorAll("[data-cg16-import-apply]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!_importPreview || !_importPreview.ok) return;
        if (!confirm("اعمال؟")) return;
        var r = IO.applyImport(_importPreview, {});
        _toast(r.success ? "✅ " + r.statistics.appliedCount + " اعمال شد" : "خطا");
        _importPreview = null;
        _renderImport(document.querySelector(".cg12-body"));
      });
    });
    panel.querySelectorAll("[data-cg16-import-cancel]").forEach(function (b) {
      b.addEventListener("click", function () { _importPreview = null; _renderImport(document.querySelector(".cg12-body")); });
    });
  }

  /* ═══ EXPORT ═══ */
  function _renderExport(body) {
    body.innerHTML = '' +
      '<section class="cg12-section">' +
        '<div class="cg16-batch-title">📤 خروج JSON</div>' +
        '<div class="cg12-row"><label>Status</label><select data-cg16-ex-status>' +
          '<option value="">همه</option><option value="approved">فقط approved</option><option value="draft">فقط draft</option>' +
        '</select></div>' +
        '<div class="cg12-row"><label>Content Type</label><select data-cg16-ex-type><option value="">همه</option>' +
          R.contentDomain.TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join("") +
        '</select></div>' +
        '<div class="cg12-row"><label>Generated only</label><input type="checkbox" data-cg16-ex-genonly></div>' +
        '<div class="cg12-row"><label>Include drafts</label><input type="checkbox" data-cg16-ex-drafts></div>' +
        '<div class="cg12-actions">' +
          '<button class="cg12-btn cg12-btn-primary" data-cg16-export-create>👁️ پیش‌نمایش</button>' +
          '<button class="cg12-btn" data-cg16-export-download>⬇️ دانلود</button>' +
        '</div>' +
      '</section>' +
      (_lastExportInfo ? '<section class="cg12-section"><div class="cg16-import-summary"><span>📦 ' + _fa(_lastExportInfo.count) + ' item</span><span>' + _fa(_lastExportInfo.size) + ' bytes</span></div></section>' : '');
    _wireExport();
  }

  function _wireExport() {
    var panel = document.querySelector(".cg12-panel");
    if (!panel) return;
    function _readOpts() {
      return {
        status: panel.querySelector("[data-cg16-ex-status]").value || null,
        contentType: panel.querySelector("[data-cg16-ex-type]").value || null,
        generatedOnly: panel.querySelector("[data-cg16-ex-genonly]").checked,
        includeDrafts: panel.querySelector("[data-cg16-ex-drafts]").checked
      };
    }
    panel.querySelectorAll("[data-cg16-export-create]").forEach(function (b) {
      b.addEventListener("click", function () {
        var pack = IO.createExport(_readOpts());
        var str = JSON.stringify(pack, null, 2);
        _lastExportInfo = { count: pack.items.length, size: str.length };
        _renderExport(document.querySelector(".cg12-body"));
      });
    });
    panel.querySelectorAll("[data-cg16-export-download]").forEach(function (b) {
      b.addEventListener("click", function () {
        var size = IO.exportToDownload(_readOpts());
        _lastExportInfo = { count: -1, size: size };
        _renderExport(document.querySelector(".cg12-body"));
      });
    });
  }

  function _toast(m) {
    if (LIB && LIB.toast) LIB.toast(m);
    else console.log("[toast]", m);
  }

  console.log("[content.ui.v16] loaded");
})();