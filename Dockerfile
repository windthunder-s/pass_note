# 使用官方 Node.js 镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 设置生产环境变量
ENV NODE_ENV=production
ENV PORT=8888

# 安装 sqlite3 / node-gyp 编译所需依赖
RUN apk add --no-cache python3 make g++ sqlite-dev

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
# 使用 npm 镜像源，并增加网络重试
RUN npm config set registry https://registry.npmmirror.com \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --omit=dev

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 8888

# 启动应用
CMD ["npm", "start"]