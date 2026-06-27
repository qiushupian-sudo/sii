<template>
  <div>
    <div class="header-row">
      <h2>记账记录</h2>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" @click="showExportMenu = !showExportMenu">
          导出
        </button>
        <button class="btn btn-primary btn-sm" @click="openForm()">
          + 新增
        </button>
      </div>
    </div>

    <div v-if="showExportMenu" class="export-menu">
      <button class="btn btn-sm btn-outline" @click="handleExport('json')">导出 JSON</button>
      <button class="btn btn-sm btn-outline" @click="handleExport('csv')">导出 CSV</button>
      <button class="btn btn-sm btn-outline" @click="handleImport">导入 JSON</button>
      <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleFileImport" />
    </div>

    <form v-if="showForm" class="form" @submit.prevent="handleSubmit">
      <div class="form-row">
        <select v-model="form.type">
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <input v-model.number="form.amount" type="number" placeholder="金额" min="0.01" step="0.01" required />
        <select v-model="form.category" required>
          <option value="" disabled>选择分类</option>
          <option v-for="c in categories[form.type]" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="form-row">
        <input v-model="form.date" type="date" required />
        <input v-model="form.note" placeholder="备注（选填）" maxlength="100" />
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          {{ submitting ? '保存中…' : editingId ? '更新' : '添加' }}
        </button>
        <button type="button" class="btn btn-outline" @click="closeForm">取消</button>
      </div>
    </form>

    <div class="summary">
      <div class="summary-card income">
        <span>收入</span>
        <strong>¥{{ incomeTotal.toFixed(2) }}</strong>
      </div>
      <div class="summary-card expense">
        <span>支出</span>
        <strong>¥{{ expenseTotal.toFixed(2) }}</strong>
      </div>
      <div class="summary-card balance">
        <span>结余</span>
        <strong :style="{ color: balance >= 0 ? '#10b981' : '#ef4444' }">¥{{ balance.toFixed(2) }}</strong>
      </div>
    </div>

    <div class="filters">
      <select v-model="filter.type">
        <option value="">全部类型</option>
        <option value="expense">支出</option>
        <option value="income">收入</option>
      </select>
      <select v-model="filter.category">
        <option value="">全部分类</option>
        <option v-for="c in allCategories" :key="c" :value="c">{{ c }}</option>
      </select>
      <input v-model="filter.month" type="month" />
      <button class="btn btn-sm btn-outline" @click="resetFilters">重置</button>
    </div>

    <div v-if="loading" class="loading">加载中…</div>

    <div v-else-if="filteredRecords.length === 0" class="empty">
      <p>{{ records.length === 0 ? '还没有记账记录，点击右上角「+ 新增」开始记账' : '没有匹配的记录' }}</p>
    </div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th>分类</th>
            <th class="text-right">金额</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredRecords" :key="r.id">
            <td class="text-nowrap">{{ r.date }}</td>
            <td><span :class="['badge', r.type === 'expense' ? 'badge-expense' : 'badge-income']">{{ r.type === 'expense' ? '支出' : '收入' }}</span></td>
            <td>{{ r.category }}</td>
            <td class="text-right" :class="r.type === 'expense' ? 'text-danger' : 'text-success'">¥{{ r.amount.toFixed(2) }}</td>
            <td class="text-muted">{{ r.note || '-' }}</td>
            <td>
              <button class="btn btn-xs btn-outline" @click="editRecord(r)">编辑</button>
              <button class="btn btn-xs btn-danger" @click="removeRecord(r)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="record-count">共 {{ filteredRecords.length }} 条记录</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { getRecords, createRecord, updateRecord, deleteRecord, getCategories, exportJSON, exportCSV, importRecords } from '../api'

const showToast = inject('showToast')

const records = ref([])
const categories = ref({ expense: [], income: [] })
const showForm = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const loading = ref(true)
const showExportMenu = ref(false)
const fileInput = ref(null)

const filter = ref({ type: '', category: '', month: getCurrentMonth() })
const form = ref(emptyForm())

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function emptyForm() {
  return { type: 'expense', amount: null, category: '', date: new Date().toISOString().slice(0, 10), note: '' }
}

const allCategories = computed(() => [...categories.value.expense, ...categories.value.income])

