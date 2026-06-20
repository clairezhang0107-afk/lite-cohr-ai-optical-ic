import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const sources = [
  {
    name: "Lumentum IR",
    url: "https://investor.lumentum.com/rss/news-releases.xml",
    type: "rss"
  },
  {
    name: "Coherent IR",
    url: "https://investors.coherent.com/rss/news-releases.xml",
    type: "rss"
  },
  {
    name: "NVIDIA Blog",
    url: "https://blogs.nvidia.com/feed/",
    type: "rss"
  },
  {
    name: "Broadcom News",
    url: "https://www.broadcom.com/company/news/rss",
    type: "rss"
  }
];

const NEWS_PATH = new URL("../data/news.json", import.meta.url);
const MAX_NEWS = 200;

const existingNews = await readExistingNews();
const fetched = [];

for (const source of sources) {
  try {
    const response = await fetch(source.url, {
      headers: { "user-agent": "lite-cohr-optical-news-bot/1.0" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const items = parseFeed(text, source);
    fetched.push(...items.map((item) => normalizeNews(item, source)));
    console.log(`Fetched ${items.length} items from ${source.name}`);
  } catch (error) {
    console.warn(`Warning: failed to fetch ${source.name}: ${error.message}`);
  }
}

if (fetched.length === 0) {
  console.warn("Warning: no new items fetched. Keeping existing data/news.json unchanged.");
  process.exit(0);
}

const merged = dedupe([...fetched, ...existingNews])
  .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  .slice(0, MAX_NEWS);

await writeFile(NEWS_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
console.log(`Updated data/news.json with ${merged.length} items.`);

async function readExistingNews() {
  if (!existsSync(NEWS_PATH)) return [];
  try {
    const raw = await readFile(NEWS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Warning: failed to read existing news.json: ${error.message}`);
    return [];
  }
}

function parseFeed(xml, source) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;
  return blocks.map((block) => ({
    title: decodeXml(readTag(block, "title")),
    url: decodeXml(readTag(block, "link")) || readAtomLink(block),
    date: normalizeDate(readTag(block, "pubDate") || readTag(block, "updated") || readTag(block, "published")),
    summary: stripHtml(decodeXml(readTag(block, "description") || readTag(block, "summary") || readTag(block, "content"))),
    source: source.name
  })).filter((item) => item.title);
}

function readTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1") : "";
}

function readAtomLink(block) {
  const match = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? decodeXml(match[1]) : "";
}

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function normalizeNews(item, source) {
  const text = `${item.title} ${item.summary}`;
  const companies = detectCompanies(text);
  const { tags, architectureLayer } = detectTagsAndLayer(text);
  const importance = detectImportance(item.title);
  const impact = detectImpact(text);
  const thesisEffect = detectThesisEffect(text, tags);
  const chain = buildImpactChain({
    title: item.title,
    companies,
    tags,
    architectureLayer,
    thesisEffect,
    impact
  });

  return {
    id: makeId(item.date, item.title),
    date: item.date,
    source: source.name,
    title: item.title,
    url: item.url,
    companies,
    tags,
    architecture_layer: architectureLayer,
    importance,
    summary_cn: makeSummaryCn(item.title, tags, companies),
    why_it_matters: makeWhyItMatters(tags, impact),
    impact,
    thesis_effect: chain.thesis_effect || thesisEffect,
    status: importance === "High" ? "Important" : "Watch",
    impact_chain: chain
  };
}

function detectCompanies(text) {
  const rules = [
    ["LITE", /\b(Lumentum|LITE)\b/i],
    ["COHR", /\b(Coherent|COHR)\b/i],
    ["NVDA", /\b(Nvidia|NVDA|Rubin|Blackwell|NVL72)\b/i],
    ["AVGO", /\b(Broadcom|Tomahawk|Jericho)\b/i],
    ["MRVL", /\bMarvell\b/i],
    ["ANET", /\bArista\b/i],
    ["GOOG", /\b(Google|TPU|OCS)\b/i],
    ["CSCO", /\bCisco\b/i]
  ];
  return unique(rules.filter(([, regex]) => regex.test(text)).map(([value]) => value));
}

function detectTagsAndLayer(text) {
  const rules = [
    ["CPO", /\b(CPO|Co-Packaged Optics)\b/i, "Scale-up"],
    ["NPO", /\b(NPO|Near-Packaged Optics)\b/i, "Scale-up"],
    ["XPO", /\bXPO\b/i, "Scale-up"],
    ["LPO", /\b(LPO|Linear Pluggable Optics)\b/i, "Scale-out"],
    ["1.6T", /\b1\.6T\b/i, "Scale-out"],
    ["800G", /\b800G\b/i, "Scale-out"],
    ["3.2T", /\b3\.2T\b/i, "Scale-out"],
    ["CW laser", /\b(CW laser|continuous wave laser)\b/i, "Supply Chain"],
    ["UHP laser", /\b(UHP laser|ultra high power laser)\b/i, "Supply Chain"],
    ["InP", /\b(InP|Indium Phosphide)\b/i, "Supply Chain"],
    ["Silicon Photonics", /\bsilicon photonics\b/i, ""],
    ["OCS", /\b(OCS|Optical Circuit Switching)\b/i, "Scale-up"],
    ["DSP", /\bDSP\b/i, ""],
    ["EML", /\bEML\b/i, ""],
    ["Coherent Optics", /\bcoherent optics\b/i, "DCI"],
    ["DWDM", /\bDWDM\b/i, "DCI"]
  ];
  const tags = [];
  let architectureLayer = "Financial";
  for (const [tag, regex, layer] of rules) {
    if (regex.test(text)) {
      tags.push(tag);
      if (layer) architectureLayer = layer;
    }
  }
  return { tags: unique(tags), architectureLayer };
}

function detectImportance(title) {
  if (/\b(CPO|NPO|XPO|InP|CW laser|UHP laser|1\.6T|NVL72|Rubin|Tomahawk|Jericho)\b/i.test(title)) return "High";
  if (/\b(800G|LPO|silicon photonics|datacenter|data center|AI infrastructure|transceiver)\b/i.test(title)) return "Medium";
  return "Low";
}

function detectImpact(text) {
  const positive = /\b(expand|capacity|order|launch|record revenue|margin expansion|qualification)\b/i.test(text);
  const negative = /\b(delay|weak demand|inventory|cut order|margin pressure|price competition|shortage|restriction)\b/i.test(text);
  if (positive && negative) return "Mixed";
  if (positive) return "Positive";
  if (negative) return "Negative";
  return "Neutral";
}

function detectThesisEffect(text, tags) {
  if (/\b(delay|weak demand|inventory|cut order|margin pressure|price competition)\b/i.test(text)) return "Weaken";
  if (tags.some((tag) => ["CPO", "NPO", "XPO", "InP", "CW laser", "UHP laser"].includes(tag)) || /\b(Scale-up|Rubin|NVL72)\b/i.test(text)) return "Strengthen";
  if (/\b(earnings|guidance|customer qualification|sampling|pilot)\b/i.test(text)) return "Watch";
  return "No Change";
}

function buildImpactChain({ title, companies, tags, thesisEffect }) {
  const has = (...values) => values.some((value) => tags.includes(value) || new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(title));
  let chain = {
    news_event: title,
    industry_link: "待人工判断",
    affected_companies: companies.length ? companies : ["LITE", "COHR"],
    affected_kpis: ["Nvidia / Google / Broadcom 架构路线"],
    thesis_effect: thesisEffect || "Watch",
    thesis_reason: "该新闻可能与 AI 光互联产业链有关，但需要人工判断其对投资假设的影响。",
    next_watch_item: "人工复核新闻来源、公司影响和相关 KPI。"
  };

  if (has("CPO", "NPO", "XPO")) {
    chain = {
      ...chain,
      industry_link: "Scale-up 光互联 / CPO-NPO-XPO",
      affected_kpis: ["CW laser 订单", "Nvidia / Google / Broadcom 架构路线", "毛利率变化"],
      thesis_effect: "Strengthen",
      thesis_reason: "这条新闻与 Scale-up 光互联有关，可能增强光入柜和 CPO/NPO/XPO 放量假设。但仍需订单、客户导入和毛利率验证。",
      next_watch_item: "继续观察 Nvidia / Google / Broadcom 架构路线、CW laser 订单和客户验证节奏。"
    };
  }

  if (has("CW laser", "UHP laser")) {
    chain = {
      ...chain,
      industry_link: "CW laser / UHP laser 光源",
      affected_kpis: unique([...chain.affected_kpis, "CW laser 订单", "毛利率变化", "InP 产能利用率"]),
      thesis_reason: "这条新闻与高功率光源有关。如果 CPO/NPO 放量，CW laser / UHP laser 可能成为关键瓶颈。",
      next_watch_item: "继续观察 CW laser 订单、产能利用率和毛利率是否改善。"
    };
  }

  if (has("InP")) {
    chain = {
      ...chain,
      industry_link: "InP 光芯片 / 供应链",
      affected_kpis: unique([...chain.affected_kpis, "InP 产能利用率", "库存和预付款", "毛利率变化"]),
      thesis_reason: "这条新闻与 InP 供应链有关。InP 是高速光芯片和激光器的重要材料，如果供需紧张，可能影响 LITE / COHR 的收入和毛利率。",
      next_watch_item: "继续观察 InP 扩产、产能利用率、客户预付款和交付周期。"
    };
  }

  if (has("1.6T", "800G") || /\btransceiver\b/i.test(title)) {
    chain = {
      ...chain,
      industry_link: "Scale-out 光模块",
      affected_kpis: unique([...chain.affected_kpis, "1.6T transceiver 出货节奏", "Cloud / AI revenue 占比", "毛利率变化"]),
      thesis_reason: "这条新闻与 Scale-out 光模块升级有关。800G 到 1.6T 的切换是当前 AI 光互联确定性主线。",
      next_watch_item: "继续观察 1.6T 是否进入批量出货、AI revenue 占比是否提升。"
    };
  }

  if (/\b(delay|weak demand|inventory|cut order|margin pressure|price competition)\b/i.test(title)) {
    chain = {
      ...chain,
      industry_link: "风险 / 需求质量",
      affected_kpis: ["库存和预付款", "毛利率变化", "客户集中度"],
      thesis_effect: "Weaken",
      thesis_reason: "这条新闻可能削弱短期需求或利润弹性，需要警惕收入增长质量和库存风险。",
      next_watch_item: "继续观察库存、预付款、毛利率和客户订单是否恶化。"
    };
  }

  return chain;
}

function makeSummaryCn(title, tags, companies) {
  const companyText = companies.length ? companies.join(" / ") : "相关公司";
  const tagText = tags.length ? tags.join(" / ") : "AI 光互联";
  return `${companyText} 相关新闻涉及 ${tagText}：${title}`;
}

function makeWhyItMatters(tags, impact) {
  if (tags.includes("CPO") || tags.includes("NPO") || tags.includes("XPO")) return "这可能影响 Scale-up 光互联从验证走向订单的节奏，需要继续跟踪客户导入和毛利率。";
  if (tags.includes("InP") || tags.includes("CW laser") || tags.includes("UHP laser")) return "这可能影响上游光源和 InP 供需格局，需要验证产能利用率、订单和利润弹性。";
  if (tags.includes("1.6T") || tags.includes("800G")) return "这可能影响 Scale-out 光模块升级主线，需要跟踪批量出货和 AI revenue 占比。";
  if (impact === "Negative") return "这可能是需求、库存或价格风险信号，需要人工复核其对假设的影响。";
  return "这可能与 AI 光互联产业链有关，但仍需人工判断具体影响。";
}

function dedupe(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.url || item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function makeId(date, title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
  return `news-${date.replaceAll("-", "")}-${slug || Math.random().toString(36).slice(2, 8)}`;
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
