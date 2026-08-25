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
async function logAction(action, detail) {
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
