<template>
  <a-card>
    <div style="display: flex; flex-direction: column">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        "
      >
        <!-- 左侧：纸张设置 + 缩放 + 旋转 -->
        <div style="display: flex; align-items: center; gap: 8px">
          <!-- 纸张设置 + 缩放控件（封装在 PaperToolbar 内）-->
          <PaperToolbar
            :template="template"
            :show-paper-type="false"
            :show-scale="true"
            :show-clear="false"
            :default-custom-paper="{ width: 220, height: 80 }"
            :scale-with-center="false"
          />
          <a-button type="primary" @click="rotatePaper()"
            ><template #icon><redo-outlined /></template>旋转</a-button
          >
        </div>
        <!-- 右侧：预览 / 清空 / JSON / 更多 -->
        <div style="display: flex; align-items: center; gap: 8px">
          <a-button type="primary" @click="preView">
            <template #icon><eye-outlined /></template>
            预览
          </a-button>
          <a-popconfirm
            title="是否确认清空?"
            okType="danger"
            okText="确定清空"
            @confirm="clearPaper"
          >
            <template #icon
              ><question-circle-outlined style="color: red"
            /></template>
            <a-button danger>
              清空
              <template #icon><close-outlined /></template>
            </a-button>
          </a-popconfirm>
          <json-view :template="template" />
          <a-dropdown>
            <template #overlay>
              <a-menu @click="handleMenuClick">
                <a-menu-item key="0">都不看,我就不看</a-menu-item>
                <a-menu-item v-for="item in keyList" :key="item.key">
                  {{ item.name }}</a-menu-item
                >
              </a-menu>
            </template>
            <a-button>
              更多功能示例
              <template #icon><down-outlined /></template>
            </a-button>
          </a-dropdown>
        </div>
      </div>
      <a-space v-if="'1' == curKey" style="margin-bottom: 10px">
        <div class="btn-text-desc">直接打印/api打印:</div>
        <a-button type="primary" @click="print">
          <template #icon><printer-outlined /></template>
          直接打印
        </a-button>
        <a-button type="primary" @click="printByFragments">
          <template #icon><printer-outlined /></template>
          分批直接打印
        </a-button>
        <a-button type="primary" @click="onlyPrint"> Api单独打印 </a-button>
        <a-button type="primary" @click="onlyPrint2">
          Api单独直接打印
        </a-button>
      </a-space>
      <a-space v-if="'2' == curKey" style="margin-bottom: 10px">
        <div class="btn-text-desc">导出PDF文件/流:</div>
        <a-button type="primary" @click="exportPdf('')">
          导出获取pdf(Blob)
        </a-button>
        <a-button type="primary" @click="exportPdf('arraybuffer')">
          导出获取pdf(ArrayBuffer)
        </a-button>
        <a-button type="primary" @click="exportPdf('dataurl')">
          导出获取pdf(DataUrl)
        </a-button>
        <a-button type="primary" @click="exportPdf('bloburl')">
          导出获取pdf(BlobUrl)
        </a-button>
        <a-button type="primary" @click="exportPdf('dataurlstring')">
          导出获取pdf(DataUrlString)
        </a-button>
        <a-button type="primary" @click="exportPdf('pdfobjectnewwindow')">
          导出查看pdf(PdfObjectNewWindow)
        </a-button>
      </a-space>
      <a-space v-if="'3' == curKey" style="margin-bottom: 10px">
        <div class="btn-text-desc">ipp打印(需打印机支持):</div>
        <a-button type="primary" @click="ippPrintAttr">
          ipp获取 打印机 参数情况
        </a-button>
        <a-button type="primary" @click="ippPrintTest"> ipp打印测试 </a-button>
        <a-button type="primary" @click="ippRequestTest">
          ipp请求 获取 打印机 参数情况
        </a-button>
        <a-button type="primary" @click="ippRequestPrint">
          ipp请求 打印测试
        </a-button>
      </a-space>
      <a-space v-if="'4' == curKey" style="margin-bottom: 10px">
        <div class="btn-text-desc">元素参数操作:</div>
        <a-button type="primary" @click="setOptionConfig(-1)">
          测试隐藏参数[看代码]
        </a-button>
        <a-button type="primary" @click="setOptionConfig(1)">
          隐藏[文本] "边框"、"高级"
        </a-button>
        <a-button type="primary" @click="setOptionConfig(2)">
          [图片]不分组
        </a-button>
        <a-button type="primary" @click="setOptionConfig(3)">
          重写[文本] "字体大小"、"元素层级"
        </a-button>
        <a-button type="primary" @click="setOptionConfig(4)">
          [文本]新增 "缩放"
        </a-button>
        <a-button type="primary" @click="setOptionConfig(0)">
          还原配置
        </a-button>
      </a-space>
      <a-space v-if="'5' == curKey" style="margin-bottom: 10px">
        <div class="btn-text-desc">模板导入导出:</div>
        <a-textarea
          style="width: 30vw"
          v-model:value="jsonIn"
          @pressEnter="updateJson"
          placeholder="复制json模板到此后 点击右侧更新"
          allow-clear
        />
        <a-button type="primary" @click="updateJson"> 更新json模板 </a-button>
        <a-button type="primary" @click="exportJson">
          导出json模板到 textArea
        </a-button>
        <a-textarea
          style="width: 30vw"
          v-model:value="jsonOut"
          placeholder="点击左侧导出json"
          allow-clear
        />
      </a-space>
      <a-space v-if="'6' == curKey" style="margin-bottom: 10px">
        <div class="btn-text-desc">元素获取/更新参数:</div>
        <a-button type="primary" @click="getSelectEls"> 获取选中元素 </a-button>
        <a-button type="primary" @click="setEleSelectByField">
          设置根据field选中文本元素
        </a-button>

        <a-button type="primary" @click="updateFontSize">
          选中元素字体12pt
        </a-button>
        <a-button type="primary" @click="updateFontWeight">
          选中元素字体Bolder
        </a-button>
      </a-space>
      <a-space v-if="'7' == curKey" style="margin-bottom: 10px">
        <div class="btn-text-desc">元素对齐/间距(需先选中):</div>
        <a-button type="primary" @click="setElsSpace(true)">
          水平间距10
        </a-button>
        <a-button type="primary" @click="setElsSpace(false)">
          垂直间距10
        </a-button>
        <a-radio-group>
          <a-radio-button @click="setElsAlign('left')" title="左对齐">
            <span class="glyphicon glyphicon-object-align-left"></span>
          </a-radio-button>
          <a-radio-button @click="setElsAlign('vertical')" title="居中">
            <span class="glyphicon glyphicon-object-align-vertical"></span>
          </a-radio-button>
          <a-radio-button @click="setElsAlign('right')" title="右对齐">
            <span class="glyphicon glyphicon-object-align-right"></span>
          </a-radio-button>
          <a-radio-button @click="setElsAlign('top')" title="顶部对齐">
            <span class="glyphicon glyphicon-object-align-top"></span>
          </a-radio-button>
          <a-radio-button @click="setElsAlign('horizontal')" title="垂直居中">
            <span class="glyphicon glyphicon-object-align-horizontal"></span>
          </a-radio-button>
          <a-radio-button @click="setElsAlign('bottom')" title="底部对齐">
            <span class="glyphicon glyphicon-object-align-bottom"></span>
          </a-radio-button>
          <a-radio-button
            @click="setElsAlign('distributeHor')"
            title="横向分散"
          >
            <span class="glyphicon glyphicon-resize-horizontal"></span>
          </a-radio-button>
          <a-radio-button
            @click="setElsAlign('distributeVer')"
            title="纵向分散"
          >
            <span class="glyphicon glyphicon-resize-vertical"></span>
          </a-radio-button>
        </a-radio-group>
      </a-space>
    </div>
    <a-row :gutter="[8, 0]">
      <a-col :span="4">
        <a-card style="height: 100vh">
          <a-row>
            <a-col
              :span="24"
              class="rect-printElement-types hiprintEpContainer"
            >
              <a-row class="drag_item_title">拖拽组件列表</a-row>
              <a-row style="height: 100px">
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.text" style>
                      <span
                        class="glyphicon glyphicon-text-width"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">文本</p>
                    </a>
                  </div>
                </a-col>
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.image" style>
                      <span
                        class="glyphicon glyphicon-picture"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">图片</p>
                    </a>
                  </div>
                </a-col>
              </a-row>
              <a-row style="height: 100px">
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.longText">
                      <span
                        class="glyphicon glyphicon-subscript"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">长文</p>
                    </a>
                  </div>
                </a-col>
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.table" style>
                      <span
                        class="glyphicon glyphicon-th"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">表格</p>
                    </a>
                  </div>
                </a-col>
              </a-row>
              <a-row style="height: 100px">
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a
                      class="ep-draggable-item"
                      tid="defaultModule.emptyTable"
                      style
                    >
                      <span
                        class="glyphicon glyphicon-th"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">空白表格</p>
                    </a>
                  </div>
                </a-col>
              </a-row>
              <a-row style="height: 100px">
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.html" style="">
                      <span
                        class="glyphicon glyphicon-header"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">html</p>
                    </a>
                  </div>
                </a-col>
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a
                      class="ep-draggable-item"
                      tid="defaultModule.customText"
                      style
                    >
                      <span
                        class="glyphicon glyphicon-text-width"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">自定义</p>
                    </a>
                  </div>
                </a-col>
              </a-row>
              <a-row class="drag_item_title">辅助</a-row>
              <a-row style="height: 100px">
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a
                      class="ep-draggable-item"
                      tid="defaultModule.hline"
                      style
                    >
                      <span
                        class="glyphicon glyphicon-resize-horizontal"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">横线</p>
                    </a>
                  </div>
                </a-col>
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a
                      class="ep-draggable-item"
                      tid="defaultModule.vline"
                      style
                    >
                      <span
                        class="glyphicon glyphicon-resize-vertical"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">竖线</p>
                    </a>
                  </div>
                </a-col>
              </a-row>
              <a-row style="height: 100px">
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.rect">
                      <span
                        class="glyphicon glyphicon-unchecked"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">矩形</p>
                    </a>
                  </div>
                </a-col>
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.oval">
                      <span
                        class="glyphicon glyphicon-record"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">椭圆</p>
                    </a>
                  </div>
                </a-col>
              </a-row>
              <a-row v-if="true" style="height: 100px">
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.barcode">
                      <span
                        class="glyphicon glyphicon-barcode"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">条形码</p>
                    </a>
                  </div>
                </a-col>
                <a-col :span="12" class="drag_item_box">
                  <div>
                    <a class="ep-draggable-item" tid="defaultModule.qrcode">
                      <span
                        class="glyphicon glyphicon-qrcode"
                        aria-hidden="true"
                      ></span>
                      <p class="glyphicon-class">二维码</p>
                    </a>
                  </div>
                </a-col>
              </a-row>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
      <a-col :span="15">
        <a-card class="card-design">
          <div id="hiprint-printTemplate" class="hiprint-printTemplate"></div>
        </a-card>
      </a-col>
      <a-col :span="5" class="params_setting_container">
        <a-card>
          <a-row class="hinnn-layout-sider">
            <div id="PrintElementOptionSetting"></div>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
    <!-- 预览 -->
    <PrintPreviewModal ref="preViewRef" />
  </a-card>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import { Modal, message } from "ant-design-vue";
