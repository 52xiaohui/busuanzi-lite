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
    
    // 获取当前日期
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours().toString().padStart(2, '0');
    
    // 获取当前统计数据
    const stats = await getStats(domain, path);
    
    // 更新统计数据
    await Promise.all([
      // 增加站点总 PV
      redis.incr(`site:${domain}:pv`),
      // 增加页面 PV
      redis.incr(`page:${domain}:${path}:pv`),
      // 增加当天 PV
      redis.incr(`stats:${domain}:${today}:pv`),
      // 增加当前小时 PV
      redis.incr(`stats:${domain}:${today}:${hour}:pv`),
      
      // 更新站点总 UV
      redis.pfadd(`site:${domain}:uv`, ip),
      // 更新当天 UV
      redis.pfadd(`stats:${domain}:${today}:uv`, ip),
      // 更新当前小时 UV
      redis.pfadd(`stats:${domain}:${today}:${hour}:uv`, ip),
      
      // 记录访问日志
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

    // 设置当天数据的过期时间（30天）
    const expire = 30 * 24 * 60 * 60; // 30天的秒数
    await Promise.all([
      redis.expire(`stats:${domain}:${today}:pv`, expire),
      redis.expire(`stats:${domain}:${today}:uv`, expire),
      redis.expire(`stats:${domain}:${today}:${hour}:pv`, expire),
      redis.expire(`stats:${domain}:${today}:${hour}:uv`, expire)
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