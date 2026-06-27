<template>
  <div class="app">
    <header class="header">
      <h1>简单记账</h1>
      <nav class="nav">
        <router-link to="/records">记账</router-link>
        <router-link to="/stats">统计</router-link>
        <router-link to="/categories">分类</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>

    <Teleport to="body">
      <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]">
        <span>{{ toast.message }}</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { provide, reactive } from 'vue'

const toast = reactive({ show: false, message: '', type: 'info' })
let toastTimer = null

function showToast(message, type = 'info', duration = 2500) {
  clearTimeout(toastTimer)
  toast.show = true
  toast.message = message
  toast.type = type
  toastTimer = setTimeout(() => { toast.show = false }, duration)
}

provide('showToast', showToast)
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; -webkit-font-smoothing: antialiased; }
.app { max-width: 800px; margin: 0 auto; padding: 12px; }
.header { background: #fff; border-radius: 12px; padding: 12px 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); display: flex; align-items: center; justify-content: space-between; }
.header h1 { font-size: 18px; font-weight: 700; }
.nav { display: flex; gap: 4px; }
.nav a { text-decoration: none; padding: 6px 14px; border-radius: 8px; color: #666; font-size: 14px; font-weight: 500; transition: all .2s; }
.nav a:hover { background: #f0f0f0; }
.nav a.router-link-exact-active { background: #4f46e5; color: #fff; }
.main { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); min-height: calc(100vh - 100px); }
.btn { display: inline-flex; align-items: center; gap: 4px; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all .2s; white-space: nowrap; }
.btn:active { transform: scale(.97); }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-primary:hover { background: #4338ca; }
.btn-success { background: #10b981; color: #fff; }
.btn-success:hover { background: #059669; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }
.btn-outline { background: transparent; color: #666; border: 1px solid #ddd; }
.btn-outline:hover { background: #f5f5f5; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-xs { padding: 2px 8px; font-size: 11px; border-radius: 6px; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn:disabled:active { transform: none; }
input, select, textarea { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: border .2s, box-shadow .2s; }
input:focus, select:focus, textarea:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
.toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,.15); animation: toastIn .25s ease; }
.toast-info { background: #1f2937; color: #fff; }
.toast-success { background: #059669; color: #fff; }
.toast-error { background: #dc2626; color: #fff; }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.loading { text-align: center; padding: 40px 0; color: #999; font-size: 14px; }
.empty { text-align: center; padding: 40px 0; color: #999; font-size: 14px; }
.text-right { text-align: right; }
.ml-auto { margin-left: auto; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
</style>