import { useHiprint, hiprint, defaultElementTypeProvider } from "../../index";
import printData from "./print-data";
import PrintPreviewModal from "../components/PreviewModal.vue";
import PaperToolbar from "../components/PaperToolbar.vue";
import jsonView from "../json-view.vue";
import fontSize from "./font-size.js";
import scale from "./scale.js";

defineOptions({ name: "printDesign" });

// 数据（原 data()）
const curPaper = ref({
  type: "A4",
  width: 210,
  height: 296.6,
});
const paperTypes = ref({
  A3: { width: 420, height: 296.6 },
  A4: { width: 210, height: 296.6 },
  A5: { width: 210, height: 147.6 },
  B3: { width: 500, height: 352.6 },
  B4: { width: 250, height: 352.6 },
  B5: { width: 250, height: 175.6 },
});
const paperPopVisible = ref(false);
const paperWidth = ref(220);
const paperHeight = ref(80);
const scaleValue = ref(1);
const scaleMax = ref(5);
const scaleMin = ref(0.5);
const jsonIn = ref("");
const jsonOut = ref("");
const curKey = ref("");
const keyList = ref([
  { key: 1, name: "直接打印/api打印" },
  { key: 2, name: "导出PDF文件/流" },
  { key: 3, name: "ipp打印(需打印机支持)" },
  { key: 4, name: "元素参数操作" },
  { key: 5, name: "模板导入导出" },
  { key: 6, name: "元素获取/更新参数" },
  { key: 7, name: "元素对齐/间距(需先选中)" },
]);

