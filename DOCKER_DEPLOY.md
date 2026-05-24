# 密码管理器 Docker 部署指南

## 前置要求

- Docker 已安装（[下载地址](https://www.docker.com/products/docker-desktop)）
- Docker Compose 已安装（通常随 Docker Desktop 一起安装）

## 快速开始

### 方法一：使用 Docker Compose（推荐）

1. **启动服务**
   ```bash
   docker-compose up -d
   ```

2. **查看日志**
   ```bash
   docker-compose logs -f
   ```

3. **访问应用**
   打开浏览器访问：`http://localhost:8888`

4. **停止服务**
   ```bash
   docker-compose down
   ```

### 方法二：使用 Docker 命令

1. **构建镜像**
   ```bash
   docker build -t password-manager .
   ```
 **保存镜像**
   ```bash
   docker save -o password-manager.tar password-manager
   ```

2. **运行容器**
   ```bash
   docker run -d -p 8888:8888 -v $(pwd)/data:/app/data --name password-manager password-manager
   ```

3. **查看日志**
   ```bash
   docker logs -f password-manager
   ```

4. **停止容器**
   ```bash
   docker stop password-manager
   docker rm password-manager
   ```

## 数据持久化

数据库文件存储在 `data/passwords.db`，通过 Docker Volume 挂载到容器中，确保数据不会丢失。

备份文件存储在 `backups/` 目录，同样通过 Volume 持久化。

## 端口配置

默认端口为 8888，如需修改：

**Docker Compose 方式**：修改 `docker-compose.yml` 中的端口映射
```yaml
ports:
  - "3000:8888"  # 将容器 8888 端口映射到主机 3000 端口
```

**Docker 命令方式**：修改 `-p` 参数
```bash
docker run -d -p 3000:8888 ...
```

## 常用命令

```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs password-manager

# 进入容器
docker exec -it password-manager sh

# 重启容器
docker restart password-manager

# 删除容器和数据（谨慎使用）
docker-compose down -v
```

## 故障排查

### 端口被占用
```bash
# Windows 查看端口占用
netstat -ano | findstr :8888

# Linux/Mac 查看端口占用
lsof -i :8888
```

### 容器无法启动
```bash
# 查看详细日志
docker-compose logs password-manager

# 检查容器状态
docker-compose ps
```

### 数据库问题
```bash
# 进入容器检查数据库
docker exec -it password-manager sh
ls -la /app/data/
```

## 备份功能

### 自动备份
- 系统会按照设置的间隔自动执行备份（默认每天）
- 备份文件保存在 `backups/` 目录

### 手动备份
在应用界面点击 **📦 备份管理** → **立即备份**

### 备份恢复
在备份管理界面选择备份，点击 **恢复备份** 即可恢复数据

### 备份卷配置
如需持久化备份文件，在 `docker-compose.yml` 中添加：
```yaml
volumes:
  - ./data:/app/data
  - ./backups:/app/backups  # 备份目录
```

## 生产环境部署建议

1. **修改加密密钥**：在 `server.js` 中修改 `SECRET_KEY`
2. **使用 HTTPS**：配置反向代理（Nginx/Caddy）
3. **定期备份**：系统已内置自动备份，同时建议定期复制 `backups/` 目录到外部存储
4. **限制访问**：配置防火墙规则，只允许特定 IP 访问
5. **监控备份**：定期检查备份文件是否生成成功
