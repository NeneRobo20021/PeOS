<template>
  <div class="page-container">
    <div class="page-header">
      <h2>一日三餐</h2>
      <el-button type="primary" @click="openAdd">
        <el-icon><Plus /></el-icon> 记录餐食
      </el-button>
    </div>

    <el-date-picker v-model="filterDate" type="date" placeholder="筛选日期" size="small"
      format="YYYY/MM/DD" value-format="YYYY-MM-DD" @change="fetchMeals" style="margin-bottom:16px;" />

    <el-tabs v-model="mealTab" @tab-change="fetchMeals">
      <el-tab-pane label="全部" name="" />
      <el-tab-pane label="早餐" name="breakfast" />
      <el-tab-pane label="午餐" name="lunch" />
      <el-tab-pane label="晚餐" name="dinner" />
    </el-tabs>

    <div v-loading="loading">
      <div v-if="meals.length > 0" class="meal-list">
        <div v-for="meal in meals" :key="meal.id" class="meal-card">
          <div class="meal-header">
            <el-tag :type="mealTagType(meal.meal_type)" size="small">
              {{ meal.label }}
            </el-tag>
            <span class="meal-date">{{ meal.meal_date }}</span>
            <span v-if="meal.total_price" class="meal-price">¥{{ meal.total_price }}</span>
            <el-button type="danger" link size="small" @click="handleDelete(meal.id)" style="margin-left:auto;">删除</el-button>
          </div>
          <div class="meal-body">
            <img v-if="meal.image_path" :src="meal.image_path" class="meal-photo" />
            <div class="meal-foods">
              <el-tag v-for="f in meal.foods" :key="f.id" size="small" style="margin:2px;" type="info">
                {{ f.food_name }}{{ f.weight ? ` ${f.weight}g` : '' }}{{ f.price ? ` ¥${f.price}` : '' }}
              </el-tag>
            </div>
          </div>
          <div v-if="meal.review" class="meal-review">
            <el-icon><ChatDotRound /></el-icon> {{ meal.review }}
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无餐食记录" />
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="showDialog" title="记录餐食" width="650px" destroy-on-close>
      <el-form :model="form" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="餐型" required>
              <el-select v-model="form.meal_type" style="width:100%">
                <el-option label="🥐 早餐" value="breakfast" />
                <el-option label="🍱 午餐" value="lunch" />
                <el-option label="🍲 晚餐" value="dinner" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="日期" required>
              <el-date-picker v-model="form.meal_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="总价格">
          <el-input-number v-model="form.total_price" :min="0" :precision="2" style="width:200px" />
        </el-form-item>

        <el-form-item label="餐食图片">
          <el-upload :auto-upload="true" :show-file-list="false" :before-upload="handleMealImage"
            accept="image/*">
            <el-button type="primary" plain size="small"><el-icon><Upload /></el-icon> 上传</el-button>
          </el-upload>
          <img v-if="form.image_path" :src="previewImage" style="height:80px;border-radius:4px;margin-top:8px;" />
        </el-form-item>

        <el-divider>食品项</el-divider>
        <div v-for="(item, idx) in form.foods" :key="idx" class="food-row">
          <el-input v-model="item.food_name" placeholder="食品名称" style="width:160px" size="small" />
          <el-input-number v-model="item.weight" :min="0" placeholder="重量(g)" size="small" style="width:120px" />
          <el-input-number v-model="item.price" :min="0" :precision="2" placeholder="价格" size="small" style="width:100px" />
          <el-button type="danger" :icon="Delete" circle size="small" @click="form.foods.splice(idx,1)" />
        </div>
        <el-button type="primary" link @click="form.foods.push({ food_name: '', weight: null, price: null, food_id: null })">
          <el-icon><Plus /></el-icon> 添加食品项
        </el-button>

        <el-form-item label="评价" style="margin-top:16px;">
          <el-input v-model="form.review" type="textarea" :rows="2" placeholder="对这顿饭的评价..." />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index'
import { syncManager } from '../utils/sync'
import { ElMessage, ElMessageBox } from 'element-plus'

const meals = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const filterDate = ref(new Date().toISOString().slice(0, 10))
const mealTab = ref('')

const defaultForm = () => ({
  meal_type: 'breakfast', meal_date: new Date().toISOString().slice(0, 10),
  total_price: null, image_path: '', review: '', notes: '',
  foods: [{ food_name: '', weight: null, price: null }]
})
const form = ref(defaultForm())

const previewImage = computed(() => {
  if (form.value.image_path?.startsWith('data:')) return form.value.image_path
  return form.value.image_path
})

function mealTagType(type) {
  return { breakfast: 'warning', lunch: 'success', dinner: '' }[type] || 'info'
}

async function fetchMeals() {
  loading.value = true
  try {
    const params = {}
    if (filterDate.value) params.date = filterDate.value
    if (mealTab.value) params.type = mealTab.value
    const res = await api.get('/meals', { params })
    if (res.code === 0) {
      meals.value = res.data.map(m => ({
        ...m,
        label: { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[m.meal_type] || m.meal_type
      }))
    }
  } catch (e) { ElMessage.error('获取失败') }
  loading.value = false
}

function openAdd() {
  form.value = defaultForm()
  showDialog.value = true
}

async function handleMealImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  try {
    const res = await api.post('/meals/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.code === 0) form.value.image_path = res.data.image_path
  } catch (e) {
    const reader = new FileReader()
    reader.onload = e => { form.value.image_path = e.target.result }
    reader.readAsDataURL(file)
  }
  return false
}

async function handleSave() {
  if (!form.value.meal_type || !form.value.meal_date) return ElMessage.warning('请填写餐型和日期')
  saving.value = true

  try {
    if (form.value.image_path?.startsWith('data:')) {
      const res = await syncManager.apiCall({
        method: 'POST',
        url: '/sync/upload-image',
        data: { image_data: form.value.image_path, category: 'meals' },
        table: 'meals'
      })
      if (res.code === 0 && res.data?.image_path) form.value.image_path = res.data.image_path
    }

    await syncManager.apiCall({
      method: 'POST', url: '/meals', data: form.value, table: 'meals'
    })
    ElMessage.success('保存成功')
    showDialog.value = false
    fetchMeals()
  } catch (e) {
    ElMessage.info('已缓存到本地')
    showDialog.value = false
  }
  saving.value = false
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除？', '确认', { type: 'warning' })
    await api.delete(`/meals/${id}`)
    ElMessage.success('已删除')
    fetchMeals()
  } catch (e) { /* cancelled */ }
}

onMounted(fetchMeals)
</script>

<style scoped>
.meal-list { display: flex; flex-direction: column; gap: 12px; }
.meal-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.meal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.meal-date { color: #909399; font-size: 13px; }
.meal-price { color: #f56c6c; font-weight: 600; font-size: 14px; }
.meal-body { display: flex; gap: 12px; }
.meal-photo { width: 80px; height: 80px; border-radius: 6px; object-fit: cover; }
.meal-foods { flex: 1; }
.meal-review { margin-top: 8px; font-size: 13px; color: #606266; display: flex; align-items: center; gap: 4px; background: #f5f7fa; padding: 8px; border-radius: 4px; }
.food-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
</style>
