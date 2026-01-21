// Firebase Utilities - Cung cấp các hàm tiện ích cho Firebase
// Hỗ trợ Realtime + Offline + Sync

// Khởi tạo Firebase
const db = firebase.database();
const auth = firebase.auth();

// ============= AUTHENTICATION =============

// Đăng nhập email
async function loginWithEmail(email, password) {
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    console.log('✅ Đăng nhập thành công:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error.message);
    throw error;
  }
}

// Đăng ký email
async function registerWithEmail(email, password, displayName) {
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName });
    console.log('✅ Đăng ký thành công:', email);
    return result.user;
  } catch (error) {
    console.error('❌ Lỗi đăng ký:', error.message);
    throw error;
  }
}

// Đăng nhập Google
async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    console.log('✅ Đăng nhập Google thành công:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Lỗi đăng nhập Google:', error.message);
    throw error;
  }
}

// Đăng xuất
async function logout() {
  try {
    await auth.signOut();
    console.log('✅ Đã đăng xuất');
  } catch (error) {
    console.error('❌ Lỗi đăng xuất:', error.message);
    throw error;
  }
}

// Lấy user hiện tại
function getCurrentUser() {
  return auth.currentUser;
}

// Lắng nghe thay đổi authentication state
function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(user => {
    callback(user);
  });
}

// ============= DATABASE - TASKS =============

// Lấy tất cả tasks
async function getTasks() {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ User chưa đăng nhập');
    return [];
  }

  try {
    const snapshot = await db.ref(`users/${user.uid}/tasks`).once('value');
    const tasks = [];
    snapshot.forEach(child => {
      tasks.push({
        id: child.key,
        ...child.val()
      });
    });
    console.log('📥 Tải tasks từ Firebase:', tasks.length);
    return tasks;
  } catch (error) {
    console.error('❌ Lỗi lấy tasks:', error.message);
    return [];
  }
}

// Thêm task
async function addTask(taskName, deadline) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User chưa đăng nhập');
  }

  try {
    const newTaskRef = db.ref(`users/${user.uid}/tasks`).push();
    await newTaskRef.set({
      name: taskName,
      deadline: deadline,
      done: false,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Thêm task:', taskName);
    return newTaskRef.key;
  } catch (error) {
    console.error('❌ Lỗi thêm task:', error.message);
    throw error;
  }
}

// Cập nhật task
async function updateTask(taskId, updates) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User chưa đăng nhập');
  }

  try {
    await db.ref(`users/${user.uid}/tasks/${taskId}`).update(updates);
    console.log('✅ Cập nhật task:', taskId);
  } catch (error) {
    console.error('❌ Lỗi cập nhật task:', error.message);
    throw error;
  }
}

// Xóa task
async function deleteTask(taskId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User chưa đăng nhập');
  }

  try {
    await db.ref(`users/${user.uid}/tasks/${taskId}`).remove();
    console.log('✅ Xóa task:', taskId);
  } catch (error) {
    console.error('❌ Lỗi xóa task:', error.message);
    throw error;
  }
}

// Lắng nghe thay đổi tasks (real-time)
function onTasksChanged(callback) {
  const user = getCurrentUser();
  if (!user) {
    console.warn('⚠️ User chưa đăng nhập');
    return () => {};
  }

  const ref = db.ref(`users/${user.uid}/tasks`);
  ref.on('value', snapshot => {
    const tasks = [];
    snapshot.forEach(child => {
      tasks.push({
        id: child.key,
        ...child.val()
      });
    });
    callback(tasks);
  });

  // Return hàm unsubscribe
  return () => ref.off('value');
}

// ============= DATABASE - EVENTS =============

// Lấy sự kiện
async function getEvents() {
  const user = getCurrentUser();
  if (!user) return {};

  try {
    const snapshot = await db.ref(`users/${user.uid}/events`).once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('❌ Lỗi lấy events:', error.message);
    return {};
  }
}

