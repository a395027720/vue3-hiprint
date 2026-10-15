import { computed, reactive, ref, watch } from "vue";
import type { Element, ElementType, Template } from "../core/types";
import { allElements, findElementGlobal } from "../core/schema";
import { mmToPx } from "../core/render";
import { snapValue } from "../utils/snap";

/** 框选矩形(屏幕像素坐标),null = 不在框选 */
export type MarqueeRect = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
  wMm: number;
  hMm: number;
};

export type ResizeDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** resize 最小尺寸 mm */
const MIN_SIZE_MM = 4;

/** 吸附阈值 1mm */
const SNAP_THRESHOLD_MM = 1;

export type SelfLines = { v: number[]; h: number[] };
export type SnapLines = { vertical: number[]; horizontal: number[] };

export type CanvasDragOptions = {
  /** 模板 ref(reactive)。composable 内部通过 .value 读 */
  template: () => Template;
  /** 单选 id */
  getSelectedId: () => string | null;
  /** 多选 id 列表(含主选) */
  getMultiSelectedIds: () => string[];
  /** 手型 pan 模式(空格 / 工具按钮) */
  getPanMode: () => boolean;
  /** 当前 zoom(1 = 100%) */
  getZoom: () => number;
  /** 当前 panX(由父级控制) */
  getPanX: () => number;
  /** 当前 panY */
  getPanY: () => number;
  /** 右键菜单是否打开(供 onWrapMouseDown 关闭) */
  isCtxMenuOpen: () => boolean;
  /** 关闭右键菜单回调 */
  onCloseCtx: () => void;
  /** 事件转发(emit) */
  onSelect: (id: string | null) => void;
  onSelectMany: (ids: string[]) => void;
  onSelectToggle: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onMoveMany: (updates: Array<{ id: string; x: number; y: number }>) => void;
  onResize: (
    id: string,
    patch: { x: number; y: number; w: number; h: number },
  ) => void;
  onRotate: (id: string, deg: number) => void;
  onPan: (dx: number, dy: number) => void;
};

/** 画布拖动 / 框选 / pan / 缩放(zoom) / 元素 resize / 旋转的统一 composable。
 *  集中管理:marquee(框选)、selfLines(延长线)、snapLines(吸附命中红线)。
 *  父级把 props 改成 getter 传入,composable 不依赖具体组件实例。 */
