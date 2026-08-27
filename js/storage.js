/**
 * 本地存储管理器 (100% 离线、私密、纯本地 LocalStorage / IndexedDB)
 * 管理用户日程备忘、重要纪念日/倒数日、个性化偏好设置
 */
const AppStorage = (function () {
  const NOTES_KEY = 'wnl_user_notes';
  const EVENTS_KEY = 'wnl_user_events';
  const SETTINGS_KEY = 'wnl_user_settings';

  const defaultSettings = {
    theme: 'auto', // 'auto', 'light', 'dark'
    firstDayOfWeek: 1, // 1: 星期一, 0: 星期日
    showHuangliInGrid: true,
    showHolidayBadge: true
  };

  function getJSON(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn('读取本地数据失败:', e);
      return fallback;
    }
  }

  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('保存本地数据失败:', e);
      return false;
    }
  }

  return {
    // === 备忘录 / 日程管理 ===
    getNotesForDate: function (dateKey) {
      const allNotes = getJSON(NOTES_KEY, {});
      return allNotes[dateKey] || [];
    },

    getAllNotes: function () {
      return getJSON(NOTES_KEY, {});
    },

    addNote: function (dateKey, text) {
      if (!text || !text.trim()) return null;
      const allNotes = getJSON(NOTES_KEY, {});
      if (!allNotes[dateKey]) {
        allNotes[dateKey] = [];
      }
      const newNote = {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
      allNotes[dateKey].unshift(newNote);
      setJSON(NOTES_KEY, allNotes);
      return newNote;
    },

    toggleNote: function (dateKey, noteId) {
      const allNotes = getJSON(NOTES_KEY, {});
      const list = allNotes[dateKey] || [];
      const item = list.find(n => n.id === noteId);
      if (item) {
        item.completed = !item.completed;
        setJSON(NOTES_KEY, allNotes);
        return item;
      }
      return null;
    },

    deleteNote: function (dateKey, noteId) {
      const allNotes = getJSON(NOTES_KEY, {});
      if (!allNotes[dateKey]) return false;
      allNotes[dateKey] = allNotes[dateKey].filter(n => n.id !== noteId);
      if (allNotes[dateKey].length === 0) {
        delete allNotes[dateKey];
      }
      setJSON(NOTES_KEY, allNotes);
      return true;
    },

    hasNotes: function (dateKey) {
      const allNotes = getJSON(NOTES_KEY, {});
      return !!(allNotes[dateKey] && allNotes[dateKey].length > 0);
    },

    // === 纪念日 / 倒数日 ===
    getEvents: function () {
      return getJSON(EVENTS_KEY, []);
    },

    addEvent: function (title, dateStr, isLunar = false) {
      const events = getJSON(EVENTS_KEY, []);
      const newEvent = {
        id: 'evt_' + Date.now(),
        title: title.trim(),
        dateStr, // 'YYYY-MM-DD' 或 'MM-DD'
        isLunar,
        createdAt: new Date().toISOString()
      };
      events.push(newEvent);
      setJSON(EVENTS_KEY, events);
      return newEvent;
    },

    deleteEvent: function (eventId) {
      let events = getJSON(EVENTS_KEY, []);
      events = events.filter(e => e.id !== eventId);
      setJSON(EVENTS_KEY, events);
    },

    // === 用户设置 ===
    getSettings: function () {
      return Object.assign({}, defaultSettings, getJSON(SETTINGS_KEY, {}));
    },

    saveSettings: function (newSettings) {
      const current = this.getSettings();
      const updated = Object.assign({}, current, newSettings);
      setJSON(SETTINGS_KEY, updated);
      return updated;
    },

    // === 导出与导入数据备份 ===
    exportBackup: function () {
      return JSON.stringify({
        notes: getJSON(NOTES_KEY, {}),
        events: getJSON(EVENTS_KEY, []),
        settings: getJSON(SETTINGS_KEY, {}),
        version: '1.0.0',
        exportTime: new Date().toISOString()
      }, null, 2);
    },

    importBackup: function (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.notes) setJSON(NOTES_KEY, data.notes);
        if (data.events) setJSON(EVENTS_KEY, data.events);
        if (data.settings) setJSON(SETTINGS_KEY, data.settings);
        return true;
      } catch (e) {
        console.error('导入失败:', e);
        return false;
      }
    }
  };
})();

if (typeof window !== 'undefined') {
  window.AppStorage = AppStorage;
}
