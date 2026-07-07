<template>
  <div id="app-container">
    <el-container class="app-layout">
      <el-aside :width="isCollapse ? '64px' : '220px'" class="app-sidebar">
        <div class="logo-area" @click="router.push('/')">
          <span class="logo-icon">🍎</span>
          <span v-show="!isCollapse" class="logo-text">饮食记录</span>
        </div>

        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/">
            <el-icon><Odometer /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="/foods">
            <el-icon><Box /></el-icon>
            <span>食品仓储</span>
          </el-menu-item>
          <el-menu-item index="/meals">
            <el-icon><DishDot /></el-icon>
            <span>一日三餐</span>
          </el-menu-item>
          <el-menu-item index="/snacks">
            <el-icon><IceCream /></el-icon>
            <span>零嘴记录</span>
          </el-menu-item>
          <el-menu-item index="/exercises">
            <el-icon><Bicycle /></el-icon>
            <span>运动记录</span>
          </el-menu-item>
          <el-menu-item index="/calorie-budget">
            <el-icon><TrendCharts /></el-icon>
            <span>热量开支</span>
          </el-menu-item>
          <el-menu-item index="/profile">
            <el-icon><User /></el-icon>
            <span>个人档案</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <el-button text @click="isCollapse = !isCollapse">
              <el-icon :size="18"><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
            </el-button>
            <span class="page-title">{{ pageTitle }}</span>
          </div>
          <div class="header-right">
            <SyncStatus />
          </div>
        </el-header>

        <el-main class="app-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SyncStatus from './components/SyncStatus.vue'

const route = useRoute()
const router = useRouter()
const isCollapse = ref(false)

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta?.title || '仪表盘')
</script>

<style scoped>
.app-layout { height: 100vh; }

.app-sidebar {
  background-color: #304156;
  overflow: hidden;
  transition: width 0.3s;
}

.logo-area {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.logo-icon { font-size: 24px; }
.logo-text { color: #fff; font-size: 16px; font-weight: 600; margin-left: 10px; white-space: nowrap; }

.app-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
  height: 56px;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 16px; font-weight: 600; }

.app-main {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
