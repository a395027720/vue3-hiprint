import {
  __commonJS
} from "./chunk-PR4QN5HX.js";

// node_modules/concurrent-tasks/lib/util.js
var require_util = __commonJS({
  "node_modules/concurrent-tasks/lib/util.js"(exports) {
    "use strict";
    exports.__esModule = true;
    var isFunction = exports.isFunction = function isFunction2(item) {
      return typeof item === "function";
    };
    var isNumber = exports.isNumber = function isNumber2(item) {
      return typeof item === "number" && !isNaN(item);
    };
    var isString = exports.isString = function isString2(item) {
      return typeof item === "string";
    };
    var isArray = exports.isArray = function isArray2(item) {
      return item.constructor === Array;
    };
    var isEmptyString = exports.isEmptyString = function isEmptyString2(item) {
      return isString(item) && !item;
    };
    var assignFunction = exports.assignFunction = function assignFunction2(item) {
      if (isFunction(item)) {
        return item;
      }
    };
    var assignNumber = exports.assignNumber = function assignNumber2(number, defaultNumber, listLength) {
      if (isNumber(number)) {
        if (number === 0) {
          return listLength;
        }
        return number;
      }
      return defaultNumber;
    };
  }
});

// node_modules/concurrent-tasks/lib/PrivateFunctions.js
var require_PrivateFunctions = __commonJS({
  "node_modules/concurrent-tasks/lib/PrivateFunctions.js"(exports) {
    "use strict";
    exports.__esModule = true;
    exports.run = run;
    exports.done = done;
    exports.startCheck = startCheck;
    exports.addCheck = addCheck;
    exports.removeCheck = removeCheck;
    exports.startCheckAndRun = startCheckAndRun;
    exports.runPending = runPending;
    var _util = require_util();
    function run() {
      if (this.tasks.list.length) {
        if (this.tasks.running < this.concurrency) {
          this.tasks.list.shift()(done.bind(this));
          this.tasks.running++;
        }
      } else {
        if (this.tasks.completed === this.tasks.total) {
          this.duration.end = Date.now();
          this.duration.total = this.duration.end - this.duration.start;
          this.__working = false;
          if ((0, _util.isFunction)(this.onEnd)) {
            var completed = this.tasks.completed, duration = this.duration;
            this.onEnd({ completed, duration });
          }
        }
      }
    }
    function done() {
      this.tasks.completed++;
      this.tasks.running--;
      this.duration.total = Date.now() - this.duration.start;
      if ((0, _util.isFunction)(this.onDone)) {
        this.onDone(this.tasks);
      }
      run.call(this);
    }
    function startCheck() {
      if (!this.__working) {
        this.duration.start = Date.now();
        this.__working = true;
        if ((0, _util.isFunction)(this.onStart)) {
          var duration = this.duration;
          this.onStart({ duration });
        }
      }
    }
    function addCheck() {
      if ((0, _util.isFunction)(this.onAdd)) {
        var tasks = this.tasks;
        this.onAdd({ tasks });
      }
    }
    function removeCheck() {
      if ((0, _util.isFunction)(this.onRemove)) {
        var tasks = this.tasks;
        this.onRemove({ tasks });
      }
    }
    function startCheckAndRun() {
      startCheck.call(this);
      run.call(this);
    }
    function runPending() {
      if (this.tasks.running < this.concurrency) {
        var concurrency = this.concurrency === Infinity ? this.tasks.list.length : this.concurrency;
        for (var i = this.tasks.running; i < concurrency; i++) {
          run.call(this);
        }
      }
    }
  }
});

// node_modules/concurrent-tasks/lib/log.js
var require_log = __commonJS({
  "node_modules/concurrent-tasks/lib/log.js"(exports, module) {
    "use strict";
    exports.__esModule = true;
    exports.default = function(logKey) {
      return "[TaskRunner]" + this.config.name + ": " + logs[logKey];
    };
    var logs = {
      already_running: "Cannot start TaskRunner instance as it is already running!",
      auto_start_true: "Cannot programmatically start TaskRunner instance as autoStart is true!",
      add_requires_function: 'The "add" operation requires a function. Check if the first argument is a function!',
      add_multiple_requires_array_of_functions: 'The "addMultiple" operation requires an array of functions. Check if the first argument is an array and whether all the items in the array are functions!',
      concurrency_not_a_number: "Concurrency should be a positive number. Defaulting to 3.",
      concurrency_should_be_positive_integer: "Concurrency should be a positive integer. Seems like you have supplied a negative value!"
    };
    module.exports = exports["default"];
  }
});

