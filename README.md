# SM-DoubleAssistant-server

浙江科技大学数字媒体技术专业 **导师双选系统** 后端服务。

基于 **Egg.js + MongoDB** 构建，为微信小程序端和管理后台提供 RESTful API 服务，支持学生选导师、导师选学生、管理员统筹管理的完整双选流程。

> 由 Richard_Q 编写，仅用于学习和交流，不用于任何商业用途。

---

## 目录

- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [数据模型](#数据模型)
- [API 接口](#api-接口)
- [认证与鉴权](#认证与鉴权)
- [AI 推荐引擎](#ai-推荐引擎)
- [微信小程序集成](#微信小程序集成)
- [定时任务](#定时任务)
- [快速开始](#快速开始)
- [部署说明](#部署说明)
- [环境变量](#环境变量)

---

## 系统架构

本系统采用前后端分离的三层架构：

```
┌──────────────────┐    ┌───────────────────┐
│  微信小程序端     │    │   管理后台 (Web)    │
│  UniApp / Vue 3  │    │  Vue 3 + Element   │
└────────┬─────────┘    └─────────┬─────────┘
         │                        │
         │     HTTPS / RESTful    │
         └────────────┬───────────┘
                      ▼
         ┌────────────────────────┐
         │   Egg.js API Server    │
         │  (本项目)               │
         │                        │
         │  Router → Middleware   │
         │    → Controller        │
         │      → Service         │
         │        → Model         │
         └────────────┬───────────┘
                      │
                      ▼
            ┌──────────────────┐
            │     MongoDB      │
            └──────────────────┘
```

后端内部遵循 Egg.js 的 **Controller-Service-Model (CSM)** 分层架构：

| 层级 | 职责 |
|------|------|
| **Router** | 路由定义，将 HTTP 请求映射到 Controller，挂载中间件 |
| **Middleware** | JWT 认证、角色鉴权 |
| **Controller** | 处理请求/响应，参数校验，调用 Service |
| **Service** | 核心业务逻辑，操作 Model |
| **Model** | Mongoose Schema，定义 MongoDB 集合结构 |
| **Extend** | 扩展 Egg Context，提供 `send()` 统一响应和 `generateToken()` |
| **Schedule** | 定时任务（微信订阅消息推送） |
| **Validate** | 输入校验规则（用户名、密码格式） |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js >= 18 |
| 框架 | Egg.js v3.17.5 |
| 数据库 | MongoDB (egg-mongoose v4.0.1) |
| 认证 | JWT 双 Token（jsonwebtoken v9.0.2） |
| 密码加密 | bcryptjs v3.0.3（兼容 SHA-256 自动迁移） |
| 参数校验 | egg-validate v2.0.2 |
| 跨域 | egg-cors v3.0.1 |
| 文件上传 | egg-multipart（file 模式，50MB 限制） |
| 环境变量 | dotenv v17.4.2 |

---

## 项目结构

```
SM-DoubleAssistant-server/
├── app.js                          # 应用启动入口，加载校验规则
├── app/
│   ├── router.js                   # 路由定义（~50 个接口）
│   ├── controller/
│   │   ├── userinfo.js             # 用户认证（登录/注册/密码重置/Token 刷新）
│   │   ├── admin.js                # 管理员操作（活动/用户/志愿/配额/简历）
│   │   ├── stdinfo.js              # 学生操作（信息管理/选导师/简历上传）
│   │   ├── teainfo.js              # 教师操作（选学生/查看志愿列表）
│   │   └── ai.js                   # AI 推荐导师接口
│   ├── service/
│   │   ├── userinfo.js             # 认证业务逻辑
│   │   ├── admin.js                # 管理业务逻辑
│   │   ├── stdinfo.js              # 学生业务逻辑（含时间窗口校验）
│   │   ├── teainfo.js              # 教师业务逻辑
│   │   ├── ai.js                   # AI 匹配算法（关键词评分引擎）
│   │   └── wechat.js               # 微信接口（access_token/openid/订阅消息）
│   ├── model/
│   │   ├── userinfo.js             # 用户账号（username/password/role）
│   │   ├── student.js              # 学生档案
│   │   ├── teacher.js              # 教师档案
│   │   ├── activity.js             # 双选活动（含多轮次时间配置）
│   │   ├── choose.js               # 志愿记录（学生→教师，1/2/3 志愿）
│   │   ├── final.js                # 最终确认记录（教师选定学生）
│   │   ├── userInActivity.js       # 活动参与关系（含教师配额）
│   │   └── resume.js               # 学生简历元数据
│   ├── middleware/
│   │   └── jwt.js                  # JWT 认证 + 角色权限中间件
│   ├── extend/
│   │   └── context.js              # Context 扩展（统一响应/Token 生成）
│   ├── validate/
│   │   └── common-check.js         # 输入格式校验规则
│   ├── schedule/
│   │   └── sendSubscribeMsg.js     # 定时任务：微信消息推送
│   ├── data/
│   │   └── teacher_data.csv        # AI 教师画像数据（25 位教师）
│   └── public/uploads/             # 上传文件存储目录
├── config/
│   ├── config.default.js           # 默认配置
│   ├── config.local.js             # 本地开发配置
│   ├── config.prod.js              # 生产环境配置
│   └── plugin.js                   # 插件注册
├── openapi.json                    # OpenAPI 3.0.3 接口文档
├── .env.example                    # 无凭据的环境变量模板
├── .env                            # 本地环境变量（不提交）
└── package.json
```

---

## 数据模型

系统包含 **8 个 MongoDB 集合**（关闭复数化命名）：

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│   User   │     │   Activity   │     │ Teacher  │
│----------│     │--------------│     │----------│
│ username │     │ name         │     │ teacherId│
│ password │     │ startDate    │     │ name     │
│ role     │     │ endDate      │     │ msg      │
│(admin/   │     │ chooseStart  │     │ type     │
│ student/ │     │ chooseEnd    │     │ resume   │
│ teacher) │     │ round1~3     │     └─────┬────┘
└──────────┘     │ subscribeSent│           │
                 └──────┬───────┘           │
                        │                   │
              ┌─────────┼───────────────────┤
              │         │                   │
              ▼         ▼                   ▼
     ┌────────────────┐          ┌──────────────┐
     │ UserInActivity │          │    Choose     │
     │----------------│          │--------------│
     │ activityId     │          │ studentId    │
     │ teacherId /    │          │ teacherId    │
     │ studentId      │          │ activityId   │
     │ maxSelectNum   │          │ order (1/2/3)│
     └────────────────┘          │ isChose      │
                                 └──────┬───────┘
     ┌──────────┐                       │
     │ Student  │               ┌───────▼──────┐
     │----------│               │    Final     │
     │ studentId│               │--------------│
     │ data     │               │ activityId   │
     │ mentor   │               │ studentId    │
     │ openid   │               │ teacherId    │
     └──────────┘               │ order        │
                                └──────────────┘
     ┌──────────┐
     │  Resume  │
     │----------│
     │ studentId│
     │ fileName │
     │ filePath │
     └──────────┘
```

### 核心关系

- **User**：统一的登录账号，通过 `role` 区分管理员/学生/教师
- **Activity**：双选活动，定义学生选择时间窗口和教师三轮选择时间窗口
- **UserInActivity**：用户与活动的多对多关系，记录教师的学生配额 (`maxSelectNum`)
- **Choose**：学生提交的志愿记录，每个学生每个活动最多填报 3 个志愿（`order`: 1/2/3）
- **Final**：教师确认选定的学生，代表最终的双选结果
- **Student / Teacher**：用户的详细档案信息
- **Resume**：学生上传的简历文件元数据

### 索引设计

| 集合 | 复合索引 |
|------|----------|
| Choose | `(studentId, activityId)`, `(teacherId, activityId)` |
| Final | `(studentId, activityId)`, `(teacherId, activityId)` |
| UserInActivity | `(activityId, teacherId)`, `(activityId, studentId)` |

---

## API 接口

系统提供约 **50 个 RESTful 接口**，统一前缀 `/api/`，除登录接口外均需 JWT 认证。

### 统一看板内部聚合

`GET /api/internal/dashboard-stats?days=1..365` 只供同机 Go 统一看板通过回环地址调用。它要求独立的 `SM_DOUBLEASSISTANT_INTERNAL_STATS_TOKEN` Bearer 令牌（至少 32 字节），只返回活动、参与者、已提交志愿和最终确认的聚合数量，不返回姓名、学号、OpenID、简历或原始志愿记录。

生产 Nginx 必须对公网主机显式返回 404，Go 应直连 `http://127.0.0.1:<port>`。不要把这个端点代理到公网，也不要复用 JWT、MongoDB、微信或看板登录凭据。

### 用户认证

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/user/login` | 用户登录，返回双 Token | 公开 |
| POST | `/api/admin/register` | 注册用户 | 管理员 |
| POST | `/api/user/selfResetPassword` | 自助修改密码 | 登录用户 |
| POST | `/api/user/refreshToken` | 刷新 Access Token | 登录用户 |
| GET | `/api/user/detail` | 获取用户详情 | 登录用户 |
| GET | `/api/user/getMyActivities` | 获取我参与的活动 | 登录用户 |

### 学生操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/writeMsg` | 创建/更新学生信息 |
| PUT | `/api/user/updateMsg` | 更新姓名/性别 |
| GET | `/api/student/getMsg` | 获取学生信息 |
| POST | `/api/student/selectTeacher` | 提交志愿（含时间窗口校验） |
| GET | `/api/student/getTeachersForActivity` | 获取可选教师列表（含统计） |
| GET | `/api/student/getTeacherList` | 查看活动内教师 |
| GET | `/api/student/isInActivity` | 检查是否已加入活动 |
| POST | `/api/student/saveOpenid` | 保存微信 openid |
| POST | `/api/student/uploadResume` | 上传简历 |
| GET | `/api/student/getStudentResume` | 下载简历 |

### 教师操作

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/teacher/detail` | 获取教师列表 |
| PUT | `/api/student/updateTeacher` | 更新志愿选中状态 |
| POST | `/api/teacher/selectStudent` | 选定学生（创建 Final 记录） |
| DELETE | `/api/teacher/cancelSelect` | 取消选定 |
| POST | `/api/teacher/selectStudentAndUpdate` | 原子操作：选定 + 更新状态 |
| POST | `/api/teacher/cancelSelectAndUpdate` | 原子操作：取消 + 更新状态 |
| GET | `/api/teacher/getSelectList` | 获取已选学生列表 |
| GET | `/api/teacher/getChooseStudents` | 获取报名学生（含简历） |
| GET | `/api/teacher/getChoosePageData` | 选择页聚合数据 |
| GET | `/api/teacher/isInActivity` | 检查是否已加入活动 |

### 管理端 — 活动管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/addActivity` | 创建活动 |
| GET | `/api/admin/getActivityList` | 活动列表 |
| GET | `/api/admin/getActivityDetail` | 活动详情 |
| PUT | `/api/admin/updateActivity` | 更新活动 |
| DELETE | `/api/admin/deleteActivity` | 删除活动（级联清理） |

### 管理端 — 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/getUserList` | 用户列表 |
| GET | `/api/admin/getUserInfo` | 搜索用户 |
| DELETE | `/api/admin/deleteUser` | 删除用户（级联清理） |
| POST | `/api/admin/resetPassword` | 重置单个密码 |
| POST | `/api/admin/resetSelectedPassword` | 批量重置密码 |

### 管理端 — 活动用户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/addTeacherToActivity` | 添加用户到活动 |
| POST | `/api/admin/batchAddUserToActivity` | 批量添加 |
| GET | `/api/admin/getUserListInActivity` | 活动参与者列表 |
| DELETE | `/api/admin/deleteUserInActivity` | 移除参与者 |
| POST | `/api/admin/batchDeleteUserInActivity` | 批量移除 |
| GET | `/api/admin/getTeacherListInActivity` | 活动内教师列表 |
| GET | `/api/admin/getStudentListInActivity` | 活动内学生列表 |

### 管理端 — 志愿管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/getSelectedList` | 查看志愿记录 |
| DELETE | `/api/admin/deleteSelected` | 删除志愿记录 |
| GET | `/api/admin/getFinalList` | 查看最终结果 |
| POST | `/api/admin/addFinal` | 手动添加最终结果 |
| DELETE | `/api/admin/resetVolunteer` | 重置学生志愿 |

### 管理端 — 配额 & 简历

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/api/admin/configMaxSelectNum` | 设置教师配额 |
| PUT | `/api/admin/batchConfigMaxSelectNum` | 批量设置配额 |
| GET | `/api/user/getMaxSelectNum` | 查询教师配额 |
| POST | `/api/teacher/uploadTeacherResume` | 上传教师简历 |
| GET | `/api/teacher/getTeacherResume` | 下载教师简历 |

### AI 推荐

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/student/recommendTeachers` | AI 推荐导师 | 登录用户 |
| GET | `/api/admin/getTeacherProfiles` | 查看教师画像 | 管理员 |
| PUT | `/api/admin/updateTeacherProfile` | 编辑教师画像 | 管理员 |
| POST | `/api/admin/reloadTeacherProfiles` | 重载画像缓存 | 管理员 |

> 完整的接口定义请参阅 `openapi.json`（OpenAPI 3.0.3 规范）。

---

## 认证与鉴权

### 双 Token 机制

```
客户端                           服务端
  │                               │
  │── POST /api/user/login ──────>│
  │                               │ 校验用户名密码
  │<── accessToken + refreshToken─│
  │                               │
  │── GET /api/xxx ──────────────>│
  │   Authorization: Bearer {AT}  │ 校验 AT 签名和有效期
  │<── 200 响应数据 ──────────────│
  │                               │
  │  (AT 过期后)                   │
  │── POST /api/user/refreshToken>│
  │   { refreshToken }            │ 校验 RT，签发新 AT
  │<── 新 accessToken ────────────│
```

| Token | 密钥 | 有效期 | 载荷 |
|-------|------|--------|------|
| Access Token | `JWT_SECRET` | 3 天 | `uid`, `role`, `username`, `type: 'access'` |
| Refresh Token | `JWT_REFRESH_SECRET` | 7 天 | `uid`, `role`, `username`, `type: 'refresh'` |

### 角色权限（RBAC）

| 角色 | 说明 | 权限范围 |
|------|------|----------|
| `admin` | 管理员 | 全部接口，包含 `requiredRole: 'admin'` 的管理端接口 |
| `teacher` | 教师 | 通用接口 + 教师操作（仅限操作自身数据） |
| `student` | 学生 | 通用接口 + 学生操作（仅限操作自身数据） |

### 密码安全

- 使用 **bcryptjs**（10 轮）加密存储密码
- 兼容旧版 SHA-256 哈希：登录时自动检测并迁移为 bcrypt
- 用户名规则：6-10 位纯数字
- 密码规则：6-20 位字母数字

---

## AI 推荐引擎

系统内置了一个基于关键词匹配的本地 AI 推荐引擎，不依赖外部 AI API。

### 工作原理

1. **方向分类**：将学生研究方向映射到 11 个预定义类别（前端、后端、测试、算法、大模型、UI 设计、产品经理、游戏开发、大数据、云计算、影视制作），支持别名识别
2. **多维评分**：基于四个加权维度为每位教师打分

| 维度 | 权重 | 说明 |
|------|------|------|
| 方向匹配度 (directionScore) | 40% | 学生方向与教师画像的关键词重叠度 |
| 画像深度 (profileScore) | 20% | 教师研究描述的文本匹配深度 |
| 安全系数 (safetyScore) | 25% | 竞争激烈程度（越低越"稳"） |
| 容量系数 (capacityScore) | 15% | 教师剩余可选名额 |

3. **推荐策略**：返回 Top 3 推荐结果
   - 第一志愿：综合匹配度最高
   - 第二志愿：次优匹配
   - 第三志愿：最"稳妥"的选择（安全系数优先）

### 数据来源

教师画像数据存储在 `app/data/teacher_data.csv`，包含 25 位教师的研究方向和教学描述。管理员可通过接口动态管理画像数据。

---

## 微信小程序集成

通过 `app/service/wechat.js` 对接微信开放平台：

| 功能 | 微信 API | 说明 |
|------|----------|------|
| 登录换取 openid | `sns/jscode2session` | 小程序登录后获取用户唯一标识 |
| Access Token 获取 | `cgi-bin/token` | 内存缓存，7000 秒有效期 |
| 订阅消息推送 | `cgi-bin/message/subscribe/send` | 双选结果通知学生 |

相关环境变量：`WX_APPID`、`WX_SECRET`、`WX_SUBSCRIBE_TEMPLATE_ID`、`WX_MINIPROGRAM_STATE`

---

## 定时任务

| 任务 | 执行间隔 | 说明 |
|------|----------|------|
| `sendSubscribeMsg` | 每分钟 | 第三轮选择结束后，自动向全部学生推送微信订阅消息通知双选结果，并清理未被选中学生的志愿记录 |

---

## 快速开始

### 环境要求

- Node.js >= 20
- MongoDB（本地或远程）

### 安装 & 启动

```bash
# 安装依赖
npm install

# 配置环境变量（参考 .env.example 或下方说明）
cp .env.example .env

# 开发模式启动
npm run dev

# 访问
open http://localhost:7001
```

### 生产部署

```bash
npm start    # 启动
npm stop     # 停止
```

---

## 部署说明

### 宝塔面板部署

1. 在宝塔面板中创建 MongoDB 数据库
2. 修改 `config/config.default.js` 中的数据库连接：

```js
config.mongoose = {
  url: 'mongodb://127.0.0.1/你的数据库名',
};
```

3. 配置 `.env` 环境变量
4. 使用 PM2 或宝塔 Node 项目管理器启动服务

### 生产地址

- 后端 API：`https://richardq.tech`
- 管理后台：`https://www.richardq.tech`

---

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `MONGO_URL` | MongoDB 连接字符串 | `mongodb://127.0.0.1/ms-da-projects` |
| `JWT_SECRET` | Access Token 签名密钥 | - |
| `JWT_REFRESH_SECRET` | Refresh Token 签名密钥 | - |
| `WX_APPID` | 微信小程序 AppID | - |
| `WX_SECRET` | 微信小程序 AppSecret | - |
| `WX_SUBSCRIBE_TEMPLATE_ID` | 订阅消息模板 ID | - |
| `WX_MINIPROGRAM_STATE` | 小程序环境（developer/trial/formal） | `developer` |
| `SM_DOUBLEASSISTANT_INTERNAL_STATS_TOKEN` | 回环看板聚合接口的独立令牌（至少 32 字节） | - |
