# LITE / COHR AI 光互联 IC 备忘录

这是一个可部署到 GitHub Pages 的中文静态网站，用来持续跟踪 Lumentum（LITE）与 Coherent（COHR）在 AI 光互联产业链中的投资逻辑。

本网站不是普通新闻流，而是一个研究判断系统。核心研究逻辑是：

新闻
↓
对应产业环节
↓
影响公司
↓
影响 KPI
↓
是否改变投资假设
↓
下一步观察动作

网站仅作研究备忘录，不构成投资建议，不输出目标价，不输出买入、卖出、持有建议。所有新闻自动分类和投资影响链均需人工复核。

## 本地打开方式

方式一：直接打开 `index.html`。

方式二：使用本地静态服务器：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

如果浏览器限制直接读取本地 JSON 文件，建议使用本地静态服务器方式。

## 部署到 GitHub Pages

1. push 项目到 GitHub。
2. 打开仓库 `Settings`。
3. 进入 `Pages`。
4. Source 选择 `Deploy from branch`。
5. Branch 选择 `main`。
6. Folder 选择 `/root`。
7. 点击 `Save`。

## 如何手动更新 memo.json

核心观点、公司对比、KPI、架构图、风险和术语都在：

```text
data/memo.json
```

更新后刷新页面即可。建议保持所有判断使用“假设、验证、风险、待观察”的表达方式。

## 如何手动更新 news.json

新闻数据在：

```text
data/news.json
```

每条新闻必须包含完整 `impact_chain`：

```json
{
  "news_event": "",
  "industry_link": "",
  "affected_companies": [],
  "affected_kpis": [],
  "thesis_effect": "",
  "thesis_reason": "",
  "next_watch_item": ""
}
```

新闻卡片会把 `impact_chain` 转换为纵向流程：

新闻事件 → 产业环节 → 影响公司 → 影响 KPI → Thesis Effect → Thesis Reason → Next Watch。

## 如何手动触发 GitHub Actions

1. 打开仓库 `Actions`。
2. 选择 `weekly-news`。
3. 点击 `Run workflow`。

工作流会执行：

```bash
node scripts/update-news.mjs
```

如果 `data/news.json` 或 `data/weekly-updates.json` 有变化，会自动提交：

```text
weekly optical news update
```

## 如何修改新闻来源

修改脚本顶部的 `sources` 数组：

```text
scripts/update-news.mjs
```

脚本只使用公开 RSS / Atom / 网页来源，不需要 API key。

## 如何修改关键词规则

修改 `scripts/update-news.mjs` 里的关键词识别函数：

- `detectCompanies`
- `detectTagsAndLayer`
- `detectImportance`
- `detectImpact`
- `detectThesisEffect`
- `buildImpactChain`

脚本不会调用外部 AI API。`summary_cn` 和 `why_it_matters` 由关键词模板生成，方便后续人工复核和修订。

## 数据文件

- `data/memo.json`：IC 结论、公司对比、KPI、架构图、风险、术语。
- `data/news.json`：新闻流和投资影响链。
- `data/kpi-evidence.json`：非卖方数据、财报、电话会、新闻事实与 KPI 推理。
- `data/weekly-updates.json`：每周复盘。
- `data/thesis-log.json`：投资假设变化记录。

## 免责声明

新闻自动分类仅作研究辅助，不构成投资建议。所有内容需人工复核。网站不输出目标价，不输出买入、卖出、持有建议。
