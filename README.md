# Busuanzi-Lite

一个轻量级的网站访问统计系统，基于 Node.js 和 Redis。专注于简单、可靠的访问统计功能。

## 特点

- 🚀 轻量级，低资源占用
- 📊 实时统计 PV/UV
- 🔒 可靠的 UV 统计（基于 IP）
- 📈 支持多域名统计
- 🛡️ 内置访问限流保护
- 📱 响应式管理界面
- 🔄 自动清理过期数据

## 快速开始

### 1. 安装
```bash
git clone https://github.com/52xiaohui/busuanzi-lite.git
cd busuanzi-lite
npm install
```

### 2. 配置
复制并修改环境配置文件：
```bash
cp .env.example .env
```

必需的配置项：
```bash
# 管理界面密码
ADMIN_PASSWORD=your-secure-password

# JWT 密钥（使用以下命令生成）
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-jwt-secret
```

### 3. 启动服务
```bash
npm start
```

### 4. 在网页中使用

```html
<!-- 引入统计脚本 -->
<script async src="https://你的域名/js/count.js"></script>

<!-- 显示统计数据 -->
<span id="busuanzi_container_site_pv">
    访问量: <span id="busuanzi_value_site_pv"></span>
</span>
<span id="busuanzi_container_site_uv">
    访客数: <span id="busuanzi_value_site_uv"></span>
</span>
```

## Nginx 配置

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 管理面板

访问 `https://你的域名/admin.html` 进入管理界面：
- 查看实时访问统计
- 查看访问趋势图表
- 导出统计数据
- 查看访问记录

## 安全建议

1. 修改默认管理密码
2. 使用随机生成的 JWT 密钥
3. 使用 HTTPS
4. 定期备份 Redis 数据

## 环境要求

- Node.js >= 14
- Redis >= 6
- Nginx (推荐)

## 许可证

MIT

## 作者

[xiaohui](mailto:52xiaohuia@gmail.com)