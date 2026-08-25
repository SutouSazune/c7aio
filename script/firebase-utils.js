/**
 * C7AIO Firebase Realtime Database Handlers & Utilities
 * Hỗ trợ đồng bộ dữ liệu Realtime Database an toàn, chống ghi đè rỗng
 */

const DB_PATHS = {
  STUDENTS: 'shared/students',
  TASKS: 'shared/tasks',
  NOTIFICATIONS: 'shared/notifications',
  SCHEDULES: 'shared/schedules',
  WEEK_METADATA: 'shared/weekMetadata',
  INPUT_HISTORY: 'shared/inputHistory',
  PERMISSIONS: 'shared/permissions',
  LOGS: 'shared/logs'
};

function getDbRef(path) {
  if (typeof database !== 'undefined' && database) {
    return database.ref(path);
  }
  return null;
}

// ==================== STUDENTS ====================
async function saveSharedStudents(studentsList) {
  if (!studentsList || !studentsList.length) return false;
  localStorage.setItem('c7aio_students_cache', JSON.stringify(studentsList));

  const ref = getDbRef(DB_PATHS.STUDENTS);
  if (ref) {
    try {
      await ref.set(studentsList);
      return true;
    } catch (e) {
      console.error('Error saving students to Firebase:', e);
    }
  }
  return false;
}

function onSharedStudentsChanged(callback) {
  const cached = localStorage.getItem('c7aio_students_cache');
  if (cached) {
    try { callback(JSON.parse(cached)); } catch(e) {}
  }

  const ref = getDbRef(DB_PATHS.STUDENTS);
  if (ref) {
    ref.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val && Array.isArray(val) && val.length > 0) {
        localStorage.setItem('c7aio_students_cache', JSON.stringify(val));
        callback(val);
      }
    });
  }
}

// ==================== TASKS ====================
async function saveSharedTask(task) {
  if (!task || !task.id) return false;
  
  let currentTasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const idx = currentTasks.findIndex(t => String(t.id) === String(task.id));
  if (idx !== -1) {
    currentTasks[idx] = task;
  } else {
    currentTasks.push(task);
  }
  localStorage.setItem('c7aio_tasks_cache', JSON.stringify(currentTasks));

  const ref = getDbRef(`${DB_PATHS.TASKS}/${task.id}`);
  if (ref) {
    try {
      await ref.set(task);
      return true;
    } catch (e) {
      console.error('Error saving task to Firebase:', e);
    }
  }
  return false;
}

async function deleteSharedTask(taskId) {
  let currentTasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  currentTasks = currentTasks.filter(t => String(t.id) !== String(taskId));
  localStorage.setItem('c7aio_tasks_cache', JSON.stringify(currentTasks));

  const ref = getDbRef(`${DB_PATHS.TASKS}/${taskId}`);
  if (ref) {
    try {
      await ref.remove();
      return true;
    } catch (e) {
      console.error('Error deleting task in Firebase:', e);
    }
  }
  return false;
}

async function updateSharedTaskCompletion(taskId, completionsObj) {
  let currentTasks = JSON.parse(localStorage.getItem('c7aio_tasks_cache')) || [];
  const target = currentTasks.find(t => String(t.id) === String(taskId));
  if (target) {
    target.completions = completionsObj;
    localStorage.setItem('c7aio_tasks_cache', JSON.stringify(currentTasks));
  }

  const ref = getDbRef(`${DB_PATHS.TASKS}/${taskId}/completions`);
  if (ref) {
    try {
      await ref.set(completionsObj);
      return true;
    } catch (e) {
      console.error('Error updating task completions in Firebase:', e);
    }
  }
  return false;
}

function onSharedTasksChanged(callback) {
  const cached = localStorage.getItem('c7aio_tasks_cache');
  if (cached) {
    try { callback(JSON.parse(cached)); } catch(e) {}
  }

  const ref = getDbRef(DB_PATHS.TASKS);
  if (ref) {
    ref.on('value', (snapshot) => {
      const val = snapshot.val();
      let taskList = [];
      if (val) {
        if (Array.isArray(val)) {
          taskList = val.filter(Boolean);
        } else if (typeof val === 'object') {
          taskList = Object.values(val);
        }
      }
      localStorage.setItem('c7aio_tasks_cache', JSON.stringify(taskList));
      callback(taskList);
    });
  }
}

// ==================== NOTIFICATIONS ====================
async function saveSharedNotification(notif) {
  if (!notif || !notif.id) return false;

  let currentList = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
  const idx = currentList.findIndex(n => String(n.id) === String(notif.id));
  if (idx !== -1) {
    currentList[idx] = notif;
  } else {
    currentList.unshift(notif);
  }
  localStorage.setItem('c7aio_notifications_cache', JSON.stringify(currentList));

  const ref = getDbRef(`${DB_PATHS.NOTIFICATIONS}/${notif.id}`);
  if (ref) {
    try {
      await ref.set(notif);
      return true;
    } catch (e) {
      console.error('Error saving notification to Firebase:', e);
    }
  }
  return false;
}

async function deleteSharedNotification(notifId) {
  let currentList = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
  currentList = currentList.filter(n => String(n.id) !== String(notifId));
  localStorage.setItem('c7aio_notifications_cache', JSON.stringify(currentList));

  const ref = getDbRef(`${DB_PATHS.NOTIFICATIONS}/${notifId}`);
  if (ref) {
    try {
      await ref.remove();
      return true;
    } catch (e) {
      console.error('Error deleting notification in Firebase:', e);
    }
  }
  return false;
}