// module-level: panel 由 getPanel 加载
let panel;

// useHiprint 一站式 hook（templateOptions 含 design 特有的 PrintTemplate 选项）
const {
  template,
  build,
  clear,
  guard,
} = useHiprint({
  designOptions: { grid: true },
  templateOptions: {
    onImageChooseClick: (target) => {
      setTimeout(() => {
        target.refresh(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAAIIAQMAAAB99EudAAAABlBMVEUmf8vG2O41LStnAAABD0lEQVR42u3XQQqCQBSAYcWFS4/QUTpaHa2jdISWLUJjjMpclJoPGvq+1WsYfiJCZ4oCAAAAAAAAAAAAAAAAAHin6pL9c6H/fOzHbRrP0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0u/SY9LS0tLS0tLS0tLS0n+edm+UlpaWlpaWlpaWlpaW/tl0Ndyzbno7/+tPTJdd1wal69dNa6abx+Lq6TSeYtK7BX/Diek0XULSZZrakPRtV0i6Hu/KIt30q4fM0pvBqvR9mvsQkZaW9gyJT+f5lsnzjR54xAk8mAUeJyMPwYFH98ALx5Jr0kRLLndT7b64UX9QR/0eAAAAAAAAAAAAAAAAAAD/4gpryzr/bja4QgAAAABJRU5ErkJggg==",
          { real: true },
        );
      }, 3000);
    },
    fontList: [
      { title: "微软雅黑", value: "Microsoft YaHei" },
      { title: "黑体", value: "STHeitiSC-Light" },
      { title: "思源黑体", value: "SourceHanSansCN-Normal" },
      { title: "王羲之书法体", value: "王羲之书法体" },
      { title: "宋体", value: "SimSun" },
      { title: "华为楷体", value: "STKaiti" },
      { title: "cursive", value: "cursive" },
    ],
    dataMode: 1,
    history: true,
    willOutOfBounds: true,
    qtDesigner: true,
    onDataChanged: (type, json) => {
      console.log(type);
      console.log(json);
    },
    onUpdateError: (e) => {
      console.log(e);
    },
  },
  onGuardFail: () => Modal.error({
    title: "客户端未连接",
    content: "请先下载并运行 electron-hiprint 打印服务（详见 README 中的 electron-hiprint 章节）。",
    okText: "我知道了",
  }),
});

