// Firebase Utilities - Cung cấp các hàm tiện ích cho Firebase Realtime Database & Offline Cache
// Hỗ trợ Realtime 2-chiều + Offline LocalStorage + Transaction an toàn

function getDb() {
  if (typeof window !== 'undefined' && window.db) return window.db;
  if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
    try {
      const d = firebase.database();
      if (typeof window !== 'undefined') window.db = d;
      return d;
    } catch (e) {}
  }
  return null;
}

function getAuth() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    try { return firebase.auth(); } catch (e) {}
  }
  return null;
}

// ============= SHARED DATA (SYNC REALTIME) =============

// --- SHARED STUDENTS ---
function onSharedStudentsChanged(callback) {
  const db = getDb();
  if (!db) {
    console.warn('⚠️ Firebase DB chưa khởi tạo');
    const cached = JSON.parse(localStorage.getItem('c7aio_students_cache') || '[]');
    callback(cached && cached.length > 0 ? cached : (typeof DEFAULT_STUDENTS !== 'undefined' ? DEFAULT_STUDENTS : []));
    return () => {};
  }

  const ref = db.ref('shared/students');
  const listener = ref.on('value', (snapshot) => {
    const val = snapshot.val();
    let data = [];
    if (Array.isArray(val)) {
      data = val.filter(item => item !== null && item !== undefined);
    } else if (val && typeof val === 'object') {
      data = Object.values(val);
    }

    // Kiểm tra xem dữ liệu đã là danh sách 11C7 chuẩn (41 học sinh, có Thiên Ân, có previousClass)
    const isUpToDate11C7 = data.length === 41 && 
                           data.some(s => s.name === "Nguyễn Ngọc Thiên Ân") && 
                           data.every(s => s.previousClass);

    if (!isUpToDate11C7 && typeof DEFAULT_STUDENTS !== 'undefined' && DEFAULT_STUDENTS.length >= 41) {
      console.log('🔄 Nâng cấp dữ liệu Firebase lên danh sách 11C7 (41 học sinh) và bảo lưu thông tin cũ...');
      
      // Lưu trữ bản sao dữ liệu lớp cũ 10C7 để giữ vết lịch sử
      if (data.length > 0 && db) {
        db.ref('shared/archive/class_10c7').set({
          archivedAt: new Date().toISOString(),
          totalStudents: data.length,
          students: data
        });
      }

      // Ghép thông tin liên lạc / chức vụ đã có từ danh sách cũ
      const oldMap = new Map();
      data.forEach(oldStd => {
        if (oldStd && oldStd.name) {
          oldMap.set(oldStd.name.toLowerCase().trim(), oldStd);
        }
      });

      const mergedStudents = DEFAULT_STUDENTS.map(newStd => {
        const oldStd = oldMap.get((newStd.name || '').toLowerCase().trim());
        if (oldStd) {
          return {
            ...newStd,
            phone: oldStd.phone || newStd.phone || '',
            email: oldStd.email || newStd.email || '',
            address: oldStd.address || newStd.address || '',
            role: (oldStd.role && oldStd.role.length > 0 && oldStd.role[0] !== 'student') ? oldStd.role : newStd.role,
            group: oldStd.group || newStd.group || 1
          };
        }
        return newStd;
      });

      data = mergedStudents;
      saveSharedStudents(mergedStudents);

      if (typeof logAction === 'function') {
        logAction('Cập nhật hệ thống', 'Chuyển đổi dữ liệu sang lớp 11C7 năm học 2026-2027 (41 học sinh, lưu vết lớp cũ 10C7/10C9 và lưu trữ danh sách cũ)');
      }
    }

    if (data.length > 0) {
      localStorage.setItem('c7aio_students_cache', JSON.stringify(data));
      if (typeof STUDENTS !== 'undefined') {
        STUDENTS = data;
      }
    }
    console.log('📥 Sync học sinh:', data.length);
    callback(data);
  }, (error) => {
    console.error('❌ Lỗi sync học sinh:', error);
  });

  return () => ref.off('value', listener);
}

