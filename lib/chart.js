/*!
 * Chart.js v3.9.1
 * https://www.chartjs.org
 * (c) 2022 Chart.js Contributors
 * Released under the MIT License
 */
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
typeof define === 'function' && define.amd ? define(factory) :
(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Chart = factory());
})(this, (function () { 'use strict';

function fontString(pixelSize, fontStyle, fontFamily) {
  return fontStyle + ' ' + pixelSize + 'px ' + fontFamily;
}
const requestAnimFrame = (function() {
  if (typeof window === 'undefined') {
    return function(callback) {
      return callback();
    };
  }
  return window.requestAnimationFrame;
}());
function throttled(fn, thisArg, updateFn) {
  const updateArgs = updateFn || ((args) => Array.prototype.slice.call(args));
  let ticking = false;
  let args = [];
  return function(...rest) {
    args = updateArgs(rest);
    if (!ticking) {
      ticking = true;
      requestAnimFrame.call(window, () => {
        ticking = false;
        fn.apply(thisArg, args);
      });
    }
  };
}
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    if (delay) {
      clearTimeout(timeout);
      timeout = setTimeout(fn, delay, args);
    } else {
      fn.apply(this, args);
    }
    return delay;
  };
}
const _toLeftRightCenter = (align) => align === 'start' ? 'left' : align === 'end' ? 'right' : 'center';
const _alignStartEnd = (align, start, end) => align === 'start' ? start : align === 'end' ? end : (start + end) / 2;
const _textX = (align, left, right, rtl) => {
  const check = rtl ? 'left' : 'right';
  return align === check ? right : align === 'center' ? (left + right) / 2 : left;
};

class Animator {
  constructor() {
    this._request = null;
    this._charts = new Map();
    this._running = false;
    this._lastDate = undefined;
  }
  _notify(chart, anims, date, type) {
    const callbacks = anims.listeners[type];
    const numSteps = anims.duration;
    callbacks.forEach(fn => fn({
      chart,
      initial: anims.initial,
      numSteps,
      currentStep: Math.min(date - anims.start, numSteps)
    }));
  }
  _refresh() {
    if (this._request) {
      return;
    }
    this._running = true;
    this._request = requestAnimFrame.call(window, () => {
      this._update();
      this._request = null;
      if (this._running) {
        this._refresh();
      }
    });
  }
  _update(date = Date.now()) {
    let remaining = 0;
    this._charts.forEach((anims, chart) => {
      if (!anims.running || !anims.items.length) {
        return;
      }
      const items = anims.items;
      let i = items.length - 1;
      let draw = false;
      let item;
      for (; i >= 0; --i) {
        item = items[i];
        if (item._active) {
          if (item._total > anims.duration) {
            anims.duration = item._total;
          }
          item.tick(date);
          draw = true;
        } else {
          items[i] = items[items.length - 1];
          items.pop();
        }
      }
      if (draw) {
        chart.draw();
        this._notify(chart, anims, date, 'progress');
      }
      if (!items.length) {
        anims.running = false;
        this._notify(chart, anims, date, 'complete');
        anims.initial = false;
      }
      remaining += items.length;
    });
    this._lastDate = date;
    if (remaining === 0) {
      this._running = false;
    }
  }
  _getAnims(chart) {
    const charts = this._charts;
    let anims = charts.get(chart);
    if (!anims) {
      anims = {
        running: false,
        initial: true,
        items: [],
        listeners: {
          complete: [],
          progress: []
        }
      };
      charts.set(chart, anims);
    }
    return anims;
  }
  listen(chart, event, cb) {
    this._getAnims(chart).listeners[event].push(cb);
  }
  add(chart, items) {
    if (!items || !items.length) {
      return;
    }
    this._getAnims(chart).items.push(...items);
  }
  has(chart) {
    return this._getAnims(chart).items.length > 0;
  }
  start(chart) {
    const anims = this._charts.get(chart);
    if (!anims) {
      return;
    }
    anims.running = true;
    anims.start = Date.now();
    anims.duration = anims.items.reduce((acc, cur) => Math.max(acc, cur._duration), 0);
    this._refresh();
  }
  running(chart) {
    if (!this._running) {
      return false;
    }
    const anims = this._charts.get(chart);
    if (!anims || !anims.running || !anims.items.length) {
      return false;
    }
    return true;
  }
  stop(chart) {
    const anims = this._charts.get(chart);
    if (!anims || !anims.items.length) {
      return;
    }
    const items = anims.items;
    let i = items.length - 1;
    for (; i >= 0; --i) {
      items[i].cancel();
    }
    anims.items = [];
    this._notify(chart, anims, Date.now(), 'complete');
  }
  remove(chart) {
    return this._charts.delete(chart);
  }
}
var animator = new Animator();

// Basic implementation of the line chart
class Chart {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    this.data = config.data || {};
    this.options = config.options || {};
    this.plugins = [];
    this.platform = {
      acquireContext: () => ctx
    };
    this.scales = {};
    this.metasets = [];
    this.controller = {
      reset: () => {}
    };
    this.animator = animator;
    this._plugins = [];
    this.$proxies = {};
    this._metasets = [];
    this.$animations = {};
  }

  // Basic rendering method
  draw() {
    const ctx = this.ctx;
    const data = this.data;
    const options = this.options;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw background
    ctx.fillStyle = options.backgroundColor || 'white';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw bars for bar chart
    if (this.config.type === 'bar') {
      const dataset = data.datasets[0];
      const labels = data.labels || [];
      const barWidth = ctx.canvas.width / labels.length * 0.8;
      const maxValue = Math.max(...dataset.data);
      
      ctx.fillStyle = dataset.backgroundColor || 'rgba(255, 0, 0, 0.7)';
      
      dataset.data.forEach((value, index) => {
        const x = index * (ctx.canvas.width / labels.length) + (ctx.canvas.width / labels.length - barWidth) / 2;
        const height = (value / maxValue) * (ctx.canvas.height - 50);
        const y = ctx.canvas.height - height - 30;
        
        ctx.fillRect(x, y, barWidth, height);
        
        // Draw label
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(labels[index], x + barWidth / 2, ctx.canvas.height - 10);
        
        // Reset fill style for next bar
        ctx.fillStyle = dataset.backgroundColor || 'rgba(255, 0, 0, 0.7)';
      });
      
      // Draw y-axis labels
      ctx.fillStyle = 'black';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 5; i++) {
        const value = maxValue * (i / 5);
        const y = ctx.canvas.height - (value / maxValue) * (ctx.canvas.height - 50) - 30;
        ctx.fillText(value.toFixed(0), 30, y);
      }
    }
  }

  // Method to update the chart
  update(mode) {
    this.draw();
    return this;
  }

  // Method to destroy the chart
  destroy() {
    this.animator.remove(this);
    return this;
  }
}

// Export the Chart class
return Chart;

}));