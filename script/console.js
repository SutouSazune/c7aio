/**
 * C7AIO Developer Console & Diagnostic Tools
 * Quản lý trạng thái kết nối, Cache LocalStorage, Debug Realtime Firebase
 */

const C7_CONSOLE = {
  version: '3.0.0-figma-pro',
  initialized: true,

  info() {
    const user = getCurrentUser();
    console.group('%c🚀 C7AIO Platform Diagnostics', 'color: #6366f1; font-weight: bold; font-size: 14px;');
    console.log('%cPhiên bản UI/UX:', 'font-weight: bold;', this.version);
    console.log('%cNgười dùng hiện tại:', 'font-weight: bold;', user ? `${user.name} (${user.role})` : 'Chưa đăng nhập');
    console.log('%cThời gian đăng nhập:', 'font-weight: bold;', getLoginTime() || 'N/A');
    console.log('%cQuyền quản trị Admin:', 'font-weight: bold;', isAdmin() ? 'Có' : 'Không');
    console.log('%cFirebase Realtime:', 'font-weight: bold;', isRealtimeConnected() ? '🟢 Đã kết nối' : '🔴 Ngoại tuyến');
    console.groupEnd();
  },

  dumpStorage() {
    console.group('📦 C7AIO LocalStorage Dump');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('c7aio_')) {
        console.log(`%c${key}:`, 'color: #06b6d4; font-weight: bold;', JSON.parse(localStorage.getItem(key)));
      }
    }
    console.groupEnd();
  },

  clearAllData() {
    if (confirm('CẢNH BÁO: Hành động này sẽ xóa toàn bộ dữ liệu tạm trên trình duyệt! Bạn có chắc không?')) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('c7aio_')) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log('🧹 Đã xóa toàn bộ bộ nhớ đệm C7AIO!');
      window.location.reload();
    }
  }
};

window.C7_CONSOLE = C7_CONSOLE;
console.log('%c[C7AIO Hub]%c Đã tải hệ thống v3.0.0. Nhập %cC7_CONSOLE.info()%c để xem thông số.', 'color: #6366f1; font-weight: bold;', 'color: inherit;', 'color: #06b6d4; font-weight: bold;', 'color: inherit;');
