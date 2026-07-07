/**
 * 离线缓存层 - 基于 IndexedDB
 * 在浏览器离线时暂存数据，在线时自动同步
 */

const DB_NAME = 'food-diet-offline'
const DB_VERSION = 1

let db = null

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db)

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const database = e.target.result
      // 待同步操作队列
      if (!database.objectStoreNames.contains('pendingOps')) {
        database.createObjectStore('pendingOps', { keyPath: 'id', autoIncrement: true })
      }
      // 离线图片缓存 (Base64)
      if (!database.objectStoreNames.contains('imageCache')) {
        database.createObjectStore('imageCache', { keyPath: 'key' })
      }
    }

    request.onsuccess = (e) => {
      db = e.target.result
      resolve(db)
    }

    request.onerror = (e) => {
      console.error('[OfflineDB] Failed to open:', e.target.error)
      reject(e.target.error)
    }
  })
}

/**
 * 添加待同步操作
 */
async function addPendingOp(operation) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingOps', 'readwrite')
    const store = tx.objectStore('pendingOps')
    const req = store.add({
      ...operation,
      created_at: new Date().toISOString()
    })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 获取所有待同步操作
 */
async function getPendingOps() {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingOps', 'readonly')
    const store = tx.objectStore('pendingOps')
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 获取待同步数量
 */
async function getPendingCount() {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingOps', 'readonly')
    const store = tx.objectStore('pendingOps')
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 删除已同步的操作
 */
async function removePendingOps(ids) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingOps', 'readwrite')
    const store = tx.objectStore('pendingOps')
    for (const id of ids) {
      store.delete(id)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 清空所有待同步
 */
async function clearAllPending() {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingOps', 'readwrite')
    const store = tx.objectStore('pendingOps')
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 缓存图片 Base64
 */
async function cacheImage(key, base64Data) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('imageCache', 'readwrite')
    const store = tx.objectStore('imageCache')
    store.put({ key, data: base64Data, cached_at: new Date().toISOString() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 获取缓存图片
 */
async function getCachedImage(key) {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('imageCache', 'readonly')
    const store = tx.objectStore('imageCache')
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result?.data || null)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 清理图片缓存
 */
async function clearImageCache() {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('imageCache', 'readwrite')
    const store = tx.objectStore('imageCache')
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export default {
  openDB,
  addPendingOp,
  getPendingOps,
  getPendingCount,
  removePendingOps,
  clearAllPending,
  cacheImage,
  getCachedImage,
  clearImageCache
}
