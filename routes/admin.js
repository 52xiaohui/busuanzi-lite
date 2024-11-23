import express from 'express';
import { redis } from '../utils/redis.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// 验证这些必需的配置是否存在
if (!JWT_SECRET || !ADMIN_PASSWORD) {
  console.error('错误: 必须设置 JWT_SECRET 和 ADMIN_PASSWORD 环境变量');
  process.exit(1);
}

// 验证中间件
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ error: '无效的令牌' });
    }
};

// 登录路由
router.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: '密码错误' });
    }
});

// 验证令牌
router.get('/check-auth', authMiddleware, (req, res) => {
    res.json({ valid: true });
});

// 为所有其他管理路由添加认证中间件
router.use(authMiddleware);

// 获取域名列表
router.get('/domains', async (req, res) => {
  try {
    // 从集合中获取所有域名
    const domains = await redis.smembers('domains');
    
    // 如果没有任何域名记录，至少返回 localhost
    if (domains.length === 0) {
      domains.push('localhost');
    }

    // 排序后返回
    res.json(domains.sort());
  } catch (error) {
    console.error('获取域名列表失败:', error);
    res.status(500).json({ error: '获取域名列表失败' });
  }
});

// 获取统计数据
router.get('/stats', async (req, res) => {
  try {
    const domain = req.query.domain;
    if (!domain) {
      return res.status(400).json({ error: '需要指定域名' });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 使用 retryOperation
    const results = await redis.retryOperation(async () => {
      const pipeline = redis.pipeline();
      pipeline.get(`site:${domain}:pv`);
      pipeline.pfcount(`site:${domain}:uv`);
      pipeline.get(`site:${domain}:${today}:pv`);
      pipeline.pfcount(`site:${domain}:${today}:uv`);
      pipeline.lrange(`logs:${domain}`, 0, 49);
      return await pipeline.exec();
    });
    
    const [sitePV, siteUV, todayPV, todayUV, logs] = results.map(r => r[1] || 0);
    
    res.json({
      sitePV,
      siteUV,
      todayPV,
      todayUV,
      recentLogs: Array.isArray(logs) ? logs.map(log => JSON.parse(log)) : []
    });
    
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 导出数据
router.get('/export', async (req, res) => {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      domains: await redis.smembers('domains'),
      stats: {}
    };

    // 获取所有域名的统计数据
    for (const domain of data.domains) {
      data.stats[domain] = {
        pv: await redis.get(`site:${domain}:pv`),
        uv: await redis.pfcount(`site:${domain}:uv`),
        logs: await redis.lrange(`logs:${domain}`, 0, -1)
      };
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=busuanzi-stats-${new Date().toISOString().split('T')[0]}.json`);
    res.json(data);
    
  } catch (error) {
    res.status(500).json({ error: '导出失败' });
  }
});

// 重置数据（仅开发环境）
router.post('/reset', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: '只能在开发环境中重置数据' });
  }
  
  try {
    await redis.flushall();
    res.json({ message: '数据已重置' });
  } catch (error) {
    res.status(500).json({ error: '重置失败' });
  }
});

// 修改图表数据接口
router.get('/chart-data', async (req, res) => {
  try {
    const domain = req.query.domain;
    if (!domain) {
      return res.status(400).json({ error: '需要指定域名' });
    }

    const dates = [];
    const pvData = [];
    const uvData = [];

    // 获取最近7天的数据
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.unshift(dateStr);

      const dayKey = `stats:${domain}:${dateStr}`;
      const [pv, uv] = await Promise.all([
        redis.get(`${dayKey}:pv`),
        redis.pfcount(`${dayKey}:uv`)
      ]);

      // 确保数据是数字，如果是 null 则返回 0
      pvData.unshift(parseInt(pv || '0', 10));
      uvData.unshift(parseInt(uv || '0', 10));
    }

    // 如果当天没有数据，使用总量数据
    if (pvData[pvData.length - 1] === 0) {
      const [totalPV, totalUV] = await Promise.all([
        redis.get(`site:${domain}:pv`),
        redis.pfcount(`site:${domain}:uv`)
      ]);
      
      if (totalPV) {
        pvData[pvData.length - 1] = parseInt(totalPV, 10);
      }
      if (totalUV) {
        uvData[uvData.length - 1] = parseInt(totalUV, 10);
      }
    }

    res.json({
      dates,
      pvData,
      uvData
    });
  } catch (error) {
    console.error('获取图表数据失败:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router; 