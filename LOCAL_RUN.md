# 密码管理器本地运行手册

## 前置要求

- Node.js 18+（[下载地址](https://nodejs.org/)）
- npm 或 yarn 包管理器

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

### 3. 访问应用

打开浏览器访问：**http://localhost:8888**

---

## 常用命令

```bash
# 启动服务（生产模式）
npm start

# 开发模式（自动重启）
npm run dev

# 停止服务
# 按 Ctrl+C 停止
```

---

## 数据存储

- 数据库文件：`data/passwords.db`
- 数据加密存储，密码使用 AES 加密

---

## 端口配置

默认端口为 8888，如需修改：

编辑 `server.js` 文件：
```javascript
const PORT = process.env.PORT || 8888;
```

或通过环境变量设置：
```bash
set PORT=3000
npm start
```

---

## 故障排查

### 端口被占用

```bash
# Windows 查看端口占用
netstat -ano | findstr :8888

# 停止占用端口的进程
taskkill /PID <进程ID> /F
```

### 依赖安装失败

```bash
# 清除缓存重新安装
rm -rf node_modules
rm package-lock.json
npm install
```

### 数据库问题

```bash
# 检查数据目录
ls data/

# 重新创建数据目录
mkdir -p data
```

---

## 功能说明

| 功能 | 说明 |
|------|------|
| 🔐 密码加密 | 使用 AES 加密算法存储密码 |
| 🏷️ 分类管理 | 支持自定义分类，可添加图标和颜色 |
| 🔍 快速搜索 | 支持按标题、用户名搜索 |
| 👁️ 密码显示 | 点击显示按钮查看密码 |
| 📋 一键复制 | 复制账号、密码、网址到剪贴板 |
| 📦 自动备份 | 定时自动备份数据库 |
| 🎨 Emoji库 | 分类管理支持丰富的图标选择 |

---

## 备份功能

### 自动备份
系统会按照设置的间隔自动执行备份：
- 默认每天自动备份一次
- 可在 **⚙️ 设置** 中修改备份间隔（1小时/6小时/12小时/24小时/每周）
- 备份文件保存在 `backups/` 目录

### 手动备份
在应用界面点击 **📦 备份管理** → **立即备份**

### 备份管理
- 查看所有备份记录
- 查看备份中的账号密码数据
- 删除不需要的备份
- 从备份恢复数据

### 手动备份数据文件
如需手动备份数据库文件：

```bash
# Windows
copy data\passwords.db backup\passwords_$(Get-Date -Format "yyyyMMdd").db

# Linux/Mac
cp data/passwords.db backup/passwords_$(date +%Y%m%d).db
```
