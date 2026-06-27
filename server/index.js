import express from 'express'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json())
app.use(express.static(join(__dirname, '..', 'dist')))

const DATA_FILE = join(__dirname, 'data', 'records.json')
const CAT_FILE = join(__dirname, 'data', 'categories.json')

function readJSON(file, fallback) {
  try {
    if (!existsSync(file)) writeFileSync(file, JSON.stringify(fallback, null, 2))
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch { return fallback }
}

function writeJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2))
}

const defaultCategories = {
  expense: ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '服饰', '其他'],
  income: ['工资', '兼职', '投资', '理财', '红包', '退款', '其他']
}

// Records API
app.get('/api/records', (req, res) => {
  res.json(readJSON(DATA_FILE, []))
})

app.post('/api/records', (req, res) => {
  const records = readJSON(DATA_FILE, [])
  const record = {
    id: Date.now(),
    type: req.body.type || 'expense',
    amount: parseFloat(req.body.amount) || 0,
    category: req.body.category || '其他',
    date: req.body.date || new Date().toISOString().slice(0, 10),
    note: req.body.note || '',
    createdAt: new Date().toISOString()
  }
  records.push(record)
  writeJSON(DATA_FILE, records)
  res.json(record)
})

app.put('/api/records/:id', (req, res) => {
  const records = readJSON(DATA_FILE, [])
  const idx = records.findIndex(r => r.id === parseInt(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  records[idx] = { ...records[idx], ...req.body, id: records[idx].id }
  writeJSON(DATA_FILE, records)
  res.json(records[idx])
})

app.delete('/api/records/:id', (req, res) => {
  let records = readJSON(DATA_FILE, [])
  records = records.filter(r => r.id !== parseInt(req.params.id))
  writeJSON(DATA_FILE, records)
  res.json({ ok: true })
})

// Categories API
app.get('/api/categories', (req, res) => {
  res.json(readJSON(CAT_FILE, defaultCategories))
})

app.put('/api/categories', (req, res) => {
  writeJSON(CAT_FILE, req.body)
  res.json({ ok: true })
})

// Stats API
app.get('/api/stats', (req, res) => {
  const records = readJSON(DATA_FILE, [])
  const income = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const expense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  const expenseByCategory = {}
  const incomeByCategory = {}
  records.forEach(r => {
    if (r.type === 'expense') expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + r.amount
    else incomeByCategory[r.category] = (incomeByCategory[r.category] || 0) + r.amount
  })

  const daily = {}
  records.forEach(r => {
    if (!daily[r.date]) daily[r.date] = { income: 0, expense: 0 }
    daily[r.date][r.type] += r.amount
  })

  res.json({ income, expense, balance: income - expense, expenseByCategory, incomeByCategory, daily })
})

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
})

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
})

app.listen(3001, () => {
  console.log('Server running at http://localhost:3001')
  console.log('Open http://localhost:3001 in your browser')
})
