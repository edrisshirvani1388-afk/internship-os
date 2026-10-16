/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Analytics Trends + Insights v9
   Deterministic trend + insight engine
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[analytics.trends.v9] R missing"); return; }
  var T = R.analyticsTrends = R.analyticsTrends || {};
  var I = R.analyticsInsights = R.analyticsInsights = R.analyticsInsights || {};
  var LIB = window.InternshipLib;

  var THRESHOLDS = {
    reserveLowPercent: 30,
    overloadMinutes: 240,
    missRateWarning: 25,
    partialRateWarning: 30,
    completionRateWarning: 50,
    paceDeviationWarning: 50,
    improvementDeltaPercent: 10
  };
  T.thresholds = THRESHOLDS;
  T.getThresholds = function () { return Object.assign({}, THRESHOLDS); };
  T.setThresholds = function (patch) {
    if (patch && typeof patch === "object") {
      Object.keys(patch).forEach(function (k) {
        if (typeof patch[k] === "number") THRESHOLDS[k] = patch[k];
      });
    }
    return T.getThresholds();
  };

  function _mean(arr) {
    if (!arr || arr.length === 0) return 0;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  /* ─── Compare two halves of a series ─── */
  function _compareTrends(series) {
    if (!Array.isArray(series) || series.length < 4) {
      return { direction: "insufficient_data", delta: 0, percentChange: 0,
               baseline: 0, current: 0, confidence: 0, dataPoints: series ? series.length : 0 };
    }
    var half = Math.floor(series.length / 2);
    var baseline = _mean(series.slice(0, half));
    var current = _mean(series.slice(half));
    var delta = current - baseline;
    var pctChange = baseline !== 0 ? Math.round((delta / Math.abs(baseline)) * 100) : 0;
    var direction = "stable";
    if (Math.abs(pctChange) > THRESHOLDS.improvementDeltaPercent) {
      direction = delta > 0 ? "improving" : "worsening";
    }
    // Confidence based on data points
    var confidence = Math.min(1, series.length / 30);
    return {
      direction: direction,
      delta: Math.round(delta * 10) / 10,
      percentChange: pctChange,
      baseline: Math.round(baseline * 10) / 10,
      current: Math.round(current * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      dataPoints: series.length
    };
  }
  T.compareTrends = _compareTrends;

  /* ─── Trend for a specific metric from time series ─── */
  T.metric = function (opts, metricKey) {
    var series = R.analytics.getTimeSeries(opts);
    var values = series.map(function (s) { return s[metricKey] || 0; });
    return _compareTrends(values);
  };

  T.all = function (opts) {
    var series = R.analytics.getTimeSeries(opts);
    var out = {};
    ["plannedPages", "actualPages", "plannedMinutes", "actualMinutes", "completed", "partial", "missed"].forEach(function (k) {
      var values = series.map(function (s) { return s[k] || 0; });
      out[k] = _compareTrends(values);
    });
    return out;
  };

  /* ═══════════ Insights ═══════════ */
  function _mkInsight(type, severity, title, explanation, metric, value, threshold) {
    return {
      id: "ins_" + type + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      type: type,
      severity: severity,
      title: title,
      explanation: explanation,
      metric: metric,
      value: value,
      threshold: threshold,
      evidence: [metric + "=" + value + (threshold != null ? " (threshold: " + threshold + ")" : "")]
    };
  }

  I.all = function (opts) {
    opts = opts || {};
    var out = [];
    var ov = R.analytics.getOverview(opts);
    if (!ov) return out;
    var exec = ov.execution || {};
    var study = ov.study || {};
    var wl = ov.workload || {};
    var rs = ov.residency || {};
    var reserve = ov.reserve || {};

    // Reserve low / exhausted
    if (reserve.status === "exhausted") {
      out.push(_mkInsight("reserve_exhausted", "error",
        "Safety Buffer تمام شده",
        "Reserve برنامه به پایان رسیده. Rescue Options را بررسی کن.",
        "reserve.remainingMinutes", reserve.remainingMinutes, 0));
    } else if (reserve.status === "low") {
      out.push(_mkInsight("reserve_low", "warning",
        "Safety Buffer کم است",
        "Reserve کمتر از " + THRESHOLDS.reserveLowPercent + "٪ باقی مانده.",
        "reserve.remainingMinutes", reserve.remainingMinutes,
        Math.round((reserve.poolMinutes || 0) * THRESHOLDS.reserveLowPercent / 100)));
    }

    // Miss rate
    if (exec.missRate >= THRESHOLDS.missRateWarning) {
      out.push(_mkInsight("miss_rate_increase", "warning",
        "نرخ فعالیت‌های جامانده بالا است",
        "بیش از " + THRESHOLDS.missRateWarning + "٪ فعالیت‌ها جامانده‌اند.",
        "execution.missRate", exec.missRate, THRESHOLDS.missRateWarning));
    }

    // Partial rate
    if (exec.partialRate >= THRESHOLDS.partialRateWarning) {
      out.push(_mkInsight("completion_decline", "warning",
        "درصد زیاد فعالیت‌های نیمه‌کاره",
        "بیش از " + THRESHOLDS.partialRateWarning + "٪ فعالیت‌ها نیمه‌کاره‌اند.",
        "execution.partialRate", exec.partialRate, THRESHOLDS.partialRateWarning));
    }

    // Low completion
    if (exec.executablePlanned > 5 && exec.completionRate < THRESHOLDS.completionRateWarning) {
      out.push(_mkInsight("completion_rate_low", "warning",
        "نرخ تکمیل پایین است",
        "کمتر از " + THRESHOLDS.completionRateWarning + "٪ از کارهای قابل‌اجرا تکمیل شدند.",
        "execution.completionRate", exec.completionRate, THRESHOLDS.completionRateWarning));
    }

    // Workload spike
    if (wl.peakDailyMinutes > THRESHOLDS.overloadMinutes) {
      out.push(_mkInsight("workload_spike", "info",
        "بار کاری بالا در یک روز",
        "بیشترین بار روزانه: " + wl.peakDailyMinutes + " دقیقه در " + (wl.peakDate || "—"),
        "workload.peakDailyMinutes", wl.peakDailyMinutes, THRESHOLDS.overloadMinutes));
    }

    // Capacity underuse
    if (wl.totalPlannedMinutes > 0 && wl.totalDays > 7 && wl.averageDailyMinutes < 30) {
      out.push(_mkInsight("capacity_underuse", "info",
        "استفاده‌ی کم از ظرفیت",
        "میانگین بار روزانه کمتر از ۳۰ دقیقه است.",
        "workload.averageDailyMinutes", wl.averageDailyMinutes, 30));
    }

    // Round risk (pace)
    if (rs.paceStatus === "at_risk" || rs.paceStatus === "deadline_passed") {
      out.push(_mkInsight("round_risk", "warning",
        "خطر عدم تکمیل Round",
        "با سرعت فعلی، تکمیل برنامه در موعد مقرر مشکل است.",
        "residency.paceStatus", rs.paceStatus, "on_track"));
    }

    // Book behind pace: skip if no per-book data
    // (Handled in depth in analytics-residency)

    // Study speed drop (from trends)
    var trends = T.all(opts);
    if (trends && trends.actualPages && trends.actualPages.direction === "worsening") {
      out.push(_mkInsight("study_speed_drop", "info",
        "کاهش سرعت مطالعه",
        "روند صفحات خوانده‌شده در حال کاهش است.",
        "trend.actualPages.percentChange",
        trends.actualPages.percentChange, -THRESHOLDS.improvementDeltaPercent));
    }

    return out;
  };

  console.log("[analytics.trends.v9] loaded");
})();