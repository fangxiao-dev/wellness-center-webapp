# Wellness Center 内容填充计划

## 目的

这份计划用于明确：在当前架构脚手架已经打通之后，哪些地方还需要替换成真实的 Wellness Center 内容。

本计划只处理内容、素材、种子数据和迁移语义清理，不改变已经确认的运行架构：

```text
web-frontend -> web-backend -> api-gateway -> services -> infrastructure
```

当前重点是让项目从“架构完整的脚手架”变成“看起来像真实 Wellness Center / Massage Center 的课程项目”，同时保持服务边界和 smoke test 可用。

## 填充策略

先保留当前 P0 业务形态：

- 3 个按摩 package
- 4 个 package add-on
- 6 个 aftercare 商品
- 1 个主门店/中心位置
- 首页和 AI 咨询页的静态展示素材

第一阶段建议“原位替换”，不要新增服务、不要跨服务查库、不要引入支付、预约、治疗师排班或 CMS。

## 优先级总览

| 优先级 | 区域 | 原因 |
|---|---|---|
| P0 | MinIO package/product/center 素材 | 这些素材可见，并且能证明对象存储链路在用。 |
| P0 | MySQL package/product/location 种子数据 | 这些数据定义了用户能看到的业务领域。 |
| P0 | 品牌名、地址、页面标题 | 避免 demo 时出现脚手架身份。 |
| P1 | 首页和 AI 静态展示图 | 改善第一眼观感，不影响架构。 |
| P1 | 迁移遗留的 `car` / `vehicle` / BMW 语义 | 减少小组项目迁移痕迹。 |
| P2 | 语言一致性 | 属于最终 polish；决定全英文还是德文界面。 |

## 品牌与中心身份

### 涉及文件

- `infrastructure/mysql/init/03_visit_context.sql`
- `web/views/layouts/main.ejs`
- `services/web-backend/src/server.js`
- `web/views/home.ejs`
- `web/public/app.js`
- `assets/center/center-entrance.png`
- `web/public/images/home-hero.png`
- `web/public/images/center-impression.png`
- `web/public/images/wellness-stage-loop.png`

### 需要填充什么

- 最终中心名称
- 一句短 tagline
- 真实或可信的中心地址
- 用于 Google Maps 的经纬度
- 营业时间/开放说明
- 到店提示
- 中心入口或接待区图片
- 中心氛围图

### 语义建议

品牌应该像一个专业按摩和 wellness center，而不是酒店、度假村或诊所。

可选命名方向：

- `Serenity Wellness Center`
- `Balance & Relief Wellness Center`
- `Urban Calm Massage Center`
- `Stillpoint Wellness Center`

tagline 可以走这种方向：

- `Massage packages for tension relief, calm, and recovery.`
- `Guided massage sessions with practical aftercare.`
- `Focused wellness packages for everyday body relief.`

### 素材来源建议

最好使用自己的照片或生成图。  
如果中心是虚构的，生成图比随便找真实门店图更安全。  
如果使用 stock photo，建议记录素材 URL、作者和 license。

## Package Configurator 内容

### 涉及文件

- `infrastructure/mysql/init/02_package_configurator.sql`
- `assets/package-configurator/neck-shoulder-relief.png`
- `assets/package-configurator/stress-reset-massage.png`
- `assets/package-configurator/warm-recovery-massage.png`
- `web/public/images/package-relief.png`
- `web/public/images/package-recovery.png`

### 当前 package 槽位

| 槽位 | 当前名称 | 建议 |
|---|---|---|
| Package 1 | `Neck & Shoulder Relief` | 保留。非常符合 Wellness Center 主题。 |
| Package 2 | `Stress Reset Massage` | 保留。适合作为 AI 推荐目标。 |
| Package 3 | `Warm Recovery Massage` | 保留。适合连接 add-on 和 aftercare。 |

### 需要填充什么

每个 package 需要：

- package 主图
- package goal
- 列表页短描述
- 每种有效配置的 summary
- 图片 alt text
- 基础价格
- 默认时长

### 语义推荐

#### Neck & Shoulder Relief

图片方向：

- 上背部按摩
- 肩颈按摩
- 安静的按摩床场景
- 不要出现医疗设备

描述方向：

> A focused upper-body massage package for desk tension, shoulder tightness, and everyday neck fatigue.

搜索关键词：

- `neck shoulder massage spa`
- `upper back massage`
- `shoulder tension massage`

#### Stress Reset Massage

图片方向：

- 安静的按摩房
- 放松状态的用户
- 香薰、毛巾、柔和灯光细节
- 下班后放松感

描述方向：

> A slower relaxation massage package for mental reset, lighter pressure, and a calmer evening routine.

搜索关键词：

- `relaxation massage spa`
- `calm massage room`
- `aroma massage`

#### Warm Recovery Massage

图片方向：

- 热石按摩
- 热毛巾
- 暖色灯光治疗室
- 强调舒适和恢复感，不要像运动医学

描述方向：

> A warmth-focused massage package using gentle heat elements to support comfort, recovery, and mobility.

