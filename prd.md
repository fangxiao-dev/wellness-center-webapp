结论：下面给你一版**偏课程项目场景、以产品需求和范围边界为核心的 PRD**。
我会刻意**不进入实现细节**，模块也只做简要定义，重点放在：

* 这个产品到底是什么
* 解决什么问题
* 用户如何使用
* 核心功能到什么程度
* 明确哪些做、哪些不做

---

# PRD

## 项目名称

**AI-assisted Wellness Resort Web Application**

---

# 1. 项目背景

本项目面向课程 **Cloud-based Web Application**，题目围绕 **Wellness Resort** 展开，要求包含若干典型 Web Application 功能，例如 configurator、webshop、图片/视频展示、天气信息等。

本项目不将重点放在“高复杂度 AI”或“炫技式前端表现”上，而是聚焦于：

* 在 **Wellness Resort** 场景下提出一个有创意但可控的产品概念
* 通过清晰的业务设计支撑后续系统架构设计
* 让产品功能天然对应课程要求中的各个模块

本项目的创意切入点是：
将 **Wellness / therapy-style consultation** 的思路嵌入 **Resort experience** 场景中，使系统不只是一个普通的度假村展示网站，而是一个能够根据用户不适部位、身体状态和偏好，推荐合适 wellness package 的引导式平台。

---

# 2. 产品定位

本产品不是诊所系统，也不是医疗决策系统。
本产品是一个：

**以 Wellness Resort 为场景、以 goal-oriented package 为核心产品单元、通过 AI-style consultation 提供个性化推荐的 Web Application。**

它的外在形态仍然是一个 Resort / Wellness 平台，用户可以：

* 浏览项目与套餐
* 获取个性化推荐
* 查看图片/视频 impression
* 完成预订
* 购买配套商品

其中，“AI 功能”的定位不是医疗诊断，而是：

**一种问答式的 wellness consultation / guided recommendation capability**

也就是说，系统不是告诉用户“你得了什么病”，而是告诉用户：

* 你当前更适合哪类 wellness goal
* 推荐哪些 package
* 这些 package 为什么适合你
* 如何以更“journey-like”的方式理解这套体验

---

# 3. 产品目标

## 3.1 核心目标

构建一个结构完整、体验清晰、题目贴合的 Wellness Resort Web Application 原型，使其在产品层面具备以下价值：

### 目标一：让用户不只是“看项目”，而是被引导到合适方案

相比普通 resort 网站只展示服务列表，本系统通过 consultation flow 帮助用户更快找到适合自己的 package。

### 目标二：把 Wellness 主题做出差异化

系统重点突出 wellness-related services 与康复/放松导向体验，而不是单纯酒店预订。

### 目标三：形成一个完整的业务闭环

系统应至少形成以下闭环：

**Discover → Consult → Recommend → View Package → Book → Extend with Shop**

### 目标四：为后续架构设计提供自然支点

产品功能本身要足够清晰，使后续的数据库、对象存储、缓存、API 分层等设计“有业务理由”，而不是为了技术而技术。

---

## 3.2 非目标

本项目不追求以下目标：

* 不做医学诊断或真实医疗决策
* 不做专业 Physiotherapie / Heilpraxis 业务系统
* 不做复杂多角色运营后台
* 不做高精度症状分析或疾病推断
* 不做复杂支付、真实库存、真实第三方预订系统
* 不做极强内容社区或用户社交系统
* 不做重量级前端单页应用体验

---

# 4. 目标用户

## 4.1 主要用户

### Wellness-oriented resort visitors

这类用户通常具备以下特征：

* 对 wellness / relaxation / recovery 有兴趣
* 存在某种轻度不适或疲劳，例如肩颈紧张、压力大、身体发冷、久坐不适等
* 不一定主动搜索某个专业 treatment 名称
* 更需要被“翻译”为合适的 package 和体验方案

他们的常见心智不是：

* “我要找哪种专业治疗”

而是：

