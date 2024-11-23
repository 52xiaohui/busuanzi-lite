# Busuanzi-Lite

一个轻量级的网站访问统计系统，基于 Node.js 和 Redis。专注于简单、可靠的访问统计功能。

## 主要特点

- 🚀 轻量级，低资源占用
- 📊 实时统计 PV/UV
- 🔒 可靠的 UV 统计（基于 IP）
- 📈 支持多域名统计
- 🛡️ 内置访问限流保护
- 📱 响应式管理界面
- 🔄 自动清理过期数据

## 快速开始

### 1. 环境要求
- Node.js >= 14
- Redis >= 6
- Nginx (推荐)

### 2. 安装部署

```bash
# 克隆项目
git clone https://github.com/52xiaohui/busuanzi-lite.git
cd busuanzi-lite

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置必要的配置项

# 启动服务
npm start
```

### 3. Nginx 配置示例

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 4. 使用方法

在需要统计的网页添加：

```html
<!-- 引入统计脚本 -->
<script async src="https://你的域名/js/count.js"></script>

<!-- 显示统计数据 -->
<span id="busuanzi_container_site_pv">
    总访问量: <span id="busuanzi_value_site_pv"></span>
</span>
<span id="busuanzi_container_site_uv">
    总访客数: <span id="busuanzi_value_site_uv"></span>
</span>
<span id="busuanzi_container_page_pv">
    本页访问量: <span id="busuanzi_value_page_pv"></span>
</span>
```

## 管理面板

访问 `https://你的域名/admin.html` 可以：
- 查看实时访问统计
- 查看访问趋势图表
- 导出统计数据
- 查看最近访问记录

## 数据说明

- PV（Page View）：页面访问量
- UV（Unique Visitor）：独立访客数
- 访问记录保留最近 1000 条
- 每天的统计数据保留 30 天

## 安全配置

### 1. 管理界面保护
在 `.env` 文件中设置以下参数：
```bash
# 设置管理界面密码（必须修改）
ADMIN_PASSWORD=your-secure-password

# 设置 JWT 密钥（必须修改）
# 可以使用以下命令生成随机密钥：
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-jwt-secret-key
```

### 2. 访问限流
```bash
# 限流配置
RATE_LIMIT_MAX=120          # 每分钟最大请求数
RATE_LIMIT_WINDOW_MS=60000  # 时间窗口（毫秒）
```

### 3. 数据保留
```bash
# 数据保留配置
LOG_RETENTION_DAYS=30  # 访问日志保留天数
```

## 安全建议

1. 必须修改默认的管理密码
2. 使用随机生成的 JWT 密钥
3. 根据实际需求调整访问限流参数
4. 使用 HTTPS 加密传输
5. 定期备份 Redis 数据
6. 适当设置防火墙规则

## 常见问题

1. 统计数据不显示
   - 检查统计脚本是否正确加载
   - 确认域名配置是否正确
   - 查看浏览器控制台错误信息

2. UV 统计不准确
   - 确认 Nginx 配置了正确的 IP 头部
   - 检查是否存在 CDN 缓存

3. 管理面板无法访问
   - 确认服务正常运行
   - 检查 Nginx 配置
   - 查看错误日志

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 作者

[xiaohui](mailto:52xiaohuia@gmail.com)