搜索关键词：

- `hot stone massage`
- `warm towel spa`
- `warm recovery massage`

### Add-on 槽位

| 当前 Add-on | 建议 |
|---|---|
| `Hot Stone` | 保留。适合 Warm Recovery。 |
| `Aroma Oil` | 保留。适合 Stress Reset。 |
| `Gentle Stretching` | 保留。适合 mobility/recovery。 |
| `Warm Towel Finish` | 保留。适合作为低价 add-on。 |

当前 add-on 没有单独图片对象。  
如果后续 UI 要展示 add-on 缩略图，再新增独立 MinIO prefix；P0 不建议先扩。

## Aftercare Shop 内容

### 涉及文件

- `infrastructure/mysql/init/01_aftercare_shop.sql`
- `assets/aftercare-shop/heated-neck-wrap.png`
- `assets/aftercare-shop/lavender-aroma-oil.png`
- `assets/aftercare-shop/recovery-massage-ball.png`
- `assets/aftercare-shop/ergonomic-neck-pillow.png`
- `assets/aftercare-shop/herbal-warmth-pack.png`
- `assets/aftercare-shop/stretching-band.png`
- `web/public/images/aftercare-preview.png`

### 需要填充什么

每个 product 需要：

- 商品图
- 商品名称
- 商品类别
- 价格
- 短描述
- 使用提示
- 安全的 alt text

### 语义推荐

| 商品槽位 | 图片方向 | 描述角度 |
|---|---|---|
| Heated Neck Wrap | 中性背景产品图，温暖布料质感 | 按摩后在家使用的肩颈热敷辅助。 |
| Lavender Aroma Oil | 小瓶精油，搭配薰衣草或毛巾 | 晚间放松仪式；只作外用。 |
| Recovery Massage Ball | 手掌大小按摩球特写 | 足底、肩部、背部的轻柔自我按摩辅助。 |
| Ergonomic Neck Pillow | 床上或中性背景颈枕 | 肩颈放松 session 后的休息支持。 |
| Herbal Warmth Pack | 草本热敷包、毛巾、布料 | 安静恢复时刻的舒适热敷。 |
| Gentle Stretching Band | 拉伸带放在瑜伽垫或浅色背景上 | 到店后延续轻度活动和 mobility 的工具。 |

### 素材来源建议

优先用自己拍的产品图或生成的产品风格图。  
供应商图只有在有授权时才建议使用。  
免费图库更适合生活方式图，不一定适合统一的商品 catalog 图。

## 首页展示素材与 YouTube 首屏视频

### 涉及文件

- `web/public/images/home-hero.png`
- `web/public/images/wellness-stage-loop.png`
- `web/public/images/wellness-ai-hero.png`
- `web/public/images/aftercare-preview.png`
- `web/public/images/package-relief.png`
- `web/public/images/package-recovery.png`
- `web/public/images/center-impression.png`

### 需要填充什么

| 文件 | 推荐内容 |
|---|---|
| `home-hero.*` | 第一屏 YouTube 加载前的 fallback poster，必须一眼看出是 Wellness Center / massage。 |
| `wellness-stage-loop.*` | 不再作为首页首屏必填视频素材；如保留中段本地视频位，可作为 package stage 或 treatment room 的备用素材。 |
| `wellness-ai-hero.*` | 咨询场景、intake form、治疗师和用户沟通。 |
| `aftercare-preview.*` | 多个 aftercare 商品组合图。 |
| `package-relief.*` | 肩颈 relief 场景。 |
| `package-recovery.*` | 热石、热毛巾或 warm recovery 场景。 |
| `center-impression.*` | 接待区、休息区、治疗室或入口。 |

### 建议

首页首屏视频使用 YouTube IFrame Player API，不放在 MinIO，也不需要本地 `mp4`。  
首页展示图保存在 `web/public/images`，并由 Docker 初始化流程 mirror 到 MinIO 的 `home/*` prefix；运行时页面通过 `/api/configurator/assets/home/*` 读取，不直接暴露 MinIO。  
最终展示时建议使用真实照片或生成的 bitmap 图片替换静态 placeholder，尤其是 `home-hero.*` fallback poster。  
第一阶段可以保持原文件名不变，这样不需要改代码。  
当前真实素材已经使用 `.png`。如果后续改成 `.jpg` 或 `.webp`，需要同步更新 `web/views/home.ejs`、SQL `minio_object` 和相关测试里的引用。

## AI Consultation 内容

### 涉及文件

- `web/views/ai-feature.ejs`
- `services/ai-feature/src/server.js`
- `services/ai-feature/src/recommendation.js`

### 需要填充什么

- prompt placeholder 文案
- AI 回答语气
- 推荐结果标签
- package 和 aftercare 的解释文案

### 当前问题

`web/views/ai-feature.ejs` 里还有迁移遗留命名，例如 `carModel`、`carColor`、`car-reveal`。  
这些不一定是可见 placeholder，但最终 polish 前建议重命名，避免看代码或测试时暴露小组项目迁移痕迹。

