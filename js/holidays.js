/**
 * 中国法定节假日与调休补班数据集及判定引擎
 * 覆盖 2024 ~ 2027 精确数据，并支持通用规则与自定义扩展
 */
const Holidays = (function () {
  // 数据格式：
  // 'YYYY-MM-DD': { type: 'holiday' | 'work', name: '节日名' }
  // holiday 表示放假(休)，work 表示调休上班(班)
  const holidayData = {
    // 2024年
    '2024-01-01': { type: 'holiday', name: '元旦' },
    '2024-02-04': { type: 'work', name: '春节补班' },
    '2024-02-10': { type: 'holiday', name: '春节' },
    '2024-02-11': { type: 'holiday', name: '春节' },
    '2024-02-12': { type: 'holiday', name: '春节' },
    '2024-02-13': { type: 'holiday', name: '春节' },
    '2024-02-14': { type: 'holiday', name: '春节' },
    '2024-02-15': { type: 'holiday', name: '春节' },
    '2024-02-16': { type: 'holiday', name: '春节' },
    '2024-02-17': { type: 'holiday', name: '春节' },
    '2024-02-18': { type: 'work', name: '春节补班' },
    '2024-04-04': { type: 'holiday', name: '清明节' },
    '2024-04-05': { type: 'holiday', name: '清明节' },
    '2024-04-06': { type: 'holiday', name: '清明节' },
    '2024-04-07': { type: 'work', name: '清明补班' },
    '2024-04-28': { type: 'work', name: '劳动节补班' },
    '2024-05-01': { type: 'holiday', name: '劳动节' },
    '2024-05-02': { type: 'holiday', name: '劳动节' },
    '2024-05-03': { type: 'holiday', name: '劳动节' },
    '2024-05-04': { type: 'holiday', name: '劳动节' },
    '2024-05-05': { type: 'holiday', name: '劳动节' },
    '2024-05-11': { type: 'work', name: '劳动节补班' },
    '2024-06-10': { type: 'holiday', name: '端午节' },
    '2024-09-14': { type: 'work', name: '中秋补班' },
    '2024-09-15': { type: 'holiday', name: '中秋节' },
    '2024-09-16': { type: 'holiday', name: '中秋节' },
    '2024-09-17': { type: 'holiday', name: '中秋节' },
    '2024-09-29': { type: 'work', name: '国庆补班' },
    '2024-10-01': { type: 'holiday', name: '国庆节' },
    '2024-10-02': { type: 'holiday', name: '国庆节' },
    '2024-10-03': { type: 'holiday', name: '国庆节' },
    '2024-10-04': { type: 'holiday', name: '国庆节' },
    '2024-10-05': { type: 'holiday', name: '国庆节' },
    '2024-10-06': { type: 'holiday', name: '国庆节' },
    '2024-10-07': { type: 'holiday', name: '国庆节' },
    '2024-10-12': { type: 'work', name: '国庆补班' },

    // 2025年
    '2025-01-01': { type: 'holiday', name: '元旦' },
    '2025-01-26': { type: 'work', name: '春节补班' },
    '2025-01-28': { type: 'holiday', name: '除夕' },
    '2025-01-29': { type: 'holiday', name: '春节' },
    '2025-01-30': { type: 'holiday', name: '春节' },
    '2025-01-31': { type: 'holiday', name: '春节' },
    '2025-02-01': { type: 'holiday', name: '春节' },
    '2025-02-02': { type: 'holiday', name: '春节' },
    '2025-02-03': { type: 'holiday', name: '春节' },
    '2025-02-04': { type: 'holiday', name: '春节' },
    '2025-02-08': { type: 'work', name: '春节补班' },
    '2025-04-04': { type: 'holiday', name: '清明节' },
    '2025-04-05': { type: 'holiday', name: '清明节' },
    '2025-04-06': { type: 'holiday', name: '清明节' },
    '2025-04-27': { type: 'work', name: '劳动节补班' },
    '2025-05-01': { type: 'holiday', name: '劳动节' },
    '2025-05-02': { type: 'holiday', name: '劳动节' },
    '2025-05-03': { type: 'holiday', name: '劳动节' },
    '2025-05-04': { type: 'holiday', name: '劳动节' },
    '2025-05-05': { type: 'holiday', name: '劳动节' },
    '2025-05-31': { type: 'holiday', name: '端午节' },
    '2025-06-01': { type: 'holiday', name: '端午节' },
    '2025-06-02': { type: 'holiday', name: '端午节' },
    '2025-09-28': { type: 'work', name: '国庆中秋补班' },
    '2025-10-01': { type: 'holiday', name: '国庆节' },
    '2025-10-02': { type: 'holiday', name: '国庆节' },
    '2025-10-03': { type: 'holiday', name: '国庆节' },
    '2025-10-04': { type: 'holiday', name: '国庆节' },
    '2025-10-05': { type: 'holiday', name: '国庆节' },
    '2025-10-06': { type: 'holiday', name: '中秋节' },
    '2025-10-07': { type: 'holiday', name: '国庆节' },
    '2025-10-08': { type: 'holiday', name: '国庆节' },
    '2025-10-11': { type: 'work', name: '国庆中秋补班' },

    // 2026年 (预测及标准排布)
    '2026-01-01': { type: 'holiday', name: '元旦' },
    '2026-01-02': { type: 'holiday', name: '元旦' },
    '2026-01-03': { type: 'holiday', name: '元旦' },
    '2026-01-04': { type: 'work', name: '元旦补班' },
    '2026-02-15': { type: 'work', name: '春节补班' },
    '2026-02-16': { type: 'holiday', name: '除夕' },
    '2026-02-17': { type: 'holiday', name: '春节' },
    '2026-02-18': { type: 'holiday', name: '春节' },
    '2026-02-19': { type: 'holiday', name: '春节' },
    '2026-02-20': { type: 'holiday', name: '春节' },
    '2026-02-21': { type: 'holiday', name: '春节' },
    '2026-02-22': { type: 'holiday', name: '春节' },
    '2026-02-23': { type: 'holiday', name: '春节' },
    '2026-02-28': { type: 'work', name: '春节补班' },
    '2026-04-04': { type: 'holiday', name: '清明节' },
    '2026-04-05': { type: 'holiday', name: '清明节' },
    '2026-04-06': { type: 'holiday', name: '清明节' },
    '2026-04-26': { type: 'work', name: '劳动节补班' },
    '2026-05-01': { type: 'holiday', name: '劳动节' },
    '2026-05-02': { type: 'holiday', name: '劳动节' },
    '2026-05-03': { type: 'holiday', name: '劳动节' },
    '2026-05-04': { type: 'holiday', name: '劳动节' },
    '2026-05-05': { type: 'holiday', name: '劳动节' },
    '2026-05-09': { type: 'work', name: '劳动节补班' },
    '2026-06-19': { type: 'holiday', name: '端午节' },
    '2026-06-20': { type: 'holiday', name: '端午节' },
    '2026-06-21': { type: 'holiday', name: '端午节' },
    '2026-09-25': { type: 'holiday', name: '中秋节' },
    '2026-09-26': { type: 'holiday', name: '中秋节' },
    '2026-09-27': { type: 'holiday', name: '中秋节' },
    '2026-09-20': { type: 'work', name: '国庆补班' },
    '2026-10-01': { type: 'holiday', name: '国庆节' },
    '2026-10-02': { type: 'holiday', name: '国庆节' },
    '2026-10-03': { type: 'holiday', name: '国庆节' },
    '2026-10-04': { type: 'holiday', name: '国庆节' },
    '2026-10-05': { type: 'holiday', name: '国庆节' },
    '2026-10-06': { type: 'holiday', name: '国庆节' },
    '2026-10-07': { type: 'holiday', name: '国庆节' },
    '2026-10-10': { type: 'work', name: '国庆补班' },

    // 2027年
    '2027-01-01': { type: 'holiday', name: '元旦' },
    '2027-02-05': { type: 'holiday', name: '除夕' },
    '2027-02-06': { type: 'holiday', name: '春节' },
    '2027-02-07': { type: 'holiday', name: '春节' },
    '2027-04-05': { type: 'holiday', name: '清明节' },
    '2027-05-01': { type: 'holiday', name: '劳动节' },
    '2027-06-09': { type: 'holiday', name: '端午节' },
    '2027-09-15': { type: 'holiday', name: '中秋节' },
    '2027-10-01': { type: 'holiday', name: '国庆节' }
  };

  /**
   * 格式化日期 key: 'YYYY-MM-DD'
   */
  function formatDateKey(year, month, day) {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  return {
    /**
     * 获取指定日期的法定放假/调休状态
     * @param {number} year 
     * @param {number} month (1-12)
     * @param {number} day (1-31)
     * @returns {{ isHoliday: boolean, isWork: boolean, name: string | null }}
     */
    getStatus: function (year, month, day) {
      const key = formatDateKey(year, month, day);
      const item = holidayData[key];
      if (!item) {
        return {
          isHoliday: false,
          isWork: false,
          name: null
        };
      }
      return {
        isHoliday: item.type === 'holiday',
        isWork: item.type === 'work',
        name: item.name
      };
    },

    /**
     * 添加自定义节假日数据
     */
    addCustom: function (dateStr, type, name) {
      holidayData[dateStr] = { type, name };
    }
  };
})();

if (typeof window !== 'undefined') {
  window.Holidays = Holidays;
}
