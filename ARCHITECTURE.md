# sm-doubleassistant-server 架构

## 产品与边界

- 本项目是 SM 导师双选唯一业务后端，使用 Egg.js + MongoDB 服务学生、教师和管理员。
- Egg 服务只属于 SM，不演进为工作区共享重后端；Go 只通过回环内部接口读取脱敏聚合。
- `app.js` 是 Egg 启动入口，`app/router.js` 注册 HTTP 路由，`config/` 负责框架组合配置。
- 微信登录、订阅消息、简历和双选一致性继续由本项目拥有。

## 目录职责

- **delivery**：`router.js`、`controller/`、`middleware/jwt.js`、`extend/context.js` 处理协议、身份和响应；`schedule/` 是定时入站入口。
- **application**：`service/` 编排登录、活动、志愿、录取、简历、推荐和微信消息用例。
- **domain**：`lib/selection-security.js` 等纯规则负责志愿、时间窗、指纹和身份判断；新增规则应避免 Egg/Mongoose 依赖。
- **adapter**：`model/` 是 MongoDB 适配器，`service/wechat.js`、文件系统、CSV 画像和内部统计查询属于出站实现。
- **composition**：`app.js`、`config/`、`plugin.js` 与 `router.js` 连接 Egg 插件、模型、middleware、controller 和 service。
- `openapi.json` 是 delivery 契约；上传文件、Mongo 数据、日志与凭据不属于源码。

## 依赖方向

- 允许方向为 `delivery -> application -> domain`；adapter 实现 application/domain 需要的端口，composition 组装实现。
- controller 只做解析、授权入口和响应映射，不直接编排多模型补偿或文件事务。
- domain 不依赖 `ctx`、Egg、Mongoose、文件系统、微信 API 或环境变量。
- 新用例先落入小而明确的 `service/`；可复用纯策略落入 `lib/`，增长后再按纵向模块迁到 `domain/`。
- Mongo 唯一约束、锁和补偿是 adapter/application 的一致性机制，不能由小程序端替代。

## 禁止事项

- 不得把 SM 原始用户、教师、简历、志愿或 OpenID 交给 Go；内部看板只返回脱敏聚合。
- 不得复用 JWT、Mongo、微信或看板凭据，不得把内部统计端点公开代理。
- 不得恢复返回 410 的碎片写接口，或绕过对象级权限、活动成员、配额和幂等门禁。
- 不得自动执行真实微信消息发送、生产凭据使用或公开发布；这些动作均需 Human 确认。

## 当前迁移热点

2026-07-29 首批已新增共享 `application/finalize-selection.js`，管理员与导师录取入口都
变为固定 policy 的薄包装；教师锁、配额、唯一 reservation、Final/Choose 写入和补偿只有
一份实现，并有双入口成功与失败补偿契约。

- `service/admin.js` 已从约 675 行降到 539 行，仍混合活动、用户、成员、志愿和简历。
- `controller/admin.js`（约 516 行）重复参数/权限/文件处理；应随对应 use case 逐片缩小。
- `service/stdinfo.js`（约 404 行）仍混合规则、锁、模型写入和失败补偿；
  `service/teainfo.js` 已降到约 217 行。
- `lib/user-analytics.js`（约 340 行）与 `service/ai.js`（约 297 行）各自同时承担查询/算法/适配。
- 迁移顺序：最终录取共享用例已完成；reservation commit 检查 ownership，丢失 ownership
  时只读取 successor 状态并幂等返回，不会回滚并发请求的 Final/Choose。下一步抽
  refresh identity 和志愿提交用例，再以
  repository 端口包住模型并按用例继续拆 service/controller。
- 微信 schedule 和文件操作在核心双选用例稳定后再隔离；每片保持现有 REST/OpenAPI 与 standalone Mongo 补偿语义。

## 验证

- 基础门禁：`npm run lint`、`npm run test:local`、`npm run test:dashboard`。
- 授权、三志愿幂等、导师锁、配额和失败补偿必须保留回归覆盖。
- 内部统计只能用回环地址和独立强令牌验证，公网路径应为 404。
- 本地 Mongo/Egg 测试不等于真实微信发送、生产数据迁移或部署验收。
