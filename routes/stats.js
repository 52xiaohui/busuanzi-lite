import express from 'express';
import { redis, getStats } from '../utils/redis.js';

const router = express.Router();

// 访问统计接口
router.get('/', async (req, res) => {
  try {
    const domain = req.query.domain || 'unknown';
    const path = req.query.path || '/';
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const referer = req.headers['referer'];
    
    // 获取当前统计数据
    const stats = await getStats(domain, path);
    
    // 更新统计数据
    await Promise.all([
      // 增加站点 PV
      redis.incr(`site:${domain}:pv`),
      // 增加页面 PV
      redis.incr(`page:${domain}:${path}:pv`),
      // 更新站点 UV
      redis.pfadd(`site:${domain}:uv`, ip),
      // 记录访问日志，添加更多信息
      redis.lpush(`logs:${domain}`, JSON.stringify({
        timestamp: Date.now(),
        ip,
        path: path || '/',
        userAgent,
        referer,
        url: req.originalUrl
      })),
      // 保持日志列表在合理长度
      redis.ltrim(`logs:${domain}`, 0, 999),
      // 记录域名
      redis.sadd('domains', domain)
    ]);

    res.json(stats);
  } catch (error) {
    console.error('处理请求错误:', error);
    res.status(500).json({ 
      error: '服务器错误',
      sitePV: '0',
      pagePV: '0',
      siteUV: '0'
    });
  }
});

export default router; 