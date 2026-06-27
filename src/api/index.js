import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL: BASE_URL })

export function getRecords(params) {
  return api.get('/records', { params })
}

export function createRecord(data) {
  return api.post('/records', data)
}

export function updateRecord(id, data) {
  return api.put('/records/' + id, data)
}

export function deleteRecord(id) {
  return api.delete('/records/' + id)
}

export function getCategories() {
  return api.get('/categories')
}

export function updateCategories(data) {
  return api.put('/categories', data)
}

export function resetCategories() {
  return api.post('/categories/reset')
}

export function getStats() {
  return api.get('/stats')
}

export function exportJSON() {
  return api.get('/export/json', { responseType: 'blob' })
}

export function exportCSV() {
  return api.get('/export/csv', { responseType: 'blob' })
}

export function importRecords(data) {
  return api.post('/import', data)
}
