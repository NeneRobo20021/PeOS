<template>
  <div class="page-container">
    <div class="page-header">
      <h2>食品仓储</h2>
      <el-button type="primary" @click="showDialog = true">
        <el-icon><Plus /></el-icon> 添加食品
      </el-button>
    </div>

    <!-- 筛选 -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="6"><el-input v-model="search" placeholder="搜索食品名称" clearable size="small" @change="fetchFoods" /></el-col>
      <el-col :span="6">
        <el-select v-model="filterStatus" placeholder="状态筛选" size="small" clearable @change="fetchFoods">
          <el-option label="未吃完" value="active" />
          <el-option label="已吃完" value="finished" />
        </el-select>
      </el-col>
    </el-row>

    <!-- 食品卡片列表 -->
    <div v-loading="loading" class="food-grid">
      <div v-for="food in foods" :key="food.id" class="food-card" @click="openEdit(food)">
        <div class="food-image">
          <img v-if="food.image_path" :src="food.image_path" alt="" />
          <el-icon v-else :size="40"><PictureFilled /></el-icon>
        </div>
        <div class="food-info">
          <div class="food-name">{{ food.name }}</div>
          <div class="food-detail">
            <span v-if="food.weight">{{ food.weight }}{{ food.weight_unit }}</span>
            <span v-if="food.price">¥{{ food.price }}</span>
          </div>
          <el-progress :percentage="food.consumed_percent || 0" :stroke-width="6"
            :color="food.consumed_percent >= 100 ? '#67c23a' : '#409eff'" />
        </div>
      </div>
      <div v-if="foods.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无食品，快去添加吧" />
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editingId ? '编辑食品' : '添加食品'" width="700px" destroy-on-close>
      <el-form :model="form" label-width="100px" label-position="right">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="食品名称" required>
              <el-input v-model="form.name" placeholder="如：蒙牛纯牛奶" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="购买日期">
              <el-date-picker v-model="form.purchase_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="价格(¥)">
              <el-input-number v-model="form.price" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="重量(g)">
              <el-input-number v-model="form.weight" :min="0" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="已食用(%)">
              <el-input-number v-model="form.consumed_percent" :min="0" :max="100" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 营养成分表 -->
        <el-divider content-position="left">营养成分表 (每100g)</el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="能量(kJ)">
              <el-input-number v-model="form.energy" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="蛋白质(g)">
              <el-input-number v-model="form.protein" :min="0" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="脂肪(g)">
              <el-input-number v-model="form.fat" :min="0" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="碳水(g)">
              <el-input-number v-model="form.carbohydrate" :min="0" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="钠(mg)">
              <el-input-number v-model="form.sodium" :min="0" :precision="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 配料表 -->
        <el-form-item label="配料表">
          <el-input v-model="form.ingredients" type="textarea" :rows="3"
            placeholder="配料表内容（可使用OCR识别后粘贴，也可手动输入）" />
        </el-form-item>

        <!-- 食品图片 -->
        <el-form-item label="食品图片">
          <div style="display:flex;align-items:center;gap:12px;">
            <el-upload :auto-upload="true" :show-file-list="false" :before-upload="handleImageUpload"
              accept="image/*">
              <el-button type="primary" plain size="small">
                <el-icon><Upload /></el-icon> 上传图片
              </el-button>
            </el-upload>
            <span v-if="form.image_path" style="color:#67c23a;font-size:12px;">已上传</span>
            <img v-if="form.image_path" :src="form.image_path" style="height:60px;border-radius:4px;" />
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" placeholder="其他备注信息" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button v-if="editingId" type="danger" plain @click="handleDelete">删除</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/index'
import { syncManager } from '../utils/sync'
import { ElMessage, ElMessageBox } from 'element-plus'

const foods = ref([])
const loading = ref(false)
const showDialog = ref(false)
const editingId = ref(null)
const saving = ref(false)
const search = ref('')
const filterStatus = ref('')

const defaultForm = () => ({
  name: '', price: null, weight: null, weight_unit: 'g',
  image_path: '', energy: null, protein: null, fat: null, carbohydrate: null, sodium: null,
  ingredients: '', consumed_percent: 0, purchase_date: '', notes: ''
})
const form = ref(defaultForm())

async function fetchFoods() {
  loading.value = true
  try {
    const params = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (search.value) params.search = search.value
    const res = await api.get('/foods', { params })
    if (res.code === 0) foods.value = res.data
  } catch (e) {
    ElMessage.error('获取食品列表失败')
  }
  loading.value = false
}

function openEdit(food) {
  editingId.value = food.id
  form.value = { ...food }
  showDialog.value = true
}

async function handleImageUpload(file) {
  const formData = new FormData()
  formData.append('image', file)

  try {
    if (syncManager.isOnline()) {
      const res = await api.post('/foods/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.code === 0) form.value.image_path = res.data.image_path
    } else {
      // 离线：转 Base64 缓存在表单中
      const reader = new FileReader()
      reader.onload = async (e) => {
        form.value.image_path = e.target.result // 暂存 base64
        ElMessage.warning('图片已缓存在本地，网络恢复后上传')
      }
      reader.readAsDataURL(file)
    }
  } catch (e) {
    ElMessage.error('图片上传失败')
  }
  return false // 阻止 el-upload 默认上传
}

async function handleSave() {
  if (!form.value.name) return ElMessage.warning('请输入食品名称')
  saving.value = true

  try {
    // 如果 image_path 是 Base64，先上传图片
    if (form.value.image_path && form.value.image_path.startsWith('data:')) {
      const res = await syncManager.apiCall({
        method: 'POST',
        url: '/sync/upload-image',
        data: { image_data: form.value.image_path, category: 'foods' },
        table: 'foods'
      })
      if (res.code === 0 && res.data?.image_path) {
        form.value.image_path = res.data.image_path
      }
    }

    const data = { ...form.value }
    delete data.id
    delete data.created_at
    delete data.updated_at

    if (editingId.value) {
      await syncManager.apiCall({
        method: 'PUT', url: `/foods/${editingId.value}`, data, table: 'foods'
      })
      ElMessage.success('更新成功')
    } else {
      await syncManager.apiCall({
        method: 'POST', url: '/foods', data, table: 'foods'
      })
      ElMessage.success('添加成功')
    }

    showDialog.value = false
    editingId.value = null
    form.value = defaultForm()
    fetchFoods()
  } catch (e) {
    if (!syncManager.isOnline()) {
      ElMessage.info('已缓存到本地，将在网络恢复后同步')
      showDialog.value = false
      form.value = defaultForm()
    } else {
      ElMessage.error('保存失败')
    }
  }
  saving.value = false
}

async function handleDelete() {
  try {
    await ElMessageBox.confirm('确定删除该食品吗？', '确认', { type: 'warning' })
    await api.delete(`/foods/${editingId.value}`)
    ElMessage.success('已删除')
    showDialog.value = false
    editingId.value = null
    form.value = defaultForm()
    fetchFoods()
  } catch (e) { /* cancelled */ }
}

onMounted(fetchFoods)
</script>

<style scoped>
.food-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.food-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.food-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.food-image {
  height: 140px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #c0c4cc;
}
.food-image img { width: 100%; height: 100%; object-fit: cover; }
.food-info { padding: 12px; }
.food-name { font-size: 14px; font-weight: 600; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.food-detail { font-size: 12px; color: #909399; margin-bottom: 8px; display: flex; gap: 12px; }
.empty-state { grid-column: 1 / -1; display: flex; justify-content: center; padding: 60px 0; }
</style>