// Thêm sự kiện
async function addEvent(dateKey, eventName) {
  const user = getCurrentUser();
  if (!user) throw new Error('User chưa đăng nhập');

  try {
    const eventRef = db.ref(`users/${user.uid}/events/${dateKey}`).push();
    await eventRef.set({
      name: eventName,
      createdAt: new Date().toISOString()
    });
    return eventRef.key;
  } catch (error) {
    console.error('❌ Lỗi thêm event:', error.message);
    throw error;
  }
}

// Xóa event
async function deleteEvent(dateKey, eventId) {
  const user = getCurrentUser();
  if (!user) throw new Error('User chưa đăng nhập');

  try {
    await db.ref(`users/${user.uid}/events/${dateKey}/${eventId}`).remove();
  } catch (error) {
    console.error('❌ Lỗi xóa event:', error.message);
    throw error;
  }
}

// Lắng nghe sự kiện real-time
function onEventsChanged(callback) {
  const user = getCurrentUser();
  if (!user) return () => {};

  const ref = db.ref(`users/${user.uid}/events`);
  ref.on('value', snapshot => {
    callback(snapshot.val() || {});
  });

  return () => ref.off('value');
}

// ============= DATABASE - NOTIFICATIONS =============

// Lấy thông báo
async function getNotifications() {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const snapshot = await db.ref(`users/${user.uid}/notifications`).once('value');
    const notifications = [];
    snapshot.forEach(child => {
      notifications.push({
        id: child.key,
        ...child.val()
      });
    });
    return notifications;
  } catch (error) {
    console.error('❌ Lỗi lấy notifications:', error.message);
    return [];
  }
}

// Thêm thông báo
async function addNotification(message, type = 'info') {
  const user = getCurrentUser();
  if (!user) throw new Error('User chưa đăng nhập');

  try {
    const notifRef = db.ref(`users/${user.uid}/notifications`).push();
    await notifRef.set({
      message: message,
      type: type,
      createdAt: new Date().toISOString()
    });
    return notifRef.key;
  } catch (error) {
    console.error('❌ Lỗi thêm notification:', error.message);
    throw error;
  }
}

// Xóa thông báo
async function deleteNotification(notifId) {
  const user = getCurrentUser();
  if (!user) throw new Error('User chưa đăng nhập');

  try {
    await db.ref(`users/${user.uid}/notifications/${notifId}`).remove();
  } catch (error) {
    console.error('❌ Lỗi xóa notification:', error.message);
    throw error;
  }
}

// Lắng nghe thông báo real-time
function onNotificationsChanged(callback) {
  const user = getCurrentUser();
  if (!user) return () => {};

  const ref = db.ref(`users/${user.uid}/notifications`);
  ref.on('value', snapshot => {
    const notifications = [];
    snapshot.forEach(child => {
      notifications.push({
        id: child.key,
        ...child.val()
      });
    });
    callback(notifications);
  });

  return () => ref.off('value');
}

// ============= SHARED DATA (SYNC ADMIN -> STUDENTS) =============

// --- SHARED STUDENTS ---
// Lắng nghe danh sách học sinh thay đổi
function onSharedStudentsChanged(callback) {
  const ref = db.ref('shared/students');
  ref.on('value', (snapshot) => {
    const val = snapshot.val();
    
    // CHUẨN HÓA DỮ LIỆU: Luôn chuyển về dạng Array
    let data = [];
    if (Array.isArray(val)) {
      data = val;
    } else if (val && typeof val === 'object') {
      data = Object.values(val); // Chuyển Object {1:.., 2:..} thành Array [.., ..]
    }

    localStorage.setItem('c7aio_students_cache', JSON.stringify(data));
    console.log('📥 Sync học sinh:', data.length);
    callback(data);
  }, (error) => {
    console.error('❌ Lỗi sync học sinh:', error);
  });
}

