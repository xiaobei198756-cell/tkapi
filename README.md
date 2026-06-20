# WhatsApp / Telegram 客服线索分流系统

这是一个合规的客服线索分流系统：用户主动点击推广链接，主动提交手机号或线索编号并同意隐私提示后，系统按规则分配到 WhatsApp 或 Telegram 客服账号。系统只做跳转，不实现自动群发、自动私信、批量注册或规避平台限制。

## 功能

- 管理后台登录
- WhatsApp / Telegram 客服账号管理
- Campaign 分流链接，例如 `/go/campaign-a`
- Round-robin 轮流分配
- 每日新线索分配上限
- 国家/地区访问限制
- 同一 `campaign + user_hash` 固定分配同一客服
- 手机号/线索编号使用 SHA-256 哈希保存
- IP 地址使用 SHA-256 哈希保存
- 点击日志、日期筛选和基础统计

## 项目结构

```text
.
├── config/
│   ├── db.js
│   ├── geoip.js
│   ├── schema.js
│   └── security.js
├── data/
├── public/
│   └── css/
│       └── app.css
├── routes/
│   ├── admin.js
│   ├── auth.js
│   └── public.js
├── scripts/
│   └── init-db.js
├── views/
│   ├── admin/
│   ├── partials/
│   └── public/
├── .env.example
├── package.json
├── README.md
└── server.js
```

## 数据库表

### accounts

- `id`
- `account_name`
- `platform`
- `contact_url`
- `country_code`
- `daily_limit`
- `enabled`
- `created_at`
- `updated_at`

### campaigns

- `id`
- `campaign_name`
- `slug`
- `allowed_countries`
- `enabled`
- `last_assigned_account_id`
- `created_at`
- `updated_at`

### lead_assignments

- `id`
- `campaign_id`
- `user_hash`
- `assigned_account_id`
- `created_at`

### click_logs

- `id`
- `campaign_id`
- `user_hash`
- `assigned_account_id`
- `platform`
- `country_code`
- `ip_hash`
- `user_agent`
- `redirect_url`
- `clicked_at`

### admin_users

- `id`
- `username`
- `password_hash`
- `created_at`

## 安装和运行

1. 安装依赖

```bash
npm install
```

2. 创建环境变量

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

建议修改 `.env` 中的 `SESSION_SECRET`、`HASH_SECRET` 和管理员密码。

3. 初始化数据库和示例数据

```bash
npm run init-db
```

默认会创建：

- 管理员：`admin`
- 密码：`admin123456`
- 示例 Campaign：`/go/campaign-a`
- 示例 WhatsApp 和 Telegram 客服账号

4. 启动项目

```bash
npm start
```

开发模式：

```bash
npm run dev
```

访问：

- 管理后台：`http://localhost:3000/admin`
- 示例分流链接：`http://localhost:3000/go/campaign-a?country=US`

## 国家/地区识别

开发阶段支持用 URL 参数模拟国家：

```text
/go/campaign-a?country=US
```

生产部署时可通过反向代理或 CDN 注入国家头：

- `CF-IPCountry`
- `X-Vercel-IP-Country`
- `X-Country-Code`

`config/geoip.js` 中已经预留了 GeoIP 接口位置。IP 地区识别只作为辅助，不作为唯一身份判断。

## 联系链接格式

WhatsApp:

```text
https://wa.me/15551234567
```

Telegram:

```text
https://t.me/username
```

## 合规说明

- 用户必须主动提交手机号或线索编号。
- 页面会显示隐私提示，并要求用户勾选同意。
- 数据库不保存明文手机号。
- 数据库不保存明文 IP。
- 系统不会自动发送 WhatsApp 消息。
- 系统不会自动发送 Telegram 消息。
- 系统不包含批量私信、批量注册、隐藏身份或规避平台风控功能。

## 分配逻辑

1. 用户访问 `/go/:slug`
2. 检查 Campaign 是否存在且启用
3. 检查国家/地区是否允许访问
4. 显示手机号或线索编号填写页面
5. 用户勾选同意并提交
6. 系统生成 `user_hash`
7. 查询 `lead_assignments`
8. 如果已分配，继续跳转原客服
9. 如果未分配，从可用客服中 round-robin 轮流分配
10. 达到 `daily_limit` 的账号当天不接收新线索
11. 写入点击日志
12. 跳转到 WhatsApp 或 Telegram 链接
