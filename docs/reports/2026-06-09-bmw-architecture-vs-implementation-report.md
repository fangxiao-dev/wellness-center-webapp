# BMW 架构文档与当前代码实现对比报告

日期：2026-06-09

## 结论摘要

本次使用两个 subagent 并行调研：

- 文档调研 subagent：抽取 `D:\Downloads\BMW_Architekturdokumentation_final.docx` 的架构、组件、API、数据与部署要求。
- 代码审计 subagent：审计 `D:\CodeSpace\dbe-cloud-soloproject` 当前实现、服务边界、API、数据层、测试与质量风险。

核心结论：

1. Word 文档是 **BMW Web Shop / BMW Web-Anwendung** 架构文档；当前仓库是 **AI-assisted Wellness Center Web Application**。二者业务域、命名、页面语义和数据实体不一致。
2. 当前代码保留了 BMW 文档的核心云式架构形状：`web-frontend -> web-backend -> api-gateway -> services -> infrastructure`。
3. 当前代码已完成 Wellness Center retheme 的主体实现，但与仓库自身的 Read First 文档仍有若干缺口，尤其是 aftercare 商品详情页、configurations API、访问上下文页面脚本、旧 `/api/destinations` 调用、测试稳定性与安全默认值。
4. 如果课程提交目标是 Wellness Center solo project，应优先更新或替换 BMW Word 文档，而不是让代码回退到 BMW 主题。

## 1. Word 文档要求

`BMW_Architekturdokumentation_final.docx` 描述的是 BMW Web Shop，核心组件如下：

- Web Shop Frontend：唯一浏览器入口，服务 `/static`，Docker Compose 暴露 `3000`，非静态请求转发到 Web Shop Backend。
- Web Shop Backend：EJS SSR，渲染 Home、Konfigurator、Merch Shop、Merch-Product、AI Feature、Shopping Cart、Impressum，转发 `/api/*` 到 API Gateway。
- API Gateway：统一代理到 Car Configurator、Merch Shop、Shopping Cart、AI Feature、Route Service；管理 session cookie；代理二进制图片资源。
- Car Configurator：BMW 车型、颜色、轮毂、内饰、有效组合、价格、image key，独立 MySQL。
- Merch Shop：商品列表/详情和商品图片 key，独立 MySQL。
- Shopping Cart：Redis 按 session 保存车辆配置和商品 snapshot。
- AI Feature：无数据库，通过 HTTP 读取 Configurator/Merch 数据并调用 Gemini。
- Route Service：MySQL 保存 BMW 旅行目的地，`GET /destinations` 返回 active destinations，Google Maps JS 在浏览器端渲染。
- 数据/外部组件：MySQL、Redis、MinIO、Google Maps、Gemini、YouTube iframe。
- 部署决策：所有组件部署到 AWS Elastic Beanstalk，面向 unpredictable workload 水平扩展。

文档内还有 3 个批注，质疑或要求检查：Frontend 转发非静态请求、Gateway 管理 session/image streaming、Route Service 独立 DB 的合理性。

## 2. 当前代码实现

当前仓库主题是 Wellness Center。README 与项目上下文定义为 massage package configuration、AI consultation、aftercare shop、visit preparation、Redis cart、service-owned MySQL、MinIO media。

实际服务清单：

- `services/web-frontend`：监听 `4100`，服务 `/static`，代理到 `web-backend`。
- `services/web-backend`：EJS SSR，转发 `/api/*` 到 `api-gateway`。
- `api-gateway`：session cookie、API 路由、二进制 asset proxy。
- `services/package-configurator`：`wellness_package_configurator`，packages/durations/intensities/add-ons/calculate/assets。
- `services/aftercare-shop`：`wellness_aftercare_shop`，products/detail/assets。
- `services/ai-feature`：通过 HTTP 读取 configurator 和 aftercare，调用 Gemini。
- `services/visit-context-service`：`wellness_visit_context`，locations/weather fallback/visit-summary。
- `services/shopping-cart`：Redis cart，24h TTL。
- `docker-compose.yml`：3 个 MySQL、Redis、MinIO、MinIO seed job 和所有 app services。

