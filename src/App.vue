<template>
  <div id="app">
    <a-space class="logos" style="float: left">
      <img src="./assets/logo.png" />
      <img src="./assets/hi.png" />
      <div>期待大家的参与😁</div>
    </a-space>
    <a-row class="menus">
      <a-button-group>
        <template v-for="demo in demoList" :key="demo.name">
          <a-button
            :type="demo.name === curDemo ? 'primary' : 'default'"
            @click="curDemo = demo.name"
          >
            {{ demo.title }}
          </a-button>
        </template>
      </a-button-group>
      <div style="margin-left: 20px" />
      <a-button
        style="width: 200px; font-size: 16px"
        :type="'templates' === curDemo ? 'primary' : 'default'"
        @click="curDemo = 'templates'"
      >
        <template #icon><file-search-outlined /></template>
        模 板 中 心
      </a-button>
    </a-row>
    <!-- 动态渲染组件，懒得去弄路由了 -->
    <keep-alive>
      <component :is="curDemo" />
    </keep-alive>
  </div>
</template>

<script>
import printDesign from "@/demo/design/index";
import printCustom from "@/demo/custom/index";
import printTasks from "@/demo/tasks/index";
import printPanels from "@/demo/panels/index";
import templates from "@/demo/templates/index";

export default {
  name: "App",
  components: {
    printDesign,
    printCustom,
    printTasks,
    printPanels,
    templates,
  },
  data() {
    return {
      curDemo: "printDesign",
      demoList: [
        { name: "printDesign", title: "默认拖拽设计" },
        { name: "printCustom", title: "自定义设计" },
        { name: "printTasks", title: "队列/批量打印" },
        { name: "printPanels", title: "多面板设计" },
      ],
    };
  },
};
</script>

<style lang="scss">
.logos {
  padding: 6px 24px;
  display: flex;
  justify-content: center;
  align-self: center;

  img {
    height: 40px;
    width: 40px;
  }
}

.menus {
  padding: 10px 24px;
}

// hiprint 拖拽图片
.hiprint-printElement-image-content {
  img {
    content: url("@/assets/logo.png");
  }
}

// 修改 页眉/页脚线 样式
.hiprint-headerLine,
.hiprint-footerLine {
  border-color: red !important;
}

.hiprint-headerLine:hover,
.hiprint-footerLine:hover {
  border-top: 3px dashed red !important;
}

.hiprint-headerLine:hover:before {
  content: "页眉线";
  left: calc(50% - 18px);
  position: relative;
  background: #ffff;
  top: -12px;
  color: red;
  font-size: 12px;
}

.hiprint-footerLine:hover:before {
  content: "页脚线";
  left: calc(50% - 18px);
  position: relative;
  color: red;
  background: #ffff;
  top: -12px;
  font-size: 12px;
}
</style>