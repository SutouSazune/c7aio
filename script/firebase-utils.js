/**
 * C7AIO Firebase Realtime Database Connector & Shared Sync Engine
 * Hỗ trợ đồng bộ đa người dùng cho Học sinh, Nhiệm vụ, Thời khóa biểu, Thông báo & Phân quyền
 */

// Global Realtime Listeners Map to manage unsubscribes
const activeListeners = {};

// Helper: Ensure string or safe JSON
function safeParse(data, fallback = null) {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    return fallback;
  }
}

// --- SHARED STUDENTS (HỌC SINH) ---
function onSharedStudentsChanged(callback) {
  if (!db) {
    console.warn('Firebase DB chưa sẵn sàng, dùng cache local');
    const cached = JSON.parse(localStorage.getItem('c7aio_students_cache') || '[]');
    callback(cached.length > 0 ? cached : (typeof STUDENTS !== 'undefined' ? STUDENTS : []));
    return () => {};
  }

  const ref = db.ref('shared/students');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val();
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('📥 Sync học sinh:', data.length);
      localStorage.setItem('c7aio_students_cache', JSON.stringify(data));
      if (typeof STUDENTS !== 'undefined') STUDENTS = data;
      callback(data);
    } else {
      // Khởi tạo dữ liệu mặc định lên Firebase nếu chưa có
      if (typeof DEFAULT_STUDENTS !== 'undefined' && DEFAULT_STUDENTS.length > 0) {
        console.log('Khởi tạo danh sách học sinh mặc định lên Firebase...');
        ref.set(DEFAULT_STUDENTS).then(() => {
          localStorage.setItem('c7aio_students_cache', JSON.stringify(DEFAULT_STUDENTS));
          callback(DEFAULT_STUDENTS);
        });
      }
    }
  });

  return () => ref.off('value', listener);
}

async function saveSharedStudents(studentsList) {
  if (!db) return;
  try {
    // Luôn lưu cache local trước
    localStorage.setItem('c7aio_students_cache', JSON.stringify(studentsList));
    if (typeof STUDENTS !== 'undefined') STUDENTS = studentsList;

    // Đẩy lên Firebase Realtime Database
    await db.ref('shared/students').set(studentsList);
    logAction('Cập nhật học sinh', `Đã lưu danh sách ${studentsList.length} học sinh`);
    console.log('✅ Đã đồng bộ danh sách học sinh (Safe Sync)');
  } catch (error) {
    console.error('❌ Lỗi lưu học sinh:', error);
    if (typeof showToast === 'function') showToast('Lỗi khi lưu lên Firebase!', 'error');
  }
}

// --- SHARED TASKS (NHIỆM VỤ) ---
function onSharedTasksChanged(callback) {
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_tasks_cache') || '[]');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/tasks');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val();
    const tasks = [];
    if (data) {
      if (Array.isArray(data)) {
        data.forEach(t => { if (t) tasks.push(t); });
      } else {
        Object.keys(data).forEach(k => {
          if (data[k]) tasks.push({ ...data[k], _fbKey: k });
        });
      }
    }
    localStorage.setItem('c7aio_tasks_cache', JSON.stringify(tasks));
    callback(tasks);
  });

  return () => ref.off('value', listener);
}

async function saveSharedTask(task) {
  if (!db) return;
  try {
    if (task.id) {
      await db.ref(`shared/tasks/${task.id}`).set(task);
      logAction('Thêm/Sửa nhiệm vụ', `Nhiệm vụ: ${task.name || task.title}`);
    }
  } catch (error) {
    console.error('❌ Lỗi lưu nhiệm vụ:', error);
    if (typeof showToast === 'function') showToast('Lỗi lưu nhiệm vụ!', 'error');
  }
}

async function deleteSharedTask(taskId) {
  if (!db) return;
  try {
    await db.ref(`shared/tasks/${taskId}`).remove();
    logAction('Xóa nhiệm vụ', `ID: ${taskId}`);
  } catch (error) {
    console.error('❌ Lỗi xóa nhiệm vụ:', error);
  }
}

