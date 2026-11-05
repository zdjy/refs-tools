<script setup lang="ts">
import { useBackdropMotion } from './useBackdropMotion'

const { enabled } = useBackdropMotion()
</script>

<template>
  <!-- 背景装饰：半场线稿、投篮小球与裁判哨子。纯色描边，无渐变，不拦截指针，不进入无障碍树。
       性能：所有运动只改 transform / opacity（合成器线程），层用 contain 隔离，且避开毛玻璃侧栏。
       暂停时由 data-paused 冻结；系统开启「减弱动态效果」时运动元素直接不渲染。 -->
  <div aria-hidden="true" class="backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden tablet:left-56" :data-paused="!enabled">
    <div class="court">
      <svg viewBox="0 0 240 200" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" focusable="false">
        <rect x="80" y="2" width="80" height="110" />
        <path d="M84 112A36 36 0 0 0 156 112" />
        <path d="M84 112A36 36 0 0 1 156 112" stroke-dasharray="3 5" />
        <path d="M22 2V52A98 98 0 0 0 218 52V2" />
        <path d="M104 14H136" />
        <circle cx="120" cy="26" r="7" />
        <path d="M2 2H238" />
      </svg>
      <span class="ripple"></span>
      <span class="ball-x"><span class="ball-y"></span></span>
    </div>
    <div class="whistle">
      <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
        <path d="M60 4V22" />
        <circle cx="60" cy="30" r="8" />
        <path d="M24 56H84A22 22 0 1 1 84 100H56A32 32 0 0 1 24 68Z" />
        <circle cx="82" cy="78" r="9" />
        <path d="M24 56H8V68H24" />
      </svg>
      <span class="wave wave-1"></span><span class="wave wave-2"></span>
    </div>
  </div>
</template>

<style scoped>
/* 轨迹与时序只能用关键帧表达；颜色取自主题 token。contain 限定重绘与布局范围，will-change 提示合成层。 */
.backdrop { contain: layout paint style; }
.court, .whistle { position: absolute; color: var(--facet); will-change: transform; }
.court svg, .whistle svg { display: block; width: 100%; height: auto; }
.court { top: -2%; right: -6%; width: min(46vw, 620px); opacity: .55; }
.whistle { bottom: -3%; left: -2%; width: clamp(96px, 11vw, 150px); opacity: .55; transform-origin: 50% 3%; animation: whistle-blow 6s ease-in-out infinite; }
/* 篮筐在线稿坐标 (120, 26)/(240×200)：用百分比对齐，随整块缩放。 */
.ripple, .wave { position: absolute; border: 1.5px solid var(--accent); border-radius: 9999px; opacity: 0; will-change: transform, opacity; }
.ripple { left: 50%; top: 13%; width: 24px; height: 24px; margin: -12px 0 0 -12px; animation: ripple 9s ease-out infinite; }
/* 小球拆成两层：外层匀速水平移动，内层先快后慢地抬升再回落，合成抛物线而不用主线程的 offset-path。 */
.ball-x { position: absolute; left: 50%; top: 13%; width: 0; height: 0; opacity: 0; animation: ball-x 9s linear infinite; }
.ball-y { position: absolute; left: -7px; top: -7px; width: 14px; height: 14px; border-radius: 9999px; background: var(--accent); animation: ball-y 9s linear infinite; }
/* 哨声：两圈声波从哨口扩散，节奏与投篮错开。 */
.wave { left: 78%; top: 62%; width: 22px; height: 22px; margin: -11px 0 0 -11px; animation: wave 6s ease-out infinite; }
.wave-2 { animation-delay: .5s; }
@keyframes ball-x { 0% { transform: translate3d(-150px, 0, 0); opacity: 0; } 6% { opacity: .9; } 38% { transform: translate3d(0, 0, 0); opacity: .9; } 42%, 100% { transform: translate3d(0, 0, 0); opacity: 0; } }
@keyframes ball-y { 0% { transform: translate3d(0, 360px, 0); animation-timing-function: cubic-bezier(.2, .7, .3, 1); } 22% { transform: translate3d(0, -24px, 0); animation-timing-function: cubic-bezier(.6, 0, .8, .4); } 38%, 100% { transform: translate3d(0, 0, 0); } }
@keyframes ripple { 0%, 36% { transform: scale(.6); opacity: 0; } 38% { transform: scale(.6); opacity: .7; } 52%, 100% { transform: scale(2.4); opacity: 0; } }
/* 只在吹响时晃动（与声波同步），其余时间静止：持续运动的动画会让合成器每帧都出帧，间歇运动实测耗时更低。 */
@keyframes whistle-blow { 0%, 26%, 100% { transform: rotate(0); } 5% { transform: rotate(-8deg); } 11% { transform: rotate(7deg); } 17% { transform: rotate(-4deg); } 22% { transform: rotate(2deg); } }
@keyframes wave { 0%, 10% { transform: scale(.5); opacity: 0; } 14% { transform: scale(.5); opacity: .65; } 40%, 100% { transform: scale(2.6); opacity: 0; } }
.backdrop[data-paused='true'] * { animation-play-state: paused; }
.backdrop[data-paused='true'] .ball-x, .backdrop[data-paused='true'] .ripple, .backdrop[data-paused='true'] .wave { visibility: hidden; }
@media (prefers-reduced-motion: reduce) { .ball-x, .ripple, .wave { display: none; } .whistle { animation: none; } }
</style>
