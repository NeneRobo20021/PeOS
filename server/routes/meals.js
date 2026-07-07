const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'data', 'images', 'meals'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// 获取餐食列表
router.get('/', (req, res) => {
  const db = getDb();
  const { date, type } = req.query;
  let sql = 'SELECT * FROM meals WHERE 1=1';
  const params = [];

  if (date) { sql += ' AND meal_date = ?'; params.push(date); }
  if (type) { sql += ' AND meal_type = ?'; params.push(type); }

  sql += ' ORDER BY meal_date DESC, meal_type ASC';
  const meals = db.prepare(sql).all(...params);

  // 关联食品项
  for (const meal of meals) {
    meal.foods = db.prepare(`
      SELECT mf.*, f.image_path
      FROM meal_foods mf
      LEFT JOIN foods f ON mf.food_id = f.id
      WHERE mf.meal_id = ?
    `).all(meal.id);
  }

  res.json({ code: 0, data: meals });
});

// 获取单餐
router.get('/:id', (req, res) => {
  const db = getDb();
  const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
  if (!meal) return res.status(404).json({ code: 1, msg: '餐食不存在' });

  meal.foods = db.prepare(`
    SELECT mf.*, f.image_path FROM meal_foods mf
    LEFT JOIN foods f ON mf.food_id = f.id
    WHERE mf.meal_id = ?
  `).all(meal.id);

  res.json({ code: 0, data: meal });
});

// 上传餐食图片
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 1, msg: '未上传图片' });
  res.json({ code: 0, data: { image_path: `/images/meals/${req.file.filename}` } });
});

// 创建餐食
router.post('/', (req, res) => {
  const db = getDb();
  const { meal_type, meal_date, total_price, image_path, review, notes, foods } = req.body;

  if (!meal_type || !meal_date) {
    return res.status(400).json({ code: 1, msg: '餐型和日期不能为空' });
  }

  const insertMeal = db.prepare(`
    INSERT INTO meals (meal_type, meal_date, total_price, image_path, review, notes)
    VALUES (?,?,?,?,?,?)
  `);

  const insertMealFood = db.prepare(`
    INSERT INTO meal_foods (meal_id, food_id, food_name, weight, price)
    VALUES (?,?,?,?,?)
  `);

  // 更新食品仓储消耗量
  const updateFoodPercent = db.prepare(`
    UPDATE foods SET consumed_percent = MIN(100, consumed_percent + ?), updated_at = datetime('now','localtime')
    WHERE id = ? AND weight > 0
  `);

  const transaction = db.transaction(() => {
    const result = insertMeal.run(meal_type, meal_date, total_price || null, image_path || null, review || null, notes || null);
    const mealId = result.lastInsertRowid;

    if (foods && foods.length > 0) {
      for (const food of foods) {
        insertMealFood.run(mealId, food.food_id || null, food.food_name || '', food.weight || null, food.price || null);
        if (food.food_id && food.weight) {
          // 计算消耗百分比：(食用重量 / 购买总重量) * 100
          const foodItem = db.prepare('SELECT weight FROM foods WHERE id = ?').get(food.food_id);
          if (foodItem && foodItem.weight > 0) {
            const percent = (food.weight / foodItem.weight) * 100;
            updateFoodPercent.run(percent, food.food_id);
          }
        }
      }
    }

    return mealId;
  });

  const mealId = transaction();
  res.json({ code: 0, data: { id: mealId } });
});

// 更新餐食
router.put('/:id', (req, res) => {
  const db = getDb();
  const { meal_type, meal_date, total_price, image_path, review, notes } = req.body;

  db.prepare(`
    UPDATE meals SET
      meal_type = COALESCE(?, meal_type),
      meal_date = COALESCE(?, meal_date),
      total_price = COALESCE(?, total_price),
      image_path = COALESCE(?, image_path),
      review = COALESCE(?, review),
      notes = COALESCE(?, notes),
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(meal_type, meal_date, total_price, image_path, review, notes, req.params.id);

  res.json({ code: 0, msg: '更新成功' });
});

// 删除餐食
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id);
  res.json({ code: 0, msg: '删除成功' });
});

module.exports = router;