// 预览 modal ref
const preViewRef = ref(null);

// plugin 注入的 $print / $print2（main.js 装了 hiPrintPlugin），script setup 里通过 instance proxy 调
const { proxy } = getCurrentInstance();

// 计算属性
const curPaperType = computed(() => {
  let type = "other";
  const types = paperTypes.value;
  for (const key in types) {
    let item = types[key];
    let { width, height } = curPaper.value;
    if (item.width === width && item.height === height) {
      type = key;
    }
  }
  return type;
});

// 加载 panel
function getPanel() {
  const panelModules = import.meta.glob("./*panel*.js", { eager: true });
  panel = panelModules["./panel.js"].default;
}

// 初始化 hiprint 引擎
function init() {
  hiprint.init({ providers: [new defaultElementTypeProvider()] });
  hiprint.setConfig();
  hiprint.PrintElementTypeManager.buildByHtml($(".ep-draggable-item"));
  build(panel);
  console.log(template.value);
  scaleValue.value = template.value?.editingPanel?.scale || 1;
}

onMounted(() => {
  getPanel();
  init();
});

function setOptionConfig(type) {
  switch (type) {
    case -1:
      hiprint.setConfig({
        movingDistance: 2.5,
        text: {
          tabs: [
            {
              options: [
                {
                  name: "fixed",
                  hidden: true,
                },
              ],
            },
          ],
          supportOptions: [
            { name: "styler", hidden: true },
            { name: "formatter", hidden: true },
          ],
        },
        image: {
          tabs: [
            {
              replace: true,
              name: "基本",
              options: [
                { name: "field", hidden: false },
                { name: "src", hidden: false },
                { name: "fit", hidden: false },
              ],
            },
          ],
        },
      });
      hiprint.setConfig({
        movingDistance: 2.5,
        text: {
          tabs: [
            {
              options: [{ name: "fixed", hidden: true }],
            },
          ],
          supportOptions: [
            { name: "styler", hidden: true },
            { name: "formatter", hidden: true },
          ],
        },
        image: {
          tabs: [
            {
              replace: true,
              name: "基本",
              options: [
                { name: "field", hidden: false },
                { name: "src", hidden: false },
                { name: "fit", hidden: false },
              ],
            },
          ],
        },
      });
      break;
    case 0:
      hiprint.setConfig();
      break;
    case 1:
      hiprint.setConfig({
        text: {
          tabs: [
            {},
            {},
            { name: "边框", replace: true, options: [] },
            { name: "高级", replace: true, options: [] },
          ],
        },
      });
      break;
    case 2:
      hiprint.setConfig({
        image: { tabs: [], supportOptions: [] },
      });
      break;
    case 3:
      hiprint.setConfig({
        optionItems: [
          fontSize,
          (function () {
            function t() {
              this.name = "zIndex";
            }
            t.prototype.css = function (t, e) {
              if (t && t.length) {
                if (e) return t.css("z-index", e);
              }
              return null;
            };
            t.prototype.createTarget = function () {
              this.target = $(
                '<div class="hiprint-option-item">\n        <div class="hiprint-option-item-label">\n        元素层级2\n        </div>\n        <div class="hiprint-option-item-field">\n        <input type="number" class="auto-submit"/>\n        </div>\n    </div>',
              );
              return this.target;
            };
            t.prototype.getValue = function () {
              var t = this.target.find("input").val();
              if (t) return parseInt(t.toString());
            };
            t.prototype.setValue = function (t) {
              this.target.find("input").val(t);
            };
            t.prototype.destroy = function () {
              this.target.remove();
            };
            return t;
          })(),
        ],
      });
      break;
    case 4:
      hiprint.setConfig({
        optionItems: [scale],
        movingDistance: 2.5,
        text: {
          tabs: [
            {},
            {
              name: "样式",
              options: [
                {
                  name: "scale",
                  after: "transform",
                  hidden: false,
                },
              ],
            },
          ],
        },
      });
      break;
  }
  console.log(template.value);
  template.value?.editingPanel?.printElements?.forEach((e) => {
    if (e._printElementOptionTabs) delete e._printElementOptionTabs;
    if (e._printElementOptionItems) delete e._printElementOptionItems;
  });
  const els = template.value?.getSelectEls();
  els && els.length && els[0].designTarget.trigger($.Event("click"));
}