## 3. 文档 vs 代码 Diff

| 维度 | BMW Word 文档 | 当前代码 | 结论 |
|---|---|---|---|
| 业务主题 | BMW Web Shop | Wellness Center | 根本主题不一致 |
| 前端入口端口 | 3000 | 4100 | 当前项目有意改为 4100 |
| Configurator | BMW car model/color/wheels/interior | massage package/duration/intensity/add-ons | 已 retheme，领域不同 |
| Shop | Merch Shop + Merch-Product | Aftercare Shop，当前缺 SSR detail route | 部分实现缺口 |
| Route | `/destinations` BMW travel destinations | `/api/visit-context/*` center visit context | 语义已改，首页仍有旧调用 |
| Asset route | `/api/merch/assets/*` | `/api/aftercare/assets/*` | 已 retheme |
| DB schema | `bmw_car_configurator`, `bmw_merch_shop`, route DB | `wellness_package_configurator`, `wellness_aftercare_shop`, `wellness_visit_context` | 已 retheme |
| Deployment | AWS Elastic Beanstalk | Docker Compose local demo | 仓库缺 AWS EB 对应说明/配置 |
| External APIs | Gemini, Google Maps, YouTube | Gemini, Google Maps key, weather fallback, YouTube-like home code | Google Weather 未真实接入 |

## 4. 主要问题与改进建议

### P0: 提交文档和实现主题不一致

Word 文档仍是 BMW 架构文档，而仓库目标明确是 Wellness Center。若提交这个 Word 文件，会被视为文档没有匹配 solo project。

建议：基于当前 `docs/architecture.md`、`docs/top-level-knowledge/tech-stack.md` 和代码实现，生成一版 Wellness Center 架构文档，替换 BMW 名称、端口、实体、schema、页面和 ADR/DDR。

### P1: 缺 `/aftercare-shop/:productId` SSR 页面

仓库项目上下文要求 `/aftercare-shop/:productId`，但 `services/web-backend/src/server.js` 只注册了 `/aftercare-shop`。领域服务和 gateway 已有产品详情 API，但没有 EJS detail 页面。

建议：二选一：

- 补 `web/views/aftercare-product.ejs` 和 `GET /aftercare-shop/:productId`。
- 或正式修改项目文档，把 aftercare 商品详情改为同页 anchor/card 交互。

### P1: 访问上下文页面脚本未加载

未找到任何 view 引入 `/static/app.js`。但 `web/public/app.js` 里包含 visit context 加载逻辑，因此 `/visit-context` 很可能只渲染静态容器，无法实际显示 summary/map。

建议：将所需 JS 迁入 `visit-context.ejs`，或在 layout 中引入 `/static/app.js` 并确保不会破坏其他页面。

### P1: 首页仍调用旧 `/api/destinations`

`web/views/home.ejs` 仍 fetch `/api/destinations`，但 gateway 实际提供的是 `/api/visit-context/locations`。这会让首页地图/路线相关交互失效。

建议：把旧 Route Service 调用替换成 visit-context API，并清理相关 BMW route 命名。

### P1: `GET /configurations` 文档与实现不一致

`docs/func-design/wellness-center-service-boundaries.md` 仍列出 `GET /configurations`，但 `services/package-configurator/src/server.js` 没有该 endpoint，`api-gateway/src/server.js` 也没有 `/api/configurator/configurations`。

建议：如果当前动态 calculate 设计是最终方案，更新服务边界文档；如果仍需要组合列表，则补服务和 gateway route。

### P2: 旧 BMW/car 命名残留

模板中仍有 `car-reveal`、`carModel`、`SportsCarOverlay`、`route-car-marker` 等命名。可见文案多数已改，但维护语义仍有 car/BMW 痕迹。