async function saveSharedStudents(studentsList) {
  const db = getDb();
  if (!db) return;
  try {
    const cleanList = Array.isArray(studentsList) ? studentsList.filter(Boolean) : [];
    await db.ref('shared/students').transaction((currentData) => {
      // Chặn ghi đè rỗng nếu server đang có dữ liệu
      if (currentData && currentData.length > 0 && cleanList.length === 0) {
        console.warn('⛔ Transaction blocked: Ngăn chặn ghi đè danh sách học sinh rỗng.');
        return;
      }
      return cleanList;
    });
    localStorage.setItem('c7aio_students_cache', JSON.stringify(cleanList));
    console.log('✅ Đã đồng bộ danh sách học sinh (Safe Sync)');
  } catch (error) {
    console.error('❌ Lỗi lưu học sinh:', error);
    if (typeof showToast === 'function') {
      showToast('Không thể lưu danh sách học sinh. Vui lòng kiểm tra mạng.', 'error');
    }
  }
}

// --- SHARED TASKS ---
function onSharedTasksChanged(callback) {
  const db = getDb();
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_tasks_cache') || '[]');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/tasks');
  const listener = ref.on('value', snapshot => {
    const tasks = [];
    snapshot.forEach(child => {
      const task = child.val();
      if (task) {
        tasks.push({ id: child.key, ...task });
      }
    });
    tasks.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    localStorage.setItem('c7aio_tasks_cache', JSON.stringify(tasks));
    callback(tasks);
  }, (error) => {
    console.error('❌ Lỗi sync tasks:', error);
  });

  return () => ref.off('value', listener);
}

async function saveSharedTask(task) {
  const db = getDb();
  if (!db) return;
  try {
    const taskId = String(task.id || Date.now());
    task.id = taskId;
    task.updatedAt = new Date().toISOString();
    await db.ref(`shared/tasks/${taskId}`).set(task);
    console.log('✅ Đã lưu task lên Firebase:', task.name);
  } catch (error) {
    console.error('❌ Lỗi lưu task:', error);
    if (typeof showToast === 'function') showToast('Lỗi khi lưu nhiệm vụ!', 'error');
  }
}

async function deleteSharedTask(taskId) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref(`shared/tasks/${taskId}`).remove();
    console.log('✅ Đã xóa task trên Firebase:', taskId);
  } catch (error) {
    console.error('❌ Lỗi xóa task:', error);
  }
}

async function updateSharedTaskCompletion(taskId, completions) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref(`shared/tasks/${taskId}/completions`).set(completions);
  } catch (error) {
    console.error('❌ Lỗi cập nhật trạng thái task:', error);
  }
}

// --- SHARED NOTIFICATIONS ---
function onSharedNotificationsChanged(callback) {
  const db = getDb();
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_notifications_cache') || '[]');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/notifications');
  const listener = ref.on('value', snapshot => {
    const notifications = [];
    snapshot.forEach(child => {
      const val = child.val();
      if (val) {
        notifications.push({
          id: String(val.id || child.key),
          createdAt: val.createdAt || new Date().toISOString(),
          ...val
        });
      }
    });
    // Ghim thông báo pinned lên đầu, sau đó sắp xếp theo ngày tạo mới nhất
    notifications.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    localStorage.setItem('c7aio_notifications_cache', JSON.stringify(notifications));
    callback(notifications);
  }, (error) => {
    console.error('❌ Lỗi sync notifications:', error);
  });

  return () => ref.off('value', listener);
}

async function saveSharedNotification(notification) {
  const db = getDb();
  if (!db) return;
  try {
    const notifId = String(notification.id || Date.now());
    notification.id = notifId;
    notification.updatedAt = new Date().toISOString();
    await db.ref(`shared/notifications/${notifId}`).set(notification);
    console.log('✅ Đã lưu thông báo lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu thông báo:', error);
    if (typeof showToast === 'function') showToast('Lỗi lưu thông báo!', 'error');
  }
}

async function deleteSharedNotification(notifId) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref(`shared/notifications/${notifId}`).remove();
  } catch (error) {
    console.error('❌ Lỗi xóa thông báo:', error);
  }
}