// Lưu toàn bộ danh sách học sinh (Admin dùng)
async function saveSharedStudents(studentsList) {
  try {
    // Đảm bảo lưu array sạch
    const cleanList = Array.isArray(studentsList) ? studentsList : [];
    await db.ref('shared/students').set(cleanList);
    console.log('✅ Đã đồng bộ danh sách học sinh lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu học sinh:', error);
    alert('Lỗi khi lưu dữ liệu lên server!');
  }
}

// --- SHARED TASKS ---
// Lắng nghe nhiệm vụ chung thay đổi
function onSharedTasksChanged(callback) {
  const ref = db.ref('shared/tasks');
  ref.on('value', snapshot => {
    const tasks = [];
    snapshot.forEach(child => {
      tasks.push(child.val());
    });
    localStorage.setItem('c7aio_tasks_cache', JSON.stringify(tasks));
    callback(tasks);
  });
}

// Lưu/Cập nhật một nhiệm vụ chung
async function saveSharedTask(task) {
  try {
    // Dùng task.id làm key để dễ update
    await db.ref(`shared/tasks/${task.id}`).set(task);
    console.log('✅ Đã lưu task lên Firebase:', task.name);
  } catch (error) {
    console.error('❌ Lỗi lưu task:', error);
  }
}

// Xóa nhiệm vụ chung
async function deleteSharedTask(taskId) {
  try {
    await db.ref(`shared/tasks/${taskId}`).remove();
    console.log('✅ Đã xóa task trên Firebase:', taskId);
  } catch (error) {
    console.error('❌ Lỗi xóa task:', error);
  }
}

// Cập nhật trạng thái hoàn thành (Check-in)
async function updateSharedTaskCompletion(taskId, completions) {
  await db.ref(`shared/tasks/${taskId}/completions`).set(completions);
}

// --- SHARED NOTIFICATIONS ---
// Lắng nghe thông báo chung
function onSharedNotificationsChanged(callback) {
  const ref = db.ref('shared/notifications');
  ref.on('value', snapshot => {
    const notifications = [];
    snapshot.forEach(child => {
      notifications.push(child.val());
    });
    // Sắp xếp mới nhất lên đầu
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    localStorage.setItem('c7aio_notifications_cache', JSON.stringify(notifications));
    callback(notifications);
  });
}

// Lưu thông báo chung
async function saveSharedNotification(notification) {
  try {
    await db.ref(`shared/notifications/${notification.id}`).set(notification);
    console.log('✅ Đã lưu thông báo lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu thông báo:', error);
  }
}

// Xóa thông báo chung
async function deleteSharedNotification(notifId) {
  await db.ref(`shared/notifications/${notifId}`).remove();
}

// Cập nhật trạng thái đã xem
async function updateSharedNotificationCompletion(notifId, completions) {
  await db.ref(`shared/notifications/${notifId}/completions`).set(completions);
}

// --- SHARED SCHEDULES (LỊCH HỌC) ---
// Lắng nghe lịch học
function onSharedSchedulesChanged(callback) {
  const ref = db.ref('shared/schedules');
  ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_schedules_cache', JSON.stringify(data));
    callback(data);
  });
}

// Lưu lịch học
async function saveSharedSchedules(schedules) {
  try {
    await db.ref('shared/schedules').set(schedules);
    console.log('✅ Đã lưu lịch học lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu lịch học:', error);
  }
}

// Lắng nghe metadata tuần (Thông tin ngày bắt đầu/kết thúc của tuần)
function onSharedWeekMetadataChanged(callback) {
  const ref = db.ref('shared/weekMetadata');
  ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(data));
    callback(data);
  });
}

// Lưu metadata tuần
async function saveSharedWeekMetadata(metadata) {
  try {
    await db.ref('shared/weekMetadata').set(metadata);
    console.log('✅ Đã lưu thông tin tuần lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu thông tin tuần:', error);
  }
}

