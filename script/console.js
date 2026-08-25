/**
 * C7AIO Console & Diagnostic Logger
 * Cung cấp tiện ích log và giám sát kết nối cho hệ thống
 */

window.C7Console = {
  log: function(...args) {
    console.log('[C7AIO]', ...args);
  },
  warn: function(...args) {
    console.warn('[C7AIO Warning]', ...args);
  },
  error: function(...args) {
    console.error('[C7AIO Error]', ...args);
  },
  info: function(...args) {
    console.info('[C7AIO Info]', ...args);
  }
};