async function updateSharedNotificationCompletion(notifId, completions) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref(`shared/notifications/${notifId}/completions`).set(completions);
  } catch (error) {
    console.error('❌ Lỗi cập nhật trạng thái thông báo:', error);
  }
}

// --- SHARED SCHEDULES (LỊCH HỌC) ---
function onSharedSchedulesChanged(callback) {
  const db = getDb();
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_schedules_cache') || '{}');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/schedules');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_schedules_cache', JSON.stringify(data));
    callback(data);
  }, (error) => {
    console.error('❌ Lỗi sync lịch học:', error);
  });

  return () => ref.off('value', listener);
}

async function saveSharedSchedules(schedules) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref('shared/schedules').transaction((currentData) => {
      if (currentData && Object.keys(currentData).length > 0 && (!schedules || Object.keys(schedules).length === 0)) {
        console.warn('⛔ Transaction blocked: Ngăn chặn ghi đè lịch học bằng dữ liệu rỗng.');
        return;
      }
      return schedules;
    });
    localStorage.setItem('c7aio_schedules_cache', JSON.stringify(schedules));
    console.log('✅ Đã lưu lịch học (Safe Sync)');
  } catch (error) {
    console.error('❌ Lỗi lưu lịch học:', error);
  }
}

// --- SHARED WEEK METADATA ---
function onSharedWeekMetadataChanged(callback) {
  const db = getDb();
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_weekMetadata_cache') || '{}');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/weekMetadata');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(data));
    callback(data);
  });

  return () => ref.off('value', listener);
}

async function saveSharedWeekMetadata(metadata) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref('shared/weekMetadata').set(metadata);
    localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(metadata));
    console.log('✅ Đã lưu thông tin tuần lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu thông tin tuần:', error);
  }
}

// --- SHARED SCHEDULE EVENTS (THÔNG BÁO ĐỔI LỊCH) ---
function onSharedScheduleEventsChanged(callback) {
  const db = getDb();
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_schedule_events') || '{}');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/scheduleEvents');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_schedule_events', JSON.stringify(data));
    callback(data);
  });

  return () => ref.off('value', listener);
}

async function saveSharedScheduleEvents(events) {
  const db = getDb();
  // Always update local cache immediately
  localStorage.setItem('c7aio_schedule_events', JSON.stringify(events || {}));
  if (!db) return;
  try {
    await db.ref('shared/scheduleEvents').set(events || {});
    console.log('✅ Đã đồng bộ thông báo đổi lịch lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu thông báo đổi lịch Firebase:', error);
  }
}

// --- SHARED INPUT HISTORY ---
function onSharedInputHistoryChanged(callback) {
  const db = getDb();
  if (!db) return () => {};
  const ref = db.ref('shared/inputHistory');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_inputHistory_cache', JSON.stringify(data));
    callback(data);
  });
  return () => ref.off('value', listener);
}

async function saveSharedInputHistory(type, list) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref(`shared/inputHistory/${type}`).set(list);
  } catch (error) {
    console.error(`❌ Lỗi lưu history ${type}:`, error);
  }
}

