const state = {
  memo: null,
  news: [],
  weekly: [],
  thesisLog: [],
  kpiStatus: {},
  filters: {
    search: "",
    companies: [],
    layers: [],
    tags: [],
    impacts: [],
    importance: [],
    thesis: []
  }
};

const KPI_STATES = ["未验证", "观察中", "已验证", "风险信号"];
const LS_KEY = "lite-cohr-kpi-status-v1";

const FILTER_OPTIONS = {
  companyFilter: ["LITE", "COHR", "NVDA", "AVGO", "MRVL", "ANET", "GOOG", "CSCO"],
  layerFilter: ["Scale-in", "Scale-up", "Scale-out", "Scale-across", "DCI", "Supply Chain", "Financial", "Risk"],
  tagFilter: ["CPO", "NPO", "LPO", "XPO", "1.6T", "800G", "3.2T", "CW laser", "UHP laser", "InP", "Silicon Photonics", "OCS", "DSP", "EML", "Coherent Optics", "DWDM"],
  impactFilter: ["Positive", "Negative", "Neutral", "Mixed"],
  importanceFilter: ["High", "Medium", "Low"],
  thesisFilter: ["Strengthen", "Weaken", "No Change", "Watch"]
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindStaticEvents();
  setupFilterOptions();
  state.kpiStatus = loadKpiStatus();

  const [memo, news, weekly, thesisLog] = await Promise.all([
    loadJson("data/memo.json", fallbackMemo()),
    loadJson("data/news.json", []),
    loadJson("data/weekly-updates.json", []),
    loadJson("data/thesis-log.json", [])
  ]);

  state.memo = memo;
  state.news = Array.isArray(news) ? news : [];
  state.weekly = Array.isArray(weekly) ? weekly : [];
  state.thesisLog = Array.isArray(thesisLog) ? thesisLog : [];

  renderAll();
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} ${response.status}`);
    return await response.json();
  } catch (error) {
    showError(`无法加载 ${path}，页面已使用可用数据继续显示。错误：${error.message}`);
    return fallback;
  }
}

function fallbackMemo() {
  return {
    updated_at: "2026-06-20",
    title: "LITE / COHR AI 光互联 IC 备忘录",
    subtitle: "Scale-out 是确定性主线，Scale-up 是更大的期权",
    disclaimer: "仅作研究备忘录，不构成投资建议。",
    core_thesis: [],
    architecture_layers: [],
    companies: [],
    kpis: [],
    risks: [],
    glossary: []
  };
}

function renderAll() {
  renderHero();
  renderCoreThesis();
  renderArchitecture();
  renderCompanyCompare();
  renderKpis();
  renderWeekly();
  renderNews();
  renderThesisLog();
  renderRisks();
  renderGlossary();
}

function renderHero() {
  const latestWeek = [...state.weekly].sort((a, b) => String(b.week_end).localeCompare(String(a.week_end)))[0];
  const updated = latestWeek?.week_end || state.memo.updated_at || "2026-06-20";
  text("heroTitle", state.memo.title);
  text("heroSubtitle", state.memo.subtitle);
  text("heroDisclaimer", state.memo.disclaimer);
  text("lastUpdated", updated);
}

function renderCoreThesis() {
  const container = byId("coreThesis");
  container.innerHTML = state.memo.core_thesis.map((item) => `
    <article class="card">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.content)}</p>
      ${item.plain ? `<p class="plain"><strong>人话：</strong>${escapeHtml(item.plain)}</p>` : ""}
    </article>
  `).join("");
}

function renderArchitecture() {
  const container = byId("architectureMap");
  const tooltips = state.memo.tooltips || {};
  container.innerHTML = (state.memo.architecture_layers || []).map((layer) => `
    <article class="arch-layer">
      <div>
        <h3>${escapeHtml(layer.name)}</h3>
        <p class="muted">${escapeHtml(layer.explanation)}</p>
        <p class="plain"><strong>人话：</strong>${escapeHtml(layer.plain)}</p>
      </div>
      <div class="node-grid">
        ${(layer.nodes || []).map((node) => {
          const tip = tooltips[node] || { technical: "待补充专业解释。", plain: "待补充人话解释。" };
          return `<span tabindex="0" class="node" data-tooltip="专业解释：${escapeAttr(tip.technical)} 人话：${escapeAttr(tip.plain)}">${escapeHtml(node)}</span>`;
        }).join("")}
      </div>
    </article>
  `).join("");
}

function renderCompanyCompare() {
  byId("companyCompare").innerHTML = (state.memo.companies || []).map((company) => `
    <tr>
      <td><strong>${escapeHtml(company.ticker)}</strong><br><span class="muted">${escapeHtml(company.name)}</span></td>
      <td>${escapeHtml(company.tag)}</td>
      <td>${escapeHtml(company.ai_exposure)}</td>
      <td>${pills(company.core_products)}</td>
      <td>${pills(company.catalysts, "good")}</td>
      <td>${pills(company.risks, "risk")}</td>
      <td>${escapeHtml(company.best_for_testing)}</td>
    </tr>
  `).join("");
}

function renderKpis() {
  byId("kpiList").innerHTML = (state.memo.kpis || []).map((kpi, index) => {
    const current = state.kpiStatus[kpi.name] || "未验证";
    return `
      <article class="kpi-card" data-kpi="${escapeAttr(kpi.name)}">
        <h3>${index + 1}. ${escapeHtml(kpi.name)}</h3>
        <p><strong>解释：</strong>${escapeHtml(kpi.why)}</p>
        <p><strong>验证：</strong>${escapeHtml(kpi.good_signal)}</p>
        <p><strong>风险：</strong>${escapeHtml(kpi.bad_signal)}</p>
        <div class="segmented" role="group" aria-label="${escapeAttr(kpi.name)} 状态">
          ${KPI_STATES.map((item) => `<button type="button" class="${item === current ? "active" : ""}" data-status="${escapeAttr(item)}">${escapeHtml(item)}</button>`).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderWeekly() {
  const latest = [...state.weekly].sort((a, b) => String(b.week_end).localeCompare(String(a.week_end)))[0];
  const container = byId("weeklyUpdate");
  if (!latest) {
    container.innerHTML = `<p class="muted">暂无周报数据。</p>`;
    return;
  }
  container.innerHTML = `
    <h3>${escapeHtml(latest.week_start)} 至 ${escapeHtml(latest.week_end)}</h3>
    <p>${escapeHtml(latest.summary)}</p>
    <div class="weekly-grid">
      ${weeklyBlock("Key takeaways", latest.key_takeaways)}
      ${weeklyBlock("Bullish signals", latest.bullish_signals, "good")}
      ${weeklyBlock("Bearish signals", latest.bearish_signals, "risk")}
      ${weeklyBlock("Watch next week", latest.watch_next_week, "watch")}
    </div>
    <div class="weekly-block">
      <h4>Thesis change</h4>
      <p>${escapeHtml(latest.thesis_change)}</p>
    </div>
  `;
}

function weeklyBlock(title, items = [], tone = "") {
  return `
    <div class="weekly-block">
      <h4>${escapeHtml(title)}</h4>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderNews() {
  const filtered = filterNews();
  byId("newsCount").textContent = `当前显示 ${filtered.length} / ${state.news.length} 条新闻`;
  byId("newsFeed").innerHTML = filtered.map((item) => renderNewsCard(item)).join("") || `<div class="card"><p class="muted">没有匹配筛选条件的新闻。</p></div>`;
}

function renderNewsCard(item) {
  const isHigh = item.importance === "High";
  const chainOpen = isHigh ? "open" : "";
  return `
    <article class="news-card ${isHigh ? "high" : ""}">
      <div class="news-top">
        <div>
          <h3>${highlight(item.title)}</h3>
          <div class="news-meta">
            <span class="pill">${escapeHtml(item.date)}</span>
            <span class="pill">${highlight(item.source || "Unknown")}</span>
            <span class="pill">${escapeHtml(item.architecture_layer || "待判断")}</span>
            <span class="pill">${escapeHtml(item.importance || "Low")}</span>
            <span class="pill ${impactClass(item.impact)}">${escapeHtml(item.impact || "Neutral")}</span>
            <span class="pill ${thesisClass(item.thesis_effect)}">${escapeHtml(item.thesis_effect || "Watch")}</span>
          </div>
        </div>
        <div class="action-row">
          ${item.url ? `<a class="btn tiny" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">打开来源</a>` : ""}
          <button class="btn tiny" type="button" data-toggle-chain>展开 / 折叠</button>
        </div>
      </div>
      <div class="tag-row">
        ${pills(item.companies || [])}
        ${pills(item.tags || [], "watch")}
      </div>
      <div class="news-body">
        <p><strong>中文摘要：</strong>${highlight(item.summary_cn || "")}</p>
        <p><strong>Why it matters：</strong>${highlight(item.why_it_matters || "")}</p>
      </div>
      <details class="impact-chain" ${chainOpen}>
        <summary>投资影响链 impact_chain</summary>
        ${renderImpactChain(item.impact_chain || {})}
      </details>
    </article>
  `;
}

function renderImpactChain(chain) {
  const steps = [
    ["新闻事件", chain.news_event],
    ["产业环节", chain.industry_link],
    ["影响公司", pills(chain.affected_companies || [])],
    ["影响 KPI", pills(chain.affected_kpis || [], "watch")],
    ["Thesis Effect", `<span class="pill ${thesisClass(chain.thesis_effect)}">${escapeHtml(chain.thesis_effect || "Watch")}</span>`],
    ["Thesis Reason", chain.thesis_reason],
    ["Next Watch", chain.next_watch_item]
  ];
  return steps.map(([label, value]) => `
    <div class="chain-step">
      <div class="chain-label">${escapeHtml(label)}</div>
      <div>${typeof value === "string" && !value.includes("<span") ? highlight(value || "待人工判断") : value}</div>
    </div>
  `).join("");
}

function renderThesisLog() {
  byId("thesisLog").innerHTML = state.thesisLog.map((item) => `
    <article class="timeline-item">
      <span class="pill">${escapeHtml(item.date)}</span>
      <span class="pill ${confidenceClass(item.confidence)}">${escapeHtml(item.confidence)}</span>
      <h3>${escapeHtml(item.thesis)}</h3>
      <p><strong>Previous view：</strong>${escapeHtml(item.previous_view)}</p>
      <p><strong>Current view：</strong>${escapeHtml(item.current_view)}</p>
      <p><strong>Reason：</strong>${escapeHtml(item.reason)}</p>
      <p><strong>Affected companies：</strong>${pills(item.affected_companies || [])}</p>
      <p><strong>Affected KPIs：</strong>${pills(item.affected_kpis || [], "watch")}</p>
    </article>
  `).join("") || `<div class="card"><p class="muted">暂无 Thesis Change Log。</p></div>`;
}

function renderRisks() {
  byId("riskList").innerHTML = (state.memo.risks || []).map((item, index) => `
    <article class="card">
      <span class="pill risk">风险 ${index + 1}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.explanation)}</p>
    </article>
  `).join("");
}

function renderGlossary() {
  byId("glossaryList").innerHTML = (state.memo.glossary || []).map((item) => `
    <details>
      <summary>${escapeHtml(item.term)} · ${escapeHtml(item.cn)}</summary>
      <div class="details-body">
        <p><strong>英文全称：</strong>${escapeHtml(item.full)}</p>
        <p><strong>中文解释：</strong>${escapeHtml(item.cn)}</p>
        <p><strong>人话解释：</strong>${escapeHtml(item.plain)}</p>
        <p><strong>投资意义：</strong>${escapeHtml(item.investment)}</p>
      </div>
    </details>
  `).join("");
}

function setupFilterOptions() {
  Object.entries(FILTER_OPTIONS).forEach(([id, values]) => {
    const select = byId(id);
    select.innerHTML = values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join("");
  });
}

function bindStaticEvents() {
  byId("navToggle").addEventListener("click", () => {
    const nav = byId("siteNav");
    const isOpen = nav.classList.toggle("open");
    byId("navToggle").setAttribute("aria-expanded", String(isOpen));
  });

  byId("siteNav").addEventListener("click", (event) => {
    if (event.target.matches("a")) byId("siteNav").classList.remove("open");
  });

  byId("kpiList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-status]");
    if (!button) return;
    const card = button.closest("[data-kpi]");
    state.kpiStatus[card.dataset.kpi] = button.dataset.status;
    saveKpiStatus();
    renderKpis();
  });

  byId("newsFeed").addEventListener("click", (event) => {
    const button = event.target.closest("[data-toggle-chain]");
    if (!button) return;
    const details = button.closest(".news-card").querySelector("details");
    details.open = !details.open;
  });

  byId("newsSearch").addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim();
    renderNews();
  });

  const filterBindings = [
    ["companyFilter", "companies"],
    ["layerFilter", "layers"],
    ["tagFilter", "tags"],
    ["impactFilter", "impacts"],
    ["importanceFilter", "importance"],
    ["thesisFilter", "thesis"]
  ];

  filterBindings.forEach(([id, key]) => {
    byId(id).addEventListener("change", (event) => {
      state.filters[key] = selectedValues(event.target);
      renderNews();
    });
  });

  document.querySelector(".quick-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-quick]");
    if (!button) return;
    applyQuickFilter(button.dataset.quick);
  });

  byId("copyThesisBtn").addEventListener("click", copyThesis);
  byId("copyWeeklyBtn").addEventListener("click", copyWeekly);
  byId("exportNewsBtn").addEventListener("click", () => downloadJson("news.json", state.news));
  byId("exportWeeklyBtn").addEventListener("click", () => downloadJson("weekly-updates.json", state.weekly));
  byId("exportKpiBtn").addEventListener("click", () => downloadJson("kpi-checklist-status.json", state.kpiStatus));
}

function filterNews() {
  return state.news.filter((item) => {
    if (state.filters.companies.length && !intersects(item.companies, state.filters.companies)) return false;
    if (state.filters.layers.length && !state.filters.layers.includes(item.architecture_layer)) return false;
    if (state.filters.tags.length && !intersects(item.tags, state.filters.tags)) return false;
    if (state.filters.impacts.length && !state.filters.impacts.includes(item.impact)) return false;
    if (state.filters.importance.length && !state.filters.importance.includes(item.importance)) return false;
    if (state.filters.thesis.length && !state.filters.thesis.includes(item.thesis_effect)) return false;
    if (state.filters.search && !searchBlob(item).includes(state.filters.search.toLowerCase())) return false;
    return true;
  });
}

function applyQuickFilter(type) {
  clearFilterSelects();
  state.filters = { search: byId("newsSearch").value.trim(), companies: [], layers: [], tags: [], impacts: [], importance: [], thesis: [] };
  if (type === "high") setSelect("importanceFilter", ["High"], "importance");
  if (type === "weaken") setSelect("thesisFilter", ["Weaken"], "thesis");
  if (type === "strengthen") setSelect("thesisFilter", ["Strengthen"], "thesis");
  if (type === "changed") setSelect("thesisFilter", ["Strengthen", "Weaken"], "thesis");
  if (type === "clear") {
    byId("newsSearch").value = "";
    state.filters.search = "";
  }
  renderNews();
}

function setSelect(id, values, key) {
  const select = byId(id);
  [...select.options].forEach((option) => {
    option.selected = values.includes(option.value);
  });
  state.filters[key] = values;
}

function clearFilterSelects() {
  Object.keys(FILTER_OPTIONS).forEach((id) => {
    [...byId(id).options].forEach((option) => {
      option.selected = false;
    });
  });
}

function searchBlob(item) {
  return JSON.stringify(item).toLowerCase();
}

function selectedValues(select) {
  return [...select.selectedOptions].map((option) => option.value);
}

function intersects(a = [], b = []) {
  return a.some((item) => b.includes(item));
}

async function copyThesis() {
  const lines = [
    state.memo.title,
    state.memo.subtitle,
    "",
    ...(state.memo.core_thesis || []).map((item) => `${item.title}：${item.content}${item.plain ? ` 人话：${item.plain}` : ""}`)
  ];
  await copyText(lines.join("\n"));
}

async function copyWeekly() {
  const latest = [...state.weekly].sort((a, b) => String(b.week_end).localeCompare(String(a.week_end)))[0];
  if (!latest) return showToast("暂无周报可复制");
  const textValue = [
    `每周光互联 Update：${latest.week_start} 至 ${latest.week_end}`,
    latest.summary,
    "",
    "Key takeaways:",
    ...(latest.key_takeaways || []).map((x) => `- ${x}`),
    "",
    "Bullish signals:",
    ...(latest.bullish_signals || []).map((x) => `- ${x}`),
    "",
    "Bearish signals:",
    ...(latest.bearish_signals || []).map((x) => `- ${x}`),
    "",
    "Watch next week:",
    ...(latest.watch_next_week || []).map((x) => `- ${x}`),
    "",
    `Thesis change: ${latest.thesis_change}`
  ].join("\n");
  await copyText(textValue);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("已复制到剪贴板");
  } catch {
    showToast("复制失败，请检查浏览器权限");
  }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`已导出 ${filename}`);
}

function loadKpiStatus() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveKpiStatus() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.kpiStatus));
  showToast("KPI 状态已保存");
}

function pills(items = [], tone = "") {
  return items.map((item) => `<span class="pill ${tone}">${escapeHtml(item)}</span>`).join("");
}

function impactClass(value = "") {
  if (value === "Positive") return "good";
  if (value === "Negative") return "risk";
  if (value === "Mixed") return "watch";
  return "";
}

function thesisClass(value = "") {
  const key = value.toLowerCase().replace(/\s+/g, "-");
  return `status-${key}`;
}

function confidenceClass(value = "") {
  if (value === "High") return "good";
  if (value === "Low") return "risk";
  return "watch";
}

function highlight(value) {
  const safe = escapeHtml(String(value || ""));
  const query = state.filters.search;
  if (!query) return safe;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(`(${escapedQuery})`, "gi"), "<mark>$1</mark>");
}

function showError(message) {
  const box = byId("errorBox");
  box.hidden = false;
  const item = document.createElement("div");
  item.textContent = message;
  box.appendChild(item);
}

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function text(id, value) {
  byId(id).textContent = value || "";
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}
