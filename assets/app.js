const state = {
  memo: null,
  news: [],
  weekly: [],
  thesisLog: [],
  evidence: [],
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

  const [memo, news, weekly, thesisLog, evidence] = await Promise.all([
    loadJson("data/memo.json", fallbackMemo()),
    loadJson("data/news.json", []),
    loadJson("data/weekly-updates.json", []),
    loadJson("data/thesis-log.json", []),
    loadJson("data/kpi-evidence.json", [])
  ]);

  state.memo = memo;
  state.news = Array.isArray(news) ? news : [];
  state.weekly = Array.isArray(weekly) ? weekly : [];
  state.thesisLog = Array.isArray(thesisLog) ? thesisLog : [];
  state.evidence = Array.isArray(evidence) ? evidence : [];

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
    independent_conclusion: null,
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
  renderIndependentConclusion();
  renderArchitecture();
  renderCompanyCompare();
  renderKpis();
  renderKpiConclusion();
  renderEvidence();
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

function renderIndependentConclusion() {
  const container = byId("independentConclusion");
  const item = state.memo.independent_conclusion;
  if (!item) {
    container.innerHTML = `<article class="card"><p class="muted">暂无独立结论数据。</p></article>`;
    return;
  }

  container.innerHTML = `
    <article class="independent-card">
      <div class="readout-hero">
        <div>
          <div class="tag-row">
            <span class="pill">As of ${escapeHtml(item.as_of)}</span>
            <span class="pill watch">Confidence: ${escapeHtml(item.confidence)}</span>
            <span class="pill">${escapeHtml(item.stance)}</span>
          </div>
          <h3>${escapeHtml(item.headline)}</h3>
          <p class="plain"><strong>人话：</strong>${escapeHtml(item.plain)}</p>
        </div>
        <div class="source-box">
          <h4>使用的数据</h4>
          <ul>${(item.data_basis || []).map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>
          <h4>不使用</h4>
          <ul>${(item.not_used || []).map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>
        </div>
      </div>

      <div class="readout-grid">
        ${(item.company_readthrough || []).map((company) => `
          <section class="readout-block">
            <span class="pill good">${escapeHtml(company.ticker)}</span>
            <p>${escapeHtml(company.conclusion)}</p>
          </section>
        `).join("")}
      </div>

      <div class="evidence-list">
        <h4>证据链</h4>
        ${(item.evidence || []).map((evidence) => `
          <section class="evidence-item">
            <h5>${escapeHtml(evidence.point)}</h5>
            <p>${escapeHtml(evidence.detail)}</p>
            <p class="muted"><strong>待观察：</strong>${escapeHtml(evidence.watch)}</p>
          </section>
        `).join("")}
      </div>

      <div class="readout-grid three">
        ${readoutList("尚未证明", item.not_yet_proven, "watch")}
        ${readoutList("风险读数", item.risk_readthrough, "risk")}
        ${readoutList("下一步观察", item.next_watch, "good")}
      </div>
    </article>
  `;
}

function readoutList(title, values = [], tone = "") {
  return `
    <section class="readout-block">
      <span class="pill ${tone}">${escapeHtml(title)}</span>
      <ul>${(values || []).map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>
    </section>
  `;
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

function renderKpiConclusion() {
  const container = byId("kpiConclusion");
  const statuses = Object.values(state.kpiStatus);
  const verified = statuses.filter((item) => item === "已验证").length;
  const watching = statuses.filter((item) => item === "观察中").length;
  const risk = statuses.filter((item) => item === "风险信号").length;
  const unset = (state.memo.kpis || []).length - statuses.length;
  const strengthenNews = state.news.filter((item) => item.thesis_effect === "Strengthen").length;
  const weakenNews = state.news.filter((item) => item.thesis_effect === "Weaken").length;
  const highNews = state.news.filter((item) => item.importance === "High").length;

  let conclusion = "当前结论：主假设保持“观察中”。Scale-out 仍是确定性主线，Scale-up 仍是更大期权，但需要更多 KPI 和订单数据验证。";
  let tone = "watch";

  if (risk >= 2 || weakenNews > strengthenNews) {
    conclusion = "当前结论：主假设需要降温。风险信号已经开始影响判断，重点复核 CPO/NPO 导入节奏、库存、毛利率和客户订单质量。";
    tone = "risk";
  } else if (verified >= 4 && strengthenNews >= weakenNews) {
    conclusion = "当前结论：主假设获得阶段性增强。Scale-out 升级和 Scale-up 光化方向都有更多验证，但仍不等于投资建议，需要继续看收入、订单和毛利率兑现。";
    tone = "good";
  } else if (verified >= 2 || strengthenNews > weakenNews) {
    conclusion = "当前结论：主假设小幅增强。产业信号偏正面，但 KPI 仍不足以完成强验证，下一步要看 1.6T、CW laser、InP 利用率和 AI revenue。";
    tone = "good";
  }

  const nextActions = buildNextActions();
  container.innerHTML = `
    <article class="conclusion-card ${tone}">
      <div>
        <p class="eyebrow">Auto Readout</p>
        <h3>${escapeHtml(conclusion)}</h3>
        <p class="muted">这是基于当前 KPI 点击状态和 news.json 的自动归纳，不构成投资建议，需要人工复核。</p>
      </div>
      <div class="conclusion-stats">
        <span class="pill good">已验证 ${verified}</span>
        <span class="pill watch">观察中 ${watching}</span>
        <span class="pill risk">风险信号 ${risk}</span>
        <span class="pill">未验证 ${unset}</span>
        <span class="pill good">Strengthen 新闻 ${strengthenNews}</span>
        <span class="pill risk">Weaken 新闻 ${weakenNews}</span>
        <span class="pill">High 新闻 ${highNews}</span>
      </div>
      <div class="next-actions">
        <h4>下一步观察动作</h4>
        <ul>${nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </article>
  `;
}

function buildNextActions() {
  const actions = new Set();
  const riskKpis = Object.entries(state.kpiStatus).filter(([, status]) => status === "风险信号").map(([name]) => name);
  const watchKpis = Object.entries(state.kpiStatus).filter(([, status]) => status === "观察中").map(([name]) => name);

  [...riskKpis, ...watchKpis].slice(0, 4).forEach((name) => actions.add(`优先复核 KPI：${name}`));
  state.news
    .filter((item) => ["Strengthen", "Weaken"].includes(item.thesis_effect))
    .slice(0, 3)
    .forEach((item) => {
      if (item.impact_chain?.next_watch_item) actions.add(item.impact_chain.next_watch_item);
    });

  if (!actions.size) {
    actions.add("继续观察 1.6T 是否进入批量出货、AI revenue 占比是否提升。");
    actions.add("继续观察 LITE / COHR 的 CW laser 订单、InP 产能利用率和毛利率变化。");
    actions.add("继续观察 Nvidia / Google / Broadcom 是否更明确采用 CPO、NPO、OCS 或硅光路线。");
  }
  return [...actions].slice(0, 5);
}

function renderEvidence() {
  renderEvidenceReadout();
  renderEvidenceList();
}

function renderEvidenceReadout() {
  const container = byId("evidenceReadout");
  const total = state.evidence.length;
  const strengthen = state.evidence.filter((item) => item.thesis_effect === "Strengthen").length;
  const weaken = state.evidence.filter((item) => item.thesis_effect === "Weaken").length;
  const watch = state.evidence.filter((item) => item.thesis_effect === "Watch").length;
  const riskSuggestions = state.evidence.filter((item) => item.kpi_status_suggestion === "风险信号").length;
  const kpiCounts = countEvidenceKpis();

  let headline = "当前非卖方数据结论：Scale-out 主线更确定，Scale-up 光互联偏正面但仍处于订单和 KPI 验证阶段。";
  let tone = "watch";
  if (weaken > strengthen || riskSuggestions >= 2) {
    headline = "当前非卖方数据结论：需要下调短期兑现预期，优先复核 CPO/NPO 导入延后、库存和毛利率风险。";
    tone = "risk";
  } else if (strengthen >= 3 && weaken === 0) {
    headline = "当前非卖方数据结论：产业方向阶段性增强，但还不能跳过订单、收入占比、产能利用率和毛利率验证。";
    tone = "good";
  }

  container.innerHTML = `
    <article class="conclusion-card ${tone}">
      <div>
        <p class="eyebrow">System Readout</p>
        <h3>${escapeHtml(headline)}</h3>
        <p class="muted">基于 data/kpi-evidence.json 的公开数据证据库自动汇总，不使用卖方评级、目标价或买卖建议。</p>
      </div>
      <div class="conclusion-stats">
        <span class="pill">证据 ${total}</span>
        <span class="pill good">Strengthen ${strengthen}</span>
        <span class="pill risk">Weaken ${weaken}</span>
        <span class="pill watch">Watch ${watch}</span>
        <span class="pill risk">风险建议 ${riskSuggestions}</span>
      </div>
      <div class="next-actions">
        <h4>KPI 证据覆盖</h4>
        <div class="tag-row">
          ${Object.entries(kpiCounts).map(([kpi, count]) => `<span class="pill watch">${escapeHtml(kpi)} · ${count}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderEvidenceList() {
  const container = byId("evidenceList");
  if (!state.evidence.length) {
    container.innerHTML = `<article class="card"><p class="muted">暂无证据数据。请在 data/kpi-evidence.json 中添加财报、电话会或新闻证据。</p></article>`;
    return;
  }

  container.innerHTML = state.evidence.map((item) => `
    <article class="evidence-card">
      <div class="news-top">
        <div>
          <div class="tag-row">
            <span class="pill">${escapeHtml(item.date)}</span>
            <span class="pill">${escapeHtml(item.source_type)}</span>
            <span class="pill">${escapeHtml(item.company)}</span>
            <span class="pill ${thesisClass(item.thesis_effect)}">${escapeHtml(item.thesis_effect)}</span>
            <span class="pill ${confidenceClass(item.confidence)}">Confidence ${escapeHtml(item.confidence)}</span>
            <span class="pill watch">建议：${escapeHtml(item.kpi_status_suggestion)}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="muted">${escapeHtml(item.source)}</p>
        </div>
        ${item.url ? `<a class="btn tiny" href="${escapeAttr(item.url)}" target="_blank" rel="noopener">打开来源</a>` : ""}
      </div>
      <div class="evidence-flow">
        ${evidenceStep("提取事实", item.facts)}
        ${evidenceStep("映射 KPI", item.mapped_kpis, "watch")}
        ${evidenceStep("影响公司", item.affected_companies)}
        ${evidenceStep("推理", [item.reasoning])}
        ${evidenceStep("下一步观察", [item.next_watch], "good")}
      </div>
    </article>
  `).join("");
}

function evidenceStep(title, values = [], tone = "") {
  return `
    <section class="evidence-step">
      <h4>${escapeHtml(title)}</h4>
      <div>${(values || []).map((value) => `<span class="pill ${tone}">${escapeHtml(value)}</span>`).join("")}</div>
    </section>
  `;
}

function countEvidenceKpis() {
  const counts = {};
  state.evidence.forEach((item) => {
    (item.mapped_kpis || []).forEach((kpi) => {
      counts[kpi] = (counts[kpi] || 0) + 1;
    });
  });
  return counts;
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
    renderKpiConclusion();
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