// --- SHARED LOGS (NHẬT KÝ HOẠT ĐỘNG) ---
function getUserKey(user) {
  if (!user) return 'guest';
  if (user.id === 0 || user.isAdmin) return 'admin';
  return 'u' + String(user.id).replace(/[.#$\[\]\/]/g, '_');
}

function getDeviceInfo() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  let os = 'Khác', browser = 'Khác';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  return `${browser} / ${os} (${mobile ? 'Điện thoại' : 'Máy tính'})`;
}

function getRoleDisplay(user) {
  if (!user) return 'Khách';
  const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
  return roles.map(r => (typeof ROLES !== 'undefined' && ROLES[r]) ? ROLES[r] : r).join(', ');
}

function getPageName() {
  try {
    const p = window.location.pathname.split('/').filter(Boolean);
    return p.length ? p.slice(-2).join('/') : 'index';
  } catch (e) { return ''; }
}

async function logAction(action, detail, extra) {
  const db = getDb();
  if (!db) return;
  // Đọc user ngay (đồng bộ) để logout vẫn ghi đúng người
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  const logEntry = Object.assign({
    id: Date.now(),
    userKey: getUserKey(user),
    user: user ? user.name : 'Unknown',
    role: getRoleDisplay(user),
    action: action,
    detail: detail || '',
    page: getPageName(),
    device: getDeviceInfo(),
    timestamp: new Date().toISOString()
  }, extra || {});

  try {
    await db.ref('shared/logs').push(logEntry);
    console.log('📝 Logged:', action);
  } catch (error) {
    console.error('❌ Lỗi ghi log:', error);
  }
}

// Ghi nhận đăng nhập thành công + thống kê từng người dùng
async function logLogin(user) {
  const db = getDb();
  if (!user) return;
  logAction('Đăng nhập', 'Đăng nhập thành công', { type: 'login' });
  if (!db) return;
  try {
    const now = new Date().toISOString();
    await db.ref(`shared/userStats/${getUserKey(user)}`).transaction(cur => {
      cur = cur || {};
      return Object.assign(cur, {
        name: user.name,
        role: getRoleDisplay(user),
        loginCount: (cur.loginCount || 0) + 1,
        firstLogin: cur.firstLogin || now,
        lastLogin: now,
        device: getDeviceInfo()
      });
    });
  } catch (e) { console.error('❌ Lỗi cập nhật thống kê user:', e); }
}

function logLoginFailed(name, isAdminAttempt) {
  const db = getDb();
  if (!db) return;
  db.ref('shared/logs').push({
    id: Date.now(),
    userKey: 'guest',
    user: name || 'Unknown',
    role: 'Khách',
    action: 'Đăng nhập thất bại',
    detail: isAdminAttempt ? 'Sai mã bảo mật Admin' : 'Sai ngày sinh xác thực',
    page: getPageName(),
    device: getDeviceInfo(),
    type: 'login_failed',
    timestamp: new Date().toISOString()
  }).catch(() => {});
}

function logLogout() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) return;
  logAction('Đăng xuất', 'Đăng xuất khỏi hệ thống', { type: 'logout' });
  stopPresence();
}

// --- PRESENCE (AI ĐANG ONLINE) ---
let _presenceTimer = null;
let _presenceRef = null;

function startPresence() {
  const db = getDb();
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!db || !user || _presenceRef) return;

  let sid = sessionStorage.getItem('c7aio_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('c7aio_sid', sid);
  }
  _presenceRef = db.ref(`shared/presence/${getUserKey(user)}/${sid}`);
  const statsSeenRef = db.ref(`shared/userStats/${getUserKey(user)}/lastSeen`);
  const beat = () => {
    _presenceRef.set({
      name: user.name,
      role: getRoleDisplay(user),
      page: getPageName(),
      device: getDeviceInfo(),
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).catch(() => {});
    statsSeenRef.set(firebase.database.ServerValue.TIMESTAMP).catch(() => {});
  };
  _presenceRef.onDisconnect().remove();
  statsSeenRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
  beat();
  _presenceTimer = setInterval(beat, 60000);

  // Ghi lượt truy cập trang (bỏ qua nếu reload cùng trang trong 30s)
  const page = getPageName();
  const last = JSON.parse(sessionStorage.getItem('c7aio_lastPv') || 'null');
  if (!last || last.page !== page || Date.now() - last.t > 30000) {
    logAction('Truy cập trang', page, { type: 'pageview' });
  }
  sessionStorage.setItem('c7aio_lastPv', JSON.stringify({ page, t: Date.now() }));
}

function stopPresence() {
  if (_presenceTimer) clearInterval(_presenceTimer);
  _presenceTimer = null;
  if (_presenceRef) {
    try { _presenceRef.remove(); } catch (e) {}
    _presenceRef = null;
  }
}

function onSharedPresenceChanged(callback) {
  const db = getDb();
  if (!db) return () => {};
  const ref = db.ref('shared/presence');
  const listener = ref.on('value', snap => callback(snap.val() || {}));
  return () => ref.off('value', listener);
}

