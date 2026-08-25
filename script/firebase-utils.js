// C7AIO Firebase Realtime Database CRUD & Sync Utilities
// Tự động đồng bộ giữa Cloud Database và LocalStorage Cache

const DB_PATHS = {
  TASKS: 'class_data/tasks',
  SCHEDULES: 'class_data/schedules',
  NOTIFICATIONS: 'class_data/notifications',
  WEEK_METADATA: 'class_data/week_metadata',
  STUDENTS: 'class_data/students',
  PERMISSIONS: 'class_data/permissions',
  LOGS: 'class_data/logs'
};

/**
 * Đăng ký lắng nghe thay đổi dữ liệu Realtime
 */
function listenToPath(path, callback, localStorageKey) {
  const db = getDatabaseRef();
  if (!db) {
    if (localStorageKey) {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        try { callback(JSON.parse(cached)); } catch (e) {}
      }
    }
    return () => {};
  }

  const ref = db.ref(path);
  const listener = ref.on('value', (snapshot) => {
    const val = snapshot.val();
    if (val !== null) {
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify(val));
      }
      callback(val);
    }
  }, (error) => {
    console.warn(`Lỗi lắng nghe đường dẫn ${path}:`, error);
    if (localStorageKey) {
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        try { callback(JSON.parse(cached)); } catch (e) {}
      }
    }
  });

  return () => ref.off('value', listener);
}

/**
 * Lưu dữ liệu lên Realtime Database và cập nhật LocalStorage
 */
async function saveToPath(path, data, localStorageKey) {
  if (localStorageKey) {
    localStorage.setItem(localStorageKey, JSON.stringify(data));
  }

  const db = getDatabaseRef();
  if (db) {
    try {
      await db.ref(path).set(data);
      return true;
    } catch (e) {
      console.warn(`Không thể ghi dữ liệu lên ${path}:`, e);
      return false;
    }
  }
  return true;
}

// Tasks sync
function onSharedTasksChanged(callback) {
  return listenToPath(DB_PATHS.TASKS, (val) => {
    const arr = Array.isArray(val) ? val : (val ? Object.values(val) : []);
    callback(arr);
  }, 'c7aio_tasks_cache');
}

async function saveSharedTask(task) {
  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const idx = tasks.findIndex(t => String(t.id) === String(task.id));
  if (idx >= 0) tasks[idx] = task;
  else tasks.unshift(task);
  return saveToPath(DB_PATHS.TASKS, tasks, 'c7aio_tasks_cache');
}

async function deleteSharedTask(taskId) {
  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const updated = tasks.filter(t => String(t.id) !== String(taskId));
  return saveToPath(DB_PATHS.TASKS, updated, 'c7aio_tasks_cache');
}

async function updateSharedTaskCompletion(taskId, completions) {
  const tasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const task = tasks.find(t => String(t.id) === String(taskId));
  if (task) {
    task.completions = completions;
    return saveToPath(DB_PATHS.TASKS, tasks, 'c7aio_tasks_cache');
  }
  return false;
}

// Schedules sync
function onSharedSchedulesChanged(callback) {
  return listenToPath(DB_PATHS.SCHEDULES, callback, 'c7aio_schedules_cache');
}

async function saveSharedSchedules(schedules) {
  return saveToPath(DB_PATHS.SCHEDULES, schedules, 'c7aio_schedules_cache');
}

// Notifications sync
function onSharedNotificationsChanged(callback) {
  return listenToPath(DB_PATHS.NOTIFICATIONS, (val) => {
    const arr = Array.isArray(val) ? val : (val ? Object.values(val) : []);
    callback(arr);
  }, 'c7aio_notifications_cache');
}

async function saveSharedNotification(notif) {
  const notifs = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
  const idx = notifs.findIndex(n => String(n.id) === String(notif.id));
  if (idx >= 0) notifs[idx] = notif;
  else notifs.unshift(notif);
  return saveToPath(DB_PATHS.NOTIFICATIONS, notifs, 'c7aio_notifications_cache');
}

async function deleteSharedNotification(notifId) {
  const notifs = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
  const updated = notifs.filter(n => String(n.id) !== String(notifId));
  return saveToPath(DB_PATHS.NOTIFICATIONS, updated, 'c7aio_notifications_cache');
}

async function updateSharedNotificationCompletion(notifId, completions) {
  const notifs = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
  const notif = notifs.find(n => String(n.id) === String(notifId));
  if (notif) {
    notif.completions = completions;
    return saveToPath(DB_PATHS.NOTIFICATIONS, notifs, 'c7aio_notifications_cache');
  }
  return false;
}

// Week metadata sync
function onSharedWeekMetadataChanged(callback) {
  return listenToPath(DB_PATHS.WEEK_METADATA, callback, 'c7aio_weekMetadata_cache');
}

async function saveSharedWeekMetadata(metadata) {
  return saveToPath(DB_PATHS.WEEK_METADATA, metadata, 'c7aio_weekMetadata_cache');
}

// Students profile sync
function onSharedStudentsChanged(callback) {
  return listenToPath(DB_PATHS.STUDENTS, callback, 'c7aio_students_cache');
}

async function saveSharedStudents(studentsList) {
  return saveToPath(DB_PATHS.STUDENTS, studentsList, 'c7aio_students_cache');
}

// Permissions sync
function onSharedPermissionsChanged(callback) {
  return listenToPath(DB_PATHS.PERMISSIONS, callback, 'c7aio_permissions_cache');
}

async function saveSharedPermissions(permConfig) {
  return saveToPath(DB_PATHS.PERMISSIONS, permConfig, 'c7aio_permissions_cache');
}

// System activity logs sync
function onSharedLogsChanged(callback) {
  return listenToPath(DB_PATHS.LOGS, (val) => {
    const arr = Array.isArray(val) ? val : (val ? Object.values(val) : []);
    callback(arr);
  }, 'c7aio_logs_cache');
}

async function logAction(action, detail) {
  const user = getCurrentUser() || { name: 'Ẩn danh', role: 'guest' };
  const roleText = Array.isArray(user.role) ? user.role.join(', ') : (user.role || 'guest');
  const newLog = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: user.name,
    role: roleText,
    action: action,
    detail: detail
  };

  const logs = JSON.parse(localStorage.getItem('c7aio_logs_cache')) || [];
  logs.unshift(newLog);
  if (logs.length > 150) logs.pop(); // Giới hạn 150 bản ghi
  return saveToPath(DB_PATHS.LOGS, logs, 'c7aio_logs_cache');
}