### 推荐 prompt placeholder

```text
My shoulders feel tense after desk work, and I want a calm 60-minute session with medium pressure.
```

这比旅行/汽车语境更好，因为它能直接触发 package、duration、intensity 和 aftercare 推荐。

## Visit Context 内容

### 涉及文件

- `infrastructure/mysql/init/03_visit_context.sql`
- `web/views/visit-context.ejs`
- `web/public/app.js`
- `services/visit-context-service/src/server.js`
- `services/visit-context-service/src/visitContext.js`

### 需要填充什么

- 中心 location row
- 经纬度
- maps destination 字符串
- opening note
- arrival tip
- weather fallback condition
- weather fallback summary

### 建议

visit context 文案应保持实用：

- 提前 10 分钟到达
- 穿舒适衣服
- 热敷类 session 后适当补水
- 天气冷时带一件薄外套

避免医疗承诺，例如治疗疼痛、损伤恢复、临床疗效等。

## Cart 与 Checkout 文案

### 涉及文件

- `web/views/shopping-cart.ejs`
- `services/shopping-cart/src/cartRoutes.js`

### 需要填充什么

- Cart、package、aftercare 的统一文案
- 德文/英文界面语言选择
- 删除旧图片名兼容逻辑

### 当前问题

`web/views/shopping-cart.ejs` 里还有 `Serenity_Aftercare_weiÃŸ.avif` 和 `Serenity_Aftercare_weiß.avif` 的兼容替换。  
这些是旧迁移痕迹，当前 PNG 素材不需要，语义清理阶段应删除。

## 语言选择

当前项目语言混合：

- 文档和 seed 内容偏英文
- 多个前端 view 是德文标签
- route 和 API 是英文

课程 demo 推荐：

- 文档和 seed data 保持英文。
- 前端可二选一：
  - 全部改成英文，方便老师评估；
  - 保留德文 UI，但在 README 里明确说明 UI 是 German-localized。

如果老师没有明确偏好，建议最终 UI 统一成英文。

## 素材来源与 License 建议

推荐优先级：

1. 自己拍摄或自己制作的素材。
2. 生成图，保持 Wellness Center 风格统一。
3. 来自可靠免费图库的 stock photo。
4. Wikimedia Commons，只在逐张确认 license 和 attribution 后使用。

可用来源：

- Unsplash License: `https://unsplash.com/license`
- Pexels License: `https://www.pexels.com/license/`
- Wikimedia Commons reuse guidance: `https://commons.wikimedia.org/wiki/Commons%3AReusing_content_outside_Wikimedia/en`
- Google Maps JavaScript API: `https://developers.google.com/maps/documentation/javascript/overview`
- Google Weather API: `https://developers.google.com/maps/documentation/weather/overview`

不要直接从 Google Images 随机下载。  
如果图片里有人脸，优先选择授权清楚、model consent 清楚的素材；否则使用非可识别人物或生成图。

## 替换规则

- 文件名保持 ASCII。
- 照片优先使用 `.jpg` 或 `.webp`。
- 透明商品图可使用 `.png`。
- 如果保持现有文件名，替换文件内容风险最低。
- 如果更换扩展名，需要同步更新 SQL 的 `minio_object` 和 EJS 静态引用。
- MinIO 归属素材保持在：

```text
assets/package-configurator/*
assets/aftercare-shop/*
assets/center/*
```

- 首页展示素材保持在本地 seed 目录，并会 mirror 到 MinIO `home/*`：

```text
web/public/images/*
```

- 不要让浏览器直接访问 MinIO。
- 不要把 package/product 业务素材移到前端 static 目录，因为它们属于对应 domain service。

## 推荐填充顺序

1. 确定最终品牌名和中心身份。
2. 替换 `03_visit_context.sql` 的 location 和 fallback weather 文案。
3. 替换 `assets/package-configurator` 下的 3 张 package 图。
4. 替换 `assets/aftercare-shop` 下的 6 张商品图。
5. 替换 `assets/center` 下的中心图。
6. 替换 `web/public/images` 下的首页静态展示图，其中 `home-hero.*` 作为 YouTube 首屏 fallback poster。
7. 优化 package 和 product seed 的描述、价格和使用提示。
8. 清理可见页面文案，并决定 UI 语言。
9. 清理 AI/home 里的迁移语义，例如 `carModel`、`car-reveal`、`vehicle-*`。
10. 重新运行 Docker Compose 和 smoke tests。

## 验证清单

内容填充完成后检查：

- `docker compose up --build` 能启动全部服务。
- `http://localhost:4100` 能打开。
- Package configurator 能通过 `/api/configurator/assets/*` 展示真实 package 图。
- Aftercare shop 能通过 `/api/aftercare/assets/*` 展示真实商品图。
- Visit context 展示你选择的中心位置和 weather fallback。
- Cart 能保存 package 和 aftercare snapshot。
- `.\scripts\smoke-test.ps1 -SkipAi` 通过。
- runtime 页面里不再有可见的 BMW、car 或 scaffold placeholder 身份。
