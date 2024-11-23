import express from 'express';
import { redis, getStats } from '../utils/redis.js';

const router = express.Router();

// 添加常量配置
const CONFIG = {
  LOG_MAX_LENGTH: 1000,    // 日志最大保存条数
  DATA_EXPIRE_DAYS: 30,    // 数据过期天数
  HOURLY_EXPIRE_HOURS: 48  // 小时数据过期小时数
};

// 访问统计接口
router.get('/', async (req, res) => {
  try {
    const domain = req.query.domain || 'unknown';
    const path = req.query.path || '/';
    
    // 获取当前日期和小时
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.getHours().toString().padStart(2, '0');
    
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
      redis.pfadd(`site:${domain}:uv`, req.realIP),
      // 更新当天 UV
      redis.pfadd(`stats:${domain}:${today}:uv`, req.realIP),
      // 更新当前小时 UV
      redis.pfadd(`stats:${domain}:${today}:${hour}:uv`, req.realIP),
      
      // 记录访问日志，只保留必要信息
      redis.lpush(`logs:${domain}`, JSON.stringify({
        timestamp: Date.now(),
        ip: req.realIP,
        path: path || '/',
        referer: req.headers['referer']
      })),
      
      // 保持日志列表在合理长度
      redis.ltrim(`logs:${domain}`, 0, CONFIG.LOG_MAX_LENGTH),
      
      // 记录域名
      redis.sadd('domains', domain)
    ]);

    // 批量设置过期时间
    const dailyExpire = CONFIG.DATA_EXPIRE_DAYS * 24 * 60 * 60;
    const hourlyExpire = CONFIG.HOURLY_EXPIRE_HOURS * 60 * 60;
    
    const expireOps = [
      [`stats:${domain}:${today}:pv`, dailyExpire],
      [`stats:${domain}:${today}:uv`, dailyExpire],
      [`stats:${domain}:${today}:${hour}:pv`, hourlyExpire],
      [`stats:${domain}:${today}:${hour}:uv`, hourlyExpire]
    ];

    await Promise.all(
      expireOps.map(([key, ttl]) => redis.expire(key, ttl))
    );

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