<template>
  <!-- 纸张类型 button-group（panels / tasks / custom 用；design 隐藏） -->
  <a-button-group v-if="showPaperType">
    <template v-for="(value, type) in paperTypesObj" :key="type">
      <a-button
        :type="curPaperType === type ? 'primary' : 'default'"
        @click="setPaper(type, value)"
      >
        {{ type }}
      </a-button>
    </template>
    <a-popover
      v-model:visible="paperPopVisible"
      title="设置纸张宽高(mm)"
      trigger="click"
    >
      <template #content>
        <div>
          <a-input-group compact style="margin: 10px 10px">
            <a-input-number
              v-model:value="paperWidth"
              style="width: 100px; text-align: center"
              placeholder="宽(mm)"
            />
            <a-input
              style="
                width: 30px;
                border-left: 0;
                pointer-events: none;
                background: #fff;
              "
              placeholder="~"
              disabled
            />
            <a-input-number
              v-model:value="paperHeight"
              style="width: 100px; text-align: center; border-left: 0"
              placeholder="高(mm)"
            />
          </a-input-group>
          <a-button
            type="primary"
            style="width: 100%"
            @click="otherPaper"
          >确定</a-button>
        </div>
      </template>
      <a-button :type="curPaperType === 'other' ? 'primary' : 'default'">
        自定义纸张
      </a-button>
    </a-popover>
  </a-button-group>

  <!-- 缩放控件（tasks 隐藏） -->
  <template v-if="showScale">
    <a-button
      type="text"
      icon="zoom-out"
      @click="changeScale(false)"
    ></a-button>
    <a-input-number
      :value="scale"
      :min="minScale"
      :max="maxScale"
      :step="0.1"
      disabled
      style="width: 70px"
      :formatter="(value) => `${(value * 100).toFixed(0)}%`"
      :parser="(value) => value.replace('%', '')"
    />
    <a-button
      type="text"
      icon="zoom-in"
      @click="changeScale(true)"
    ></a-button>
  </template>

  <!-- 清空 popconfirm（4 demo 都有） -->
  <a-popconfirm
    v-if="showClear"
    title="是否确认清空?"
    okType="danger"
    okText="确定清空"
    @confirm="$emit('clear')"
  >
    <template #icon>
      <question-circle-outlined style="color: red" />
    </template>
    <a-button danger>
      清空
      <template #icon><close-outlined /></template>
    </a-button>
  </a-popconfirm>
</template>

<script>
// 4 demo 的「自定义纸张 popover + 缩放 + 清空 popconfirm」统一封装。
// 调用方传入 markRaw 后的 hiprintTemplate 实例，避免被 Vue Proxy 响应式化破坏 jQuery 引用。
// 调用方清空逻辑通过 @clear 事件自行实现（保留 try/catch 与 $message.error）。
const paperTypes = {
  A3: { width: 420, height: 296.6 },
  A4: { width: 210, height: 296.6 },
  A5: { width: 210, height: 147.6 },
  B3: { width: 500, height: 352.6 },
  B4: { width: 250, height: 352.6 },
  B5: { width: 250, height: 175.6 }
}

export default {
  name: 'PaperToolbar',
  props: {
    /** hiprintTemplate 实例（必须由外部 markRaw） */
    template: { type: Object, required: true },
    showScale: { type: Boolean, default: true },
    showPaperType: { type: Boolean, default: true },
    showClear: { type: Boolean, default: true },
    initialScale: { type: Number, default: 1 },
    minScale: { type: Number, default: 0.5 },
    maxScale: { type: Number, default: 5 },
    /** zoom 第二参：true 让画布重新居中（design 不传，其他传） */
    scaleWithCenter: { type: Boolean, default: false },
    /** 自定义纸张初值；mounted 时自动应用 */
    defaultCustomPaper: {
      type: Object,
      default: () => ({ width: 210, height: 297 })
    }
  },
  emits: ['clear'],
  data() {
    return {
      paperPopVisible: false,
      paperWidth: this.defaultCustomPaper.width,
      paperHeight: this.defaultCustomPaper.height,
      curPaper: {
        type: 'A4',
        width: 210,
        height: 296.6
      },
      scale: this.initialScale
    }
  },
  computed: {
    paperTypesObj() {
      return paperTypes
    },
    curPaperType() {
      for (const key in paperTypes) {
        const item = paperTypes[key]
        if (item.width === this.curPaper.width && item.height === this.curPaper.height) {
          return key
        }
      }
      return 'other'
    }
  },
  mounted() {
    // 应用默认自定义纸张（保持原 demo 中 mounted 调 otherPaper 的行为）
    this.setPaper('other', {
      width: this.defaultCustomPaper.width,
      height: this.defaultCustomPaper.height
    })
  },
  methods: {
    setPaper(type, value) {
      if (Object.keys(paperTypes).includes(type)) {
        this.curPaper = { type, width: value.width, height: value.height }
      } else {
        this.curPaper = { type: 'other', width: value.width, height: value.height }
      }
      this.template?.setPaper(value.width, value.height)
    },
    otherPaper() {
      this.paperPopVisible = false
      this.setPaper('other', {
        width: this.paperWidth,
        height: this.paperHeight
      })
    },
    changeScale(big) {
      let v = this.scale + (big ? 0.1 : -0.1)
      if (v > this.maxScale) v = this.maxScale
      if (v < this.minScale) v = this.minScale
      this.scale = v
      this.template?.zoom(v, this.scaleWithCenter)
    }
  }
}
</script>