function setPaper(type, value) {
  try {
    if (Object.keys(paperTypes.value).includes(type)) {
      curPaper.value = { type, width: value.width, height: value.height };
    } else {
      curPaper.value = { type: "other", width: value.width, height: value.height };
    }
    template.value?.setPaper(value.width, value.height);
  } catch (error) {
    message.error(`操作失败: ${error}`)
  }
}

function otherPaper() {
  const value = { width: paperWidth.value, height: paperHeight.value };
  paperPopVisible.value = false;
  setPaper("other", value);
}

function changeScale(big) {
  let v = scaleValue.value;
  if (big) {
    v += 0.1;
    if (v > scaleMax.value) v = 5;
  } else {
    v -= 0.1;
    if (v < scaleMin.value) v = 0.5;
  }
  if (template.value) {
    template.value.zoom(v);
    scaleValue.value = v;
  }
}

function rotatePaper() {
  template.value?.rotatePaper();
}

function preView() {
  hiprint.updateElementType("defaultModule.text", (type) => {
    type.title = "这是更新后的元素";
    return type;
  });
  hiprint.refreshPrinterList((list) => {
    console.log("refreshPrinterList");
    console.log(list);
  });
  hiprint.getAddress("ip", (data) => console.log("ip", data));
  hiprint.getAddress("ipv6", (data) => console.log("ipv6", data));
  hiprint.getAddress("mac", (data) => console.log("mac", data));
  hiprint.getAddress("dns", (data) => console.log("dns", data));
  hiprint.getAddress("all", (data) => console.log("all", data));
  hiprint.getAddress(
    "interface",
    (data) => console.log("interface", data),
    "IPv4",
    "eth1",
  );
  preViewRef.value?.show(template.value, printData);
}