* “我最近肩颈很紧，去这里的话适合做什么？”
* “我只有一个周末，想放松和恢复一下”
* “我不懂这些项目差别，希望系统给我推荐”

---

## 4.2 次要用户

### Direct browsers / package shoppers

这类用户可能不想先做 consultation，而是直接：

* 浏览 package
* 查看 resort 内容
* 看图/视频
* 买周边商品

因此系统不能把 consultation 做成唯一入口，而应作为核心入口之一。

---

# 5. 用户问题

本产品希望解决的核心问题包括：

## 问题一：Wellness 选择成本高

用户通常不理解不同 treatment 的差异，也不知道什么组合更适合自己的状态。

## 问题二：普通 resort 网站缺乏“引导性”

如果网站只是罗列项目、房型和价格，用户需要自己判断，决策成本高，且 wellness 主题不突出。

## 问题三：Wellness 服务容易碎片化

单个项目（如 hot stone、acupuncture、manual therapy）对用户来说过于零散，缺少一个更完整的体验包装。

## 问题四：课程要求的模块容易彼此割裂

如果没有统一产品主线，configurator、webshop、gallery、weather 等功能会变成单独拼接的功能点，而不是一个 coherent product。

---

# 6. 产品核心思路

本产品采用以下业务抽象：

## 6.1 Treatment

Treatment 是底层原子能力，表示具体的单项服务，例如：

* Manual Therapy
* Acupuncture
* Hot Stone
* Cupping
* Sauna Session

Treatment 是系统内部组织和组合的基础，但不是前台最核心的售卖对象。

---

## 6.2 Package

Package 是系统的核心业务对象。
用户面向的是 **goal-oriented packages**，而不是零散 treatment 列表。

例如：

* Neck Relief
* Stress Reset
* Warm Recovery

每个 package：

* 围绕某个目标设计
* 包含若干 treatments
* 具备价格、时长、适用场景和展示内容
* 可以直接被推荐、浏览和预订

---

## 6.3 Journey

Journey 是前台的体验包装层。
它不是必须严谨建模成底层交易实体，而更像：

* 推荐结果标题
* 方案的叙事表达
* 面向用户的体验语言

也就是说：

* 系统内部运作围绕 package
* 用户界面中可以将推荐结果包装成 personalized journey

例如：

* Shoulder & Neck Reset Journey
* Stress Relief Weekend Journey

这样既保留 Wellness Resort 的体验感，又不会把底层模型做得过重。

---

# 7. 产品范围

---

## 7.1 In Scope（本次项目范围内）

### 1. Wellness consultation / recommendation flow

用户可以通过一个简化问答流程输入自身状态，例如：

* 不适部位
* 不适强度
* 偏好放松 / 深度缓解
* 时间或预算倾向

系统基于这些输入给出 package recommendation，并附带简短解释。

这是本项目的核心亮点功能。

---

### 2. Package browsing

用户可以浏览系统中的 wellness packages，包括：

* package 名称
* 目标场景
* 包含内容概览
* 简要说明
* 图片/视频 impression
* 价格 / 时长基础信息

---

### 3. Journey-style presentation

推荐结果不只是冷冰冰的 package list，而应以更友好的“journey / recommended experience”方式呈现，帮助用户理解推荐逻辑。

---

### 4. Basic configurator

系统需要满足 configurator 类需求，但 configurator 不应做成无限自由组合器。
本项目中的 configurator 应理解为：

* 在推荐结果基础上做有限调整
* 在几个 package option 间切换
* 允许少量 add-on 或替换
* 帮助用户从推荐走向选择

它是 guided configuration，不是 fully custom build-your-own therapy system。

---

### 5. Booking flow

用户可对所选 package 发起预订。
本项目中 booking 的目标是形成完整业务闭环，而不是实现真实复杂预订系统。

用户至少应能完成：

* 选择 package
* 选择基础预约信息
* 提交预订
* 看到确认结果

---

### 6. Webshop

系统包含与 wellness 场景相关的 webshop。
商品定位为 aftercare / lifestyle extension，而非专业医疗器械。

