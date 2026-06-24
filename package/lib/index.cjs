var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ChatLunaUsage: () => ChatLunaUsageService,
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_path = require("path");
var import_koishi3 = require("koishi");
var import_plugin_console = require("@koishijs/plugin-console");

// src/utils.ts
var import_koishi = require("koishi");
function summary(key, label = key, platform) {
  return {
    key,
    label,
    platform,
    calls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    timedCalls: 0,
    ttftMs: 0,
    totalMs: 0,
    tps: 0,
    successRate: 0
  };
}
__name(summary, "summary");
function calculateTheme() {
  const currentHours = (/* @__PURE__ */ new Date()).getHours();
  return currentHours < 6 || currentHours >= 18 ? "dark" : "light";
}
__name(calculateTheme, "calculateTheme");
var ChatLunaUsage;
((ChatLunaUsage2) => {
  ChatLunaUsage2.Config = import_koishi.Schema.object({
    recentDays: import_koishi.Schema.natural().description("默认统计最近几天的数据。").default(30),
    pageSize: import_koishi.Schema.natural().description("调用明细分页大小。").default(50),
    webui: import_koishi.Schema.boolean().description("启用 Web UI 控制台用量面板。").default(true),
    tokensTheme: import_koishi.Schema.union([
      import_koishi.Schema.const("auto").description("自动"),
      import_koishi.Schema.const("light").description("浅色模式"),
      import_koishi.Schema.const("dark").description("深色模式")
    ]).description("tokens命令渲染出的图表颜色主题").default("auto").role("select"),
    tokensRenderMode: import_koishi.Schema.union([
      import_koishi.Schema.const("both").description("曲线和柱状图"),
      import_koishi.Schema.const("line").description("仅曲线"),
      import_koishi.Schema.const("bar").description("仅柱状图")
    ]).description("tokens命令渲染出的图表展示模式").default("line").role("select")
  });
  ChatLunaUsage2.inject = ["chatluna", "database"];
})(ChatLunaUsage || (ChatLunaUsage = {}));

// src/tokens.ts
var import_koishi2 = require("koishi");
var RANGES = {
  day: ["天", 2 * import_koishi2.Time.hour],
  week: ["周", import_koishi2.Time.day],
  month: ["月", 2 * import_koishi2.Time.day],
  all: ["全部", 0]
};
var pad = /* @__PURE__ */ __name((value) => String(value).padStart(2, "0"), "pad");
function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
__name(formatDate, "formatDate");
function formatTokenReport(report) {
  return [
    `Chatluna token 用量（${report.label}）`,
    `时间范围：${formatDate(report.start)} 至 ${formatDate(report.end)}`,
    `累计 token：${report.totalTokens.toLocaleString("en-US")}`,
    `累计请求：${report.calls.toLocaleString("en-US")}次`,
    `TPM：${report.tpm.toLocaleString("en-US")}`,
    `RPM：${report.rpm.toLocaleString("en-US")}次`
  ].join("\n");
}
__name(formatTokenReport, "formatTokenReport");
function createTokenReport(range, start, end, rows, withPlugins = false) {
  const sorted = rows.slice().sort((a, b) => +a.createdAt - +b.createdAt);
  const from = range === "all" ? sorted[0]?.createdAt ?? end : start;
  const step = range === "all" ? Math.max(
    import_koishi2.Time.day,
    Math.ceil((+end - +from) / import_koishi2.Time.day / 15) * import_koishi2.Time.day
  ) : RANGES[range][1];
  const aligned = new Date(from);
  const plugins = /* @__PURE__ */ new Map();
  let totalTokens = 0;
  let tpm = 0;
  let rpm = 0;
  let minute = -1;
  let minuteTokens = 0;
  let minuteCalls = 0;
  if (range === "day") aligned.setMinutes(0, 0, 0);
  else aligned.setHours(0, 0, 0, 0);
  const points = sorted.length ? Array.from(
    { length: Math.ceil((+end - +aligned) / step) },
    (_, i) => {
      const date = new Date(+aligned + i * step);
      const label = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      return {
        label: range === "day" ? `${label} ${pad(date.getHours())}:00` : label,
        tokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        models: {}
      };
    }
  ) : [];
  for (const row of sorted) {
    const tokens = row.usageMetadata.total_tokens;
    const key = Math.floor(+row.createdAt / import_koishi2.Time.minute) * import_koishi2.Time.minute;
    const point = points[Math.floor((+row.createdAt - +aligned) / step)];
    if (key === minute) {
      minuteTokens += tokens;
      minuteCalls += 1;
    } else {
      tpm = Math.max(tpm, minuteTokens);
      rpm = Math.max(rpm, minuteCalls);
      minute = key;
      minuteTokens = tokens;
      minuteCalls = 1;
    }
    totalTokens += tokens;
    point.tokens += tokens;
    point.inputTokens += row.usageMetadata.input_tokens ?? 0;
    point.outputTokens += row.usageMetadata.output_tokens ?? 0;
    point.models[row.model] = (point.models[row.model] || 0) + tokens;
    if (withPlugins) {
      const plugin = plugins.get(row.source) ?? {
        source: row.source,
        tokens: 0,
        calls: 0
      };
      plugin.tokens += tokens;
      plugin.calls += 1;
      plugins.set(row.source, plugin);
    }
  }
  tpm = Math.max(tpm, minuteTokens);
  rpm = Math.max(rpm, minuteCalls);
  return {
    range,
    label: RANGES[range][0],
    start: from,
    end,
    totalTokens,
    calls: sorted.length,
    tpm,
    rpm,
    points,
    plugins: withPlugins ? [...plugins.values()].sort((a, b) => b.tokens - a.tokens) : void 0
  };
}
__name(createTokenReport, "createTokenReport");

