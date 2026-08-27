<template>
  <a-modal :visible="visible" :maskClosable="false"
           @cancel="hideModal" :width="width+'mm'">
    <a-spin :spinning="spinning" style="min-height: 100px">
      <div :id="containerId"></div>
    </a-spin>
    <template #title>
      <a-space>
        <div style="margin-right: 20px">打印预览</div>
        <a-button :loading="waitShowPrinter" type="primary" icon="printer" @click.stop="print">打印</a-button>
        <a-button type="primary" icon="printer" @click.stop="toPdf">pdf</a-button>
      </a-space>
    </template>
    <template #footer>
      <a-button key="close" type="default" @click="hideModal">
        关闭
      </a-button>
    </template>
  </a-modal>
</template>

<script>
// 从 4 份 preview.vue（design / panels / tasks / custom）合并而成：
// - DOM id 现在由实例唯一生成，不再硬编码 preview_content_xxx
// - pdfFileName + useTemplateData 控制 toPdf 的两个差异点
// - 调用方式与原 preview 兼容：parent 通过 ref 调 this.$refs.preView.show(tpl, data, width)
export default {
  name: "printPreview",
  props: {
    /** PDF 文件名 */
    pdfFileName: { type: String, default: '打印预览pdf' },
    /** 是否用 printData 作为 toPdf 数据（design demo 传 false：用 {}） */
    useTemplateData: { type: Boolean, default: true }
  },
  data() {
    return {
      visible: false,
      spinning: true,
      waitShowPrinter: false,
      // 纸张宽 mm
      width: 0,
      // 模板
      hiprintTemplate: {},
      // 数据
      printData: {},
      // 实例唯一 DOM id，避免 4 demo 同页时 id 冲突
      containerId: `printPreview_${Math.random().toString(36).slice(2, 10)}`
    }
  },
  methods: {
    hideModal() {
      this.visible = false
    },
    show(hiprintTemplate, printData, width = '210') {
      this.visible = true
      this.spinning = true
      this.width = hiprintTemplate.editingPanel ? hiprintTemplate.editingPanel.width : width
      this.hiprintTemplate = hiprintTemplate
      this.printData = printData
      setTimeout(() => {
        // eslint-disable-next-line no-undef
        $('#' + this.containerId).html(hiprintTemplate.getHtml(printData))
        this.spinning = false
      }, 500)
    },
    print() {
      this.waitShowPrinter = true
      this.hiprintTemplate.print(this.printData, {}, {
        callback: () => {
          this.waitShowPrinter = false
        }
      })
    },
    toPdf() {
      const data = this.useTemplateData ? this.printData : {}
      this.hiprintTemplate.toPdf(data, this.pdfFileName)
    }
  }
}
</script>

<style lang="scss" scoped>
:deep(.ant-modal-body) {
  padding: 0px;
}

:deep(.ant-modal-content) {
  margin-bottom: 24px;
}
</style>