// node_modules/concurrent-tasks/lib/index.js
var require_lib = __commonJS({
  "node_modules/concurrent-tasks/lib/index.js"(exports, module) {
    exports.__esModule = true;
    exports.default = void 0;
    var _extends = Object.assign || function(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    };
    var _class;
    var _temp;
    var _initialiseProps;
    var _PrivateFunctions = require_PrivateFunctions();
    var _log = require_log();
    var _log2 = _interopRequireDefault(_log);
    var _util = require_util();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function _objectWithoutProperties(obj, keys) {
      var target = {};
      for (var i in obj) {
        if (keys.indexOf(i) >= 0) continue;
        if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
        target[i] = obj[i];
      }
      return target;
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    var TaskRunner = (_temp = _class = function TaskRunner2() {
      var config = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      _classCallCheck(this, TaskRunner2);
      _initialiseProps.call(this);
      var concurrency = config.concurrency, onAdd = config.onAdd, onStart = config.onStart, onDone = config.onDone, onEnd = config.onEnd, otherConfig = _objectWithoutProperties(config, ["concurrency", "onAdd", "onStart", "onDone", "onEnd"]);
      this.config = _extends({
        autoStart: true,
        name: "Runner " + ++TaskRunner2.runnerCount
      }, otherConfig);
      this.setConcurrency(concurrency);
      this.onAdd = (0, _util.assignFunction)(onAdd);
      this.onStart = (0, _util.assignFunction)(onStart);
      this.onDone = (0, _util.assignFunction)(onDone);
      this.onEnd = (0, _util.assignFunction)(onEnd);
      Object.seal(this);
    }, _class.runnerCount = 0, _initialiseProps = function _initialiseProps2() {
      var _this = this;
      this.__working = false;
      this.tasks = {
        list: [],
        total: 0,
        completed: 0,
        running: 0
      };
      this.duration = {
        start: 0,
        end: 0,
        total: 0
      };
      this.isBusy = function() {
        return _this.__working;
      };
      this.setConcurrency = function(concurrency) {
        concurrency = parseInt(concurrency, 10);
        if (!(0, _util.isNumber)(concurrency)) {
          console.warn(_log2.default.call(_this, "concurrency_not_a_number"));
        }
        if (concurrency < 0) {
          concurrency = Math.abs(concurrency);
          console.warn(_log2.default.call(_this, "concurrency_should_be_positive_integer"));
        }
        _this.concurrency = (0, _util.assignNumber)(concurrency, 3, _this.tasks.total);
        if (_this.__working) {
          _PrivateFunctions.runPending.call(_this);
        }
      };
      this.start = function() {
        if (_this.__working) {
          console.warn(_log2.default.call(_this, "already_running"));
          return false;
        }
        if (_this.config.autoStart) {
          console.warn(_log2.default.call(_this, "auto_start_true"));
          return false;
        }
        _PrivateFunctions.startCheck.call(_this);
        _PrivateFunctions.runPending.call(_this);
        return true;
      };
      this.add = function(task) {
        var first2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
        if ((0, _util.isFunction)(task)) {
          var autoStart = _this.config.autoStart;
          if (first2) {
            _this.tasks.list.push(task);
          } else {
            _this.tasks.list.unshift(task);
          }
          _this.tasks.total++;
          if (autoStart) {
            _PrivateFunctions.startCheckAndRun.call(_this);
          }
          _PrivateFunctions.addCheck.call(_this);
          return true;
        }
        throw new TypeError((0, _log2.default)("add_requires_function"));
      };
      this.addFirst = function(task) {
        _this.add(task, true);
      };
      this.addMultiple = function(tasks, first2) {
        if ((0, _util.isArray)(tasks) && tasks.every(function(t) {
          return (0, _util.isFunction)(t);
        })) {
          var autoStart = _this.config.autoStart;
          _this.tasks = _extends({}, _this.tasks, {
            list: first2 ? [].concat(tasks, _this.tasks.list) : [].concat(_this.tasks.list, tasks),
            total: _this.tasks.total + tasks.length
          });
          if (autoStart) {
            _PrivateFunctions.startCheckAndRun.call(_this);
          }
          _PrivateFunctions.addCheck.call(_this);
          return true;
        }
        throw new TypeError(_log2.default.call(_this, "add_multiple_requires_array_of_functions"));
      };
      this.addMultipleFirst = function(tasks) {
        _this.addMultiple(tasks, first);
      };
      this.remove = function() {
        var first2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
        var task = first2 ? _this.tasks.list.shift() : _this.tasks.list.pop();
        _this.tasks.total = _this.tasks.list.length + _this.tasks.completed;
        _PrivateFunctions.removeCheck.call(_this);
        return task;
      };
      this.removeFirst = function() {
        _this.remove(true);
      };
      this.removeAt = function(index) {
        var task = _this.tasks.list.splice(index, 1);
        _this.tasks.total = _this.tasks.list.length + _this.tasks.completed;
        _PrivateFunctions.removeCheck.call(_this);
        return task;
      };
      this.removeAll = function() {
        _this.tasks.list = [];
        _this.tasks.total = _this.tasks.completed;
        _PrivateFunctions.removeCheck.call(_this);
        return _this.tasks.list;
      };
    }, _temp);
    exports.default = TaskRunner;
    module.exports = exports["default"];
  }
});
export default require_lib();
//# sourceMappingURL=concurrent-tasks.js.map
