const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb, ensureUserProfile, closeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 - 图片
app.use('/images', express.static(path.join(__dirname, '..', 'data', 'images')));

// 静态文件服务 - 前端构建产物
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// API 路由
app.use('/api/foods', require('./routes/foods'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/snacks', require('./routes/snacks'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/summary', require('./routes/summary'));
app.use('/api/sync', require('./routes/sync'));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  }
});

// 启动
getDb();
ensureUserProfile();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] 运行在 http://0.0.0.0:${PORT}`);
  console.log(`[Server] 本机访问 http://localhost:${PORT}`);
});

// 优雅退出
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });
