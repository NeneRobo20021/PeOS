const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// 获取运动记录
router.get('/', (req, res) => {
  const db = getDb();
  const { date, days } = req.query;
  let sql = 'SELECT * FROM exercises WHERE 1=1';
  const params = [];

  if (date) { sql += ' AND exercise_date = ?'; params.push(date); }
  if (days) { sql += ` AND exercise_date >= date('now', 'localtime', '-${parseInt(days)} days')`; }

  sql += ' ORDER BY exercise_date DESC, created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ code: 0, data: rows });
});

// 获取单条
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM exercises WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ code: 1, msg: '不存在' });
  res.json({ code: 0, data: row });
});

// 创建运动记录
router.post('/', (req, res) => {
  const db = getDb();
  const {
    exercise_date, exercise_type, duration, distance,
    sets_count, calories_burned, avg_heart_rate, max_heart_rate, avg_pace, notes
  } = req.body;

  if (!exercise_date || !exercise_type) {
    return res.status(400).json({ code: 1, msg: '日期和运动类型不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO exercises (exercise_date, exercise_type, duration, distance,
      sets_count, calories_burned, avg_heart_rate, max_heart_rate, avg_pace, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    exercise_date, exercise_type, duration || null, distance || null,
    sets_count || null, calories_burned || null, avg_heart_rate || null,
    max_heart_rate || null, avg_pace || null, notes || null
  );

  res.json({ code: 0, data: { id: result.lastInsertRowid } });
});

// 更新运动记录
router.put('/:id', (req, res) => {
  const db = getDb();
  const fields = [
    'exercise_date','exercise_type','duration','distance',
    'sets_count','calories_burned','avg_heart_rate','max_heart_rate','avg_pace','notes'
  ];
  const sets = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }
  if (sets.length === 0) return res.status(400).json({ code: 1, msg: '无更新字段' });
  params.push(req.params.id);

  db.prepare(`UPDATE exercises SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  res.json({ code: 0, msg: '更新成功' });
});

// 删除
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM exercises WHERE id = ?').run(req.params.id);
  res.json({ code: 0, msg: '删除成功' });
});

module.exports = router;
