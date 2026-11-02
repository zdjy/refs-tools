<script setup lang="ts">
import { RouterLink } from 'vue-router'
defineProps<{ account?: boolean }>()
</script>

<template>
  <div class="auth-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/workbench"><span class="brand-mark" aria-hidden="true">R</span>裁判工具箱</RouterLink>
      <RouterLink class="auth-nav-link" to="/workbench">进入本地工作台</RouterLink>
    </header>
    <main id="auth-main" class="auth-layout">
      <section class="auth-intro" aria-labelledby="auth-intro-title">
        <div class="auth-facet" aria-hidden="true"></div>
        <div class="auth-intro-copy">
          <p class="auth-eyebrow">{{ account ? '账号与安全' : '篮球裁判综合工作台' }}</p>
          <h1 id="auth-intro-title">{{ account ? '专注场上，\n安心连接。' : '每一次判罚，\n从充分准备开始。' }}</h1>
          <p class="auth-intro-description">{{ account ? '在这里管理你的登录方式与会话，守护属于你的裁判档案。' : '用一个账号连接学习、考试与裁判履职，让场下的积累，成为场上的底气。' }}</p>
          <div class="auth-intro-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3 4 6v6c0 4 8 9 8 9s8-5 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/></svg>
            <p>你的账号，独立的访问边界。<br><span>个人材料与业务记录按授权范围访问。</span></p>
          </div>
        </div>
        <p class="auth-intro-footer">为裁判的每一份专业，做好准备。</p>
      </section>
      <section class="auth-content" :aria-label="account ? '账号管理' : '账号登录与注册'">
        <slot />
        <p class="auth-footnote">本地工作台无需登录即可使用。<br>比赛会话保存在当前设备，请注意共享设备上的数据安全。</p>
      </section>
    </main>
  </div>
</template>