// src/renderer.tsx
var import_jsx_runtime = require("@satorijs/element/jsx-runtime");
var CSS = `
:root {
    --bg-paper: #f8fafc;
    --bg-paper-soft: #f1f5f9;
    --bg-paper-row: #e2e8f0;
    --bg-paper-line: rgba(148, 163, 184, 0.025);
    --bg-paper-dot: rgba(255, 255, 255, 0.65);
    --bg-paper-glow: rgba(255, 255, 255, 0.72);
    --bg-legend: rgba(241, 245, 249, 0.78);
    --bg-row: rgba(241, 245, 249, 0.78);
    --bg-row-hover: rgba(148, 163, 184, 0.05);
    --bg-row-track: #e2e8f0;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --border-color: #cbd5e1;
    --grid-line: #e2e8f0;
    --color-total: #7e1671;
    --color-input: #1772b4;
    --color-output: #20894d;
    --edge-shade: rgba(148, 163, 184, 0.08);
    --row-border: rgba(203, 213, 225, 0.42);
    --legend-border: rgba(203, 213, 225, 0.62);
    --bar-shadow: transparent;
    --shadow-paper: none;
    --shadow-lift: none;
    --shadow-hover: none;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color-scheme: light;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: transparent;
}

.stage {
    position: relative;
    display: inline-block;
    width: 1000px;
    padding: 32px 38px 34px;
    background: var(--bg-paper);
    color: var(--text-primary);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
}

.stage.theme-dark {
    --bg-paper: #1e293b;
    --bg-paper-soft: #334155;
    --bg-paper-row: #1e293b;
    --bg-paper-line: rgba(255, 255, 255, 0.015);
    --bg-paper-dot: rgba(255, 255, 255, 0.02);
    --bg-paper-glow: rgba(255, 255, 255, 0.03);
    --bg-legend: rgba(51, 65, 85, 0.88);
    --bg-row: rgba(30, 41, 59, 0.86);
    --bg-row-hover: rgba(255, 255, 255, 0.03);
    --bg-row-track: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --border-color: #475569;
    --grid-line: #334155;
    --color-total: #c8709c;
    --color-input: #4a9eda;
    --color-output: #4ade80;
    --edge-shade: rgba(255, 255, 255, 0.03);
    --row-border: rgba(71, 85, 105, 0.44);
    --legend-border: rgba(71, 85, 105, 0.55);
    --bar-shadow: transparent;
    --shadow-paper: none;
    --shadow-lift: none;
    --shadow-hover: none;
    color-scheme: dark;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: transparent;
}

.stage {
    position: relative;
    display: inline-block;
    width: 1000px;
    padding: 32px 38px 34px;
    background: var(--bg-paper);
    color: var(--text-primary);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
}

.stage::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.paper-content {
    position: relative;
    z-index: 1;
}

.hero-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
}

.hero-title {
    margin: 0;
    font-size: 28px;
    line-height: 1.18;
    font-weight: 800;
    letter-spacing: 0;
    color: var(--text-primary);
}

.time-strip {
    display: inline-grid;
    grid-template-columns: auto auto auto auto;
    align-items: center;
    gap: 8px;
    padding: 10px 15px;
    background: var(--bg-paper-soft);
    border-radius: 10px;
    transform: rotate(0.35deg);
}

.time-label {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
}

.time-value,
.time-sep {
    color: var(--text-secondary);
    font-size: 13px;
    font-family: var(--font-mono);
    font-weight: 700;
    font-style: normal;
}

.stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin-bottom: 24px;
}

.stat-cell {
    padding: 0 20px;
}

.stat-cell:first-child {
    padding-left: 0;
}

.stat-cell + .stat-cell {
    border-left: 1px solid var(--edge-shade);
}

.stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.stat-value {
    margin-top: 6px;
    font-size: 22px;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
}

.chart-container {
    padding: 22px 0 18px;
    margin: 4px 0 2px;
    background: transparent;
}

.trend-chart {
    display: block;
    width: 100%;
    height: auto;
}

.grid line {
    stroke: var(--grid-line);
    stroke-width: 1;
    stroke-dasharray: 3 3;
}

.grid text {
    fill: var(--text-secondary);
    font-size: 11px;
    font-family: var(--font-mono);
    text-anchor: end;
    font-weight: 500;
}

.axis-x {
    fill: var(--text-secondary);
    font-size: 11px;
    font-family: var(--font-mono);
    text-anchor: middle;
    font-weight: 500;
}

.line {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.line-total {
    stroke: var(--color-total);
}

.line-input {
    stroke: var(--color-input);
}

.line-output {
    stroke: var(--color-output);
}

.line-input {
    stroke: var(--color-input);
}

.line-output {
    stroke: var(--color-output);
}

.bar-outline {
    stroke: var(--row-border);
}

.dot-input {
    fill: var(--bg-paper);
    stroke-width: 2;
    stroke: var(--color-input);
}

.dot-output {
    fill: var(--bg-paper);
    stroke-width: 2;
    stroke: var(--color-output);
}

.dot-last.dot-total {
    fill: var(--color-total);
    stroke: var(--bg-paper);
}

.bar-outline {
    stroke: var(--row-border);
}

.chart-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
}

.legend-item {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background: var(--bg-legend);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
}

.legend-color-indicator {
    display: inline-block;
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--legend-color);
    margin-right: 8px;
    font-size: 0;
    line-height: 0;
}

.legend-total-indicator {
    border-radius: 50%;
}

.empty-chart {
    display: grid;
    height: 320px;
    place-items: center;
    color: var(--text-muted);
    font-size: 14px;
    border-radius: 8px;
}

.plugin-section {
    margin-top: 28px;
    padding-top: 24px;
    border-top: 2px dashed rgba(180, 135, 82, 0.38);
}

.section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.section-title-row h2 {
    margin: 0;
    font-size: 22px;
    line-height: 1.2;
    color: var(--text-primary);
}

.sort-chip {
    padding: 7px 12px;
    color: var(--text-secondary);
    background: var(--bg-paper-soft);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
}

.plugin-list {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--bg-row);
    border-radius: 8px;
    overflow: hidden;
}

.plugin-list-head,
.plugin-list-row {
    display: grid;
    grid-template-columns: 1fr 240px 160px 120px;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
}

.plugin-list-head {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.plugin-list-row {
    font-size: 13px;
    color: var(--text-primary);
    background: transparent;
    transition: background 180ms ease;
}

.plugin-list-row + .plugin-list-row {
    margin-top: 0;
    border-top: 1px solid var(--row-border);
}

.plugin-list-row:hover {
    background: var(--bg-row-hover);
}

.plugin-name-cell {
    font-weight: 500;
    display: flex;
    align-items: center;
}

.plugin-indicator {
    display: inline-block;
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    margin-right: 10px;
    font-size: 0;
    line-height: 0;
}

.plugin-progress-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.plugin-progress-bar {
    flex: 1;
    height: 5px;
    border-radius: 3px;
    background: var(--bg-row-track);
    overflow: hidden;
}

.plugin-progress-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--accent);
    font-size: 0;
    line-height: 0;
}

.plugin-number {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
}

.text-right {
    text-align: right !important;
}

.text-center {
    text-align: center !important;
}

.footer {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid var(--edge-shade);
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
}

.footer span {
    font-weight: 700;
    color: var(--text-secondary);
}
`;
var MODEL_COLORS = [
  "#b14b28",
  "#1772b4",
  "#20894d",
  "#ebb10d",
  "#813c85",
  "#fb8b05",
  "#12aa9c",
  "#eb261a",
  "#918072"
];
var CHART = {
  width: 952,
  height: 320,
  left: 60,
  right: 20,
  top: 20,
  bottom: 48,
  gridLines: 5,
  maxLabels: 30,
  maxModels: 5,
  minBarWidth: 3,
  maxBarWidth: 28
};
var CURVE_FACTOR = 0.4;
var FLAT_Y_THRESHOLD = 0.1;
var MAX_PLUGIN_ROWS = 6;
var OTHER_COLOR = "#94a3b8";
var OTHER_MODEL_NAME = "其他模型";
var OTHER_PLUGIN_NAME = "其他插件";
function formatNum(value) {
  if (value >= 1e6) {
    return (value / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return value.toString();
}
__name(formatNum, "formatNum");
function monotonePath(pts) {
  const n = pts.length;
  if (n < 2) return "";
  if (n === 2) {
    return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
  }
  const h2 = new Array(n - 1);
  const m = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h2[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / h2[i];
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    const s0 = m[i - 1];
    const s1 = m[i];
    if (s0 * s1 <= 0) {
      t[i] = 0;
    } else {
      const h0 = h2[i - 1];
      const h1 = h2[i];
      const p = (s0 * h1 + s1 * h0) / (h0 + h1);
      t[i] = (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p));
    }
  }
  t[0] = Math.sign(m[0]) * Math.min(Math.abs(m[0]), Math.abs(t[0]));
  t[n - 1] = Math.sign(m[n - 2]) * Math.min(Math.abs(m[n - 2]), Math.abs(t[n - 1]));
  const maxY = Math.max(...pts.map((p) => p.y));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = h2[i];
    const c1x = pts[i].x + dx * CURVE_FACTOR;
    let c1y = pts[i].y + t[i] * dx * CURVE_FACTOR;
    const c2x = pts[i + 1].x - dx * CURVE_FACTOR;
    let c2y = pts[i + 1].y - t[i + 1] * dx * CURVE_FACTOR;
    if (Math.abs(pts[i].y - pts[i + 1].y) < FLAT_Y_THRESHOLD) {
      c1y = pts[i].y;
      c2y = pts[i + 1].y;
    } else if (pts[i].y < pts[i + 1].y) {
      c1y = Math.max(pts[i].y, Math.min(pts[i + 1].y, c1y));
      c2y = Math.max(pts[i].y, Math.min(pts[i + 1].y, c2y));
    } else {
      c1y = Math.max(pts[i + 1].y, Math.min(pts[i].y, c1y));
      c2y = Math.max(pts[i + 1].y, Math.min(pts[i].y, c2y));
    }
    c1y = Math.min(maxY, c1y);
    c2y = Math.min(maxY, c2y);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}
__name(monotonePath, "monotonePath");
function getTopModels(points) {
  const modelTotals = {};
  for (const p of points) {
    for (const [model, val] of Object.entries(p.models)) {
      modelTotals[model] = (modelTotals[model] || 0) + val;
    }
  }
  const sortedModels = Object.entries(modelTotals).sort((a, b) => b[1] - a[1]).map(([model]) => model);
  const topModels = sortedModels.slice(0, CHART.maxModels);
  const colorMap = {};
  topModels.forEach((model, i) => {
    colorMap[model] = MODEL_COLORS[i % MODEL_COLORS.length];
  });
  if (sortedModels.length > CHART.maxModels) {
    colorMap[OTHER_MODEL_NAME] = OTHER_COLOR;
  }
  return { topModels, colorMap };
}
__name(getTopModels, "getTopModels");
function getChartLayout(points) {
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const baseline = CHART.top + plotHeight;
  const max = Math.max(
    1,
    ...points.map((p) => p.tokens),
    ...points.map((p) => p.inputTokens),
    ...points.map((p) => p.outputTokens)
  );
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;
  const barWidth = Math.max(
    CHART.minBarWidth,
    Math.min(CHART.maxBarWidth, stepX * 0.5)
  );
  const safePadding = barWidth / 2 + 4;
  const drawWidth = plotWidth - safePadding * 2;
  const makeCoords = /* @__PURE__ */ __name((key) => points.map((point, idx) => ({
    x: points.length === 1 ? CHART.left + plotWidth / 2 : CHART.left + safePadding + drawWidth * idx / (points.length - 1),
    y: baseline - point[key] / max * plotHeight,
    point
  })), "makeCoords");
  const totalCoords = makeCoords("tokens");
  const inputCoords = makeCoords("inputTokens");
  const outputCoords = makeCoords("outputTokens");
  return {
    plotWidth,
    plotHeight,
    baseline,
    max,
    barWidth,
    safePadding,
    drawWidth,
    totalCoords,
    totalLine: monotonePath(totalCoords),
    inputCoords,
    inputLine: monotonePath(inputCoords),
    outputCoords,
    outputLine: monotonePath(outputCoords),
    stepLabel: Math.max(1, Math.ceil(points.length / CHART.maxLabels))
  };
}
__name(getChartLayout, "getChartLayout");
function getBarItems(point, info) {
  const items = [];
  let otherVal = 0;
  for (const [name2, val] of Object.entries(point.models)) {
    if (val <= 0) continue;
    if (info.topModels.includes(name2)) {
      items.push({ name: name2, val });
    } else {
      otherVal += val;
    }
  }
  items.sort(
    (a, b) => info.topModels.indexOf(a.name) - info.topModels.indexOf(b.name)
  );
  if (otherVal > 0) {
    items.push({ name: OTHER_MODEL_NAME, val: otherVal });
  }
  return items;
}
__name(getBarItems, "getBarItems");
function renderGrid(layout) {
  const last = CHART.gridLines - 1;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { class: "grid", children: Array.from({ length: CHART.gridLines }, (_, idx) => {
    const y = CHART.top + layout.plotHeight * idx / last;
    const value = Math.round(layout.max - layout.max * idx / last);
    return [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "line",
        {
          x1: CHART.left,
          y1: y,
          x2: CHART.width - CHART.right,
          y2: y
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", { x: CHART.left - 12, y: y + 4, children: formatNum(value) })
    ];
  }) });
}
__name(renderGrid, "renderGrid");
function renderBars(points, info, layout) {
  return points.map((point, idx) => {
    const x = points.length === 1 ? CHART.left + layout.plotWidth / 2 : CHART.left + layout.safePadding + layout.drawWidth * idx / (points.length - 1);
    const items = getBarItems(point, info);
    let currentY = layout.baseline;
    const groupHeight = items.reduce(
      (sum, item) => sum + item.val / layout.max * layout.plotHeight,
      0
    );
    const groupY = layout.baseline - groupHeight;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
      items.map((item) => {
        const barHeight = item.val / layout.max * layout.plotHeight;
        const y = currentY - barHeight;
        currentY = y;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "rect",
          {
            class: "bar-piece",
            x: x - layout.barWidth / 2,
            y,
            width: layout.barWidth,
            height: barHeight,
            fill: info.colorMap[item.name],
            opacity: "0.85"
          }
        );
      }),
      groupHeight > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "rect",
        {
          class: "bar-outline",
          x: x - layout.barWidth / 2,
          y: groupY,
          width: layout.barWidth,
          height: groupHeight,
          fill: "none",
          "stroke-width": "1",
          opacity: "0.6"
        }
      )
    ] });
  });
}
__name(renderBars, "renderBars");
function renderAxisLabels(coords, stepLabel) {
  return coords.map((c, idx) => {
    const shouldShowLabel = idx === 0 || idx === coords.length - 1 || idx % stepLabel === 0;
    if (!shouldShowLabel) return null;
    const parts = c.point.label.split(" ");
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "text",
      {
        class: "axis-x",
        x: c.x,
        y: CHART.height - (parts[1] ? 22 : 18),
        children: parts[1] ? parts.map((part, pIdx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tspan", { x: c.x, dy: pIdx ? "13" : "0", children: part })) : c.point.label
      }
    );
  });
}
__name(renderAxisLabels, "renderAxisLabels");
function chart(points, info, mode = "both") {
  if (!points.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "empty-chart", children: "暂无用量数据" });
  const layout = getChartLayout(points);
  const showLine = mode === "both" || mode === "line";
  const showBar = mode === "both" || mode === "bar";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      class: "trend-chart",
      viewbox: `0 0 ${CHART.width} ${CHART.height}`,
      role: "img",
      children: [
        renderGrid(layout),
        showBar ? renderBars(points, info, layout) : null,
        showLine && layout.totalLine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { class: "line line-total", d: layout.totalLine }) : null,
        mode === "line" && layout.inputLine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { class: "line line-input", d: layout.inputLine }) : null,
        mode === "line" && layout.outputLine ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { class: "line line-output", d: layout.outputLine }) : null,
        renderAxisLabels(layout.totalCoords, layout.stepLabel)
      ]
    }
  );
}
__name(chart, "chart");
function pluginSection(plugins) {
  if (!plugins?.length) return "";
  const total = plugins.reduce((sum, p) => sum + p.tokens, 0) || 1;
  let displayPlugins = plugins.slice(0, MAX_PLUGIN_ROWS);
  if (plugins.length > MAX_PLUGIN_ROWS) {
    const other = {
      source: OTHER_PLUGIN_NAME,
      tokens: 0,
      calls: 0
    };
    for (const p of plugins.slice(MAX_PLUGIN_ROWS)) {
      other.tokens += p.tokens;
      other.calls += p.calls;
    }
    displayPlugins = [...displayPlugins, other];
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { class: "plugin-section", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "section-title-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "用量明细" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { class: "sort-chip", children: "按 Token 使用降序排列" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "plugin-list-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "来源插件" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { class: "text-center", children: "用量占比" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { class: "text-right", children: "Token 使用" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { class: "text-right", children: "请求次数" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { class: "plugin-list", children: displayPlugins.map((plugin, idx) => {
      const isOther = plugin.source === OTHER_PLUGIN_NAME;
      const color = isOther ? OTHER_COLOR : MODEL_COLORS[idx % MODEL_COLORS.length];
      const ratio = plugin.tokens / total * 100;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { class: "plugin-list-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "plugin-name-cell", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "span",
            {
              class: "plugin-indicator",
              style: `--accent:${color}`,
              children: " "
            }
          ),
          plugin.source
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "plugin-progress-wrapper", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "plugin-progress-bar", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              class: "plugin-progress-fill",
              style: `--accent:${color}; width:${Math.max(1, Math.min(100, ratio))}%`,
              children: " "
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "span",
            {
              class: "plugin-number",
              style: "min-width: 48px;",
              children: [
                ratio.toFixed(1),
                "%"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { class: "plugin-number text-right", children: formatNum(plugin.tokens) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { class: "plugin-number text-right", children: formatNum(plugin.calls) })
      ] });
    }) })
  ] });
}
__name(pluginSection, "pluginSection");
function renderLegend(info, mode = "both") {
  const showLine = mode === "both" || mode === "line";
  const showBar = mode === "both" || mode === "bar";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "chart-legend", children: [
    mode === "line" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "legend-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          class: "legend-color-indicator legend-total-indicator",
          style: "--legend-color:var(--color-total)",
          children: " "
        }
      ),
      "总 Token"
    ] }) : null,
    mode === "line" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "legend-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          class: "legend-color-indicator legend-total-indicator",
          style: "--legend-color:var(--color-input)",
          children: " "
        }
      ),
      "输入 Token"
    ] }) : null,
    mode === "line" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "legend-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          class: "legend-color-indicator legend-total-indicator",
          style: "--legend-color:var(--color-output)",
          children: " "
        }
      ),
      "输出 Token"
    ] }) : null,
    mode === "both" && showLine ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "legend-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          class: "legend-color-indicator legend-total-indicator",
          style: "--legend-color:var(--color-total)",
          children: " "
        }
      ),
      "总 Token"
    ] }) : null,
    showBar ? Object.entries(info.colorMap).map(([model, color]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "legend-item", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          class: "legend-color-indicator",
          style: `--legend-color:${color}`,
          children: " "
        }
      ),
      model
    ] })) : null
  ] });
}
__name(renderLegend, "renderLegend");
function pageHtml(data, theme, mode = "both") {
  const info = mode === "line" ? { topModels: [], colorMap: {} } : getTopModels(data.points);
  return "<!doctype html>" + String(
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", { lang: "zh-CN", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("meta", { charset: "UTF-8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "meta",
          {
            name: "viewport",
            content: "width=device-width, initial-scale=1.0"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: "ChatLuna Token 用量" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: CSS })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("body", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: `stage theme-${theme}`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { class: "paper-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { class: "hero-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { class: "hero-title", children: "ChatLuna Token 用量" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "time-strip", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { class: "time-label", children: "统计周期" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { class: "time-value", children: formatDate(data.start) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { class: "time-sep", children: "至" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { class: "time-value", children: formatDate(data.end) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { class: "stats-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "stat-cell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-label", children: "使用 Token" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-value", children: formatNum(data.totalTokens) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "stat-cell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-label", children: "请求次数" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-value", children: formatNum(data.calls) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "stat-cell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-label", children: "TPM 峰值" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-value", children: formatNum(data.tpm) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { class: "stat-cell", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-label", children: "RPM 峰值" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { class: "stat-value", children: formatNum(data.rpm) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { class: "chart-container", children: [
          chart(data.points, info, mode),
          renderLegend(info, mode)
        ] }),
        pluginSection(data.plugins),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { class: "footer", children: [
          "Generated by ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ChatLuna" }),
          " &",
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Koishi" })
        ] })
      ] }) }) })
    ] })
  );
}
__name(pageHtml, "pageHtml");
async function renderTokenTrend(ctx, puppeteer, data, theme = "light", mode = "both") {
  let page;
  try {
    page = await puppeteer.page();
    await page.setViewport({
      width: 1080,
      height: 900,
      deviceScaleFactor: 2
    });
    await page.setContent(pageHtml(data, theme, mode), {
      waitUntil: "domcontentloaded"
    });
    await page.evaluate(() => document.fonts.ready);
    const el = await page.$(".stage");
    if (!el) {
      return "图表渲染失败：未找到图表容器。";
    }
    return await el.screenshot();
  } catch (err) {
    ctx.logger.error(err);
    return "图表渲染失败，请检查日志。";
  } finally {
    await page?.close();
  }
}
__name(renderTokenTrend, "renderTokenTrend");

