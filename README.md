# Busuanzi-Lite

一个轻量级的网站访问统计系统，基于 Node.js 和 Redis。

## 功能特点

- 🚀 轻量级，易于部署
- 📊 统计 PV（页面访问量）和 UV（独立访客数）
- 📈 支持站点总量和单页面统计
- 🔄 实时更新
- 📱 响应式设计
- 🛡️ 内置限流保护
- 🎯 精确的UV统计（基于HyperLogLog）
- 📊 可视化管理界面
- 📥 数据导出功能

## 系统要求

- Node.js >= 14
- Redis >= 6
- npm 或 yarn

## 快速开始

1. 克隆仓库：
```
git clone https://github.com/你的用户名/busuanzi-lite.git
cd busuanzi-lite
```
2. 安装依赖：
```
npm install
```
3. 配置环境变量：
```
cp .env.example .env
```

编辑 .env 文件，设置你的配置：
```
PORT=3000
REDIS_URL=redis://127.0.0.1:6379
NODE_ENV=development
```

4. 启动服务：
```
npm start
```

## 使用方法

1. 在你的网页中引入统计脚本：
```
<script async src="http://你的域名:3000/js/count.js"></script>
```

2. 添加统计显示元素：
```
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

## 管理界面

访问 http://你的域名:3000/admin.html 进入管理界面，可以：

- 查看实时访问统计
- 查看访问趋势图表
- 查看最近访问记录
- 导出统计数据
- 重置统计数据（仅开发环境）

## API 说明

### 获取访问统计
- 端点：GET /count
- 参数：
  - url: 页面URL（必需）
- 返回示例：
```
{
  "totalPV": "100",
  "pagePV": "10",
  "totalUV": "50",
  "pageUV": "5"
}
```

### 管理接口
- 获取统计数据：GET /admin/stats
- 导出数据：GET /admin/export
- 重置数据：POST /admin/reset（仅开发环境）

## 开发

1. 测试 Redis 连接：
```
node redis_test.js
```

2. 运行开发服务器：
```
npm run dev
```

## 部署

1. 修改 .env 文件：
```
PORT=3000
REDIS_URL=redis://你的Redis地址:6379
NODE_ENV=production
```

2. 使用 PM2 运行：
```
npm install -g pm2
pm2 start server.js --name busuanzi-lite
```

## 安全建议

1. 配置防火墙，只允许必要的端口访问
2. 设置 Redis 密码
3. 使用 HTTPS
4. 定期备份 Redis 数据
5. 添加管理界面访问控制

## 数据备份

建议定期备份 Redis 数据：

1. 自动备份（使用 crontab）：
```
0 2 * * * redis-cli SAVE
```

2. 手动备份：
```
redis-cli SAVE
```

备份文件默认保存在 /var/lib/redis/dump.rdb

## 常见问题

1. Redis 连接失败
- 检查 Redis 服务是否运行
- 检查连接地址和端口
- 检查防火墙设置

2. 统计数据不更新
- 检查 JavaScript 控制台错误
- 确认 count.js 路径正确
- 检查 CORS 设置

3. 管理界面无法访问
- 确认服务器正常运行
- 检查端口配置
- 查看服务器错误日志

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 基本的 PV/UV 统计功能
- 管理界面
- 数据导出功能

## 作者

你的名字 <你的邮箱>

## 鸣谢

- [Express](https://expressjs.com/)
- [Redis](https://redis.io/)
- [Chart.js](https://www.chartjs.org/)
- [不蒜子](http://busuanzi.ibruce.info/)（灵感来源）