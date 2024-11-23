import 'dotenv/config';
import express from 'express';
import Redis from 'ioredis';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { redis } from './utils/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// 配置 CORS，完全开放
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true
}));

// 添加额外的 CORS 头
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// 限流保护
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 120 // 限制每个IP每分钟60次请求
});
app.use(limiter);

// 提供静态文件服务
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public')));

// 添加请求日志中间件
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${duration}ms`
    );
  });
  next();
};

app.use(requestLogger);

// 简单的内存缓存实现
class Cache {
  constructor(ttl = 60000) { // 默认缓存1分钟
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const data = this.cache.get(key);
    if (!data) return null;
    
    if (Date.now() - data.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return data.value;
  }

  clear() {
    this.cache.clear();
  }
}

const statsCache = new Cache(60000); // 1分钟缓存

// 将路由处理分离到单独的文件
import statsRouter from './routes/stats.js';
import adminRouter from './routes/admin.js';

app.use('/count', statsRouter);
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务运行在端口 ${PORT}`);
});

// 添加统一的错误处理中间件
const errorHandler = (err, req, res, next) => {
  // 记录错误详情
  console.error('错误时间:', new Date().toISOString());
  console.error('请求路径:', req.path);
  console.error('错误详情:', err);
  console.error('堆栈:', err.stack);

  // 返回适当的错误响应
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : '服务器错误'
  });
};

app.use(errorHandler);

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({
      status: 'healthy',
      redis: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// 简单的性能监控
const performanceMonitor = {
  requests: 0,
  errors: 0,
  startTime: Date.now(),

  log(duration) {
    this.requests++;
    if (this.requests % 100 === 0) {
      console.log(`性能统计:
        总请求数: ${this.requests}
        错误数: ${this.errors}
        运行时间: ${(Date.now() - this.startTime) / 1000}秒
        平均响应时间: ${duration}ms
      `);
    }
  }
};

// 修改获取真实 IP 的函数
function getRealIP(req) {
  // 按优先级尝试获取真实 IP
  const realIP = 
    req.headers['x-real-ip'] ||                         // Nginx 配置的真实 IP
    req.headers['x-forwarded-for']?.split(',')[0] ||    // 代理链的第一个 IP
    req.connection.remoteAddress?.replace(/^::ffff:/, '') || // IPv4 映射地址
    req.socket.remoteAddress?.replace(/^::ffff:/, '') ||     // Socket IP
    req.ip?.replace(/^::ffff:/, '') ||                       // Express IP
    'unknown';                                               // 默认值

  console.log('IP 获取详情:', {
    'x-real-ip': req.headers['x-real-ip'],
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'connection.remoteAddress': req.connection.remoteAddress,
    'socket.remoteAddress': req.socket.remoteAddress,
    'express.ip': req.ip,
    'final.ip': realIP
  });

  return realIP;
}

// 修改 IP 获取中间件
app.use((req, res, next) => {
  // 确保在所有中间件之前设置 trust proxy
  app.set('trust proxy', true);
  req.realIP = getRealIP(req);
  next();
});
  