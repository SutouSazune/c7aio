// Firebase Utilities - Cung cấp các hàm tiện ích cho Firebase Realtime Database & Offline Cache
// Hỗ trợ Realtime 2-chiều + Offline LocalStorage + Transaction an toàn

const db = typeof firebase !== 'undefined' && firebase.database ? firebase.database() : null;
const auth = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null;

// ============= SHARED DATA (SYNC REALTIME) =============

// --- SHARED STUDENTS ---
function onSharedStudentsChanged(callback) {
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
  if (!db) return;\n  try {\n    const taskId = String(task.id || Date.now());\n    task.id = taskId;\n    task.updatedAt = new Date().toISOString();\n    await db.ref(`shared/tasks/${taskId}`).set(task);\n    console.log('✅ Đã lưu task lên Firebase:', task.name);\n  } catch (error) {\n    console.error('❌ Lỗi lưu task:', error);\n    if (typeof showToast === 'function') showToast('Lỗi khi lưu nhiệm vụ!', 'error');\n  }\n}\n\nasync function deleteSharedTask(taskId) {\n  if (!db) return;\n  try {\n    await db.ref(`shared/tasks/${taskId}`).remove();\n    console.log('✅ Đã xóa task trên Firebase:', taskId);\n  } catch (error) {\n    console.error('❌ Lỗi xóa task:', error);\n  }\n}\n\nasync function updateSharedTaskCompletion(taskId, completions) {\n  if (!db) return;\n  try {\n    await db.ref(`shared/tasks/${taskId}/completions`).set(completions);\n  } catch (error) {\n    console.error('❌ Lỗi cập nhật trạng thái task:', error);\n  }\n}\n\n// --- SHARED NOTIFICATIONS ---\nfunction onSharedNotificationsChanged(callback) {\n  if (!db) {\n    const cached = JSON.parse(localStorage.getItem('c7aio_notifications_cache') || '[]');\n    callback(cached);\n    return () => {};\n  }\n\n  const ref = db.ref('shared/notifications');\n  const listener = ref.on('value', snapshot => {\n    const notifications = [];\n    snapshot.forEach(child => {\n      const val = child.val();\n      if (val) {\n        notifications.push({\n          id: String(val.id || child.key),\n          createdAt: val.createdAt || new Date().toISOString(),\n          ...val\n        });\n      }\n    });\n    // Ghim thông báo pinned lên đầu, sau đó sắp xếp theo ngày tạo mới nhất\n    notifications.sort((a, b) => {\n      if (a.pinned && !b.pinned) return -1;\n      if (!a.pinned && b.pinned) return 1;\n      return new Date(b.createdAt) - new Date(a.createdAt);\n    });\n    localStorage.setItem('c7aio_notifications_cache', JSON.stringify(notifications));\n    callback(notifications);\n  }, (error) => {\n    console.error('❌ Lỗi sync notifications:', error);\n  });\n\n  return () => ref.off('value', listener);\n}\n\nasync function saveSharedNotification(notification) {\n  if (!db) return;\n  try {\n    const notifId = String(notification.id || Date.now());\n    notification.id = notifId;\n    notification.updatedAt = new Date().toISOString();\n    await db.ref(`shared/notifications/${notifId}`).set(notification);\n    console.log('✅ Đã lưu thông báo lên Firebase');\n  } catch (error) {\n    console.error('❌ Lỗi lưu thông báo:', error);\n    if (typeof showToast === 'function') showToast('Lỗi lưu thông báo!', 'error');\n  }\n}\n\nasync function deleteSharedNotification(notifId) {\n  if (!db) return;\n  try {\n    await db.ref(`shared/notifications/${notifId}`).remove();\n  } catch (error) {\n    console.error('❌ Lỗi xóa thông báo:', error);\n  }\n}\n\nasync function updateSharedNotificationCompletion(notifId, completions) {\n  if (!db) return;\n  try {\n    await db.ref(`shared/notifications/${notifId}/completions`).set(completions);\n  } catch (error) {\n    console.error('❌ Lỗi cập nhật trạng thái thông báo:', error);\n  }\n}\n\n// --- SHARED SCHEDULES (LỊCH HỌC) ---\nfunction onSharedSchedulesChanged(callback) {\n  if (!db) {\n    const cached = JSON.parse(localStorage.getItem('c7aio_schedules_cache') || '{}');\n    callback(cached);\n    return () => {};\n  }\n\n  const ref = db.ref('shared/schedules');\n  const listener = ref.on('value', snapshot => {\n    const data = snapshot.val() || {};\n    localStorage.setItem('c7aio_schedules_cache', JSON.stringify(data));\n    callback(data);\n  }, (error) => {\n    console.error('❌ Lỗi sync lịch học:', error);\n  });\n\n  return () => ref.off('value', listener);\n}\n\nasync function saveSharedSchedules(schedules) {\n  if (!db) return;\n  try {\n    await db.ref('shared/schedules').transaction((currentData) => {\n      if (currentData && Object.keys(currentData).length > 0 && (!schedules || Object.keys(schedules).length === 0)) {\n        console.warn('⛔ Transaction blocked: Ngăn chặn ghi đè lịch học bằng dữ liệu rỗng.');\n        return;\n      }\n      return schedules;\n    });\n    localStorage.setItem('c7aio_schedules_cache', JSON.stringify(schedules));\n    console.log('✅ Đã lưu lịch học (Safe Sync)');\n  } catch (error) {\n    console.error('❌ Lỗi lưu lịch học:', error);\n  }\n}\n\n// --- SHARED WEEK METADATA ---\nfunction onSharedWeekMetadataChanged(callback) {\n  if (!db) {\n    const cached = JSON.parse(localStorage.getItem('c7aio_weekMetadata_cache') || '{}');\n    callback(cached);\n    return () => {};\n  }\n\n  const ref = db.ref('shared/weekMetadata');\n  const listener = ref.on('value', snapshot => {\n    const data = snapshot.val() || {};\n    localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(data));\n    callback(data);\n  });\n\n  return () => ref.off('value', listener);\n}\n\nasync function saveSharedWeekMetadata(metadata) {\n  if (!db) return;\n  try {\n    await db.ref('shared/weekMetadata').set(metadata);\n    localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(metadata));\n    console.log('✅ Đã lưu thông tin tuần lên Firebase');\n  } catch (error) {\n    console.error('❌ Lỗi lưu thông tin tuần:', error);\n  }\n}\n\n// --- SHARED INPUT HISTORY ---\nfunction onSharedInputHistoryChanged(callback) {\n  if (!db) return () => {};\n  const ref = db.ref('shared/inputHistory');\n  const listener = ref.on('value', snapshot => {\n    const data = snapshot.val() || {};\n    localStorage.setItem('c7aio_inputHistory_cache', JSON.stringify(data));\n    callback(data);\n  });\n  return () => ref.off('value', listener);\n}\n\nasync function saveSharedInputHistory(type, list) {\n  if (!db) return;\n  try {\n    await db.ref(`shared/inputHistory/${type}`).set(list);\n  } catch (error) {\n    console.error(`❌ Lỗi lưu history ${type}:`, error);\n  }\n}\n\n// --- SHARED LOGS (NHẬT KÝ HOẠT ĐỘNG) ---\nasync function logAction(action, detail) {\n  if (!db) return;\n  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;\n\n  let roleDisplay = 'Khách';\n  if (user) {\n    const roles = Array.isArray(user.role) ? user.role : [user.role || 'student'];\n    roleDisplay = roles.map(r => (typeof ROLES !== 'undefined' && ROLES[r]) ? ROLES[r] : r).join(', ');\n  }\n\n  const logEntry = {\n    id: Date.now(),\n    user: user ? user.name : 'Unknown',\n    role: roleDisplay,\n    action: action,\n    detail: detail,\n    timestamp: new Date().toISOString()\n  };\n\n  try {\n    await db.ref('shared/logs').push(logEntry);\n    console.log('📝 Logged:', action);\n  } catch (error) {\n    console.error('❌ Lỗi ghi log:', error);\n  }\n}\n\nfunction onSharedLogsChanged(callback) {\n  if (!db) return () => {};\n  const ref = db.ref('shared/logs').limitToLast(150);\n  const listener = ref.on('value', snapshot => {\n    const logs = [];\n    snapshot.forEach(child => {\n      logs.push(child.val());\n    });\n    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));\n    callback(logs);\n  });\n  return () => ref.off('value', listener);\n}\n\n// --- SHARED PERMISSIONS (PHÂN QUYỀN) ---\nfunction onSharedPermissionsChanged(callback) {\n  if (!db) {\n    const cached = JSON.parse(localStorage.getItem('c7aio_permissions_cache') || 'null');\n    if (cached) callback(cached);\n    return () => {};\n  }\n\n  const ref = db.ref('shared/permissions');\n  const listener = ref.on('value', snapshot => {\n    const data = snapshot.val();\n    if (data) {\n      localStorage.setItem('c7aio_permissions_cache', JSON.stringify(data));\n      callback(data);\n    }\n  });\n\n  return () => ref.off('value', listener);\n}\n\nasync function saveSharedPermissions(perms) {\n  if (!db) return;\n  try {\n    await db.ref('shared/permissions').set(perms);\n    localStorage.setItem('c7aio_permissions_cache', JSON.stringify(perms));\n    logAction('Cập nhật quyền hạn', 'Thay đổi bảng phân quyền hệ thống');\n    console.log('✅ Đã lưu phân quyền lên Firebase');\n  } catch (error) {\n    console.error('❌ Lỗi lưu phân quyền:', error);\n    if (typeof showToast === 'function') showToast('Lỗi khi lưu phân quyền!', 'error');\n  }\n}\n\nconsole.log('📱 Firebase Utilities (C7AIO Pro) Loaded');\n