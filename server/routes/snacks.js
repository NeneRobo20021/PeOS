const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// 获取零嘴列表
router.get('/', (req, res) => {
  const db = getDb();
  const { date } = req.query;
  let sql = 'SELECT s.*, f.image_path FROM snacks s LEFT JOIN foods f ON s.food_id = f.id WHERE 1=1';
  const params = [];

  if (date) { sql += ' AND s.snack_date = ?'; params.push(date); }

  sql += ' ORDER BY s.snack_date DESC, s.snack_time DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ code: 0, data: rows });
});

// 创建零嘴记录
router.post('/', (req, res) => {
  const db = getDb();
  const { food_id, name, snack_date, snack_time, weight, price, purchase_type, notes } = req.body;

  if (!name || !snack_date) {
    return res.status(400).json({ code: 1, msg: '名称和日期不能为空' });
  }

  const result = db.prepare(`
    INSERT INTO snacks (food_id, name, snack_date, snack_time, weight, price, purchase_type, notes)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(food_id || null, name, snack_date, snack_time || null, weight || null, price || null, purchase_type || 'non_instant', notes || null);

  // 如果关联了食品仓储，更新消耗百分比
  if (food_id && weight) {
    const foodItem = db.prepare('SELECT weight FROM foods WHERE id = ?').get(food_id);
    if (foodItem && foodItem.weight > 0) {
      const percent = (weight / foodItem.weight) * 100;
      db.prepare(`
        UPDATE foods SET consumed_percent = MIN(100, consumed_percent + ?), updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(percent, food_id);
    }
  }

  res.json({ code: 0, data: { id: result.lastInsertRowid } });
});

// 删除零嘴
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM snacks WHERE id = ?').run(req.params.id);
  res.json({ code: 0, msg: '删除成功' });
});

module.exports = router;