export function useCanvasDrag(opts: CanvasDragOptions) {
  // ===== 框选 / 多选 =====
  const marquee = ref<MarqueeRect | null>(null);
  const marqueeHits = ref<Set<string>>(new Set());
  /** 框选启动瞬间:防止 onDocMouseDown 同帧把多选清空 */
  const marqueeStarting = ref(false);

  const multiIds = computed<Set<string>>(
    () => new Set(opts.getMultiSelectedIds()),
  );
  function isMultiSelected(id: string): boolean {
    return multiIds.value.has(id);
  }

  const zoomValue = computed(() => opts.getZoom());
  const pxPerMmScreen = computed(() => mmToPx(1) * zoomValue.value);
  function mmToPxScaled(mm: number): number {
    return mmToPx(mm) * zoomValue.value;
  }

  // ===== 延长线 / 吸附线 =====
  const selfLines = ref<SelfLines | null>(null);
  const snapLines = reactive<SnapLines>({ vertical: [], horizontal: [] });

  /** 框选矩形的渲染样式:.marquee-rect 是 .canvas 的子元素,
   *  left/top 用 canvas 内的相对像素(屏幕 clientX - canvas.left) */
  const marqueeStyle = computed(() => {
    const m = marquee.value;
    if (!m) return {};
    const canvas = document.querySelector(".canvas") as HTMLElement | null;
    if (!canvas) return {};
    const cr = canvas.getBoundingClientRect();
    return {
      left: m.x1 - cr.left + "px",
      top: m.y1 - cr.top + "px",
      width: m.w + "px",
      height: m.h + "px",
    };
  });

  /** 元素在屏幕坐标系下的 AABB(已应用 zoom,未考虑 rotate) */
  function elScreenRect(
    el: Element,
  ): { left: number; top: number; right: number; bottom: number } | null {
    const canvas = document.querySelector(".canvas") as HTMLElement | null;
    if (!canvas) return null;
    const cr = canvas.getBoundingClientRect();
    const px = mmToPxScaled(el.w);
    const py = mmToPxScaled(el.h);
    return {
      left: cr.left + mmToPxScaled(el.x),
      top: cr.top + mmToPxScaled(el.y),
      right: cr.left + mmToPxScaled(el.x) + px,
      bottom: cr.top + mmToPxScaled(el.y) + py,
    };
  }

  /** 框选过程中实时算命中元素(每帧更新 marqueeHits) */
  watch(marquee, (m) => {
    if (!m) {
      marqueeHits.value = new Set();
      return;
    }
    const hits = new Set<string>();
    for (const el of allElements(opts.template())) {
      if (el.locked) continue;
      const r = elScreenRect(el);
      if (!r) continue;
      if (m.x1 <= r.right && m.x2 >= r.left && m.y1 <= r.bottom && m.y2 >= r.top) {
        hits.add(el.id);
      }
    }
    marqueeHits.value = hits;
  });

  // ===== 吸附候选收集 =====

  /** 收集某轴上的吸附候选(其它元素 4 边 + 画布 0/纸边) */
  function collectCandidates(axis: "x" | "y", excludeId: string): number[] {
    const tpl = opts.template();
    const list: number[] =
      axis === "x" ? [0, tpl.paper.width] : [0, tpl.paper.height];
    for (const e of allElements(tpl)) {
      if (e.id === excludeId) continue;
      if (axis === "x") list.push(e.x, e.x + e.w);
      else list.push(e.y, e.y + e.h);
    }
    return list;
  }

  /** 收集某轴上吸附候选,但可以排除一组 id(组拖动用) */
  function collectCandidatesForGroup(
    axis: "x" | "y",
    excludeIds: Set<string>,
  ): number[] {
    const tpl = opts.template();
    const list: number[] =
      axis === "x" ? [0, tpl.paper.width] : [0, tpl.paper.height];
    for (const e of allElements(tpl)) {
      if (excludeIds.has(e.id)) continue;
      if (axis === "x") list.push(e.x, e.x + e.w);
      else list.push(e.y, e.y + e.h);
    }
    return list;
  }

  // ===== wrap 鼠标 down:启动 pan 或 框选 =====
  function onWrapMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (e.shiftKey) return;
    // 落在 ctx 菜单内:交给菜单自己处理
    if (target.closest(".ctx-menu")) return;
    // 画布任意 mousedown:右键菜单开着就先关掉
    if (opts.isCtxMenuOpen()) {
      opts.onCloseCtx();
    }
    // panMode:启动平移
    if (opts.getPanMode()) {
      if (target.closest(".canvas-element")) return;
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const baseX = opts.getPanX();
      const baseY = opts.getPanY();
      function onMove(ev: MouseEvent) {
        opts.onPan(
          baseX + (ev.clientX - startX) - opts.getPanX(),
          baseY + (ev.clientY - startY) - opts.getPanY(),
        );
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      return;
    }
    // 元素 / handle 上不启动框选
    if (target.closest(".canvas-element")) return;
    // 框选必须落在画布纸上(.canvas),ruler / frame 留白处不启动
    if (!target.closest(".canvas") && !target.classList.contains("canvas")) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    // 启动时清掉单选/多选
    if (opts.getSelectedId() || opts.getMultiSelectedIds().length > 0) {
      opts.onSelectMany([]);
    }
    marqueeStarting.value = true;
    queueMicrotask(() => {
      marqueeStarting.value = false;
    });
    const startX = e.clientX;
    const startY = e.clientY;

    function onMove(ev: MouseEvent) {
      const x1 = Math.min(startX, ev.clientX);
      const y1 = Math.min(startY, ev.clientY);
      const x2 = Math.max(startX, ev.clientX);
      const y2 = Math.max(startY, ev.clientY);
      const ppm = pxPerMmScreen.value;
      marquee.value = {
        x1,
        y1,
        x2,
        y2,
        w: x2 - x1,
        h: y2 - y1,
        wMm: (x2 - x1) / ppm,
        hMm: (y2 - y1) / ppm,
      };
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const m = marquee.value;
      if (!m) return;
      // 鼠标没动:当作"点空白处"→ 清选中
      if (m.w < 3 && m.h < 3) {
        marquee.value = null;
        marqueeHits.value = new Set();
        return;
      }
      const hits: string[] = [];
      for (const el of allElements(opts.template())) {
        if (el.locked) continue;
        const r = elScreenRect(el);
        if (!r) continue;
        if (
          m.x1 <= r.right &&
          m.x2 >= r.left &&
          m.y1 <= r.bottom &&
          m.y2 >= r.top
        ) {
          hits.push(el.id);
        }
      }
      marquee.value = null;
      marqueeHits.value = new Set();
      opts.onSelectMany(hits);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ===== 元素 mousedown:启动拖动 =====
  function onElementMouseDown(e: MouseEvent, id: string) {
    const el = findElementGlobal(opts.template(), id)?.el;
    if (!el) return;
    if (e.shiftKey) {
      e.preventDefault();
      opts.onSelectToggle(id);
      return;
    }
    const ids = opts.getMultiSelectedIds();
    // 多选组拖动
    if (ids.length > 1 && ids.includes(id)) {
      startGroupDrag(e, id);
      return;
    }
    opts.onSelect(id);
    if (el.locked) return;
    startElementDrag(e, id);
  }

  /** 单元素拖动 */
  function startElementDrag(e: MouseEvent, id: string) {
    const el = findElementGlobal(opts.template(), id)?.el;
    if (!el) return;
    // 缓存到 const,避免 TS 5.3 闭包 narrowing 丢 el 类型(inner onMove 用)
    const elW = el.w;
    const elH = el.h;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x;
    const origY = el.y;
    const pxPerMmLocal = mmToPx(1) * zoomValue.value;
    const vCandidates = collectCandidates("x", id);
    const hCandidates = collectCandidates("y", id);
    // 启动时设延长线
    selfLines.value = { v: [origX, origX + elW], h: [origY, origY + elH] };

    function onMove(ev: MouseEvent) {
      const dx = (ev.clientX - startX) / pxPerMmLocal;
      const dy = (ev.clientY - startY) / pxPerMmLocal;
      let newX = Math.max(0, origX + dx);
      let newY = Math.max(0, origY + dy);
      const newRight = newX + elW;
      const newBottom = newY + elH;

      const sxLeft = snapValue(newX, vCandidates, SNAP_THRESHOLD_MM);
      const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM);
      const syTop = snapValue(newY, hCandidates, SNAP_THRESHOLD_MM);
      const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM);

      if (sxLeft.lineAt !== null) newX = sxLeft.value;
      else if (sxRight.lineAt !== null) newX = sxRight.value - elW;
      if (syTop.lineAt !== null) newY = syTop.value;
      else if (syBottom.lineAt !== null) newY = syBottom.value - elH;

      snapLines.vertical = [sxLeft.lineAt, sxRight.lineAt].filter(
        (v): v is number => v !== null,
      );
      snapLines.horizontal = [syTop.lineAt, syBottom.lineAt].filter(
        (v): v is number => v !== null,
      );
      if (selfLines.value) {
        selfLines.value = {
          v: [newX, newX + elW],
          h: [newY, newY + elH],
        };
      }
      opts.onMove(id, newX, newY);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      snapLines.vertical = [];
      snapLines.horizontal = [];
      selfLines.value = null;
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  /** 多选组拖动 */
  function startGroupDrag(e: MouseEvent, primaryId: string) {
    const ids = opts.getMultiSelectedIds().filter((x) => x !== primaryId);
    ids.unshift(primaryId);
    const origs = ids
      .map((id) => {
        const el = findElementGlobal(opts.template(), id)?.el;
        return el
          ? { id, x: el.x, y: el.y, locked: !!el.locked }
          : null;
      })
      .filter(
        (x): x is { id: string; x: number; y: number; locked: boolean } =>
          x !== null,
      );
    const draggables = origs.filter((o) => !o.locked);
    if (draggables.length === 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const pxPerMmLocal = mmToPx(1) * zoomValue.value;
    const groupX = origs.reduce((acc, o) => Math.min(acc, o.x), Infinity);
    const groupY = origs.reduce((acc, o) => Math.min(acc, o.y), Infinity);
    const primaryEl = draggables[0]
      ? findElementGlobal(opts.template(), draggables[0].id)?.el
      : null;
    const groupRight =
      origs.reduce((acc, o) => Math.max(acc, o.x), -Infinity) +
      (primaryEl?.w ?? 0);
    const groupBottom =
      origs.reduce((acc, o) => Math.max(acc, o.y), -Infinity) +
      (primaryEl?.h ?? 0);
    const groupW = groupRight - groupX;
    const groupH = groupBottom - groupY;
    const vCandidates = collectCandidatesForGroup(
      "x",
      new Set(origs.map((o) => o.id)),
    );
    const hCandidates = collectCandidatesForGroup(
      "y",
      new Set(origs.map((o) => o.id)),
    );
    selfLines.value = {
      v: [groupX, groupRight],
      h: [groupY, groupBottom],
    };

    function onMove(ev: MouseEvent) {
      const dx = (ev.clientX - startX) / pxPerMmLocal;
      const dy = (ev.clientY - startY) / pxPerMmLocal;
      let newX = Math.max(0, groupX + dx);
      let newY = Math.max(0, groupY + dy);
      const newRight = newX + groupW;
      const newBottom = newY + groupH;
      const sxLeft = snapValue(newX, vCandidates, SNAP_THRESHOLD_MM);
      const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM);
      const syTop = snapValue(newY, hCandidates, SNAP_THRESHOLD_MM);
      const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM);
      if (sxLeft.lineAt !== null) newX = sxLeft.value;
      else if (sxRight.lineAt !== null) newX = sxRight.value - groupW;
      if (syTop.lineAt !== null) newY = syTop.value;
      else if (syBottom.lineAt !== null) newY = syBottom.value - groupH;

      snapLines.vertical = [sxLeft.lineAt, sxRight.lineAt].filter(
        (v): v is number => v !== null,
      );
      snapLines.horizontal = [syTop.lineAt, syBottom.lineAt].filter(
        (v): v is number => v !== null,
      );
      if (selfLines.value) {
        selfLines.value = {
          v: [newX, newRight],
          h: [newY, newBottom],
        };
      }
      const finalDx = newX - groupX;
      const finalDy = newY - groupY;
      const updates = draggables.map((o) => ({
        id: o.id,
        x: o.x + finalDx,
        y: o.y + finalDy,
      }));
      opts.onMoveMany(updates);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      snapLines.vertical = [];
      snapLines.horizontal = [];
      selfLines.value = null;
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ===== Resize / Rotate handle 由父级 ElementOverlayHandles 触发 =====

  function onResizeStart(e: MouseEvent, id: string, dir: ResizeDir) {
    e.preventDefault();
    const found = findElementGlobal(opts.template(), id);
    if (!found) return;
    const el = found.el;
    if (el.locked) return;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const origX = el.x;
    const origY = el.y;
    const origW = el.w;
    const origH = el.h;
    const pxPerMmLocal = mmToPx(1) * zoomValue.value;
    const ratio = origW / origH;
    const isCorner =
      dir === "nw" || dir === "ne" || dir === "sw" || dir === "se";
    const vCandidates = collectCandidates("x", id);
    const hCandidates = collectCandidates("y", id);
    // 启动时设延长线
    selfLines.value = {
      v: [origX, origX + el.w],
      h: [origY, origY + el.h],
    };

    function onMove(ev: MouseEvent) {
      const dxMm = (ev.clientX - startMouseX) / pxPerMmLocal;
      const dyMm = (ev.clientY - startMouseY) / pxPerMmLocal;
      const shift = ev.shiftKey && isCorner;
      let x = origX;
      let y = origY;
      let w = origW;
      let h = origH;
      if (dir === "nw" || dir === "w" || dir === "sw") {
        w = Math.max(MIN_SIZE_MM, origW - dxMm);
        x = origX + (origW - w);
      } else if (dir === "ne" || dir === "e" || dir === "se") {
        w = Math.max(MIN_SIZE_MM, origW + dxMm);
      }
      if (dir === "nw" || dir === "n" || dir === "ne") {
        h = Math.max(MIN_SIZE_MM, origH - dyMm);
        y = origY + (origH - h);
      } else if (dir === "sw" || dir === "s" || dir === "se") {
        h = Math.max(MIN_SIZE_MM, origH + dyMm);
      }
      if (shift) {
        if (dir === "nw" || dir === "ne" || dir === "se" || dir === "sw") {
          const newH = w / ratio;
          if (dir === "nw" || dir === "ne") y = origY + (origH - newH);
          h = newH;
        }
      }
      const newRight = x + w;
      const newBottom = y + h;
      const sxLeft = snapValue(x, vCandidates, SNAP_THRESHOLD_MM);
      const sxRight = snapValue(newRight, vCandidates, SNAP_THRESHOLD_MM);
      const syTop = snapValue(y, hCandidates, SNAP_THRESHOLD_MM);
      const syBottom = snapValue(newBottom, hCandidates, SNAP_THRESHOLD_MM);
      if (sxLeft.lineAt !== null) {
        const delta = sxLeft.value - x;
        x = sxLeft.value;
        w = Math.max(MIN_SIZE_MM, w - delta);
      } else if (sxRight.lineAt !== null) {
        w = Math.max(MIN_SIZE_MM, sxRight.value - x);
      }
      if (syTop.lineAt !== null) {
        const delta = syTop.value - y;
        y = syTop.value;
        h = Math.max(MIN_SIZE_MM, h - delta);
      } else if (syBottom.lineAt !== null) {
        h = Math.max(MIN_SIZE_MM, syBottom.value - y);
      }
      snapLines.vertical = [sxLeft.lineAt, sxRight.lineAt].filter(
        (v): v is number => v !== null,
      );
      snapLines.horizontal = [syTop.lineAt, syBottom.lineAt].filter(
        (v): v is number => v !== null,
      );
      if (selfLines.value) {
        selfLines.value = {
          v: [x, x + w],
          h: [y, y + h],
        };
      }
      opts.onResize(id, { x, y, w, h });
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      snapLines.vertical = [];
      snapLines.horizontal = [];
      selfLines.value = null;
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function onRotateStart(e: MouseEvent, id: string) {
    e.preventDefault();
    const found = findElementGlobal(opts.template(), id);
    if (!found) return;
    const el = found.el;
    if (el.locked) return;
    // 元素未旋转中心 → 屏幕 px(用 .canvas 实际 bounding rect,已含 scale + pan)
    const canvas = document.querySelector(".canvas") as HTMLElement | null;
    if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    const z = zoomValue.value;
    const cx = cr.left + mmToPx(el.x + el.w / 2) * z;
    const cy = cr.top + mmToPx(el.y + el.h / 2) * z;
    // 用"相对角度"避免一碰就跳
    const startRot = el.rotate ?? 0;
    const startAngle =
      Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;

    function onMove(ev: MouseEvent) {
      const angle =
        Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
      const rawDeg = startRot + (angle - startAngle);
      const rounded = Math.round(rawDeg);
      const normalized = ((rounded % 360) + 360) % 360;
      const distToZero = Math.min(normalized, 360 - normalized);
      // 接近 0 度(±3 度)吸附到 0
      const finalDeg = distToZero < 3 ? 0 : rounded;
      opts.onRotate(id, finalDeg);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return {
    // 状态(父级模板直接用)
    marquee,
    marqueeHits,
    marqueeStarting,
    selfLines,
    snapLines,
    marqueeStyle,
    // 工具
    isMultiSelected,
    // handlers
    onWrapMouseDown,
    onElementMouseDown,
    onResizeStart,
    onRotateStart,
  };
}

/** re-export for ElementOverlayHandles 类型 */
export type { ElementType };
