import {
  require_jquery
} from "./chunk-4UOYXR3S.js";
import {
  __commonJS
} from "./chunk-PR4QN5HX.js";

// node_modules/@claviska/jquery-minicolors/jquery.minicolors.min.js
var require_jquery_minicolors_min = __commonJS({
  "node_modules/@claviska/jquery-minicolors/jquery.minicolors.min.js"(exports, module) {
    !function(i) {
      "function" == typeof define && define.amd ? define(["jquery"], i) : "object" == typeof exports ? module.exports = i(require_jquery()) : i(jQuery);
    }(function(C) {
      "use strict";
      function o(i) {
        var t = i.parent();
        i.removeData("minicolors-initialized").removeData("minicolors-settings").removeProp("size").removeClass("minicolors-input"), t.before(i).remove();
      }
      function s(i) {
        var t = i.parent(), o2 = t.find(".minicolors-panel"), s2 = i.data("minicolors-settings");
        !i.data("minicolors-initialized") || i.prop("disabled") || t.hasClass("minicolors-inline") || t.hasClass("minicolors-focus") || (a(), t.addClass("minicolors-focus"), o2.animate ? o2.stop(true, true).fadeIn(s2.showSpeed, function() {
          s2.show && s2.show.call(i.get(0));
        }) : (o2.show(), s2.show && s2.show.call(i.get(0))));
      }
      function a() {
        C(".minicolors-focus").each(function() {
          var i = C(this), t = i.find(".minicolors-input"), o2 = i.find(".minicolors-panel"), s2 = t.data("minicolors-settings");
          o2.animate ? o2.fadeOut(s2.hideSpeed, function() {
            s2.hide && s2.hide.call(t.get(0)), i.removeClass("minicolors-focus");
          }) : (o2.hide(), s2.hide && s2.hide.call(t.get(0)), i.removeClass("minicolors-focus"));
        });
      }
      function n(i, t, o2) {
        var s2, a2, n2, r, e, c = i.parents(".minicolors").find(".minicolors-input"), l = c.data("minicolors-settings"), h = i.find("[class$=-picker]"), d2 = i.offset().left, p2 = i.offset().top, u = Math.round(t.pageX - d2), g = Math.round(t.pageY - p2), m = o2 ? l.animationSpeed : 0;
        t.originalEvent.changedTouches && (u = t.originalEvent.changedTouches[0].pageX - d2, g = t.originalEvent.changedTouches[0].pageY - p2), u < 0 && (u = 0), g < 0 && (g = 0), u > i.width() && (u = i.width()), g > i.height() && (g = i.height()), i.parent().is(".minicolors-slider-wheel") && h.parent().is(".minicolors-grid") && (s2 = 75 - u, a2 = 75 - g, n2 = Math.sqrt(s2 * s2 + a2 * a2), (r = Math.atan2(a2, s2)) < 0 && (r += 2 * Math.PI), 75 < n2 && (u = (n2 = 75) - 75 * Math.cos(r), g = 75 - 75 * Math.sin(r)), u = Math.round(u), g = Math.round(g)), e = { top: g + "px" }, i.is(".minicolors-grid") && (e.left = u + "px"), h.animate ? h.stop(true).animate(e, m, l.animationEasing, function() {
          f(c, i);
        }) : (h.css(e), f(c, i));
      }
      function f(i, t) {
        function o2(i2, t2) {
          var o3, s3;
          return i2.length && t2 ? (o3 = i2.offset().left, s3 = i2.offset().top, { x: o3 - t2.offset().left + i2.outerWidth() / 2, y: s3 - t2.offset().top + i2.outerHeight() / 2 }) : null;
        }
        var s2, a2, n2, r, e, c, l, h = i.val(), d2 = i.attr("data-opacity"), p2 = i.parent(), u = i.data("minicolors-settings"), g = p2.find(".minicolors-input-swatch"), m = p2.find(".minicolors-grid"), f2 = p2.find(".minicolors-slider"), v = p2.find(".minicolors-opacity-slider"), b = m.find("[class$=-picker]"), w = f2.find("[class$=-picker]"), y = v.find("[class$=-picker]"), C2 = o2(b, m), k2 = o2(w, f2), M2 = o2(y, v);
        if (t.is(".minicolors-grid, .minicolors-slider, .minicolors-opacity-slider")) {
          switch (u.control) {
            case "wheel":
              r = m.width() / 2 - C2.x, e = m.height() / 2 - C2.y, c = Math.sqrt(r * r + e * e), (l = Math.atan2(e, r)) < 0 && (l += 2 * Math.PI), 75 < c && (c = 75, C2.x = 69 - 75 * Math.cos(l), C2.y = 69 - 75 * Math.sin(l)), a2 = F(c / 0.75, 0, 100), h = q({ h: s2 = F(180 * l / Math.PI, 0, 360), s: a2, b: n2 = F(100 - Math.floor(k2.y * (100 / f2.height())), 0, 100) }), f2.css("backgroundColor", q({ h: s2, s: a2, b: 100 }));
              break;
            case "saturation":
              h = q({ h: s2 = F(parseInt(C2.x * (360 / m.width()), 10), 0, 360), s: a2 = F(100 - Math.floor(k2.y * (100 / f2.height())), 0, 100), b: n2 = F(100 - Math.floor(C2.y * (100 / m.height())), 0, 100) }), f2.css("backgroundColor", q({ h: s2, s: 100, b: n2 })), p2.find(".minicolors-grid-inner").css("opacity", a2 / 100);
              break;
            case "brightness":
              h = q({ h: s2 = F(parseInt(C2.x * (360 / m.width()), 10), 0, 360), s: a2 = F(100 - Math.floor(C2.y * (100 / m.height())), 0, 100), b: n2 = F(100 - Math.floor(k2.y * (100 / f2.height())), 0, 100) }), f2.css("backgroundColor", q({ h: s2, s: a2, b: 100 })), p2.find(".minicolors-grid-inner").css("opacity", 1 - n2 / 100);
              break;
            default:
              h = q({ h: s2 = F(360 - parseInt(k2.y * (360 / f2.height()), 10), 0, 360), s: a2 = F(Math.floor(C2.x * (100 / m.width())), 0, 100), b: n2 = F(100 - Math.floor(C2.y * (100 / m.height())), 0, 100) }), m.css("backgroundColor", q({ h: s2, s: 100, b: 100 }));
          }
          x(i, h, d2 = u.opacity ? parseFloat(1 - M2.y / v.height()).toFixed(2) : 1);
        } else g.find("span").css({ backgroundColor: h, opacity: String(d2) }), S(i, h, d2);
      }
      function x(i, t, o2) {
        var s2, a2 = i.parent(), n2 = i.data("minicolors-settings"), r = a2.find(".minicolors-input-swatch");
        n2.opacity && i.attr("data-opacity", o2), t = "rgb" === n2.format ? (s2 = T(t) ? I(t, true) : L(M(t, true)), o2 = "" === i.attr("data-opacity") ? 1 : F(parseFloat(i.attr("data-opacity")).toFixed(2), 0, 1), !isNaN(o2) && n2.opacity || (o2 = 1), i.minicolors("rgbObject").a <= 1 && s2 && n2.opacity ? "rgba(" + s2.r + ", " + s2.g + ", " + s2.b + ", " + parseFloat(o2) + ")" : "rgb(" + s2.r + ", " + s2.g + ", " + s2.b + ")") : (T(t) && (t = j(t)), k(t, n2.letterCase)), i.val(t), r.find("span").css({ backgroundColor: t, opacity: String(o2) }), S(i, t, o2);
      }
      function d(i, t) {
        var o2, s2, a2, n2, r, e, c, l, h, d2, p2 = i.parent(), u = i.data("minicolors-settings"), g = p2.find(".minicolors-input-swatch"), m = p2.find(".minicolors-grid"), f2 = p2.find(".minicolors-slider"), v = p2.find(".minicolors-opacity-slider"), b = m.find("[class$=-picker]"), w = f2.find("[class$=-picker]"), y = v.find("[class$=-picker]");
        switch (T(i.val()) ? (o2 = j(i.val()), (r = F(parseFloat(D(i.val())).toFixed(2), 0, 1)) && i.attr("data-opacity", r)) : o2 = k(M(i.val(), true), u.letterCase), s2 = function(i2) {
          var t2 = function(i3) {
            var t3 = { h: 0, s: 0, b: 0 }, o3 = Math.min(i3.r, i3.g, i3.b), s3 = Math.max(i3.r, i3.g, i3.b), a3 = s3 - o3;
            t3.b = s3, t3.s = 0 !== s3 ? 255 * a3 / s3 : 0, 0 !== t3.s ? i3.r === s3 ? t3.h = (i3.g - i3.b) / a3 : i3.g === s3 ? t3.h = 2 + (i3.b - i3.r) / a3 : t3.h = 4 + (i3.r - i3.g) / a3 : t3.h = -1;
            t3.h *= 60, t3.h < 0 && (t3.h += 360);
            return t3.s *= 100 / 255, t3.b *= 100 / 255, t3;
          }(L(i2));
          0 === t2.s && (t2.h = 360);
          return t2;
        }(o2 = o2 || k(z(u.defaultValue, true), u.letterCase)), n2 = u.keywords ? C.map(u.keywords.split(","), function(i2) {
          return i2.toLowerCase().trim();
        }) : [], e = "" !== i.val() && -1 < C.inArray(i.val().toLowerCase(), n2) ? k(i.val()) : T(i.val()) ? I(i.val()) : o2, t || i.val(e), u.opacity && (a2 = "" === i.attr("data-opacity") ? 1 : F(parseFloat(i.attr("data-opacity")).toFixed(2), 0, 1), isNaN(a2) && (a2 = 1), i.attr("data-opacity", a2), g.find("span").css("opacity", String(a2)), l = F(v.height() - v.height() * a2, 0, v.height()), y.css("top", l + "px")), "transparent" === i.val().toLowerCase() && g.find("span").css("opacity", String(0)), g.find("span").css("backgroundColor", o2), u.control) {
          case "wheel":
            h = F(Math.ceil(0.75 * s2.s), 0, m.height() / 2), d2 = s2.h * Math.PI / 180, c = F(75 - Math.cos(d2) * h, 0, m.width()), l = F(75 - Math.sin(d2) * h, 0, m.height()), b.css({ top: l + "px", left: c + "px" }), l = 150 - s2.b / (100 / m.height()), "" === o2 && (l = 0), w.css("top", l + "px"), f2.css("backgroundColor", q({ h: s2.h, s: s2.s, b: 100 }));
            break;
          case "saturation":
            c = F(5 * s2.h / 12, 0, 150), l = F(m.height() - Math.ceil(s2.b / (100 / m.height())), 0, m.height()), b.css({ top: l + "px", left: c + "px" }), l = F(f2.height() - s2.s * (f2.height() / 100), 0, f2.height()), w.css("top", l + "px"), f2.css("backgroundColor", q({ h: s2.h, s: 100, b: s2.b })), p2.find(".minicolors-grid-inner").css("opacity", s2.s / 100);
            break;
          case "brightness":
            c = F(5 * s2.h / 12, 0, 150), l = F(m.height() - Math.ceil(s2.s / (100 / m.height())), 0, m.height()), b.css({ top: l + "px", left: c + "px" }), l = F(f2.height() - s2.b * (f2.height() / 100), 0, f2.height()), w.css("top", l + "px"), f2.css("backgroundColor", q({ h: s2.h, s: s2.s, b: 100 })), p2.find(".minicolors-grid-inner").css("opacity", 1 - s2.b / 100);
            break;
          default:
            c = F(Math.ceil(s2.s / (100 / m.width())), 0, m.width()), l = F(m.height() - Math.ceil(s2.b / (100 / m.height())), 0, m.height()), b.css({ top: l + "px", left: c + "px" }), l = F(f2.height() - s2.h / (360 / f2.height()), 0, f2.height()), w.css("top", l + "px"), m.css("backgroundColor", q({ h: s2.h, s: 100, b: 100 }));
        }
        i.data("minicolors-initialized") && S(i, e, a2);
      }
      function S(i, t, o2) {
        var s2, a2, n2, r = i.data("minicolors-settings"), e = i.data("minicolors-lastChange");
        if (!e || e.value !== t || e.opacity !== o2) {
          if (i.data("minicolors-lastChange", { value: t, opacity: o2 }), r.swatches && 0 !== r.swatches.length) {
            for (s2 = T(t) ? I(t, true) : L(t), a2 = -1, n2 = 0; n2 < r.swatches.length; ++n2) if (s2.r === r.swatches[n2].r && s2.g === r.swatches[n2].g && s2.b === r.swatches[n2].b && s2.a === r.swatches[n2].a) {
              a2 = n2;
              break;
            }
            i.parent().find(".minicolors-swatches .minicolors-swatch").removeClass("selected"), -1 !== a2 && i.parent().find(".minicolors-swatches .minicolors-swatch").eq(n2).addClass("selected");
          }
          r.change && (r.changeDelay ? (clearTimeout(i.data("minicolors-changeTimeout")), i.data("minicolors-changeTimeout", setTimeout(function() {
            r.change.call(i.get(0), t, o2);
          }, r.changeDelay))) : r.change.call(i.get(0), t, o2)), i.trigger("change").trigger("input");
        }
      }
      function k(i, t) {
        return "uppercase" === t ? i.toUpperCase() : i.toLowerCase();
      }
      function M(i, t) {
        return !(i = i.replace(/^#/g, "")).match(/^[A-F0-9]{3,6}/gi) || 3 !== i.length && 6 !== i.length ? "" : (3 === i.length && t && (i = i[0] + i[0] + i[1] + i[1] + i[2] + i[2]), "#" + i);
      }
      function I(i, t) {
        var o2 = i.replace(/[^\d,.]/g, "").split(",");
        return o2[0] = F(parseInt(o2[0], 10), 0, 255), o2[1] = F(parseInt(o2[1], 10), 0, 255), o2[2] = F(parseInt(o2[2], 10), 0, 255), void 0 !== o2[3] && (o2[3] = F(parseFloat(o2[3], 10), 0, 1)), t ? void 0 !== o2[3] ? { r: o2[0], g: o2[1], b: o2[2], a: o2[3] } : { r: o2[0], g: o2[1], b: o2[2] } : void 0 !== o2[3] && o2[3] <= 1 ? "rgba(" + o2[0] + ", " + o2[1] + ", " + o2[2] + ", " + o2[3] + ")" : "rgb(" + o2[0] + ", " + o2[1] + ", " + o2[2] + ")";
      }
      function z(i, t) {
        return T(i) ? I(i) : M(i, t);
      }
      function F(i, t, o2) {
        return i < t && (i = t), o2 < i && (i = o2), i;
      }
      function T(i) {
        var t = i.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return !(!t || 4 !== t.length);
      }
      function D(i) {
        return (i = i.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+(\.\d{1,2})?|\.\d{1,2})[\s+]?/i)) && 6 === i.length ? i[4] : "1";
      }
      function j(i) {
        return (i = i.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i)) && 4 === i.length ? "#" + ("0" + parseInt(i[1], 10).toString(16)).slice(-2) + ("0" + parseInt(i[2], 10).toString(16)).slice(-2) + ("0" + parseInt(i[3], 10).toString(16)).slice(-2) : "";
      }
      function p(i) {
        var o2 = [i.r.toString(16), i.g.toString(16), i.b.toString(16)];
        return C.each(o2, function(i2, t) {
          1 === t.length && (o2[i2] = "0" + t);
        }), "#" + o2.join("");
      }
      function q(i) {
        return p((t = i, n2 = {}, r = Math.round(t.h), e = Math.round(255 * t.s / 100), c = Math.round(255 * t.b / 100), 0 === e ? n2.r = n2.g = n2.b = c : (a2 = r % 60 * ((o2 = c) - (s2 = (255 - e) * c / 255)) / 60, 360 === r && (r = 0), r < 60 ? (n2.r = o2, n2.b = s2, n2.g = s2 + a2) : r < 120 ? (n2.g = o2, n2.b = s2, n2.r = o2 - a2) : r < 180 ? (n2.g = o2, n2.r = s2, n2.b = s2 + a2) : r < 240 ? (n2.b = o2, n2.r = s2, n2.g = o2 - a2) : r < 300 ? (n2.b = o2, n2.g = s2, n2.r = s2 + a2) : r < 360 ? (n2.r = o2, n2.g = s2, n2.b = o2 - a2) : (n2.r = 0, n2.g = 0, n2.b = 0)), { r: Math.round(n2.r), g: Math.round(n2.g), b: Math.round(n2.b) }));
        var t, o2, s2, a2, n2, r, e, c;
      }
      function L(i) {
        return { r: (i = parseInt(-1 < i.indexOf("#") ? i.substring(1) : i, 16)) >> 16, g: (65280 & i) >> 8, b: 255 & i };
      }
      C.minicolors = { defaults: { animationSpeed: 50, animationEasing: "swing", change: null, changeDelay: 0, control: "hue", defaultValue: "", format: "hex", hide: null, hideSpeed: 100, inline: false, keywords: "", letterCase: "lowercase", opacity: false, position: "bottom", show: null, showSpeed: 100, theme: "default", swatches: [] } }, C.extend(C.fn, { minicolors: function(i, t) {
        switch (i) {
          case "destroy":
            return C(this).each(function() {
              o(C(this));
            }), C(this);
          case "hide":
            return a(), C(this);
          case "opacity":
            return void 0 === t ? C(this).attr("data-opacity") : (C(this).each(function() {
              d(C(this).attr("data-opacity", t));
            }), C(this));
          case "rgbObject":
            return function(i2) {
              var t2, o2 = C(i2).attr("data-opacity");
              {
                var s2;
                t2 = T(C(i2).val()) ? I(C(i2).val(), true) : (s2 = M(C(i2).val(), true), L(s2));
              }
              if (!t2) return null;
              void 0 !== o2 && C.extend(t2, { a: parseFloat(o2) });
              return t2;
            }(C(this));
          case "rgbString":
          case "rgbaString":
            return function(i2, t2) {
              var o2, s2 = C(i2).attr("data-opacity");
              {
                var a2;
                o2 = T(C(i2).val()) ? I(C(i2).val(), true) : (a2 = M(C(i2).val(), true), L(a2));
              }
              if (!o2) return null;
              void 0 === s2 && (s2 = 1);
              return t2 ? "rgba(" + o2.r + ", " + o2.g + ", " + o2.b + ", " + parseFloat(s2) + ")" : "rgb(" + o2.r + ", " + o2.g + ", " + o2.b + ")";
            }(C(this), "rgbaString" === i);
          case "settings":
            return void 0 === t ? C(this).data("minicolors-settings") : (C(this).each(function() {
              var i2 = C(this).data("minicolors-settings") || {};
              o(C(this)), C(this).minicolors(C.extend(true, i2, t));
            }), C(this));
          case "show":
            return s(C(this).eq(0)), C(this);
          case "value":
            return void 0 === t ? C(this).val() : (C(this).each(function() {
              "object" == typeof t && null !== t ? (void 0 !== t.opacity && C(this).attr("data-opacity", F(t.opacity, 0, 1)), t.color && C(this).val(t.color)) : C(this).val(t), d(C(this));
            }), C(this));
          default:
            return "create" !== i && (t = i), C(this).each(function() {
              !function(t2, i2) {
                var o2, s2, a2, n2, r, e, c, l = C('<div class="minicolors" />'), h = C.minicolors.defaults;
                if (t2.data("minicolors-initialized")) return;
                i2 = C.extend(true, {}, h, i2), l.addClass("minicolors-theme-" + i2.theme).toggleClass("minicolors-with-opacity", i2.opacity), void 0 !== i2.position && C.each(i2.position.split(" "), function() {
                  l.addClass("minicolors-position-" + this);
                });
                s2 = "rgb" === i2.format ? i2.opacity ? "25" : "20" : i2.keywords ? "11" : "7";
                t2.addClass("minicolors-input").data("minicolors-initialized", false).data("minicolors-settings", i2).prop("size", s2).wrap(l).after('<div class="minicolors-panel minicolors-slider-' + i2.control + '"><div class="minicolors-slider minicolors-sprite"><div class="minicolors-picker"></div></div><div class="minicolors-opacity-slider minicolors-sprite"><div class="minicolors-picker"></div></div><div class="minicolors-grid minicolors-sprite"><div class="minicolors-grid-inner"></div><div class="minicolors-picker"><div></div></div></div></div>'), i2.inline || (t2.after('<span class="minicolors-swatch minicolors-sprite minicolors-input-swatch"><span class="minicolors-swatch-color"></span></span>'), t2.next(".minicolors-input-swatch").on("click", function(i3) {
                  i3.preventDefault(), t2.trigger("focus");
                }));
                if ((e = t2.parent().find(".minicolors-panel")).on("selectstart", function() {
                  return false;
                }).end(), i2.swatches && 0 !== i2.swatches.length) for (e.addClass("minicolors-with-swatches"), a2 = C('<ul class="minicolors-swatches"></ul>').appendTo(e), c = 0; c < i2.swatches.length; ++c) n2 = "object" == typeof i2.swatches[c] ? (o2 = i2.swatches[c].name, i2.swatches[c].color) : (o2 = "", i2.swatches[c]), n2 = T(r = n2) ? I(n2, true) : L(M(n2, true)), C('<li class="minicolors-swatch minicolors-sprite"><span class="minicolors-swatch-color"></span></li>').attr("title", o2).appendTo(a2).data("swatch-color", r).find(".minicolors-swatch-color").css({ backgroundColor: "transparent" !== r ? p(n2) : "transparent", opacity: String(n2.a) }), i2.swatches[c] = n2;
                i2.inline && t2.parent().addClass("minicolors-inline");
                d(t2, false), t2.data("minicolors-initialized", true);
              }(C(this), t);
            }), C(this);
        }
      } }), C([document]).on("mousedown.minicolors touchstart.minicolors", function(i) {
        C(i.target).parents().add(i.target).hasClass("minicolors") || a();
      }).on("mousedown.minicolors touchstart.minicolors", ".minicolors-grid, .minicolors-slider, .minicolors-opacity-slider", function(i) {
        var t = C(this);
        i.preventDefault(), C(i.delegateTarget).data("minicolors-target", t), n(t, i, true);
      }).on("mousemove.minicolors touchmove.minicolors", function(i) {
        var t = C(i.delegateTarget).data("minicolors-target");
        t && n(t, i);
      }).on("mouseup.minicolors touchend.minicolors", function() {
        C(this).removeData("minicolors-target");
      }).on("click.minicolors", ".minicolors-swatches li", function(i) {
        i.preventDefault();
        var t = C(this), o2 = t.parents(".minicolors").find(".minicolors-input"), s2 = t.data("swatch-color");
        x(o2, s2, D(s2)), d(o2);
      }).on("mousedown.minicolors touchstart.minicolors", ".minicolors-input-swatch", function(i) {
        var t = C(this).parent().find(".minicolors-input");
        i.preventDefault(), s(t);
      }).on("focus.minicolors", ".minicolors-input", function() {
        var i = C(this);
        i.data("minicolors-initialized") && s(i);
      }).on("blur.minicolors", ".minicolors-input", function() {
        var i, t, o2, s2, a2, n2 = C(this), r = n2.data("minicolors-settings");
        n2.data("minicolors-initialized") && (i = r.keywords ? C.map(r.keywords.split(","), function(i2) {
          return i2.toLowerCase().trim();
        }) : [], a2 = "" !== n2.val() && -1 < C.inArray(n2.val().toLowerCase(), i) ? n2.val() : null === (o2 = T(n2.val()) ? I(n2.val(), true) : (t = M(n2.val(), true)) ? L(t) : null) ? r.defaultValue : "rgb" === r.format ? r.opacity ? I("rgba(" + o2.r + "," + o2.g + "," + o2.b + "," + n2.attr("data-opacity") + ")") : I("rgb(" + o2.r + "," + o2.g + "," + o2.b + ")") : p(o2), s2 = r.opacity ? n2.attr("data-opacity") : 1, "transparent" === a2.toLowerCase() && (s2 = 0), n2.closest(".minicolors").find(".minicolors-input-swatch > span").css("opacity", String(s2)), n2.val(a2), "" === n2.val() && n2.val(z(r.defaultValue, true)), n2.val(k(n2.val(), r.letterCase)));
      }).on("keydown.minicolors", ".minicolors-input", function(i) {
        var t = C(this);
        if (t.data("minicolors-initialized")) switch (i.which) {
          case 9:
            a();
            break;
          case 13:
          case 27:
            a(), t.blur();
        }
      }).on("keyup.minicolors", ".minicolors-input", function() {
        var i = C(this);
        i.data("minicolors-initialized") && d(i, true);
      }).on("paste.minicolors", ".minicolors-input", function() {
        var i = C(this);
        i.data("minicolors-initialized") && setTimeout(function() {
          d(i, true);
        }, 1);
      });
    });
  }
});
export default require_jquery_minicolors_min();
//# sourceMappingURL=@claviska_jquery-minicolors_jquery__minicolors__min.js.map