// --- SHARED NOTIFICATIONS (THÔNG BÁO) ---
function onSharedNotificationsChanged(callback) {
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_notifications_cache') || '[]');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/notifications');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val();
    const notifs = [];
    if (data) {
      if (Array.isArray(data)) {
        data.forEach(n => { if (n) notifs.push(n); });
      } else {
        Object.keys(data).forEach(k => {
          if (data[k]) notifs.push({ ...data[k], _fbKey: k });
        });
      }
    }
    // Sắp xếp theo ngày giảm dần
    notifs.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    localStorage.setItem('c7aio_notifications_cache', JSON.stringify(notifs));
    callback(notifs);
  });

  return () => ref.off('value', listener);
}

async function saveSharedNotification(notif) {
  if (!db) return;
  try {
    const id = notif.id || Date.now();
    await db.ref(`shared/notifications/${id}`).set({ ...notif, id });
    logAction('Đăng thông báo', notif.message || notif.title || 'Thông báo mới');
  } catch (error) {
    console.error('❌ Lỗi lưu thông báo:', error);
  }
}

async function deleteSharedNotification(notifId) {
  if (!db) return;
  try {
    await db.ref(`shared/notifications/${notifId}`).remove();
    logAction('Xóa thông báo', `ID: ${notifId}`);
  } catch (error) {
    console.error('❌ Lỗi xóa thông báo:', error);
  }
}

// --- SHARED SCHEDULES (THỜI KHÓA BIỂU) ---
function onSharedSchedulesChanged(callback) {
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
  });

  return () => ref.off('value', listener);
}

async function saveSharedScheduleWeek(weekKey, weekData) {
  if (!db) return;
  try {
    await db.ref(`shared/schedules/${weekKey}`).set(weekData);
    logAction('Cập nhật TKB', `Tuần ${weekKey}`);
  } catch (error) {
    console.error('❌ Lỗi lưu TKB:', error);
  }
}

function onSharedWeekMetadataChanged(callback) {
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_week_metadata_cache') || '{}');
    callback(cached);
    return () => {};
  }

  const ref = db.ref('shared/weekMetadata');
  const listener = ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_week_metadata_cache', JSON.stringify(data));
    callback(data);
  });

  return () => ref.off('value', listener);
}

async function saveSharedWeekMetadata(meta) {
  if (!db) return;
  try {
    await db.ref('shared/weekMetadata').set(meta);
  } catch (error) {
    console.error('❌ Lỗi lưu metadata tuần:', error);
  }
}

// --- ACTIVITY LOGS (NHẬT KÝ HOẠT ĐỘNG) ---
async function logAction(action, detail = '') {
  if (!db) return;
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  let roleDisplay = 'Khách';
  if (user) {
    const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];
    roleDisplay = roles.map(r => (typeof ROLES !== 'undefined' && ROLES[r]) ? ROLES[r] : r).join(', ');
  }

  const logEntry = {
    id: Date.now(),
    user: user ? user.name : 'Unknown',
    role: roleDisplay,
    action: action,
    detail: detail,
    timestamp: new Date().toISOString()
  };

  try {
    await db.ref('shared/logs').push(logEntry);
    console.log('📝 Logged:', action);
  } catch (error) {
    console.error('❌ Lỗi ghi log:', error);
  }
}

function onSharedLogsChanged(callback) {
  if (!db) return () => {};
  const ref = db.ref('shared/logs').limitToLast(150);
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
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_custom_roles_cache') || '{}');
    cached[roleKey] = roleData;
    localStorage.setItem('c7aio_custom_roles_cache', JSON.stringify(cached));
    return;
  }
  try {
    await db.ref(`shared/custom_roles/${roleKey}`).set(roleData);
    logAction('Thêm/Sửa vai trò', `Cập nhật chức vụ: ${roleData.name || roleKey}`);
  } catch (error) {
    console.error('❌ Lỗi lưu vai trò tùy chỉnh:', error);
    throw error;
  }
}

async function deleteSharedCustomRole(roleKey) {
  if (!db) {
    const cached = JSON.parse(localStorage.getItem('c7aio_custom_roles_cache') || '{}');
    delete cached[roleKey];
    localStorage.setItem('c7aio_custom_roles_cache', JSON.stringify(cached));
    return;
  }
  try {
    await db.ref(`shared/custom_roles/${roleKey}`).remove();
    await db.ref(`shared/permissions/${roleKey}`).remove();
    logAction('Xóa vai trò', `Đã xóa chức vụ: ${roleKey}`);
  } catch (error) {
    console.error('❌ Lỗi xóa vai trò tùy chỉnh:', error);
    throw error;
  }
}

console.log('📱 Firebase Utilities (C7AIO Pro) Loaded');