function onlyPrint() {
  proxy.$print(undefined, panel, printData, {}, {
    styleHandler: () => {
      let css = '<link href="http://hiprint.io/Content/hiprint/css/print-lock.css" media="print" rel="stylesheet">';
      return css;
    },
  });
  console.log(template.value);
}

function onlyPrint2() {
  guard.run(() => {
    const localTpl = proxy.$print2(undefined, panel, printData, {
      printer: "",
      title: "Api单独打印",
      styleHandler: () => {
        let css = "<style>.hiprint-printElement-text{color:red !important;}</style>";
        return css;
      },
    });
    const key = "Api单独直接打印";
    localTpl.on("printSuccess", () => {
      Modal.success({
        key,
        placement: "topRight",
        message: key + " 打印成功",
        description: "Api单独直接打印回调",
      });
    });
  });
}

function handleMenuClick(e) {
  curKey.value = e.key;
}

function print() {
  guard.run(() => {
    const printerList = template.value?.getPrinterList();
    console.log(printerList);
    template.value?.print2(printData, { printer: "", title: "hiprint测试打印" });
  });
}

function printByFragments() {
  guard.run(() => {
    const dataList = new Array(50).fill(printData);
    template.value?.print2(dataList, {
      printer: "",
      title: "hiprint测试打印",
      printByFragments: true,
    });
  });
}

function clearPaper() {
  clear();
}

function exportPdf(type) {
  template.value?.toPdf(printData, "测试导出pdf", { isDownload: false, type }).then((res) => {
    console.log("type:", type);
    console.log(res);
  });
}

function ippPrintAttr() {
  const printerList = template.value?.getPrinterList();
  console.log(printerList);
  if (!printerList?.length) return;
  const p = printerList[0];
  console.log(p);
  const url = p.options["printer-uri-supported"];
  hiprint.ippPrint(
    {
      url,
      opt: {},
      action: "Get-Printer-Attributes",
      message: null,
    },
    (res) => console.log(res),
    (printer) => console.log(printer),
  );
}

function ippPrintTest() {
  const printerList = template.value?.getPrinterList();
  console.log(printerList);
  if (!printerList?.length) return;
  const p = printerList[0];
  console.log(p);
  const url = p.options["printer-uri-supported"];
  hiprint.ippPrint(
    {
      url,
      opt: {},
      action: "Print-Job",
      message: {
        "operation-attributes-tag": {
          "requesting-user-name": "hiPrint",
          "job-name": "ipp Test Job",
          "document-format": "text/plain",
        },
        data: "test test test test test test test",
        encoding: "utf-8",
      },
    },
    (res) => console.log(res),
    (printer) => console.log(printer),
  );
}

