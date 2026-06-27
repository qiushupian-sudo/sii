<template>
  <div>
    <h2>分类管理</h2>

    <div class="category-group">
      <h3>支出分类</h3>
      <div class="tag-list">
        <span v-for="(c, i) in categories.expense" :key="i" class="tag tag-expense">
          {{ c }}
          <button class="tag-remove" @click="removeCategory('expense', i)">&times;</button>
        </span>
      </div>
      <div class="add-row">
        <input v-model="newExpenseCat" placeholder="新增支出分类" @keyup.enter="addCategory('expense')" />
        <button class="btn btn-primary btn-sm" @click="addCategory('expense')">添加</button>
      </div>
    </div>

    <div class="category-group">
      <h3>收入分类</h3>
      <div class="tag-list">
        <span v-for="(c, i) in categories.income" :key="i" class="tag tag-income">
          {{ c }}
          <button class="tag-remove" @click="removeCategory('income', i)">&times;</button>
        </span>
      </div>
      <div class="add-row">
        <input v-model="newIncomeCat" placeholder="新增收入分类" @keyup.enter="addCategory('income')" />
        <button class="btn btn-primary btn-sm" @click="addCategory('income')">添加</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getCategories, updateCategories } from '../api'

const categories = ref({ expense: [], income: [] })
const newExpenseCat = ref('')
const newIncomeCat = ref('')

async function fetchCategories() {
  const res = await getCategories()
  categories.value = res.data
}

async function save() {
  await updateCategories(categories.value)
}

function addCategory(type) {
  const val = type === 'expense' ? newExpenseCat.value.trim() : newIncomeCat.value.trim()
  if (!val || categories.value[type].includes(val)) return
  categories.value[type].push(val)
  if (type === 'expense') newExpenseCat.value = ''
  else newIncomeCat.value = ''
  save()
}

function removeCategory(type, index) {
  categories.value[type].splice(index, 1)
  save()
}

onMounted(fetchCategories)
</script>

<style scoped>
h2 { font-size: 18px; margin-bottom: 16px; }
h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
.category-group { margin-bottom: 24px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 16px; font-size: 13px; }
.tag-expense { background: #fef2f2; color: #ef4444; }
.tag-income { background: #ecfdf5; color: #10b981; }
.tag-remove { background: none; border: none; cursor: pointer; font-size: 16px; line-height: 1; opacity: .5; padding: 0 2px; }
.tag-remove:hover { opacity: 1; }
.add-row { display: flex; gap: 8px; }
.add-row input { flex: 1; max-width: 200px; }
</style>
