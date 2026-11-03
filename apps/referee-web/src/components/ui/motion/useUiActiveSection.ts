import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * 跟踪正文中最接近视口上缘的章节，用于目录高亮。
 * 只表达阅读位置，不写入 URL，也不保存任何阅读进度。
 */
export function useUiActiveSection(ids: Ref<readonly string[]>) {
  const active = ref('')
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    active.value = ids.value[0] ?? ''
    if (typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
      if (visible.length) active.value = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]!.target.id
    }, { rootMargin: '-15% 0px -70% 0px' })
    for (const id of ids.value) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
  })
  onBeforeUnmount(() => observer?.disconnect())
  return active
}
