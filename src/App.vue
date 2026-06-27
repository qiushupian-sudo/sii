<template>
  <div class="app">
    <header class="header">
      <h1>📒 简单记账</h1>
      <nav class="nav">
        <router-link to="/records" :class="{ active: $route.path === '/records' }">记账</router-link>
        <router-link to="/stats" :class="{ active: $route.path === '/stats' }">统计</router-link>
        <router-link to="/categories" :class="{ active: $route.path === '/categories' }">分类</router-link>
      </nav>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
.app { max-width: 800px; margin: 0 auto; padding: 16px; }
.header { background: #fff; border-radius: 12px; padding: 16px 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); display: flex; align-items: center; justify-content: space-between; }
.header h1 { font-size: 20px; }
.nav { display: flex; gap: 8px; }
.nav a { text-decoration: none; padding: 6px 16px; border-radius: 8px; color: #666; font-size: 14px; transition: all .2s; }
.nav a:hover { background: #f0f0f0; }
.nav a.active { background: #4f46e5; color: #fff; }
.main { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.1); min-height: 400px; }
.btn { display: inline-flex; align-items: center; gap: 4px; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all .2s; }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-primary:hover { background: #4338ca; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
input, select, textarea { padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: border .2s; }
input:focus, select:focus, textarea:focus { border-color: #4f46e5; }
</style>