示例：

* heat wrap / hot water products
* neck pillow
* essential oils
* simple recovery accessories

Webshop 的意义在于补全课程题目要求，同时与 wellness 主线保持一致。

---

### 7. Impressions / media presentation

系统应展示与 package、resort、product 相关的图片或视频内容，用于提升体验感并满足课程中的 impression 类要求。

---

### 8. Weather information

系统展示基础天气信息，用于增强 resort context，并满足课程要求中的天气模块。

天气功能不是核心卖点，但应自然融入页面。

---

## 7.2 Out of Scope（本次项目不做）

### 1. 医疗诊断

不做疾病判断、临床分析、风险评估、禁忌识别等专业医疗功能。

### 2. 真实治疗处方

不生成医学处方，不替代专业医生或 therapist。

### 3. 无限自由组合

不做用户任意拼装所有 treatment、任意定义疗程、任意排班的复杂 configurator。

### 4. 多日复杂 itinerary planning

虽然可以使用 journey 概念做展示，但本项目不做完整日程排布引擎，不做真正的 resort multi-day trip planner。

### 5. 复杂会员体系

不做高级 loyalty、points、membership tier、subscription 等机制。

### 6. 复杂支付与真实库存

不做真实支付接口、实时库存同步、复杂订单状态机。

### 7. 商家后台 / CMS / staff portal

本次重点在用户侧产品，不延伸到运营后台、治疗师排班后台或内容管理后台。

### 8. 社区/评价系统

不做用户评论、论坛、分享社区等功能。

---

# 8. 核心用户流程

## Flow 1：咨询驱动主流程

1. 用户进入首页或 consultation 入口
2. 用户输入不适部位、偏好、强度等信息
3. 系统返回推荐结果
4. 推荐结果以 journey-style 形式呈现
5. 用户查看 package 详情
6. 用户做有限调整
7. 用户发起 booking
8. 系统推荐相关 aftercare products

这是最核心的产品主线。

---

## Flow 2：浏览驱动流程

1. 用户直接浏览 package catalog
2. 用户查看某个 package 详情
3. 用户查看相关图片/视频 impression
4. 用户决定 booking，或转到 consultation 以获得更合适推荐

这个流程保证 consultation 不是唯一入口。

---

## Flow 3：Shop extension 流程

1. 用户完成 booking 或浏览 package 后
2. 系统展示适合的 aftercare products
3. 用户进入 webshop 浏览商品
4. 用户加入购物车或查看详情

Shop 是主流程的延伸，不应喧宾夺主。

---

# 9. 功能需求

---

## 9.1 Homepage

首页需要承担三类任务：

### a. 传达产品定位

让用户立刻明白这是一个 wellness resort experience，而不是普通商城或诊所页面。

### b. 提供核心入口

首页至少应突出：

* consultation / find your ideal package
* browse packages
* impressions / highlights

### c. 建立 resort context

首页可包含：

* hero section
* wellness highlights
* selected packages
* weather snippet
* visual impressions

---

## 9.2 Consultation / Recommendation

这是本项目最核心的功能模块。

### 功能目标

将用户输入翻译成 package recommendation。

### 输入范围

输入应保持简洁，不应变成复杂问诊表。
可包括：

* 哪个部位不适
* 程度如何
* 想要放松还是更集中缓解
* 时间/预算偏好

### 输出形式

推荐结果至少应包含：

* 推荐 package
* 为什么推荐
* 适合的目标说明
* 可替代选项

### 产品原则

* 重点是引导，不是诊断
* 语言应面向 resort / wellness 场景
* 输出应具备一定“journey 感”

---

## 9.3 Package Catalog

### 功能目标

为用户提供结构化浏览入口。

### 核心展示内容

* package 名称
* package goal
* 简介
* 包含内容概览
* 基础价格/时长
* 图片/视频 preview

### 筛选方式

可支持基础筛选，例如：

* by goal
* by intensity
* by relaxation / recovery orientation

