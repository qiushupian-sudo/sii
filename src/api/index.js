import axios from 'axios'

const BASE_URL = import.meta.env?.VITE_API_URL || '/api'
const api = axios.create({ baseURL: BASE_URL })
const STORAGE_KEYS = {
  records: 'simple-bookkeeping-records',
  categories: 'simple-bookkeeping-categories'
}

const defaultCategories = {
  expense: ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '服饰', '其他'],
  income: ['工资', '兼职', '投资', '理财', '红包', '退款', '其他']
}

function localRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return structuredClone(fallback)
    return JSON.parse(raw)
  } catch {
    return structuredClone(fallback)
  }
}

function localWrite(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function normalizeCategories(data) {
  return {
    expense: Array.isArray(data?.expense) && data.expense.length ? data.expense : defaultCategories.expense.slice(),
    income: Array.isArray(data?.income) && data.income.length ? data.income : defaultCategories.income.slice()
  }
}

async function withLocalFallback(request, fallback) {
  try {
    return await request()
  } catch (error) {
    const fallbackStatuses = [404, 405, 501]
    if (!error.response || fallbackStatuses.includes(error.response.status)) {
      return fallback()
    }
    throw error
  }
}

export function getRecords(params) {
  return withLocalFallback(
    async () => {
      const res = await api.get('/records', { params })
      if (!Array.isArray(res.data)) throw new Error('Invalid records response')
      return res
    },
    () => Promise.resolve({ data: localRead(STORAGE_KEYS.records, []) })
  )
}

export function createRecord(data) {
  return withLocalFallback(
    async () => {
      const res = await api.post('/records', data)
      if (!res.data || typeof res.data !== 'object' || Array.isArray(res.data)) {
        throw new Error('Invalid create record response')
      }
      return res
    },
    () => {
      const records = localRead(STORAGE_KEYS.records, [])
      const record = {
        id: Date.now(),
        type: data.type || 'expense',
        amount: parseFloat(data.amount),
        category: data.category,
        date: data.date || new Date().toISOString().slice(0, 10),
        note: data.note || '',
        createdAt: new Date().toISOString()
      }
      records.push(record)
      localWrite(STORAGE_KEYS.records, records)
      return Promise.resolve({ data: record })
    }
  )
}

export function updateRecord(id, data) {
  return withLocalFallback(
    () => api.put('/records/' + id, data),
    () => {
      const records = localRead(STORAGE_KEYS.records, [])
      const idx = records.findIndex(r => String(r.id) === String(id))
      if (idx === -1) return Promise.reject(new Error('记录不存在'))
      records[idx] = { ...records[idx], ...data, id: records[idx].id, amount: parseFloat(data.amount) }
      localWrite(STORAGE_KEYS.records, records)
      return Promise.resolve({ data: records[idx] })
    }
  )
}

export function deleteRecord(id) {
  return withLocalFallback(
    () => api.delete('/records/' + id),
    () => {
      const records = localRead(STORAGE_KEYS.records, []).filter(r => String(r.id) !== String(id))
      localWrite(STORAGE_KEYS.records, records)
      return Promise.resolve({ data: { ok: true } })
    }
  )
}

export function getCategories() {
  return withLocalFallback(
    async () => {
      const res = await api.get('/categories')
      if (!Array.isArray(res.data?.expense) || !Array.isArray(res.data?.income)) {
        throw new Error('Invalid categories response')
      }
      return { data: normalizeCategories(res.data) }
    },
    () => Promise.resolve({ data: normalizeCategories(localRead(STORAGE_KEYS.categories, defaultCategories)) })
  )
}

export function updateCategories(data) {
  const normalized = normalizeCategories(data)
  return withLocalFallback(
    async () => {
      await api.put('/categories', normalized)
      return { data: normalized }
    },
    () => {
      localWrite(STORAGE_KEYS.categories, normalized)
      return Promise.resolve({ data: normalized })
    }
  )
}

export function resetCategories() {
  return withLocalFallback(
    () => api.post('/categories/reset'),
    () => {
      const data = normalizeCategories(defaultCategories)
      localWrite(STORAGE_KEYS.categories, data)
      return Promise.resolve({ data })
    }
  )
}

export function getStats() {
  return api.get('/stats')
}

export function exportJSON() {
  return withLocalFallback(
    () => api.get('/export/json', { responseType: 'blob' }),
    () => Promise.resolve({ data: new Blob([JSON.stringify(localRead(STORAGE_KEYS.records, []), null, 2)], { type: 'application/json' }) })
  )
}

export function exportCSV() {
  return withLocalFallback(
    () => api.get('/export/csv', { responseType: 'blob' }),
    () => {
      const records = localRead(STORAGE_KEYS.records, [])
      const rows = records.map(r =>
        [r.id, r.type, r.amount, r.category, r.date, '"' + (r.note || '').replace(/"/g, '""') + '"'].join(',')
      )
      return Promise.resolve({ data: new Blob(['\uFEFF' + ['id,type,amount,category,date,note', ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }) })
    }
  )
}

export function importRecords(data) {
  return withLocalFallback(
    () => api.post('/import', data),
    () => {
      const records = localRead(STORAGE_KEYS.records, [])
      data.forEach((r, index) => {
        if (!r?.amount) return
        records.push({
          id: Date.now() + index,
          type: r.type || 'expense',
          amount: parseFloat(r.amount) || 0,
          category: r.category || '其他',
          date: r.date || new Date().toISOString().slice(0, 10),
          note: r.note || '',
          createdAt: new Date().toISOString()
        })
      })
      localWrite(STORAGE_KEYS.records, records)
      return Promise.resolve({ data: { ok: true } })
    }
  )
}