async function updateSharedNotificationCompletion(notifId, completionsObj) {
  let currentList = JSON.parse(localStorage.getItem('c7aio_notifications_cache')) || [];
  const target = currentList.find(n => String(n.id) === String(notifId));
  if (target) {
    target.completions = completionsObj;
    localStorage.setItem('c7aio_notifications_cache', JSON.stringify(currentList));
  }

  const ref = getDbRef(`${DB_PATHS.NOTIFICATIONS}/${notifId}/completions`);
  if (ref) {
    try {
      await ref.set(completionsObj);
      return true;
    } catch (e) {
      console.error('Error updating notification completions in Firebase:', e);
    }
  }
  return false;
}

function onSharedNotificationsChanged(callback) {
  const cached = localStorage.getItem('c7aio_notifications_cache');
  if (cached) {
    try { callback(JSON.parse(cached)); } catch(e) {}
  }

  const ref = getDbRef(DB_PATHS.NOTIFICATIONS);
  if (ref) {
    ref.on('value', (snapshot) => {
      const val = snapshot.val();
      let notifList = [];
      if (val) {
        if (Array.isArray(val)) {
          notifList = val.filter(Boolean);
        } else if (typeof val === 'object') {
          notifList = Object.values(val);
        }
      }
      notifList.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0));
      });
      localStorage.setItem('c7aio_notifications_cache', JSON.stringify(notifList));
      callback(notifList);
    });
  }
}

// ==================== SCHEDULES & WEEKS ====================
async function saveSharedSchedules(schedulesData) {
  if (!schedulesData) return false;
  localStorage.setItem('c7aio_schedules_cache', JSON.stringify(schedulesData));

  const ref = getDbRef(DB_PATHS.SCHEDULES);
  if (ref) {
    try {
      await ref.set(schedulesData);
      return true;
    } catch (e) {
      console.error('Error saving schedules in Firebase:', e);
    }
  }
  return false;
}

function onSharedSchedulesChanged(callback) {
  const cached = localStorage.getItem('c7aio_schedules_cache');
  if (cached) {
    try { callback(JSON.parse(cached)); } catch(e) {}
  }

  const ref = getDbRef(DB_PATHS.SCHEDULES);
  if (ref) {
    ref.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        localStorage.setItem('c7aio_schedules_cache', JSON.stringify(val));
        callback(val);
      }
    });
  }
}

async function saveSharedWeekMetadata(metaData) {
  if (!metaData) return false;
  localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(metaData));

  const ref = getDbRef(DB_PATHS.WEEK_METADATA);
  if (ref) {
    try {
      await ref.set(metaData);
      return true;
    } catch (e) {
      console.error('Error saving week metadata in Firebase:', e);
    }
  }
  return false;
}

function onSharedWeekMetadataChanged(callback) {
  const cached = localStorage.getItem('c7aio_weekMetadata_cache');
  if (cached) {
    try { callback(JSON.parse(cached)); } catch(e) {}
  }

  const ref = getDbRef(DB_PATHS.WEEK_METADATA);
  if (ref) {
    ref.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(val));
        callback(val);
      }
    });
  }
}

// ==================== PERMISSIONS & ROLES ====================
async function saveSharedPermissions(permConfig) {
  if (!permConfig) return false;
  localStorage.setItem('c7aio_permissions_cache', JSON.stringify(permConfig));

  const ref = getDbRef(DB_PATHS.PERMISSIONS);
  if (ref) {
    try {
      await ref.set(permConfig);
      return true;
    } catch (e) {
      console.error('Error saving permissions in Firebase:', e);
    }
  }
  return false;
}

function onSharedPermissionsChanged(callback) {
  const cached = localStorage.getItem('c7aio_permissions_cache');
  if (cached) {
    try { callback(JSON.parse(cached)); } catch(e) {}
  }

  const ref = getDbRef(DB_PATHS.PERMISSIONS);
  if (ref) {
    ref.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val) {
        localStorage.setItem('c7aio_permissions_cache', JSON.stringify(val));
        callback(val);
      }
    });
  }
}

// ==================== SYSTEM LOGS ====================
async function logAction(action, detail = '') {
  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { name: 'Khách', role: ['guest'] };
  const logItem = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: currentUser.name || 'Học sinh',
    role: Array.isArray(currentUser.role) ? currentUser.role.join(', ') : (currentUser.role || 'student'),
    action: action,
    detail: detail
  };

  const ref = getDbRef(DB_PATHS.LOGS);
  if (ref) {
    try {
      await ref.push(logItem);
    } catch (e) {
      console.error('Error logging to Firebase:', e);
    }
  }
}

function onSharedLogsChanged(callback) {
  const ref = getDbRef(DB_PATHS.LOGS);
  if (ref) {
    ref.limitToLast(150).on('value', (snapshot) => {
      const val = snapshot.val();
      let logsList = [];
      if (val) {
        logsList = Object.values(val);
        logsList.sort((a, b) => (new Date(b.timestamp || 0)) - (new Date(a.timestamp || 0)));
      }
      callback(logsList);
    });
  }
}
