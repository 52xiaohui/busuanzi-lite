import Redis from 'ioredis';

class RetryableRedis extends Redis {
  constructor(options) {
    super({
      ...options,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.on('error', (error) => {
      console.error('Redis 连接错误:', error);
    });

    this.on('ready', () => {
      console.log('Redis 连接就绪');
    });
  }

  async retryOperation(operation, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.min(100 * Math.pow(2, i), 2000)));
        }
      }
    }
    throw lastError;
  }
}

class RedisPool extends RetryableRedis {
  constructor(options) {
    super(options);
    
    // 添加连接池监控
    this.on('connect', () => {
      console.log('Redis 新连接已建立');
    });

    this.on('close', () => {
      console.log('Redis 连接已关���');
    });

    // 定期检查连接健康状况
    this.healthCheck = setInterval(async () => {
      try {
        await this.ping();
      } catch (error) {
        console.error('Redis 健康检查失败:', error);
      }
    }, 30000); // 每30秒检查一次
  }

  async quit() {
    clearInterval(this.healthCheck);
    return super.quit();
  }
}

// Redis 客户端单例
const redis = new RedisPool(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// 添加简单的内存缓存
const memoryCache = new Map();

// 获取统计数据的函数，添加重试机制
async function getStats(domain, path) {
  const cacheKey = `${domain}:${path}`;
  const cached = memoryCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 1000) { // 10秒缓存
    return cached.data;
  }

  try {
    const stats = await redis.retryOperation(async () => {
      const [sitePV, pagePV, siteUV] = await Promise.all([
        redis.get(`site:${domain}:pv`),
        redis.get(`page:${domain}:${path}:pv`),
        redis.pfcount(`site:${domain}:uv`)
      ]);

      return {
        sitePV: sitePV || '0',
        pagePV: pagePV || '0',
        siteUV: siteUV.toString()
      };
    });

    // 更新缓存
    memoryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: stats
    });

    // 清理过期缓存
    if (memoryCache.size > 1000) { // 最多缓存1000个键
      const now = Date.now();
      for (const [key, value] of memoryCache) {
        if (now - value.timestamp > 10000) {
          memoryCache.delete(key);
        }
      }
    }

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