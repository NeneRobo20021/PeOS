const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

// 图片存储
const foodStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'data', 'images', 'foods'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const mealStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'data', 'images', 'meals'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const uploadFood = multer({ storage: foodStorage, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadMeal = multer({ storage: mealStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// 批量同步 - 接收离线缓存的待同步数据
router.post('/batch', (req, res) => {
  const db = getDb();
  const { client_id, operations } = req.body;

  if (!client_id || !operations || !Array.isArray(operations)) {
    return res.status(400).json({ code: 1, msg: '参数错误' });
  }

  const results = [];
  const transaction = db.transaction(() => {
    for (const op of operations) {
      try {
        const { operation, table, data, tempId } = op;

        // 记录同步日志
        db.prepare(`
          INSERT INTO sync_log (client_id, operation, table_name, payload)
          VALUES (?,?,?,?)
        `).run(client_id, operation, table, JSON.stringify(data));

        let result = { tempId, status: 'ok' };

        switch (`${operation}:${table}`) {
          case 'INSERT:foods': {
            const r = db.prepare(`
              INSERT INTO foods (name, price, weight, weight_unit, image_path,
                energy, protein, fat, carbohydrate, sodium, ingredients, purchase_date, notes)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            `).run(
              data.name, data.price, data.weight, data.weight_unit || 'g', data.image_path || null,
              data.energy, data.protein, data.fat, data.carbohydrate, data.sodium,
              data.ingredients, data.purchase_date, data.notes
            );
            result.realId = r.lastInsertRowid;
            break;
          }
          case 'INSERT:meals': {
            const r = db.prepare(`
              INSERT INTO meals (meal_type, meal_date, total_price, image_path, review, notes)
              VALUES (?,?,?,?,?,?)
            `).run(
              data.meal_type, data.meal_date, data.total_price, data.image_path, data.review, data.notes
            );
            result.realId = r.lastInsertRowid;

            if (data.foods && data.foods.length > 0) {
              const stmt = db.prepare('INSERT INTO meal_foods (meal_id, food_id, food_name, weight, price) VALUES (?,?,?,?,?)');
              for (const f of data.foods) {
                stmt.run(result.realId, f.food_id, f.food_name, f.weight, f.price);
              }
            }
            break;
          }
          case 'INSERT:snacks': {
            const r = db.prepare(`
              INSERT INTO snacks (food_id, name, snack_date, snack_time, weight, price, purchase_type, notes)
              VALUES (?,?,?,?,?,?,?,?)
            `).run(
              data.food_id, data.name, data.snack_date, data.snack_time, data.weight, data.price, data.purchase_type || 'non_instant', data.notes
            );
            result.realId = r.lastInsertRowid;
            break;
          }
          case 'INSERT:exercises': {
            const r = db.prepare(`
              INSERT INTO exercises (exercise_date, exercise_type, duration, distance,
                sets_count, calories_burned, avg_heart_rate, max_heart_rate, avg_pace, notes)
              VALUES (?,?,?,?,?,?,?,?,?,?)
            `).run(
              data.exercise_date, data.exercise_type, data.duration, data.distance,
              data.sets_count, data.calories_burned, data.avg_heart_rate, data.max_heart_rate, data.avg_pace, data.notes
            );
            result.realId = r.lastInsertRowid;
            break;
          }
          default:
            result = { tempId, status: 'skipped', reason: 'unknown operation' };
        }

        results.push(result);
      } catch (err) {
        results.push({ tempId: op.tempId, status: 'error', reason: err.message });
      }
    }
  });

  transaction();
  res.json({ code: 0, data: results });
});

// 同步图片上传（Base64 -> 文件）
router.post('/upload-image', (req, res) => {
  const fs = require('fs');
  const { image_data, category } = req.body; // category: 'foods' | 'meals'

  if (!image_data || !category) {
    return res.status(400).json({ code: 1, msg: '参数错误' });
  }

  const baseDir = path.join(__dirname, '..', '..', 'data', 'images', category);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  // Base64 -> Buffer -> File
  const matches = image_data.match(/^data:image\/(\w+);base64,(.+)$/);
  let ext = 'jpg';
  let buffer;

  if (matches) {
    ext = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(image_data, 'base64');
  }

  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(baseDir, filename);
  fs.writeFileSync(filepath, buffer);

  res.json({ code: 0, data: { image_path: `/images/${category}/${filename}` } });
});

module.exports = router;