建议：清理 CSS class、JS 变量、地图 overlay 命名，统一为 package/visit/wellness 语义，降低课程审查和后续维护风险。

### P2: 测试稳定性与覆盖缺口

主线程验证结果：

- `npm test --prefix api-gateway` 通过。
- `npm test --prefix services/web-backend` 通过。
- `npm test --prefix services/package-configurator` 通过。
- `npm test --prefix services/aftercare-shop` 通过。
- `npm test --prefix services/visit-context-service` 通过。
- `npm test --prefix services/ai-feature` 通过。
- `npm test --prefix services/web-frontend` 默认并发运行时出现 1 次 health 测试失败；`node --test --test-concurrency=1` 通过，说明测试 harness 有并发/端口探测不稳定风险。

另一个缺口：`services/shopping-cart/test/cart-validation.test.js` 存在，但 `services/shopping-cart/package.json` 没有 `test` 脚本。

建议：

- 给 `web-frontend` 测试设置串行或避免 port probe 竞态。
- 给 `shopping-cart` 增加 `"test": "node --test"`。
- 增加 CI：跑 `docker compose config --quiet`、所有服务测试、可选 `scripts/smoke-test.ps1 -SkipAi`。

### P2: 安全默认值可加强

`api-gateway` 生成 `sessionId` cookie 时只有 `httpOnly`。本地 demo 可接受，但建议加 `sameSite: "lax"`、环境化 `secure`、明确生命周期。

`package-configurator.ejs` 通过未转义 JSON 输出 route params 的初始选择，建议安全序列化并转义 `<`，降低脚本注入风险。

### P2: Dockerfile 暴露端口与 Compose 不一致

`services/ai-feature/Dockerfile` 暴露 `3004`，Compose 使用 `4105`；`services/shopping-cart/Dockerfile` 暴露 `3005`，Compose 使用 `4106`。这通常不影响容器运行，但会误导维护者。

建议：统一 `EXPOSE 4105` 和 `EXPOSE 4106`。

### P3: Google Weather / AWS EB 口径待统一

当前 `visit-context-service` 使用 DB fallback weather，没有实际调用 Google Weather API。Word 文档要求 AWS Elastic Beanstalk 部署，但仓库目前主要是 Docker Compose 本地 demo。

建议：P0 可以保留 fallback，但需在架构文档明确“Google Weather 是可选增强/未来项”；如果课程要求部署决策，应补 AWS EB 或等价 PaaS 部署说明。

## 5. 建议修复顺序

1. 生成 Wellness Center 版架构文档，替代 BMW Word 文档作为提交物。
2. 修复 `/aftercare-shop/:productId` 文档/实现冲突。
3. 修复 `/visit-context` 脚本加载和首页 `/api/destinations` 旧调用。
4. 补齐 `shopping-cart` 测试脚本，稳定 `web-frontend` 测试。
5. 清理 car/BMW 内部命名残留。
6. 加强 session cookie 和模板 JSON 安全序列化。
7. 对齐 Dockerfile `EXPOSE`、Google Weather、AWS EB/部署说明。

## 6. 验证记录

已执行：

```powershell
git status --short
git ls-files
docker compose config --quiet
npm test --prefix api-gateway
npm test --prefix services/web-frontend
npm test --prefix services/web-backend
npm test --prefix services/package-configurator
npm test --prefix services/aftercare-shop
npm test --prefix services/visit-context-service
npm test --prefix services/ai-feature
node --test --test-concurrency=1  # in services/web-frontend
```

说明：

- 默认 `npm test --prefix services/web-frontend` 在主线程出现一次并发失败；串行复跑通过。
- 未启动完整 Docker Compose 栈跑 smoke test，因此运行时数据库/Redis/MinIO 端到端状态未在本报告中重新验证。
- 本报告未修改业务代码。