// src/index.ts
var logger = new import_koishi3.Logger("chatluna-usage");
var ChatLunaUsageService = class extends import_plugin_console.DataService {
  constructor(ctx, config) {
    super(ctx, "chatluna_usage", {
      immediate: true,
      authority: 1
    });
    this.config = config;
    ctx.database.extend(
      "chatluna_usage",
      {
        id: "unsigned",
        source: { type: "char", length: 128 },
        callType: { type: "char", length: 20 },
        platform: { type: "char", length: 128 },
        chatPlatform: { type: "char", length: 128, nullable: true },
        model: { type: "char", length: 255 },
        usageMetadata: {
          type: "json",
          nullable: false,
          initial: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          }
        },
        estimated: "boolean",
        success: "boolean",
        createdAt: { type: "timestamp", nullable: false },
        ttftMs: { type: "integer", nullable: true },
        totalMs: { type: "integer", nullable: true },
        tps: { type: "float", nullable: true },
        conversationId: { type: "char", length: 255, nullable: true },
        requestId: { type: "char", length: 255, nullable: true },
        userId: { type: "char", length: 255, nullable: true },
        guildId: { type: "char", length: 255, nullable: true }
      },
      {
        autoInc: true,
        primary: "id",
        indexes: ["createdAt", "source", "model", "guildId"]
      }
    );
    ctx.on("chatluna/model-usage", async (usage) => {
      try {
        await ctx.database.create("chatluna_usage", {
          source: usage.source,
          callType: usage.callType,
          platform: usage.platform,
          chatPlatform: usage.context?.chatPlatform ?? null,
          model: usage.model,
          usageMetadata: usage.usageMetadata,
          estimated: usage.estimated,
          success: usage.success,
          createdAt: usage.createdAt,
          ttftMs: usage.timing?.ttftMs ?? null,
          totalMs: usage.timing?.totalMs ?? null,
          tps: usage.timing?.tps ?? null,
          conversationId: usage.context?.conversationId ?? null,
          requestId: usage.context?.requestId ?? null,
          userId: usage.context?.userId ?? null,
          guildId: usage.context?.guildId ?? null
        });
        if (config.webui) await this.refresh();
      } catch (e) {
        logger.error(e);
      }
    });
    ctx.command(
      "chatluna.tokens [...args:string]",
      "查看 ChatLuna 整体 token 消耗趋势",
      { authority: 1 }
    ).alias("chatluna.usage", "tokens").option("day", "-d 按天统计").option("week", "-w 按一周统计").option("month", "-m 按一月统计").option("all", "-a 统计全部").option("plugin", "-p 附带各插件用量明细").usage(
      "示例：/tokens / /tokens day / /tokens -d / /tokens d，附带插件明细 /tokens -p"
    ).action(
      async ({ session, options }, ...args) => this.sendTokens(session, options, args)
    );
    if (!config.webui) return;
    ctx.inject(["console"], (ctx2) => {
      ctx2.console.addListener(
        "chatluna-usage/query",
        async (input) => this.query(input),
        { authority: 1 }
      );
      ctx2.console.addListener(
        "chatluna-usage/list",
        async (input) => this.list(input),
        { authority: 1 }
      );
      ctx2.console.addListener(
        "chatluna-usage/cleanup",
        async (before) => {
          await this.cleanup(before ? new Date(before) : void 0);
          await this.refresh();
          return { success: true };
        },
        { authority: 1 }
      );
      ctx2.console.addEntry({
        dev: (0, import_path.resolve)(__dirname, "../client/index.ts"),
        prod: (0, import_path.resolve)(__dirname, "../dist")
      });
    });
  }
  static {
    __name(this, "ChatLunaUsageService");
  }
  async get() {
    return await this.query();
  }
  async query(input = {}) {
    const rows = await this.search(input);
    const groupBy = input.groupBy ?? "model";
    const sortBy = input.sortBy ?? "totalTokens";
    const desc = input.desc ?? true;
    const groups = /* @__PURE__ */ new Map();
    const models = /* @__PURE__ */ new Map();
    const sources = /* @__PURE__ */ new Map();
    const timeline = /* @__PURE__ */ new Map();
    const modelTimeline = /* @__PURE__ */ new Map();
    const totals = summary("total", "全部用量");
    for (const row of rows) {
      const key = this.groupKey(row, groupBy);
      const item = groups.get(key) ?? summary(
        key,
        this.groupLabel(key, groupBy),
        groupBy === "model" ? row.platform : void 0
      );
      const model = models.get(row.model) ?? summary(row.model, row.model, row.platform);
      const source = sources.get(row.source) ?? summary(row.source);
      const date = this.dateKey(row.createdAt, input.period ?? "day");
      const point = timeline.get(date) ?? {
        date,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedTokens: 0,
        reasoningTokens: 0
      };
      this.add(row, item);
      this.add(row, model);
      this.add(row, source);
      this.add(row, totals);
      point.calls += 1;
      point.inputTokens += row.usageMetadata.input_tokens;
      point.outputTokens += row.usageMetadata.output_tokens;
      point.totalTokens += row.usageMetadata.total_tokens;
      point.cachedTokens += (row.usageMetadata.input_token_details?.cache_read ?? 0) + (row.usageMetadata.input_token_details?.cache_creation ?? 0);
      point.reasoningTokens += row.usageMetadata.output_token_details?.reasoning ?? 0;
      if (!modelTimeline.has(row.model))
        modelTimeline.set(row.model, /* @__PURE__ */ new Map());
      modelTimeline.get(row.model).set(date, (modelTimeline.get(row.model).get(date) ?? 0) + 1);
      groups.set(key, item);
      models.set(row.model, model);
      sources.set(row.source, source);
      timeline.set(date, point);
    }
    this.finish(totals);
    return {
      query: this.withDefaults(input),
      totals,
      groups: [...groups.values()].map((row) => this.finish(row)).sort((a, b) => {
        const diff = a[sortBy] - b[sortBy];
        return desc ? -diff : diff;
      }),
      models: [...models.values()].map((row) => this.finish(row)).sort((a, b) => b.calls - a.calls),
      sources: [...sources.values()].map((row) => this.finish(row)).sort((a, b) => b.calls - a.calls),
      timeline: [...timeline.values()].sort(
        (a, b) => a.date.localeCompare(b.date)
      ),
      modelTimeline: [...modelTimeline.entries()].map(
        ([model, dates]) => ({
          model,
          points: [...dates.entries()].map(([date, calls]) => ({ date, calls })).sort((a, b) => a.date.localeCompare(b.date))
        })
      ),
      list: this.pageRows(rows, input)
    };
  }
  async list(input = {}) {
    const rows = await this.search(input);
    return this.pageRows(rows, input);
  }
  async cleanup(before) {
    await this.ctx.database.remove(
      "chatluna_usage",
      before ? { createdAt: { $lt: before } } : {}
    );
  }
  async sendTokens(session, options, args) {
    let range;
    if (options.all) {
      range = "all";
    } else if (options.month) {
      range = "month";
    } else if (options.week) {
      range = "week";
    } else {
      range = "day";
    }
    let plugin = Boolean(options.plugin);
    for (const arg of args) {
      const keyword = arg.replace(/^-+/, "").trim().toLowerCase();
      const value = {
        d: "day",
        day: "day",
        w: "week",
        week: "week",
        m: "month",
        month: "month",
        a: "all",
        all: "all"
      }[keyword];
      if (value) {
        range = value;
        continue;
      }
      if (keyword === "p" || keyword === "plugin") {
        plugin = true;
        continue;
      }
      return [
        "指令：chatluna tokens",
        "查看 ChatLuna 整体 token 消耗趋势",
        "可用的子指令有：",
        "  chatluna tokens day 显示当日的token用量",
        "  chatluna tokens week 显示最近一周的token用量",
        "  chatluna tokens month 显示最近一个月的token用量",
        "  chatluna tokens all 显示至今的token用量",
        "  chatluna tokens plugin 显示各插件的token用量明细"
      ].join("\n");
    }
    let report;
    try {
      report = await this.tokenReport(range, plugin);
    } catch (e) {
      logger.error(e);
      return "ChatLuna token 用量统计失败，请检查日志。";
    }
    try {
      const puppeteer = this.ctx.get("puppeteer");
      if (!puppeteer) {
        return formatTokenReport(report);
      }
      const image = await renderTokenTrend(
        this.ctx,
        puppeteer,
        report,
        this.config.tokensTheme === "auto" ? calculateTheme() : this.config.tokensTheme,
        this.config.tokensRenderMode
      );
      await session.send(
        typeof image === "string" ? import_koishi3.h.text(image) : import_koishi3.h.image(image, "image/png")
      );
    } catch (e) {
      logger.error(e);
      return formatTokenReport(report);
    }
  }
  async tokenReport(range, withPlugins = false) {
    const end = /* @__PURE__ */ new Date();
    const start = new Date(
      +end - {
        day: import_koishi3.Time.day,
        week: 7 * import_koishi3.Time.day,
        month: 30 * import_koishi3.Time.day,
        all: 0
      }[range]
    );
    const time = range === "all" ? { $lt: end } : { $gte: start, $lt: end };
    const rows = await this.ctx.database.get("chatluna_usage", {
      createdAt: time
    });
    return createTokenReport(range, start, end, rows, withPlugins);
  }
  async search(input) {
    const query = this.withDefaults(input);
    const where = {
      createdAt: { $gte: query.start, $lt: query.end }
    };
    if (query.source) where.source = query.source;
    if (query.model) where.model = query.model;
    if (query.platform) where.platform = query.platform;
    if (query.callType) where.callType = query.callType;
    if (query.success != null) where.success = query.success;
    if (query.estimated != null) where.estimated = query.estimated;
    const rows = await this.ctx.database.get("chatluna_usage", where);
    if (!query.chatPlatform && !query.guildId && !query.userId && !query.keyword) {
      return rows;
    }
    return rows.filter((row) => {
      if (query.chatPlatform && !(row.chatPlatform ?? "").includes(query.chatPlatform)) {
        return false;
      }
      if (query.guildId && !(row.guildId ?? "").includes(query.guildId)) {
        return false;
      }
      if (query.userId && !(row.userId ?? "").includes(query.userId)) {
        return false;
      }
      if (!query.keyword) return true;
      return [
        row.source,
        row.callType,
        row.platform,
        row.chatPlatform,
        row.model,
        row.conversationId,
        row.requestId,
        row.userId,
        row.guildId
      ].filter(Boolean).some((value) => value.includes(query.keyword));
    });
  }
  withDefaults(input) {
    const period = input.period ?? "day";
    const end = input.end ? new Date(input.end) : /* @__PURE__ */ new Date();
    const start = input.start ? new Date(input.start) : period === "year" ? new Date(end.getFullYear() - 1, end.getMonth(), end.getDate()) : period === "month" ? new Date(end.getFullYear(), end.getMonth() - 11, 1) : new Date(+end - this.config.recentDays * import_koishi3.Time.day);
    return {
      ...input,
      period,
      groupBy: input.groupBy ?? "model",
      sortBy: input.sortBy ?? "totalTokens",
      desc: input.desc ?? true,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? this.config.pageSize,
      listSortBy: input.listSortBy ?? "createdAt",
      listDesc: input.listDesc ?? true,
      start,
      end
    };
  }
  pageRows(rows, input) {
    const query = this.withDefaults(input);
    const sorted = rows.map((row) => ({
      ...row,
      inputTokens: row.usageMetadata.input_tokens,
      outputTokens: row.usageMetadata.output_tokens,
      totalTokens: row.usageMetadata.total_tokens,
      estimated: row.estimated,
      cachedTokens: (row.usageMetadata.input_token_details?.cache_read ?? 0) + (row.usageMetadata.input_token_details?.cache_creation ?? 0),
      reasoningTokens: row.usageMetadata.output_token_details?.reasoning ?? 0
    })).sort((a, b) => {
      const left = a[query.listSortBy];
      const right = b[query.listSortBy];
      let diff;
      if (left instanceof Date && right instanceof Date) {
        diff = +left - +right;
      } else {
        diff = Number(left) - Number(right);
      }
      return query.listDesc ? -diff : diff;
    });
    const start = (query.page - 1) * query.pageSize;
    return {
      total: sorted.length,
      page: query.page,
      pageSize: query.pageSize,
      rows: sorted.slice(start, start + query.pageSize)
    };
  }
  add(row, item) {
    item.calls += 1;
    if (row.success) item.successfulCalls += 1;
    else item.failedCalls += 1;
    item.inputTokens += row.usageMetadata.input_tokens;
    item.outputTokens += row.usageMetadata.output_tokens;
    item.totalTokens += row.usageMetadata.total_tokens;
    item.cachedTokens += (row.usageMetadata.input_token_details?.cache_read ?? 0) + (row.usageMetadata.input_token_details?.cache_creation ?? 0);
    item.reasoningTokens += row.usageMetadata.output_token_details?.reasoning ?? 0;
    if (row.estimated)
      item.estimatedTokens += row.usageMetadata.total_tokens;
    if (row.totalMs != null) {
      item.timedCalls += 1;
      item.ttftMs += row.ttftMs ?? 0;
      item.totalMs += row.totalMs;
      item.tps += row.tps ?? 0;
    }
    if (!item.lastSeen || row.createdAt > item.lastSeen)
      item.lastSeen = row.createdAt;
  }
  finish(item) {
    item.successRate = item.calls ? item.successfulCalls / item.calls : 0;
    if (item.timedCalls > 0) {
      item.ttftMs /= item.timedCalls;
      item.totalMs /= item.timedCalls;
      item.tps /= item.timedCalls;
    }
    return item;
  }
  groupKey(row, groupBy) {
    if (groupBy === "guild") return row.guildId ?? "private";
    if (groupBy === "chatPlatform") return row.chatPlatform ?? "unknown";
    return row[groupBy];
  }
  groupLabel(key, groupBy) {
    if (groupBy === "guild" && key === "private") return "私聊/未知群";
    if (groupBy === "chatPlatform" && key === "unknown")
      return "未知聊天平台";
    return key;
  }
  dateKey(date, period) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    if (period === "year") return String(y);
    if (period === "month") return `${y}-${m}`;
    return `${y}-${m}-${d}`;
  }
};
function apply(ctx, config) {
  ctx.plugin(ChatLunaUsageService, config);
}
__name(apply, "apply");
var Config = ChatLunaUsage.Config;
var inject = {
  required: ["chatluna", "database"],
  optional: ["console", "puppeteer"]
};
var name = "chatluna-usage";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatLunaUsage,
  Config,
  apply,
  inject,
  name
});