function onSharedUserStatsChanged(callback) {
  const db = getDb();
  if (!db) return () => {};
  const ref = db.ref('shared/userStats');
  const listener = ref.on('value', snap => callback(snap.val() || {}));
  return () => ref.off('value', listener);
}

// Admin: xóa log cũ hơn N ngày
async function clearOldLogs(days) {
  const db = getDb();
  if (!db) return 0;
  const cutoff = Date.now() - days * 86400000;
  const snap = await db.ref('shared/logs').once('value');
  const updates = {};
  let n = 0;
  snap.forEach(child => {
    const v = child.val();
    if (v && new Date(v.timestamp).getTime() < cutoff) { updates[child.key] = null; n++; }
  });
  if (n) await db.ref('shared/logs').update(updates);
  return n;
}

function onSharedLogsChanged(callback, limit) {
  const db = getDb();
  if (!db) return () => {};
  const ref = db.ref('shared/logs').limitToLast(limit || 500);
  const listener = ref.on('value', snapshot => {
    const logs = [];
    snapshot.forEach(child => {
      logs.push(child.val());
    });
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    callback(logs);
  });
  return () => ref.off('value', listener);
}

// --- SHARED PERMISSIONS (PHÂN QUYỀN) ---
function onSharedPermissionsChanged(callback) {
  const db = getDb();
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_permissions_cache') || 'null');
    if (cached) callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/permissions');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val();
    if (data) {
      localStorage.setItem('c7aio_permissions_cache', JSON.stringify(data));
      callback(data);
    }
  });

  return () => ref.off('value', listener);
}

async function saveSharedPermissions(perms) {
  const db = getDb();
  if (!db) return;
  try {
    await db.ref('shared/permissions').set(perms);
    localStorage.setItem('c7aio_permissions_cache', JSON.stringify(perms));
    logAction('Cập nhật quyền hạn', 'Thay đổi bảng phân quyền hệ thống');
    console.log('✅ Đã lưu phân quyền lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu phân quyền:', error);
    if (typeof showToast === 'function') showToast('Lỗi khi lưu phân quyền!', 'error');
  }
}

// --- CUSTOM ROLES MANAGEMENT (QUẢN LÝ VAI TRÒ TÙY CHỈNH) ---
function onSharedCustomRolesChanged(callback) {
  const db = getDb();
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_custom_roles_cache') || '{}');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/custom_roles');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_custom_roles_cache', JSON.stringify(data));
    callback(data);
  });

  return () => ref.off('value', listener);
}

async function saveSharedCustomRole(roleKey, roleData) {
  const cached = JSON.parse(localStorage.getItem('c7aio_custom_roles_cache') || '{}');
  cached[roleKey] = roleData;
  localStorage.setItem('c7aio_custom_roles_cache', JSON.stringify(cached));

  const db = getDb();
  if (!db) return;
  try {
    await db.ref(`shared/custom_roles/${roleKey}`).set(roleData);
    logAction('Thêm/Sửa vai trò', `Cập nhật chức vụ: ${roleData.name || roleKey}`);
  } catch (error) {
    console.error('❌ Lỗi lưu vai trò tùy chỉnh:', error);
    throw error;
  }
}

async function deleteSharedCustomRole(roleKey) {
  const cached = JSON.parse(localStorage.getItem('c7aio_custom_roles_cache') || '{}');
  cached[roleKey] = { deleted: true };
  localStorage.setItem('c7aio_custom_roles_cache', JSON.stringify(cached));

  const db = getDb();
  if (!db) return;
  try {
    await db.ref(`shared/custom_roles/${roleKey}`).set({ deleted: true });
    await db.ref(`shared/permissions/${roleKey}`).remove();
    logAction('Xóa vai trò', `Đã xóa chức vụ: ${roleKey}`);
  } catch (error) {
    console.error('❌ Lỗi xóa vai trò tùy chỉnh:', error);
    throw error;
  }
}

console.log('📱 Firebase Utilities (C7AIO Pro) Loaded');
