const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

// 图片上传配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'data', 'images', 'foods'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// 获取所有食品
router.get('/', (req, res) => {
  const db = getDb();
  const { status, search } = req.query;
  let sql = 'SELECT * FROM foods WHERE 1=1';
  const params = [];

  if (status === 'active') {
    sql += ' AND is_finished = 0';
  } else if (status === 'finished') {
    sql += ' AND is_finished = 1';
  }
  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params);
  res.json({ code: 0, data: rows });
});

// 获取单个食品
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ code: 1, msg: '食品不存在' });
  res.json({ code: 0, data: row });
});

// 上传食品图片（裁剪后的）
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 1, msg: '未上传图片' });
  const imagePath = `/images/foods/${req.file.filename}`;
  res.json({ code: 0, data: { image_path: imagePath } });
});

// 创建食品
router.post('/', (req, res) => {
  const db = getDb();
  const {
    name, price, weight, weight_unit, image_path,
    energy, protein, fat, carbohydrate, sodium,
    fiber, sugar, saturated_fat, trans_fat, cholesterol, calcium,
    ingredients, purchase_date, notes
  } = req.body;

  if (!name) return res.status(400).json({ code: 1, msg: '食品名称不能为空' });

  const result = db.prepare(`
    INSERT INTO foods (name, price, weight, weight_unit, image_path,
      energy, protein, fat, carbohydrate, sodium,
      fiber, sugar, saturated_fat, trans_fat, cholesterol, calcium,
      ingredients, purchase_date, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    name, price || null, weight || null, weight_unit || 'g', image_path || null,
    energy || null, protein || null, fat || null, carbohydrate || null, sodium || null,
    fiber || null, sugar || null, saturated_fat || null, trans_fat || null, cholesterol || null, calcium || null,
    ingredients || null, purchase_date || null, notes || null
  );

  res.json({ code: 0, data: { id: result.lastInsertRowid } });
});

// 更新食品
router.put('/:id', (req, res) => {
  const db = getDb();
  const fields = [
    'name','price','weight','weight_unit','image_path',
    'energy','protein','fat','carbohydrate','sodium',
    'fiber','sugar','saturated_fat','trans_fat','cholesterol','calcium',
    'ingredients','consumed_percent','is_finished','purchase_date','notes'
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

  sets.push("updated_at = datetime('now', 'localtime')");
  params.push(req.params.id);

  db.prepare(`UPDATE foods SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  res.json({ code: 0, msg: '更新成功' });
});

// 删除食品
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM foods WHERE id = ?').run(req.params.id);
  res.json({ code: 0, msg: '删除成功' });
});

module.exports = router;
