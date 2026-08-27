<template>
  <a-row :gutter="[8, 0]">
    <a-col :span="4">
      <a-card style="height: 100vh">
        <a-row>
          <a-col :span="24" class="rect-printElement-types hiprintEpContainer">
            <slot name="left" />
          </a-col>
        </a-row>
      </a-card>
    </a-col>
    <a-col :span="14">
      <a-card class="card-design">
        <div
          id="hiprint-printTemplate"
          class="hiprint-printTemplate"
        ></div>
      </a-card>
    </a-col>
    <a-col :span="6" class="params_setting_container">
      <a-card>
        <a-row class="hinnn-layout-sider">
          <slot name="right" />
        </a-row>
      </a-card>
    </a-col>
  </a-row>
</template>

<script>
// panels / tasks / custom 三处字符级重复的三栏布局。
// 提供 left / right slot；中间栏 id="hiprint-printTemplate" 固定不变，
// 由 hiprint.bundle.js 内置构造器定位设计画布。
export default {
  name: 'PrintLayout'
}
</script>

<style lang="scss" scoped>
// 拖拽项配色（原本 3 demo 各自 scoped 块）
:deep(.hiprint-printElement-type > li > ul > li > a) {
  padding: 4px 4px;
  color: #1296db;
  line-height: 1;
  height: auto;
  text-overflow: ellipsis;
}

// 设计容器溢出处理
.card-design {
  overflow: hidden;
  overflow-x: auto;
  overflow-y: auto;
}
</style>