// --- SHARED INPUT HISTORY (Gợi ý nhập liệu: Tên lớp, Môn, Phòng) ---
// Lắng nghe thay đổi history
function onSharedInputHistoryChanged(callback) {
  const ref = db.ref('shared/inputHistory');
  ref.on('value', snapshot => {
    const data = snapshot.val() || {};
    localStorage.setItem('c7aio_inputHistory_cache', JSON.stringify(data));
    callback(data);
  });
}

// Lưu history
async function saveSharedInputHistory(type, list) {
  try {
    await db.ref(`shared/inputHistory/${type}`).set(list);
  } catch (error) {
    console.error(`❌ Lỗi lưu history ${type}:`, error);
  }
}

// --- SHARED LOGS (NHẬT KÝ HOẠT ĐỘNG) ---
async function logAction(action, detail) {
  const user = getCurrentUser();
  const logEntry = {
    id: Date.now(),
    user: user ? user.name : 'Unknown',
    role: user ? (ROLES[user.role] || user.role) : 'Unknown',
    action: action,
    detail: detail,
    timestamp: new Date().toISOString()
  };

  try {
    // Lưu vào node shared/logs
    // Để tránh quá tải, có thể giới hạn số lượng log sau này
    await db.ref('shared/logs').push(logEntry);
    console.log('📝 Logged:', action);
  } catch (error) {
    console.error('❌ Lỗi ghi log:', error);
  }
}

function onSharedLogsChanged(callback) {
  const ref = db.ref('shared/logs').limitToLast(200); // Chỉ lấy 200 log gần nhất
  ref.on('value', snapshot => {
    const logs = [];
    snapshot.forEach(child => {
      logs.push(child.val());
    });
    // Sắp xếp mới nhất lên đầu
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    callback(logs);
  });
}

// --- SHARED PERMISSIONS (PHÂN QUYỀN) ---
function onSharedPermissionsChanged(callback) {
  const ref = db.ref('shared/permissions');
  ref.on('value', snapshot => {
    const data = snapshot.val();
    if (data) {
      localStorage.setItem('c7aio_permissions_cache', JSON.stringify(data));
      callback(data);
    }
  });
}

async function saveSharedPermissions(perms) {
  try {
    await db.ref('shared/permissions').set(perms);
    // Ghi log hành động này
    logAction('Cập nhật quyền hạn', 'Thay đổi bảng phân quyền hệ thống');
    console.log('✅ Đã lưu phân quyền lên Firebase');
  } catch (error) {
    console.error('❌ Lỗi lưu phân quyền:', error);
    alert('Lỗi khi lưu phân quyền!');
  }
}

// ============= FALLBACK - Offline Support =============

// Nếu offline, sử dụng localStorage tạm thời
function getLocalStorageData(key) {
  return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : [];
}

function saveLocalStorageData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Sync offline data với Firebase khi online
async function syncOfflineData() {
  try {
    const offlineTasks = getLocalStorageData('c7aio_tasks_detail');
    const user = getCurrentUser();

    if (user && offlineTasks.length > 0) {
      console.log('🔄 Đang sync dữ liệu offline...');
      for (const task of offlineTasks) {
        if (!task.id || task.id.toString().length < 15) {
          // Task mới (được tạo offline)
          await addTask(task.name, task.deadline);
        }
      }
      localStorage.removeItem('c7aio_tasks_detail');
      console.log('✅ Sync hoàn tất');
    }
  } catch (error) {
    console.error('❌ Lỗi sync:', error.message);
  }
}

// Kiểm tra kết nối
window.addEventListener('online', () => {
  console.log('✅ Kết nối lại - Đang sync...');
  syncOfflineData();
});

console.log('📱 Firebase Utilities loaded');

// ============= SHORTCUTS / ALIASES =============
// Các hàm viết tắt để dễ sử dụng trong các script khác

const getTasks_Firebase = getTasks;
const addTask_Firebase = addTask;
const updateTask_Firebase = updateTask;
const deleteTask_Firebase = deleteTask;
