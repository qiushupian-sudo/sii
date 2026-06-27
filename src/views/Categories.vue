<template>
  <div>
    <div class="header-row">
      <h2>分类管理</h2>
      <button class="btn btn-sm btn-outline" @click="resetToDefault">
        恢复默认
      </button>
    </div>

    <div v-if="loading" class="loading">加载中…</div>

    <template v-else>
      <div class="category-group">
        <div class="group-header">
          <h3>支出分类</h3>
          <span class="count">{{ categories.expense.length }} 项</span>
        </div>
        <div class="tag-list">
          <span v-for="(c, i) in categories.expense" :key="i" class="tag tag-expense">
            <span>{{ c }}</span>
            <button class="tag-remove" @click="removeCategory('expense', i)" :disabled="categories.expense.length <= 1">&times;</button>
          </span>
          <span v-if="categories.expense.length === 0" class="empty-tag">暂无分类</span>
        </div>
        <div class="add-row">
          <input v-model="newExpenseCat" placeholder="新增支出分类" maxlength="10" @keyup.enter="addCategory('expense')" />
          <button class="btn btn-primary btn-sm" @click="addCategory('expense')" :disabled="!newExpenseCat.trim()">添加</button>
        </div>
      </div>

      <div class="category-group">
        <div class="group-header">
          <h3>收入分类</h3>
          <span class="count">{{ categories.income.length }} 项</span>
        </div>
        <div class="tag-list">
          <span v-for="(c, i) in categories.income" :key="i" class="tag tag-income">
            <span>{{ c }}</span>
            <button class="tag-remove" @click="removeCategory('income', i)" :disabled="categories.income.length <= 1">&times;</button>
          </span>
          <span v-if="categories.income.length === 0" class="empty-tag">暂无分类</span>
        </div>
        <div class="add-row">
          <input v-model="newIncomeCat" placeholder="新增收入分类" maxlength="10" @keyup.enter="addCategory('income')" />
          <button class="btn btn-primary btn-sm" @click="addCategory('income')" :disabled="!newIncomeCat.trim()">添加</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { getCategories, updateCategories, resetCategories } from '../api'

const showToast = inject('showToast')

const categories = ref({ expense: [], income: [] })
const newExpenseCat = ref('')
const newIncomeCat = ref('')
const loading = ref(true)

async function fetchCategories() {
  try {
    loading.value = true
    const res = await getCategories()
    categories.value = res.data
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function save() {
  try {
    await updateCategories(categories.value)
  } catch (e) {
    showToast(e.message, 'error')
  }
}

function addCategory(type) {
  const val = type === 'expense' ? newExpenseCat.value.trim() : newIncomeCat.value.trim()
  if (!val) return
  if (categories.value[type].includes(val)) {
    showToast('分类已存在', 'error')
    return
  }
  categories.value[type].push(val)
  if (type === 'expense') newExpenseCat.value = ''
  else newIncomeCat.value = ''
  save()
}

function removeCategory(type, index) {
  if (categories.value[type].length <= 1) {
    showToast('至少保留一个分类', 'error')
    return
  }
  if (!confirm(`确定删除「${categories.value[type][index]}」？`)) return
  categories.value[type].splice(index, 1)
  save()
}

async function resetToDefault() {
  if (!confirm('确定恢复默认分类？自定义分类将被覆盖')) return
  try {
    const res = await resetCategories()
    categories.value = res.data
    showToast('已恢复默认分类', 'success')
  } catch (e) {
    showToast(e.message, 'error')
  }
}

onMounted(fetchCategories)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.header-row h2 { font-size: 17px; font-weight: 700; }
.group-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.group-header h3 { font-size: 14px; color: #666; }
.count { font-size: 11px; color: #bbb; }
.category-group { margin-bottom: 24px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 16px; font-size: 13px; }
.tag-expense { background: #fef2f2; color: #ef4444; }
.tag-income { background: #ecfdf5; color: #10b981; }
.tag-remove { background: none; border: none; cursor: pointer; font-size: 15px; line-height: 1; opacity: .4; padding: 0 2px; color: inherit; }
.tag-remove:hover { opacity: 1; }
.tag-remove:disabled { opacity: .15; cursor: not-allowed; }
.empty-tag { color: #ccc; font-size: 13px; padding: 4px 0; }
.add-row { display: flex; gap: 8px; }
.add-row input { flex: 1; max-width: 200px; }
</style>
