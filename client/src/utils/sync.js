/**
 * 同步管理器
 * 检测网络状态，自动从 IndexedDB 向服务器同步离线数据
 */

import api from '../api/index'
import offlineDB from './offline-db'

// 同步状态
const SyncState = {
  ONLINE: 'online',       // 在线，数据实时同步
  OFFLINE: 'offline',     // 离线模式
  SYNCING: 'syncing'      // 正在同步
}

class SyncManager {
  constructor() {
    this.state = SyncState.ONLINE
    this.pendingCount = 0
    this.listeners = []
  }

  // 初始化
  async init() {
    // 监听网络状态
    window.addEventListener('online', () => this.onOnline())
    window.addEventListener('offline', () => this.onOffline())

    // 初始化状态
    if (!navigator.onLine) {
      this.state = SyncState.OFFLINE
    }

    // 获取待同步数量
    this.pendingCount = await offlineDB.getPendingCount()
    this.notify()

    // 如果在线，尝试同步
    if (navigator.onLine && this.pendingCount > 0) {
      this.syncPending()
    }
  }

  // 在线回调
  async onOnline() {
    this.state = SyncState.SYNCING
    this.notify()
    await this.syncPending()
    this.state = SyncState.ONLINE
    this.notify()
  }

  // 离线回调
  onOffline() {
    this.state = SyncState.OFFLINE
    this.notify()
  }

  // 检查是否在线
  isOnline() {
    return navigator.onLine
  }

  // 执行 API 调用，离线时自动入队
  async apiCall(config) {
    if (!this.isOnline()) {
      // 离线模式：缓存到 IndexedDB
      await offlineDB.addPendingOp({
        method: config.method || 'POST',
        url: config.url,
        data: config.data,
        table: config.table
      })
      this.pendingCount = await offlineDB.getPendingCount()
      this.notify()
      return { code: 0, data: { offline: true }, msg: '已缓存，网络恢复后自动同步' }
    }

    // 在线模式：直接请求
    try {
      return await api({
        method: config.method,
        url: config.url,
        data: config.data
      })
    } catch (err) {
      // 请求失败也缓存
      await offlineDB.addPendingOp({
        method: config.method || 'POST',
        url: config.url,
        data: config.data,
        table: config.table
      })
      this.pendingCount = await offlineDB.getPendingCount()
      this.notify()
      throw err
    }
  }

  // 同步所有待处理操作
  async syncPending() {
    const ops = await offlineDB.getPendingOps()
    if (ops.length === 0) return

    this.state = SyncState.SYNCING
    this.notify()

    try {
      // 分批同步到 /api/sync/batch
      const batchSize = 10
      const syncedIds = []

      for (let i = 0; i < ops.length; i += batchSize) {
        const batch = ops.slice(i, i + batchSize)
        const operations = batch.map(op => ({
          tempId: op.id,
          operation: op.method === 'PUT' ? 'UPDATE' : 'INSERT',
          table: op.table,
          data: op.data
        }))

        const result = await api.post('/sync/batch', {
          client_id: 'browser-' + (localStorage.getItem('client_id') || 'default'),
          operations
        })

        if (result?.code === 0) {
          // 将成功同步的 ID 加入删除列表
          const okIds = result.data
            .filter(r => r.status === 'ok')
            .map(r => batch.find(b => b.id === r.tempId)?.id)
            .filter(Boolean)
          syncedIds.push(...okIds)
        }
      }

      // 清理已同步
      if (syncedIds.length > 0) {
        await offlineDB.removePendingOps(syncedIds)
      }

      this.pendingCount = await offlineDB.getPendingCount()
    } catch (err) {
      console.warn('[Sync] 同步失败:', err.message)
    }

    this.state = SyncState.ONLINE
    this.notify()
  }

  // 订阅状态变化
  subscribe(fn) {
    this.listeners.push(fn)
    fn(this.getStatus())
    return () => {
      this.listeners = this.listeners.filter(f => f !== fn)
    }
  }

  // 通知所有订阅者
  notify() {
    const status = this.getStatus()
    this.listeners.forEach(fn => fn(status))
  }

  // 获取当前状态
  getStatus() {
    return {
      state: this.state,
      pendingCount: this.pendingCount,
      isOnline: this.isOnline()
    }
  }
}

const syncManager = new SyncManager()
export { syncManager, SyncState }
