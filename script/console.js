/**
 * C7AIO Automation Engine & Console API Suite
 * Cung cấp API lập trình toàn cục (window.C7_CONSOLE & window.C7_BOT)
 * Phục vụ AI Agent / Automation Tools tự động bóc tách tin nhắn & nạp dữ liệu Firebase an toàn
 * @version 3.4.2
 */

(function() {
  'use strict';

  // --- HELPER UTILITIES ---
  const DAY_KEY_MAP = {
    't2': 'monday', '2': 'monday', 'thu2': 'monday', 'thuhai': 'monday', 'monday': 'monday', 'mon': 'monday',
    't3': 'tuesday', '3': 'tuesday', 'thu3': 'tuesday', 'thuba': 'tuesday', 'tuesday': 'tuesday', 'tue': 'tuesday',
    't4': 'wednesday', '4': 'wednesday', 'thu4': 'wednesday', 'thutu': 'wednesday', 'wednesday': 'wednesday', 'wed': 'wednesday',
    't5': 'thursday', '5': 'thursday', 'thu5': 'thursday', 'thunam': 'thursday', 'thursday': 'thursday', 'thu': 'thursday',
    't6': 'friday', '6': 'friday', 'thu6': 'friday', 'thusau': 'friday', 'friday': 'friday', 'fri': 'friday',
    't7': 'saturday', '7': 'saturday', 'thu7': 'saturday', 'thubay': 'saturday', 'saturday': 'saturday', 'sat': 'saturday',
    'cn': 'sunday', 'chunhat': 'sunday', 'sunday': 'sunday', 'sun': 'sunday'
  };

  function normalizeDayKey(rawDay) {
    if (!rawDay) return null;
    if (rawDay instanceof Date && !isNaN(rawDay)) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return days[rawDay.getDay()];
    }
    const str = String(rawDay).trim();
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[parsed.getDay()];
      }
    }
    const clean = str.toLowerCase().replace(/[\s_\-]/g, '');
    return DAY_KEY_MAP[clean] || (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(clean) ? clean : null);
  }

  function resolveWeekKeyFromDate(dateInput) {
    if (!dateInput) return 'week-1';
    let d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return 'week-1';
    const allMeta = getLocalWeekMetadata();
    for (const [key, meta] of Object.entries(allMeta)) {
      if (meta && meta.startDate && meta.endDate) {
        const s = new Date(meta.startDate);
        const e = new Date(meta.endDate);
        if (d >= s && d <= e) return key;
      }
    }
    return 'week-1';
  }

  function generateUniqueId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  function normalizeDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date && !isNaN(dateInput)) {
      return dateInput.toISOString();
    }

    const str = String(dateInput).trim();
    if (!str) return null;

    // Định dạng YYYY-MM-DD HH:mm hoặc YYYY-MM-DD HH:mm:ss
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (ymdMatch) {
      const [, y, m, d, h = '23', min = '59', s = '59'] = ymdMatch;
      const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
      return isNaN(parsed) ? null : parsed.toISOString();
    }

    // Định dạng DD/MM/YYYY HH:mm hoặc DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (dmyMatch) {
      const [, d, m, y, h = '23', min = '59', s = '59'] = dmyMatch;
      const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
      return isNaN(parsed) ? null : parsed.toISOString();
    }

    // Cố gắng parse tự nhiên
    const dObj = new Date(str);
    return isNaN(dObj.getTime()) ? null : dObj.toISOString();
  }

  function autoFormatDescription(text) {
    if (!text) return '';
    let content = String(text).trim();
    if (!content) return '';

    // Nếu đã chứa thẻ HTML (như <p>, <div>, <ul>, <br>), giữ nguyên
    if (/<[a-z][\s\S]*>/i.test(content)) {
      return content;
    }

    // Tự động convert raw URLs thành thẻ <a>
    const urlPattern = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    content = content.replace(urlPattern, url => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--primary, #6366f1); text-decoration: underline; word-break: break-all;">${url}</a>`;
    });

    // Chuyển dòng xuống thành <p> hoặc <br>
    const paragraphs = content.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }

    return `<p>${content.replace(/\n/g, '<br>')}</p>`;
  }

  function getLocalTasks() {
    return JSON.parse(localStorage.getItem('c7aio_tasks_cache') || '[]');
  }

  function getLocalNotifications() {
    return JSON.parse(localStorage.getItem('c7aio_notifications_cache') || '[]');
  }

  function getLocalSchedules() {
    return JSON.parse(localStorage.getItem('c7aio_schedules_cache') || '{}');
  }

  function getLocalWeekMetadata() {
    return JSON.parse(localStorage.getItem('c7aio_weekMetadata_cache') || '{}');
  }

  // ================= MAIN CONTROLLER OBJECT =================
  const C7_ENGINE = {
    version: '3.5.0',

    // ================= 1. TASKS MANAGEMENT =================
    /**
     * Thêm nhiệm vụ mới vào Firebase & Cache
     * @param {Object} payload 
     * @returns {Promise<{success: boolean, taskId?: string, task?: Object, error?: string}>}
     */
    async addTask(payload = {}) {
      try {
        if (!payload || !payload.name) {
          throw new Error('Thiếu tên nhiệm vụ (payload.name là bắt buộc)!');
        }

        const taskId = payload.id ? String(payload.id) : generateUniqueId('task_');
        const taskObj = {
          id: taskId,
          name: String(payload.name).trim(),
          category: payload.category ? String(payload.category).trim() : 'Bài tập',
          priority: payload.priority === 'Khẩn cấp' ? 'Khẩn cấp' : 'Bình thường',
          deadline: normalizeDate(payload.deadline),
          description: autoFormatDescription(payload.description || ''),
          assignedStudents: Array.isArray(payload.assignedStudents) ? payload.assignedStudents : [],
          tags: Array.isArray(payload.tags) ? payload.tags : [],
          completions: payload.completions && typeof payload.completions === 'object' ? payload.completions : {},
          createdAt: payload.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (typeof saveSharedTask === 'function') {
          await saveSharedTask(taskObj);
        } else {
          const current = getLocalTasks();
          current.unshift(taskObj);
          localStorage.setItem('c7aio_tasks_cache', JSON.stringify(current));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Thêm nhiệm vụ', `Tên: ${taskObj.name} (Hạn: ${taskObj.deadline || 'Không giới hạn'})`);
        }

        console.log('✅ [C7_CONSOLE] Đã thêm nhiệm vụ thành công:', taskObj.name, `(ID: ${taskId})`);
        return { success: true, taskId, task: taskObj };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi addTask:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Cập nhật nhiệm vụ đã có mà không mất dữ liệu completions
     */
    async updateTask(taskId, updateData = {}) {
      try {
        if (!taskId) throw new Error('Cần cung cấp taskId!');
        const tasks = getLocalTasks();
        const existing = tasks.find(t => String(t.id) === String(taskId)) || {};

        const merged = {
          ...existing,
          ...updateData,
          id: String(taskId),
          name: updateData.name !== undefined ? String(updateData.name).trim() : (existing.name || ''),
          category: updateData.category !== undefined ? String(updateData.category).trim() : (existing.category || 'Bài tập'),
          priority: updateData.priority !== undefined ? (updateData.priority === 'Khẩn cấp' ? 'Khẩn cấp' : 'Bình thường') : (existing.priority || 'Bình thường'),
          deadline: updateData.deadline !== undefined ? normalizeDate(updateData.deadline) : (existing.deadline || null),
          description: updateData.description !== undefined ? autoFormatDescription(updateData.description) : (existing.description || ''),
          assignedStudents: Array.isArray(updateData.assignedStudents) ? updateData.assignedStudents : (existing.assignedStudents || []),
          tags: Array.isArray(updateData.tags) ? updateData.tags : (existing.tags || []),
          completions: updateData.completions || existing.completions || {},
          updatedAt: new Date().toISOString()
        };

        if (typeof saveSharedTask === 'function') {
          await saveSharedTask(merged);
        } else {
          const idx = tasks.findIndex(t => String(t.id) === String(taskId));
          if (idx !== -1) tasks[idx] = merged;
          else tasks.unshift(merged);
          localStorage.setItem('c7aio_tasks_cache', JSON.stringify(tasks));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Sửa nhiệm vụ', `ID: ${taskId} - ${merged.name}`);
        }

        console.log('✅ [C7_CONSOLE] Đã cập nhật nhiệm vụ:', taskId);
        return { success: true, taskId, task: merged };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi updateTask:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Xóa nhiệm vụ
     */
    async deleteTask(taskId) {
      try {
        if (!taskId) throw new Error('Cần cung cấp taskId!');
        if (typeof deleteSharedTask === 'function') {
          await deleteSharedTask(String(taskId));
        } else {
          const tasks = getLocalTasks().filter(t => String(t.id) !== String(taskId));
          localStorage.setItem('c7aio_tasks_cache', JSON.stringify(tasks));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Xóa nhiệm vụ', `ID: ${taskId}`);
        }

        console.log('🗑️ [C7_CONSOLE] Đã xóa nhiệm vụ:', taskId);
        return { success: true, taskId };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi deleteTask:', err);
        return { success: false, error: err.message };
      }
    },

    getTasks() {
      return getLocalTasks();
    },

    // ================= 2. NOTIFICATIONS MANAGEMENT =================
    /**
     * Thêm thông báo mới
     * @param {Object} payload 
     * @returns {Promise<{success: boolean, notifId?: string, notification?: Object, error?: string}>}
     */
    async addNotification(payload = {}) {
      try {
        if (!payload || !payload.message) {
          throw new Error('Thiếu tiêu đề thông báo (payload.message là bắt buộc)!');
        }

        const notifId = payload.id ? String(payload.id) : generateUniqueId('notif_');
        const notifObj = {
          id: notifId,
          message: String(payload.message).trim(),
          content: autoFormatDescription(payload.content || ''),
          type: ['info', 'warning', 'success', 'error'].includes(payload.type) ? payload.type : 'info',
          pinned: Boolean(payload.pinned),
          completions: payload.completions && typeof payload.completions === 'object' ? payload.completions : {},
          createdAt: payload.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (typeof saveSharedNotification === 'function') {
          await saveSharedNotification(notifObj);
        } else {
          const current = getLocalNotifications();
          current.unshift(notifObj);
          localStorage.setItem('c7aio_notifications_cache', JSON.stringify(current));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Thêm thông báo', `Tiêu đề: ${notifObj.message}`);
        }

        console.log('✅ [C7_CONSOLE] Đã thêm thông báo:', notifObj.message, `(ID: ${notifId})`);
        return { success: true, notifId, notification: notifObj };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi addNotification:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Cập nhật thông báo
     */
    async updateNotification(notifId, updateData = {}) {
      try {
        if (!notifId) throw new Error('Cần cung cấp notifId!');
        const notifs = getLocalNotifications();
        const existing = notifs.find(n => String(n.id) === String(notifId)) || {};

        const merged = {
          ...existing,
          ...updateData,
          id: String(notifId),
          message: updateData.message !== undefined ? String(updateData.message).trim() : (existing.message || ''),
          content: updateData.content !== undefined ? autoFormatDescription(updateData.content) : (existing.content || ''),
          type: updateData.type !== undefined && ['info', 'warning', 'success', 'error'].includes(updateData.type) ? updateData.type : (existing.type || 'info'),
          pinned: updateData.pinned !== undefined ? Boolean(updateData.pinned) : Boolean(existing.pinned),
          completions: updateData.completions || existing.completions || {},
          updatedAt: new Date().toISOString()
        };

        if (typeof saveSharedNotification === 'function') {
          await saveSharedNotification(merged);
        } else {
          const idx = notifs.findIndex(n => String(n.id) === String(notifId));
          if (idx !== -1) notifs[idx] = merged;
          else notifs.unshift(merged);
          localStorage.setItem('c7aio_notifications_cache', JSON.stringify(notifs));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Sửa thông báo', `ID: ${notifId} - ${merged.message}`);
        }

        console.log('✅ [C7_CONSOLE] Đã cập nhật thông báo:', notifId);
        return { success: true, notifId, notification: merged };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi updateNotification:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Xóa thông báo
     */
    async deleteNotification(notifId) {
      try {
        if (!notifId) throw new Error('Cần cung cấp notifId!');
        if (typeof deleteSharedNotification === 'function') {
          await deleteSharedNotification(String(notifId));
        } else {
          const notifs = getLocalNotifications().filter(n => String(n.id) !== String(notifId));
          localStorage.setItem('c7aio_notifications_cache', JSON.stringify(notifs));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Xóa thông báo', `ID: ${notifId}`);
        }

        console.log('🗑️ [C7_CONSOLE] Đã xóa thông báo:', notifId);
        return { success: true, notifId };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi deleteNotification:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Bật / Tắt ghim thông báo
     */
    async togglePin(notifId) {
      try {
        const notifs = getLocalNotifications();
        const target = notifs.find(n => String(n.id) === String(notifId));
        if (!target) throw new Error('Không tìm thấy thông báo ID: ' + notifId);
        const newPinned = !target.pinned;
        return await this.updateNotification(notifId, { pinned: newPinned });
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi togglePin:', err);
        return { success: false, error: err.message };
      }
    },

    getNotifications() {
      return getLocalNotifications();
    },

    // ================= 3. SCHEDULES & WEEK METADATA =================
    /**
     * Cập nhật thời khóa biểu theo thứ hoặc toàn bộ tuần (Hỗ trợ lớp riêng)
     * @param {Object} scheduleData Object chứa các ngày (monday, tuesday, T2, T3...)
     * @param {string} weekKey Mặc định 'week-1'
     * @param {string} className Tên lớp học, mặc định '11C7'
     */
    async updateSchedule(scheduleData = {}, weekKey = 'week-1', className = '11C7') {
      try {
        if (!scheduleData || typeof scheduleData !== 'object') {
          throw new Error('Dữ liệu thời khóa biểu không hợp lệ!');
        }

        const allSchedules = getLocalSchedules();
        if (!allSchedules[weekKey]) {
          allSchedules[weekKey] = {
            monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
          };
        }

        const currentWeekSchedule = allSchedules[weekKey];

        // Chuẩn hóa và ghép các ngày
        Object.entries(scheduleData).forEach(([rawKey, periods]) => {
          const normDay = normalizeDayKey(rawKey);
          if (normDay && Array.isArray(periods)) {
            currentWeekSchedule[normDay] = periods.map(p => ({
              name: p.name || p.subject || 'Tiết học',
              subject: p.subject || p.name || '',
              time: p.time || '',
              room: p.room || 'P.204',
              note: p.note || '',
              className: p.className || p.class || className || '11C7'
            }));
          }
        });

        allSchedules[weekKey] = currentWeekSchedule;

        if (typeof saveSharedSchedules === 'function') {
          await saveSharedSchedules(allSchedules);
        } else {
          localStorage.setItem('c7aio_schedules_cache', JSON.stringify(allSchedules));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Cập nhật TKB', `Tuần: ${weekKey} - Lớp: ${className}`);
        }

        console.log('✅ [C7_CONSOLE] Đã cập nhật TKB thành công cho:', weekKey, `(Lớp ${className})`);
        return { success: true, weekKey, className, schedule: currentWeekSchedule };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi updateSchedule:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Cập nhật TKB cho một ngày cụ thể (Truyền 'T2', 'monday' hoặc ngày '2026-09-08')
     * @param {string|Date} dayOrDate Thứ ('T2', 'thứ 3') hoặc Ngày cụ thể ('YYYY-MM-DD')
     * @param {Array<Object>} periods Danh sách tiết học trong ngày
     * @param {string} [weekKey] Tự động suy ra nếu truyền ngày cụ thể, hoặc mặc định 'week-1'
     * @param {string} [className] Mặc định '11C7'
     */
    async updateDaySchedule(dayOrDate, periods = [], weekKey = null, className = '11C7') {
      try {
        const normDay = normalizeDayKey(dayOrDate);
        if (!normDay) {
          throw new Error(`Không nhận diện được thứ hoặc ngày: "${dayOrDate}"!`);
        }

        const targetWeekKey = weekKey || resolveWeekKeyFromDate(dayOrDate);
        const allSchedules = getLocalSchedules();
        if (!allSchedules[targetWeekKey]) {
          allSchedules[targetWeekKey] = {
            monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
          };
        }

        const formattedPeriods = Array.isArray(periods) ? periods.map(p => ({
          name: p.name || p.subject || 'Tiết học',
          subject: p.subject || p.name || '',
          time: p.time || '',
          room: p.room || 'P.204',
          note: p.note || '',
          className: p.className || p.class || className || '11C7'
        })) : [];

        allSchedules[targetWeekKey][normDay] = formattedPeriods;

        if (typeof saveSharedSchedules === 'function') {
          await saveSharedSchedules(allSchedules);
        } else {
          localStorage.setItem('c7aio_schedules_cache', JSON.stringify(allSchedules));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Cập nhật TKB ngày', `${normDay} (${targetWeekKey}) - ${formattedPeriods.length} tiết`);
        }

        console.log(`✅ [C7_CONSOLE] Đã cập nhật TKB cho ngày ${normDay} (${targetWeekKey})!`);
        return { success: true, weekKey: targetWeekKey, day: normDay, periods: formattedPeriods };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi updateDaySchedule:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Thêm 1 tiết học vào ngày cụ thể
     */
    async addClassPeriod(dayOrDate, periodObj = {}, weekKey = null, className = '11C7') {
      try {
        const normDay = normalizeDayKey(dayOrDate);
        if (!normDay) throw new Error(`Không nhận diện được ngày: "${dayOrDate}"!`);
        if (!periodObj || !periodObj.name) throw new Error('Thiếu tên môn học (periodObj.name)!');

        const targetWeekKey = weekKey || resolveWeekKeyFromDate(dayOrDate);
        const allSchedules = getLocalSchedules();
        if (!allSchedules[targetWeekKey]) {
          allSchedules[targetWeekKey] = {
            monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
          };
        }
        if (!allSchedules[targetWeekKey][normDay]) {
          allSchedules[targetWeekKey][normDay] = [];
        }

        const newPeriod = {
          name: periodObj.name || 'Tiết học',
          subject: periodObj.subject || periodObj.name || '',
          time: periodObj.time || '',
          room: periodObj.room || 'P.204',
          note: periodObj.note || '',
          className: periodObj.className || periodObj.class || className || '11C7'
        };

        allSchedules[targetWeekKey][normDay].push(newPeriod);

        if (typeof saveSharedSchedules === 'function') {
          await saveSharedSchedules(allSchedules);
        } else {
          localStorage.setItem('c7aio_schedules_cache', JSON.stringify(allSchedules));
        }

        console.log(`✅ [C7_CONSOLE] Đã thêm tiết học "${newPeriod.name}" vào ${normDay} (${targetWeekKey})!`);
        return { success: true, weekKey: targetWeekKey, day: normDay, period: newPeriod };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi addClassPeriod:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Xóa 1 tiết học theo index (0, 1, 2...) hoặc theo tên môn
     */
    async removeClassPeriod(dayOrDate, periodIndexOrName, weekKey = null) {
      try {
        const normDay = normalizeDayKey(dayOrDate);
        if (!normDay) throw new Error(`Không nhận diện được ngày: "${dayOrDate}"!`);
        const targetWeekKey = weekKey || resolveWeekKeyFromDate(dayOrDate);
        const allSchedules = getLocalSchedules();
        const dayList = allSchedules[targetWeekKey] ? (allSchedules[targetWeekKey][normDay] || []) : [];

        let removeIdx = -1;
        if (typeof periodIndexOrName === 'number') {
          removeIdx = periodIndexOrName;
        } else if (typeof periodIndexOrName === 'string') {
          const matchName = periodIndexOrName.toLowerCase().trim();
          removeIdx = dayList.findIndex(p => (p.name || '').toLowerCase() === matchName || (p.subject || '').toLowerCase() === matchName);
        }

        if (removeIdx < 0 || removeIdx >= dayList.length) {
          throw new Error(`Không tìm thấy tiết học cần xóa (${periodIndexOrName}) trong ${normDay}!`);
        }

        const removed = dayList.splice(removeIdx, 1)[0];
        allSchedules[targetWeekKey][normDay] = dayList;

        if (typeof saveSharedSchedules === 'function') {
          await saveSharedSchedules(allSchedules);
        } else {
          localStorage.setItem('c7aio_schedules_cache', JSON.stringify(allSchedules));
        }

        console.log(`✅ [C7_CONSOLE] Đã xóa tiết "${removed.name}" khỏi ${normDay}!`);
        return { success: true, removedPeriod: removed };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi removeClassPeriod:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Xóa sạch các tiết học của 1 ngày (Ví dụ ngày nghỉ lễ)
     */
    async clearDaySchedule(dayOrDate, weekKey = null) {
      return this.updateDaySchedule(dayOrDate, [], weekKey);
    },

    /**
     * Lấy danh sách tiết học của một ngày cụ thể (Có thể lọc theo lớp)
     */
    getDaySchedule(dayOrDate, weekKey = null, className = '') {
      const normDay = normalizeDayKey(dayOrDate);
      if (!normDay) return [];
      const targetWeekKey = weekKey || resolveWeekKeyFromDate(dayOrDate);
      const allSchedules = getLocalSchedules();
      const weekSchedule = allSchedules[targetWeekKey] || {};
      let list = weekSchedule[normDay] || [];
      if (className) {
        list = list.filter(c => !c.className || c.className === className);
      }
      return list;
    },

    /**
     * Lấy danh sách tất cả các lớp riêng đang có trong TKB
     */
    getClassesList() {
      const allSchedules = getLocalSchedules();
      const allMeta = getLocalWeekMetadata();
      const classes = new Set(['11C7']);
      Object.values(allMeta).forEach(m => { if (m && m.className) classes.add(m.className); });
      Object.values(allSchedules).forEach(w => {
        if (w && typeof w === 'object') {
          Object.values(w).forEach(dayList => {
            if (Array.isArray(dayList)) dayList.forEach(c => { if (c && c.className) classes.add(c.className); });
          });
        }
      });
      return Array.from(classes).sort();
    },

    /**
     * Cập nhật Metadata tuần học (Tên tuần, Lớp học, Ngày bắt đầu - kết thúc, Học kỳ, Năm học)
     */
    async setWeekMetadata({ week = 1, name = '', className = '11C7', startDate = '', endDate = '', semester = 'HK1', academicYear = '2026-2027' } = {}) {
      try {
        const weekKey = typeof week === 'number' ? `week-${week}` : (String(week).startsWith('week-') ? week : `week-${week}`);
        const allMeta = getLocalWeekMetadata();

        allMeta[weekKey] = {
          ...(allMeta[weekKey] || {}),
          name: name || `Tuần ${String(week).replace(/\D/g, '') || '1'}`,
          className: className || (allMeta[weekKey] ? allMeta[weekKey].className : '11C7'),
          startDate: startDate || (allMeta[weekKey] ? allMeta[weekKey].startDate : ''),
          endDate: endDate || (allMeta[weekKey] ? allMeta[weekKey].endDate : ''),
          semester,
          academicYear,
          updatedAt: new Date().toISOString()
        };

        if (typeof saveSharedWeekMetadata === 'function') {
          await saveSharedWeekMetadata(allMeta);
        } else {
          localStorage.setItem('c7aio_weekMetadata_cache', JSON.stringify(allMeta));
        }

        if (typeof logAction === 'function') {
          logAction('Automation: Cập nhật Metadata Tuần', `${weekKey}: ${allMeta[weekKey].name} - Lớp ${allMeta[weekKey].className}`);
        }

        console.log('✅ [C7_CONSOLE] Đã cập nhật thông tin tuần:', weekKey);
        return { success: true, weekKey, metadata: allMeta[weekKey] };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi setWeekMetadata:', err);
        return { success: false, error: err.message };
      }
    },

    getSchedule(weekKey = 'week-1', className = '') {
      const all = getLocalSchedules();
      const weekSchedule = all[weekKey] || null;
      if (!weekSchedule || !className) return weekSchedule;

      const filtered = {};
      Object.entries(weekSchedule).forEach(([day, list]) => {
        filtered[day] = Array.isArray(list) ? list.filter(c => !c.className || c.className === className) : [];
      });
      return filtered;
    },

    /**
     * Lấy thông tin niên khóa hiện tại và tiến độ năm học (Bộ đếm tuần học)
     * @param {string|Date} [targetDate] Ngày kiểm tra (mặc định hôm nay)
     */
    getAcademicYearInfo(targetDate = '') {
      try {
        if (typeof window !== 'undefined' && typeof window.getAcademicProgress === 'function' && typeof window.getActiveAcademicYear === 'function') {
          const ay = window.getActiveAcademicYear();
          const target = targetDate ? new Date(targetDate) : new Date();
          const prog = window.getAcademicProgress(target);
          return {
            success: true,
            academicYear: ay.id,
            grade: ay.grade,
            label: ay.label,
            openingDate: ay.openingDate,
            startDate: ay.startDate,
            endDate: ay.endDate,
            status: prog.status,
            currentWeek: prog.currentWeek,
            totalWeeks: prog.totalWeeks,
            percentage: prog.percentage,
            badge: prog.badgeText,
            desc: prog.desc
          };
        }
        const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('c7aio_academic_year')) || '2026-2027';
        return {
          success: true,
          academicYear: stored,
          note: 'Chạy ở chế độ độc lập/fallback'
        };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi getAcademicYearInfo:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Chuyển đổi niên khóa hoạt động ('2025-2026', '2026-2027', '2027-2028')
     * @param {string} yearKey 
     */
    setAcademicYear(yearKey) {
      try {
        if (typeof window !== 'undefined' && typeof window.switchAcademicYear === 'function') {
          window.switchAcademicYear(yearKey);
          return { success: true, academicYear: yearKey };
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('c7aio_academic_year', yearKey);
        }
        console.log('✅ [C7_CONSOLE] Đã cập nhật niên khóa:', yearKey);
        return { success: true, academicYear: yearKey };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi setAcademicYear:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Bộ đếm tuần học và trạng thái tính từ Khai giảng (05/09)
     * @param {string|Date} [targetDate]
     */
    getWeekCount(targetDate = '') {
      return this.getAcademicYearInfo(targetDate);
    },

    // ================= 5. SCHEDULE EVENTS API (THÔNG BÁO THAY ĐỔI LỊCH) =================
    /**
     * Thêm sự kiện thay đổi lịch vào tuần học
     * @param {Object} payload
     * @param {string} payload.weekKey Mã tuần ('week-1', 'week-2', ...)
     * @param {string} [payload.day] Ngày áp dụng ('monday', 'tuesday', ...)
     * @param {number|null} [payload.periodIndex] Index của tiết học (0-based, null = cả ngày)
     * @param {string} [payload.type] 'schedule_change' | 'day_off' | 'extra_class' | 'room_change' | 'info'
     * @param {string} payload.title Nội dung thay đổi
     * @param {string} [payload.note] Ghi chú thêm
     * @param {string} [payload.severity] 'info' | 'warning' | 'danger'
     */
    addScheduleEvent(payload = {}) {
      try {
        const { weekKey = 'week-1', day = '', periodIndex = null, type = 'schedule_change', title, note = '', severity = 'info' } = payload;
        if (!title) throw new Error('Thiếu title (nội dung thay đổi)!');

        const eventsRaw = localStorage.getItem('c7aio_schedule_events');
        const events = JSON.parse(eventsRaw || '{}');
        if (!Array.isArray(events[weekKey])) events[weekKey] = [];

        const eventId = 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const newEvent = {
          id: eventId,
          type, severity, title, note, day,
          periodIndex: (periodIndex !== null && periodIndex !== undefined) ? parseInt(periodIndex) : null,
          weekKey,
          createdAt: new Date().toISOString(),
          createdBy: 'API'
        };
        events[weekKey].push(newEvent);
        localStorage.setItem('c7aio_schedule_events', JSON.stringify(events));

        // Sync to in-memory if on schedule page
        if (typeof window !== 'undefined' && typeof window.scheduleEvents !== 'undefined') {
          window.scheduleEvents = events;
        }

        if (typeof logAction === 'function') {
          logAction('API: Thêm thông báo đổi lịch', `${weekKey}: ${title}`);
        }

        console.log('✅ [C7_CONSOLE] Đã thêm sự kiện đổi lịch:', eventId);
        return { success: true, eventId, event: newEvent };
      } catch (err) {
        console.error('❌ [C7_CONSOLE] Lỗi addScheduleEvent:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Lấy danh sách sự kiện thay đổi lịch của một tuần
     * @param {string} weekKey Mã tuần ('week-1', 'week-2', ...)
     */
    getScheduleEvents(weekKey = 'week-1') {
      try {
        const events = JSON.parse(localStorage.getItem('c7aio_schedule_events') || '{}');
        const weekEvents = Array.isArray(events[weekKey]) ? events[weekKey] : [];
        return { success: true, weekKey, count: weekEvents.length, events: weekEvents };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * Xóa một sự kiện thay đổi lịch theo ID
     * @param {string} weekKey Mã tuần
     * @param {string} eventId ID sự kiện
     */
    deleteScheduleEvent(weekKey, eventId) {
      try {
        const events = JSON.parse(localStorage.getItem('c7aio_schedule_events') || '{}');
        if (!Array.isArray(events[weekKey])) return { success: false, error: 'Tuần không tồn tại hoặc không có sự kiện' };
        const before = events[weekKey].length;
        events[weekKey] = events[weekKey].filter(e => e.id !== eventId);
        localStorage.setItem('c7aio_schedule_events', JSON.stringify(events));
        if (typeof window !== 'undefined' && typeof window.scheduleEvents !== 'undefined') {
          window.scheduleEvents = events;
        }
        const deleted = before > events[weekKey].length;
        console.log(deleted ? '✅ Đã xóa sự kiện' : '⚠️ Không tìm thấy sự kiện', eventId);
        return { success: deleted, eventId };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    /**
     * Xóa toàn bộ sự kiện thay đổi lịch của một tuần
     * @param {string} weekKey Mã tuần
     */
    clearScheduleEvents(weekKey = 'week-1') {
      try {
        const events = JSON.parse(localStorage.getItem('c7aio_schedule_events') || '{}');
        const count = Array.isArray(events[weekKey]) ? events[weekKey].length : 0;
        events[weekKey] = [];
        localStorage.setItem('c7aio_schedule_events', JSON.stringify(events));
        if (typeof window !== 'undefined' && typeof window.scheduleEvents !== 'undefined') {
          window.scheduleEvents = events;
        }
        console.log(`✅ [C7_CONSOLE] Đã xóa ${count} sự kiện của ${weekKey}`);
        return { success: true, weekKey, cleared: count };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // ================= 6. BATCH INGESTION (NẠP HÀNG LOẠT TRONG 1 LỆNH) =================
    /**
     * Nạp toàn bộ Nhiệm vụ, Thông báo và Lịch học từ 1 đoạn trích xuất duy nhất
     * @param {Object} batchPayload 
     * @param {Array} batchPayload.tasks Danh sách nhiệm vụ
     * @param {Array} batchPayload.notifications Danh sách thông báo
     * @param {Object} batchPayload.schedules Dữ liệu TKB theo ngày
     * @param {Object} batchPayload.weekMetadata Thông tin tuần
     * @param {string} batchPayload.weekKey Tuần áp dụng (Mặc định 'week-1')
     */
    async ingestBatch(batchPayload = {}) {
      console.log('🚀 [C7_CONSOLE] Bắt đầu nạp hàng loạt (Batch Ingestion)...');
      const results = {
        status: 'pending',
        addedTasks: 0,
        addedNotifications: 0,
        updatedSchedule: false,
        updatedWeekMeta: false,
        taskIds: [],
        notificationIds: [],
        errors: []
      };

      try {
        const { tasks = [], notifications = [], schedules = null, weekMetadata = null, weekKey = 'week-1' } = batchPayload;

        // 1. Nạp Tasks
        if (Array.isArray(tasks) && tasks.length > 0) {
          for (const t of tasks) {
            const res = await this.addTask(t);
            if (res.success) {
              results.addedTasks++;
              results.taskIds.push(res.taskId);
            } else {
              results.errors.push(`Task [${t.name}]: ${res.error}`);
            }
          }
        }

        // 2. Nạp Notifications
        if (Array.isArray(notifications) && notifications.length > 0) {
          for (const n of notifications) {
            const res = await this.addNotification(n);
            if (res.success) {
              results.addedNotifications++;
              results.notificationIds.push(res.notifId);
            } else {
              results.errors.push(`Notif [${n.message}]: ${res.error}`);
            }
          }
        }

        // 3. Cập nhật Schedule
        if (schedules && typeof schedules === 'object') {
          const res = await this.updateSchedule(schedules, weekKey);
          if (res.success) {
            results.updatedSchedule = true;
          } else {
            results.errors.push(`Schedule: ${res.error}`);
          }
        }

        // 4. Cập nhật Week Metadata
        if (weekMetadata && typeof weekMetadata === 'object') {
          const res = await this.setWeekMetadata({ ...weekMetadata, week: weekMetadata.week || weekKey });
          if (res.success) {
            results.updatedWeekMeta = true;
          } else {
            results.errors.push(`WeekMeta: ${res.error}`);
          }
        }

        results.status = results.errors.length === 0 ? 'success' : 'partial_success';

        if (typeof logAction === 'function') {
          logAction(
            'Batch Ingestion hoàn tất',
            `Thêm: ${results.addedTasks} nhiệm vụ, ${results.addedNotifications} thông báo, TKB: ${results.updatedSchedule ? 'Có' : 'Không'}`
          );
        }

        console.log('🎉 [C7_CONSOLE] Batch Ingestion hoàn tất:', results);
        return results;
      } catch (err) {
        console.error('💥 [C7_CONSOLE] Batch Ingestion thất bại:', err);
        results.status = 'failed';
        results.errors.push(err.message);
        return results;
      }
    },

    // ================= 5. DIAGNOSTICS & HELP =================
    help() {
      console.log(`
%c🎓 C7AIO Automation API Suite (v${this.version})
%cCác lệnh có sẵn trên console (window.C7_CONSOLE hoặc window.C7_BOT):

1. Nhiệm vụ (Tasks):
   • C7_CONSOLE.addTask({ name, category, priority, deadline, description, assignedStudents, tags })
   • C7_CONSOLE.updateTask(taskId, updateData)
   • C7_CONSOLE.deleteTask(taskId)
   • C7_CONSOLE.getTasks()

2. Thông báo (Notifications):
   • C7_CONSOLE.addNotification({ message, content, type, pinned })
   • C7_CONSOLE.updateNotification(notifId, updateData)
   • C7_CONSOLE.deleteNotification(notifId)
   • C7_CONSOLE.togglePin(notifId)
   • C7_CONSOLE.getNotifications()

3. Thời khóa biểu & Niên khóa (Schedules & Academic Years):
   • C7_CONSOLE.updateSchedule({ T2: [...], T3: [...] }, 'week-1', '11C7')
   • C7_CONSOLE.updateDaySchedule('T2', [...], 'week-1', '11C7')  // hoặc ngày '2026-09-08'
   • C7_CONSOLE.addClassPeriod('T2', { name: 'Toán', time: '07:00 - 07:45', room: 'P.204' }, 'week-1', '11C7')
   • C7_CONSOLE.removeClassPeriod('T2', 0) // xóa theo index hoặc tên môn
   • C7_CONSOLE.clearDaySchedule('T2') // xóa sạch tiết của 1 ngày (ví dụ nghỉ lễ)
   • C7_CONSOLE.getDaySchedule('T2', 'week-1', '11C7')
   • C7_CONSOLE.getClassesList() // danh sách các lớp riêng
   • C7_CONSOLE.setWeekMetadata({ week: 1, name: 'Tuần 1', className: '11C7', startDate: '2026-09-07', endDate: '2026-09-13', academicYear: '2026-2027' })
   • C7_CONSOLE.getSchedule('week-1', '11C7')
   • C7_CONSOLE.getAcademicYearInfo() // Thông tin niên khóa & tiến độ năm học
   • C7_CONSOLE.setAcademicYear('2026-2027') // Đổi niên khóa ('2025-2026', '2026-2027', '2027-2028')
   • C7_CONSOLE.getWeekCount('2026-09-08') // Đếm tuần học tính từ Khai giảng (05/09)

5. Thông báo Thay đổi Lịch (Schedule Events):
   • C7_CONSOLE.addScheduleEvent({ weekKey: 'week-1', day: 'monday', periodIndex: 0, type: 'schedule_change', title: 'Đổi phòng Toán → P.301', severity: 'warning' })
       type: 'schedule_change' | 'day_off' | 'extra_class' | 'room_change' | 'info'
       severity: 'info' | 'warning' | 'danger'
       periodIndex: 0-based (Tiết 1=0, Tiết 2=1, ...) hoặc null = cả ngày
   • C7_CONSOLE.getScheduleEvents('week-1') // Lấy danh sách sự kiện theo tuần
   • C7_CONSOLE.deleteScheduleEvent('week-1', 'evt_xxx') // Xóa sự kiện theo ID
   • C7_CONSOLE.clearScheduleEvents('week-1') // Xóa hết sự kiện của tuần

6. Nạp hàng loạt (Batch Ingestion):
   • C7_CONSOLE.ingestBatch({ tasks: [...], notifications: [...], schedules: {...}, weekMetadata: {...} })

Xem tài liệu chi tiết tại AUTOMATION_API.md
      `, 'font-size: 14px; font-weight: bold; color: #6366f1;', 'font-size: 12px; color: #22c55e;');
      return 'Nhập C7_CONSOLE.help() để xem lại danh sách lệnh.';
    },

    info() {
      const tasks = getLocalTasks();
      const notifs = getLocalNotifications();
      const students = typeof STUDENTS !== 'undefined' ? STUDENTS.length : 41;
      return {
        version: this.version,
        totalStudents: students,
        totalTasks: tasks.length,
        totalNotifications: notifs.length,
        firebaseConnected: typeof window.db !== 'undefined' || typeof firebase !== 'undefined'
      };
    }
  };

  // Bind to Global Window Scope with multiple Aliases for flexibility
  window.C7_CONSOLE = C7_ENGINE;
  window.C7_BOT = C7_ENGINE;
  window.C7Console = C7_ENGINE;

  console.log(`🤖 [C7AIO Automation API v${C7_ENGINE.version}] Loaded. Type C7_CONSOLE.help() for instructions.`);
})();
