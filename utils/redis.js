import Redis from 'ioredis';

// Redis 客户端单例
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// 获取统计数据的函数
async function getStats(domain, path) {
  try {
    const stats = {
      sitePV: await redis.get(`site:${domain}:pv`) || '0',
      pagePV: await redis.get(`page:${domain}:${path}:pv`) || '0',
      siteUV: (await redis.pfcount(`site:${domain}:uv`)).toString()
    };
    return stats;
  } catch (error) {
    console.error('获取统计数据错误:', error);
    return {
      sitePV: '0',
      pagePV: '0',
      siteUV: '0'
    };
  }
}

export { redis, getStats }; 