但不追求复杂检索系统。

---

## 9.4 Package Detail

### 功能目标

帮助用户从“感兴趣”走向“选择”。

### 页面内容建议

* package 核心价值说明
* 适用场景
* 包含 treatments 概览
* 图片/视频
* 推荐补充商品
* booking CTA
* optional re-consultation CTA

---

## 9.5 Configurator

### 功能目标

让用户在有限范围内调整方案，而不是从零搭建全部组合。

### 允许的操作类型

* 在少量 package variant 之间切换
* 添加简单 add-on
* 替换少量可替换项

### 产品原则

* 用户应感觉自己有控制权
* 系统仍应保持“guided”
* 不把复杂度推给用户

---

## 9.6 Booking

### 功能目标

让 package recommendation 和浏览最终能够落到实际 action。

### Booking 需要达到的程度

* 能完成基本预订流程
* 能记录用户所选 package
* 能展示确认状态

### 不要求达到的程度

* 不做真实支付
* 不做复杂 availability engine
* 不做 therapist 资源调度优化

---

## 9.7 Webshop

### 功能目标

作为 wellness journey 的 aftercare extension。

### 商品类型原则

商品应与 package 和 wellness 场景相关，而不是泛化电商。

### 展示逻辑

商品可以出现在：

* 独立 shop 页面
* package detail 页面
* booking 完成后推荐区

### 产品原则

shop 是补充，不应抢主线。

---

## 9.8 Impressions / Gallery

### 功能目标

提升体验感、增强 resort 场景，并承接课程要求。

### 内容来源

可覆盖：

* resort environment
* treatment scenes
* package visuals
* products

### 产品原则

* 服务于“感受”
* 不做复杂内容平台
* 重点是支持 package 与 resort narrative

---

## 9.9 Weather

### 功能目标

作为场景增强信息，体现 resort context。

### 产品定位

* 辅助信息
* 非核心决策功能
* 轻量融入首页或 package/journey 页面即可

---

# 10. 模块定义（简版）

这里不展开架构，只保留产品视角下的简要定义。

## Catalog

管理 treatments、packages 及其展示信息。

## Recommendation

根据用户输入给出 package recommendation，并提供简要 explanation。

## Journey Flow

把 consultation、recommendation、configuration、booking 串成一个完整体验流程。

## Booking

承载预订行为与确认结果。

## Shop

提供与 wellness 相关的 aftercare 商品浏览与购买延伸。

## Media

提供 package、resort、product 的视觉展示内容。

## Weather

提供场景辅助信息。

---

# 11. 产品原则

## 原则一：Resort first, not clinic first

整体产品语气与视觉逻辑应更接近 resort / wellness experience，而不是专业诊疗系统。

## 原则二：Guided, not overwhelming

用户不应被大量 treatment 术语和复杂配置压垮，系统应主动引导。

## 原则三：Package-centered

前台核心对象是 package，而不是 treatment 列表。

## 原则四：AI as helper, not as authority

AI/consultation 是帮助用户选择，而不是做权威医疗判断。

## 原则五：Coherent flow over scattered features

所有课程要求功能都要围绕同一条主业务线组织，而不是拼盘式堆叠。

---

# 12. 成功标准

从课程项目角度，这个产品成功的标准不是商业 KPI，而是以下几点：

## 产品层

* 主题明确，Wellness + Resort 结合自然
* 核心差异点清晰：consultation-driven recommendation
* 功能形成闭环，而不是孤立模块

## 需求层

* 范围边界清楚
* 核心对象明确
* 每个功能有合理存在理由

## 演示层

* 用户能快速理解系统价值
* 系统主流程清晰
* 老师能看出这是一个结构化设计的 web application，而不是简单页面拼接

---

# 13. 一句话版本

这个项目可以被定义为：

**一个以 goal-oriented wellness packages 为核心、通过 consultation-driven recommendation 将其包装成 personalized resort journeys，并进一步连接 booking、shop、media 和 weather context 的 Wellness Resort Web Application。**

