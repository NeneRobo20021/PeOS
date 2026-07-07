<template>
  <div class="page-container">
    <div class="page-header">
      <h2>零嘴记录</h2>
      <el-button type="primary" @click="openAdd">
        <el-icon><Plus /></el-icon> 记录零嘴
      </el-button>
    </div>

    <el-date-picker v-model="filterDate" type="date" placeholder="筛选日期" size="small"
      format="YYYY/MM/DD" value-format="YYYY-MM-DD" @change="fetchSnacks" style="margin-bottom:16px;" />

    <div v-loading="loading">
      <el-timeline v-if="snacks.length > 0">
        <el-timeline-item
          v-for="s in snacks" :key="s.id"
          :timestamp="s.snack_date + (s.snack_time ? ' ' + s.snack_time : '')"
          placement="top"
        >
          <el-card shadow="hover">
            <div class="snack-item">
              <img v-if="s.image_path" :src="s.image_path" class="snack-img" />
              <div class="snack-info">
                <div class="snack-name">
                  {{ s.name }}
                  <el-tag size="small" :type="s.purchase_type === 'instant' ? 'warning' : 'info'">
                    {{ s.purchase_type === 'instant' ? '即时购买' : '已有食品' }}
                  </el-tag>
                </div>
                <div class="snack-detail">
                  <span v-if="s.weight">重量: {{ s.weight }}g</span>
                  <span v-if="s.price">价格: ¥{{ s.price }}</span>
                </div>
                <div v-if="s.notes" class="snack-note">{{ s.notes }}</div>
              </div>
              <el-button type="danger" link size="small" @click="handleDelete(s.id)">删除</el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="今天还没吃零嘴呢" />
    </div>

    <!-- 添加对话框 -->
    <el-dialog v-model="showDialog" title="记录零嘴" width="500px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="零嘴名称" required>
          <el-input v-model="form.name" placeholder="如：奶茶、苹果、薯片..." />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="日期" required>
              <el-date-picker v-model="form.snack_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="时间">
              <el-time-picker v-model="form.snack_time" value-format="HH:mm" format="HH:mm" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="重量(g)">
              <el-input-number v-model="form.weight" :min="0" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格(¥)">
              <el-input-number v-model="form.price" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="购买类型">
          <el-radio-group v-model="form.purchase_type">
            <el-radio value="instant">即时购买（如奶茶、咖啡）</el-radio>
            <el-radio value="non_instant">已有食品（前几天买的）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="关联食品">
          <el-select v-model="form.food_id" placeholder="选择食品仓储中的食品" clearable filterable style="width:100%"
            @focus="fetchFoodList">
            <el-option v-for="f in foodList" :key="f.id" :label="f.name + ' (' + (f.weight||'?') + 'g)'" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" />
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
import { ref, onMounted } from 'vue'
import api from '../api/index'
import { syncManager } from '../utils/sync'
import { ElMessage, ElMessageBox } from 'element-plus'

const snacks = ref([])
const foodList = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const filterDate = ref(new Date().toISOString().slice(0, 10))

const form = ref({
  name: '', food_id: null, snack_date: new Date().toISOString().slice(0, 10),
  snack_time: '', weight: null, price: null, purchase_type: 'non_instant', notes: ''
})

async function fetchSnacks() {
  loading.value = true
  try {
    const params = {}
    if (filterDate.value) params.date = filterDate.value
    const res = await api.get('/snacks', { params })
    if (res.code === 0) snacks.value = res.data
  } catch (e) { ElMessage.error('获取失败') }
  loading.value = false
}

async function fetchFoodList() {
  try {
    const res = await api.get('/foods', { params: { status: 'active' } })
    if (res.code === 0) foodList.value = res.data
  } catch (e) { /* ignore */ }
}

function openAdd() {
  form.value = {
    name: '', food_id: null, snack_date: new Date().toISOString().slice(0, 10),
    snack_time: '', weight: null, price: null, purchase_type: 'non_instant', notes: ''
  }
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.snack_date) return ElMessage.warning('请填写名称和日期')
  saving.value = true
  try {
    await syncManager.apiCall({ method: 'POST', url: '/snacks', data: form.value, table: 'snacks' })
    ElMessage.success('保存成功')
    showDialog.value = false
    fetchSnacks()
  } catch (e) {
    ElMessage.info('已缓存到本地')
    showDialog.value = false
  }
  saving.value = false
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除？', '确认', { type: 'warning' })
    await api.delete(`/snacks/${id}`)
    ElMessage.success('已删除')
    fetchSnacks()
  } catch (e) { /* cancelled */ }
}

onMounted(fetchSnacks)
</script>

<style scoped>
.snack-item { display: flex; align-items: center; gap: 12px; }
.snack-img { width: 50px; height: 50px; border-radius: 4px; object-fit: cover; }
.snack-info { flex: 1; }
.snack-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.snack-detail { font-size: 12px; color: #909399; margin-top: 4px; display: flex; gap: 12px; }
.snack-note { font-size: 12px; color: #c0c4cc; margin-top: 4px; }
</style>
