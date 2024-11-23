require('dotenv').config();

const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const redis = new Redis(process.env.REDIS_URL);

// 启用CORS
app.use(cors());

// 限流保护
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 60 // 限制每个IP每分钟60次请求
});
app.use(limiter);

// 访问统计接口
app.get('/count', async (req, res) => {
  const ip = req.ip;
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL参数必需' });
  }

  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 使用Redis管道批量处理
    const pipeline = redis.pipeline();
    
    // 增加总PV
    pipeline.incr('pv:total');
    // 增加页面PV
    pipeline.incr(`pv:${url}`);
    
    // 使用HyperLogLog统计UV
    pipeline.pfadd('uv:total', ip);
    pipeline.pfadd(`uv:${url}`, ip);
    
    // 记录当天访问
    pipeline.pfadd(`uv:${today}`, ip);
    
    // 记录IP访问日志（只保留最近1000条）
    pipeline.lpush('ip:log', JSON.stringify({
      ip,
      url,
      timestamp: now
    }));
    pipeline.ltrim('ip:log', 0, 999);

    const results = await pipeline.exec();
    
    // 获取统计数据
    const [totalPV] = await redis.mget('pv:total');
    const [pagePV] = await redis.mget(`pv:${url}`);
    const totalUV = await redis.pfcount('uv:total');
    const pageUV = await redis.pfcount(`uv:${url}`);

    res.json({
      totalPV,
      pagePV,
      totalUV,
      pageUV
    });
    
  } catch (error) {
    console.error('Redis错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

if (process.env.NODE_ENV === 'development') {
  // 测试接口
  app.get('/test', async (req, res) => {
    try {
      const stats = {
        pv: await redis.get('pv:total'),
        uv: await redis.pfcount('uv:total'),
        recentLogs: await redis.lrange('ip:log', 0, 9) // 获取最近10条访问记录
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 测试数据重置接口
  app.get('/reset', async (req, res) => {
    try {
      await redis.flushall();
      res.json({ message: '测试数据已重置' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务运行在端口 ${PORT}`);
}); 