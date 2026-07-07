<template>
  <div class="sync-status" :class="status.state">
    <el-tag v-if="status.state === 'online'" type="success" size="small" effect="plain">
      <el-icon class="status-dot"><CircleCheckFilled /></el-icon>
      在线
    </el-tag>
    <el-tag v-else-if="status.state === 'syncing'" type="warning" size="small" effect="plain">
      <el-icon class="status-dot sync-spin"><Loading /></el-icon>
      同步中 ({{ status.pendingCount }})
    </el-tag>
    <el-tag v-else type="info" size="small" effect="plain">
      <el-icon class="status-dot"><WarningFilled /></el-icon>
      离线 ({{ status.pendingCount }}条待同步)
    </el-tag>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { syncManager } from '../utils/sync'

const status = ref({ state: 'online', pendingCount: 0, isOnline: true })
let unsub = null

onMounted(() => {
  syncManager.init()
  unsub = syncManager.subscribe(s => { status.value = s })
})

onUnmounted(() => {
  if (unsub) unsub()
})
</script>

<style scoped>
.sync-status { display: flex; align-items: center; }
.status-dot { margin-right: 4px; }
.sync-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
