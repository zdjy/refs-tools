<template>
  <div>
    <n-grid :x-gap="24">
      <n-grid-item span="6">
        <n-card :bordered="false" size="small" class="proCard">
          <n-thing
            class="thing-cell"
            v-for="item in typeTabList"
            :key="item.key"
            :class="{ 'thing-cell-on': state.type === item.key }"
            @click="switchType(item)"
          >
            <template #header>{{ item.name }}</template>
            <template #description>{{ item.desc }}</template>
          </n-thing>
        </n-card>
      </n-grid-item>
      <n-grid-item span="18">
        <n-card :bordered="false" size="small" :title="state.typeTitle" class="proCard">
          <BasicSetting v-if="state.type === 1" />
          <RevealSetting v-if="state.type === 2" />
          <EmailSetting v-if="state.type === 3" />
        </n-card>
      </n-grid-item>
    </n-grid>
  </div>
</template>
<script lang="ts" setup>
  import { reactive } from 'vue';
  import BasicSetting from './BasicSetting.vue';
  import RevealSetting from './RevealSetting.vue';
  import EmailSetting from './EmailSetting.vue';

  const typeTabList = [
    {
      name: '基本设置',
      desc: '系统常规设置',
      key: 1,
    },
    {
      name: '显示设置',
      desc: '系统显示设置',
      key: 2,
    },
    {
      name: '邮件设置',
      desc: '系统邮件设置',
      key: 3,
    },
  ];

  const state = reactive({
    type: 1,
    typeTitle: '基本设置',
  });

  function switchType(e) {
    state.type = e.key;
    state.typeTitle = e.name;
  }
</script>
<style lang="less" scoped>
  .thing-cell {
    margin: 0 -16px 10px;
    padding: 5px 16px;

    &:hover {
      background: #F5F2EB;
      cursor: pointer;
    }
  }

  .thing-cell-on {
    background: #EBE4D8;
    color: #D83A1E;

    ::v-deep(.n-thing-main .n-thing-header .n-thing-header__title) {
      color: #D83A1E;
    }

    &:hover {
      background: #DDD4C5;
    }
  }
</style>