function ippRequestTest() {
  const printerList = template.value?.getPrinterList();
  console.log(printerList);
  if (!printerList?.length) return;
  const p = printerList[0];
  console.log(p);
  const url = p.options["printer-uri-supported"];
  hiprint.ippRequest(
    {
      url,
      data: {
        operation: "Get-Printer-Attributes",
        "operation-attributes-tag": {
          "attributes-charset": "utf-8",
          "attributes-natural-language": "zh-cn",
          "printer-uri": url,
        },
      },
    },
    (res) => console.log(res),
  );
}

function ippRequestPrint() {
  const printerList = template.value?.getPrinterList();
  console.log(printerList);
  if (!printerList?.length) return;
  const p = printerList[0];
  console.log(p);
  const url = p.options["printer-uri-supported"];
  const str = "ippRequestPrint ippRequestPrint ippRequestPrint";
  const array = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    array[i] = str.charCodeAt(i);
  }
  const testData = array.buffer;
  hiprint.ippRequest(
    {
      url,
      data: {
        operation: "Print-Job",
        "operation-attributes-tag": {
          "attributes-charset": "utf-8",
          "attributes-natural-language": "zh-cn",
          "printer-uri": url,
          "requesting-user-name": "hiPrint",
          "job-name": "ipp Request Job",
          "document-format": "text/plain",
        },
        data: testData,
      },
    },
    (res) => console.log(res),
  );
}

function updateJson() {
  if (!template.value) return;
  try {
    template.value.update(JSON.parse(jsonIn.value));
  } catch (e) {
    message.error(`更新失败: ${e}`);
  }
}

function exportJson() {
  if (template.value) {
    jsonOut.value = JSON.stringify(template.value.getJson() || {});
  }
}

function setElsAlign(e) {
  template.value?.setElsAlign(e);
}

function setElsSpace(h) {
  template.value?.setElsSpace(10, h);
}

function setEleSelectByField() {
  template.value?.selectElementsByField(["name"]);
}

function getSelectEls() {
  const els = template.value?.getSelectEls();
  console.log(els);
}

function updateFontSize() {
  template.value?.updateOption("fontSize", 12);
}

function updateFontWeight() {
  template.value?.updateOption("fontWeight", "bolder");
}
</script>

<style lang="scss" scoped>
.btn-text-desc {
  width: 12vw;
  text-align: right;
  white-space: nowrap;
  font-weight: 600;
  padding: 0 10px;
  border-left: 3px solid #1890ff;
  background: #fafafa;
  line-height: 32px;
  border-radius: 2px;
}

// 拖拽
.drag_item_box {
  height: 100%;
  padding: 6px;
}

.drag_item_box > div {
  height: 100%;
  width: 100%;
  background-color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
}

.drag_item_box > div > a {
  text-align: center;
  text-decoration-line: none;
}

.drag_item_box > div > a > span {
  font-size: 28px;
}

.drag_item_box > div > a > p {
  margin: 0;
}

.drag_item_title {
  font-size: 16px;
  padding: 12px 6px 0 6px;
  font-weight: bold;
}

// 默认图片
:deep(.hiprint-printElement-image-content) {
  img {
    content: url("@/assets/logo.png");
  }
}

// 辅助线样式
:deep(.toplineOfPosition) {
  border: 0;
  border-top: 1px dashed purple;
}

:deep(.bottomlineOfPosition) {
  border: 0;
  border-top: 1px dashed purple;
}

:deep(.leftlineOfPosition) {
  border: 0;
  border-left: 1px dashed purple;
}

:deep(.rightlineOfPosition) {
  border: 0;
  border-left: 1px dashed purple;
}

// 设计容器
.card-design {
  overflow: hidden;
  overflow-x: auto;
  overflow-y: auto;
}
</style>