const filteredRecords = computed(() => {
  return records.value.filter(r => {
    if (filter.value.type && r.type !== filter.value.type) return false
    if (filter.value.category && r.category !== filter.value.category) return false
    if (filter.value.month && r.date.slice(0, 7) !== filter.value.month) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

const incomeTotal = computed(() => records.value.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))
const expenseTotal = computed(() => records.value.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))
const balance = computed(() => incomeTotal.value - expenseTotal.value)

async function fetchData() {
  try {
    loading.value = true
    const [recRes, catRes] = await Promise.all([getRecords(), getCategories()])
    records.value = recRes.data
    categories.value = catRes.data
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

function openForm(record) {
  if (record) {
    form.value = { type: record.type, amount: record.amount, category: record.category, date: record.date, note: record.note }
    editingId.value = record.id
  } else {
    form.value = emptyForm()
    editingId.value = null
  }
  showForm.value = true
  showExportMenu.value = false
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value = emptyForm()
}

function resetFilters() {
  filter.value = { type: '', category: '', month: getCurrentMonth() }
}

async function handleSubmit() {
  if (!form.value.amount || form.value.amount <= 0) {
    showToast('金额必须大于0', 'error')
    return
  }
  if (!form.value.category) {
    showToast('请选择分类', 'error')
    return
  }

  submitting.value = true
  try {
    const data = { ...form.value, amount: parseFloat(form.value.amount) }
    if (editingId.value) {
      await updateRecord(editingId.value, data)
      showToast('更新成功', 'success')
    } else {
      await createRecord(data)
      showToast('添加成功', 'success')
    }
    closeForm()
    await fetchData()
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    submitting.value = false
  }
}

function editRecord(r) {
  openForm(r)
}

async function removeRecord(r) {
  if (!confirm(`确定删除这条 ${r.type === 'expense' ? '支出' : '收入'} 记录？`)) return
  try {
    await deleteRecord(r.id)
    showToast('已删除', 'success')
    await fetchData()
  } catch (e) {
    showToast(e.message, 'error')
  }
}

async function handleExport(format) {
  try {
    if (format === 'json') {
      const res = await exportJSON()
      downloadBlob(res.data, 'records.json')
    } else {
      const res = await exportCSV()
      downloadBlob(res.data, 'records.csv')
    }
    showToast(`导出成功`, 'success')
  } catch (e) {
    showToast(e.message, 'error')
  }
  showExportMenu.value = false
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleImport() {
  fileInput.value?.click()
  showExportMenu.value = false
}

async function handleFileImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    await importRecords(data)
    showToast(`导入 ${data.length} 条记录成功`, 'success')
    await fetchData()
  } catch (e) {
    showToast('导入失败：' + e.message, 'error')
  }
  e.target.value = ''
}

onMounted(fetchData)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.header-row h2 { font-size: 17px; font-weight: 700; }
.export-menu { display: flex; gap: 6px; margin-bottom: 12px; padding: 10px; background: #f8f8f8; border-radius: 8px; }
.form { background: #f8f8f8; padding: 14px; border-radius: 8px; margin-bottom: 12px; }
.form-row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.form-row input, .form-row select { flex: 1; min-width: 100px; }
.summary { display: flex; gap: 10px; margin-bottom: 14px; }
.summary-card { flex: 1; padding: 10px 14px; border-radius: 8px; text-align: center; }
.summary-card span { display: block; font-size: 11px; color: #666; margin-bottom: 2px; }
.summary-card strong { font-size: 17px; }
.income { background: #ecfdf5; }
.expense { background: #fef2f2; }
.balance { background: #eff6ff; }
.filters { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
.filters select, .filters input { flex: 1; min-width: 100px; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 10px 10px; text-align: left; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
.table th { background: #fafafa; font-weight: 600; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; }
.table tbody tr:hover { background: #fafafa; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.badge-expense { background: #fef2f2; color: #ef4444; }
.badge-income { background: #ecfdf5; color: #10b981; }
.text-right { text-align: right; }
.text-danger { color: #ef4444; font-weight: 600; }
.text-success { color: #10b981; font-weight: 600; }
.text-muted { color: #999; }
.text-nowrap { white-space: nowrap; }
.record-count { text-align: center; font-size: 12px; color: #bbb; margin-top: 12px; }
</style>
