<script setup lang="ts">
import { Award, BookOpen, Building2, CalendarDays, ChartColumn, CircleUserRound, ClipboardCheck, House, Languages, LayoutDashboard, MessageSquare, MessageSquarePlus, NotebookPen, Pencil, ScrollText, UserRound, Wrench } from '@lucide/vue'
import type { ModuleId, NavigationSection } from '../../navigation/modules'
defineProps<{ name: ModuleId | NavigationSection }>()
const icons = {
  home: House, learning: BookOpen, tools: Wrench, forum: MessageSquare, account: UserRound,
  practice: Pencil, 'wrong-questions': NotebookPen, exams: ClipboardCheck, results: ChartColumn,
  certifications: Award, organizations: Building2, events: CalendarDays, workbench: LayoutDashboard, gb2312: Languages, rules: ScrollText,
  profile: CircleUserRound, feedback: MessageSquarePlus,
}
</script>

<template>
  <component :is="icons[name]" :stroke-width="1.5" aria-hidden="true" />
</template>
