/**
 * 日历与天文历法计算核心引擎
 * 基于 6tail/lunar-javascript 封装，提供高性能、高精度的农历、黄历、节气与吉凶计算
 */
const CalendarEngine = (function () {
  /**
   * 格式化补零
   */
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * 生成 'YYYY-MM-DD' 格式
   */
  function toDateKey(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const monthGridCache = new Map();

  return {
    /**
     * 获取指定公历日期的完整详细信息
     * @param {number} year 
     * @param {number} month (1-12)
     * @param {number} day (1-31)
     */
    getDayDetail: function (year, month, day) {
      if (!window.Solar) {
        console.error('lunar-javascript 未加载');
        return null;
      }

      const solar = Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();
      const dateKey = toDateKey(year, month, day);

      // 节气
      const jieqi = lunar.getJieQi();
      const prevJieqi = lunar.getPrevJieQi(true);
      const nextJieqi = lunar.getNextJieQi(true);

      // 节日判断 (公历节日 + 农历节日)
      const solarFestivals = solar.getFestivals() || [];
      const solarOtherFestivals = solar.getOtherFestivals() || [];
      const lunarFestivals = lunar.getFestivals() || [];
      const lunarOtherFestivals = lunar.getOtherFestivals() || [];

      // 整合所有节日
      const allFestivals = [
        ...solarFestivals,
        ...lunarFestivals,
        ...solarOtherFestivals,
        ...lunarOtherFestivals
      ];

      // 核心重大传统节日白名单 (严格过滤长名生僻小众纪念日，确保日历格纯净优雅)
      const majorLunarFestivals = new Set([
        '除夕', '春节', '元宵节', '龙头节', '上巳节', '清明节', '端午节', '七夕节', '中元节', '中秋节', '重阳节', '下元节', '腊八节', '小年'
      ]);
      const majorSolarFestivals = {
        '1-1': '元旦',
        '3-8': '妇女节',
        '3-12': '植树节',
        '5-1': '劳动节',
        '5-4': '青年节',
        '6-1': '儿童节',
        '7-1': '建党节',
        '8-1': '建军节',
        '9-10': '教师节',
        '10-1': '国庆节',
        '12-13': '公祭日',
        '12-25': '圣诞节'
      };

      // 提取重大节日
      const validLunarFest = lunarFestivals.find(f => majorLunarFestivals.has(f)) || null;
      const validSolarFest = majorSolarFestivals[`${month}-${day}`] || null;

      // 日历网格中优先展示的次级文案 (重大节日 > 24节气 > 农历初一显示月名 > 纯正农历日)
      let subText = lunar.getDayInChinese();
      let subTextType = 'lunar'; // 'festival', 'jieqi', 'lunar-first', 'lunar'

      if (validLunarFest) {
        subText = validLunarFest;
        subTextType = 'festival';
      } else if (validSolarFest) {
        subText = validSolarFest;
        subTextType = 'festival';
      } else if (jieqi) {
        subText = jieqi;
        subTextType = 'jieqi';
      } else if (lunar.getDay() === 1) {
        subText = (lunar.getMonthInChinese() + '月');
        subTextType = 'lunar-first';
      }

      // 法定节假日状态 (放假 / 调休补班)
      const holidayInfo = window.Holidays ? window.Holidays.getStatus(year, month, day) : { isHoliday: false, isWork: false, name: null };

      // 彭祖百忌
      const pengzuGan = lunar.getPengZuGan();
      const pengzuZhi = lunar.getPengZuZhi();
      const pengzu = `${pengzuGan} ${pengzuZhi}`;

      // 宜忌
      const yi = lunar.getDayYi() || [];
      const ji = lunar.getDayJi() || [];

      // 吉神方位
      const xiShen = lunar.getDayPositionXiDesc();
      const fuShen = lunar.getDayPositionFuDesc();
      const caiShen = lunar.getDayPositionCaiDesc();
      const taiShen = lunar.getDayPositionTai();

      // 冲煞与干支 (采用天文学与紫金山天文台标准：立春换岁、节令换月)
      const chong = lunar.getDayChongDesc();
      const sha = lunar.getDaySha();
      const ganZhiYear = lunar.getYearInGanZhiByLiChun();
      const ganZhiMonth = lunar.getMonthInGanZhiExact();
      const ganZhiDay = lunar.getDayInGanZhiExact();
      const shengXiao = lunar.getYearShengXiaoByLiChun();
      const naYin = lunar.getDayNaYin();

      // 时辰吉凶 (十二时辰)
      const times = lunar.getTimes().map(t => {
        return {
          ganzhi: t.getGanZhi(),
          timeRange: t.getMinHm() + ' - ' + t.getMaxHm(),
          tianShen: t.getTianShen(),
          tianShenType: t.getTianShenType(), // '黄道' | '黑道'
          tianShenLuck: t.getTianShenLuck(), // '吉' | '凶'
          yi: t.getYi() || [],
          ji: t.getJi() || []
        };
      });

      return {
        // 公历信息
        year,
        month,
        day,
        dateKey,
        weekDay: solar.getWeek(), // 0: 周日, 1: 周一, ..., 6: 周六
        weekDayChinese: '星期' + solar.getWeekInChinese(),
        isLeapYear: solar.isLeapYear(),

        // 农历信息
        lunarYear: lunar.getYear(),
        lunarMonth: lunar.getMonth(),
        lunarMonthChinese: lunar.getMonthInChinese() + '月',
        lunarDay: lunar.getDay(),
        lunarDayChinese: lunar.getDayInChinese(),
        isLunarLeapMonth: lunar.getMonth() < 0,
        ganZhiYear,
        ganZhiMonth,
        ganZhiDay,
        shengXiao,
        naYin,

        // 节气与节日
        jieqi,
        prevJieqi: prevJieqi ? `${prevJieqi.getName()} (${prevJieqi.getSolar().toYmd()})` : '',
        nextJieqi: nextJieqi ? `${nextJieqi.getName()} (${nextJieqi.getSolar().toYmd()})` : '',
        festivals: allFestivals,
        subText,
        subTextType,

        // 法定节假日
        isHoliday: holidayInfo.isHoliday,
        isWork: holidayInfo.isWork,
        holidayName: holidayInfo.name,

        // 黄历
        yi,
        ji,
        chong,
        sha,
        pengzu,
        xiShen,
        fuShen,
        caiShen,
        taiShen,
        times
      };
    },

    /**
     * 轻量级日历单元格数据生成 (专为 120 FPS 满帧切月优化，极速纯净)
     */
    getGridCellDetail: function (year, month, day) {
      if (!window.Solar) return null;
      const solar = Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();

      // 节日与节气
      const jieqi = lunar.getJieQi();
      const lunarFestivals = lunar.getFestivals() || [];
      const majorLunarFestivals = new Set([
        '除夕', '春节', '元宵节', '龙头节', '上巳节', '清明节', '端午节', '七夕节', '中元节', '中秋节', '重阳节', '下元节', '腊八节', '小年'
      ]);
      const majorSolarFestivals = {
        '1-1': '元旦', '3-8': '妇女节', '3-12': '植树节', '5-1': '劳动节', '5-4': '青年节',
        '6-1': '儿童节', '7-1': '建党节', '8-1': '建军节', '9-10': '教师节', '10-1': '国庆节',
        '12-13': '公祭日', '12-25': '圣诞节'
      };

      const validLunarFest = lunarFestivals.find(f => majorLunarFestivals.has(f)) || null;
      const validSolarFest = majorSolarFestivals[`${month}-${day}`] || null;

      let subText = lunar.getDayInChinese();
      let subTextType = 'lunar';

      if (validLunarFest) {
        subText = validLunarFest;
        subTextType = 'festival';
      } else if (validSolarFest) {
        subText = validSolarFest;
        subTextType = 'festival';
      } else if (jieqi) {
        subText = jieqi;
        subTextType = 'jieqi';
      } else if (lunar.getDay() === 1) {
        subText = (lunar.getMonthInChinese() + '月');
        subTextType = 'lunar-first';
      }

      const holidayInfo = window.Holidays ? window.Holidays.getStatus(year, month, day) : { isHoliday: false, isWork: false };

      return {
        year,
        month,
        day,
        weekDay: solar.getWeek(),
        lunarMonthChinese: lunar.getMonthInChinese() + '月',
        lunarDayChinese: lunar.getDayInChinese(),
        subText,
        subTextType,
        isHoliday: holidayInfo.isHoliday,
        isWork: holidayInfo.isWork
      };
    },

    /**
     * 获取某个月份的完整网格日历数据 (包含前后补齐的上月/下月日期，固定42格)
     * @param {number} year 
     * @param {number} month (1-12)
     * @param {number} firstDayOfWeek (1: 周一排最前, 0: 周日排最前)
     */
    getMonthGrid: function (year, month, firstDayOfWeek = 1) {
      const cacheKey = `${year}-${month}-${firstDayOfWeek}`;
      if (monthGridCache.has(cacheKey)) {
        return monthGridCache.get(cacheKey);
      }

      const days = [];
      const solarMonth = SolarMonth.fromYm(year, month);
      const solarDays = solarMonth.getDays();

      // 当月第一天的星期几 (0: 周日, 1: 周一, ...)
      const firstDay = solarDays[0];
      const firstDayWeek = firstDay.getWeek();

      // 计算需要向前补充的上月天数
      let prevCount = 0;
      if (firstDayOfWeek === 1) {
        prevCount = firstDayWeek === 0 ? 6 : firstDayWeek - 1;
      } else {
        prevCount = firstDayWeek;
      }

      // 补充上月日期
      if (prevCount > 0) {
        const prevMonthSolar = SolarMonth.fromYm(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
        const prevMonthDays = prevMonthSolar.getDays();
        const startIdx = prevMonthDays.length - prevCount;
        for (let i = startIdx; i < prevMonthDays.length; i++) {
          const s = prevMonthDays[i];
          const info = this.getGridCellDetail(s.getYear(), s.getMonth(), s.getDay());
          info.isCurrentMonth = false;
          info.isPrevMonth = true;
          days.push(info);
        }
      }

      // 填充当月日期
      solarDays.forEach(s => {
        const info = this.getGridCellDetail(s.getYear(), s.getMonth(), s.getDay());
        info.isCurrentMonth = true;
        days.push(info);
      });

      // 补齐下月天数 (固定 6 行 42 格)
      const nextMonthSolar = SolarMonth.fromYm(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
      const nextMonthDays = nextMonthSolar.getDays();
      let nextIdx = 0;
      while (days.length < 42 && nextIdx < nextMonthDays.length) {
        const s = nextMonthDays[nextIdx];
        const info = this.getGridCellDetail(s.getYear(), s.getMonth(), s.getDay());
        info.isCurrentMonth = false;
        info.isNextMonth = true;
        days.push(info);
        nextIdx++;
      }

      monthGridCache.set(cacheKey, days);
      return days;
    },

    /**
     * 获取指定年份的全部二十四节气列表
     * @param {number} year 
     */
    getSolarTermsOfYear: function (year) {
      if (!window.Solar) return [];
      const lunar = Solar.fromYmd(year, 6, 1).getLunar();
      const jieQiTable = lunar.getJieQiTable();
      const terms24 = [
        '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
        '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
        '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
        '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
      ];
      const list = [];
      for (let name of terms24) {
        const solar = jieQiTable[name];
        if (solar) {
          list.push({
            name: name,
            dateStr: solar.toYmd(),
            timeStr: solar.toYmdHms().split(' ')[1] || '',
            month: solar.getMonth(),
            day: solar.getDay()
          });
        }
      }
      // 按日期升序排序
      list.sort((a, b) => (a.dateStr > b.dateStr ? 1 : -1));
      return list;
    },

    /**
     * 筛选黄道吉日 (在指定时间范围内，查找宜于特定事项的日期)
     * @param {number} startYear 
     * @param {number} startMonth 
     * @param {number} durationMonths 
     * @param {string} matter 事项名称 (如 '嫁娶', '开市', '入宅', '出行', '祈福', '动土', '安床')
     */
    findAuspiciousDays: function (startYear, startMonth, durationMonths = 2, matter = '嫁娶') {
      const results = [];
      let currentYear = startYear;
      let currentMonth = startMonth;

      for (let m = 0; m < durationMonths; m++) {
        const solarMonth = SolarMonth.fromYm(currentYear, currentMonth);
        const days = solarMonth.getDays();
        days.forEach(s => {
          const info = this.getDayDetail(s.getYear(), s.getMonth(), s.getDay());
          if (info.yi && info.yi.some(item => item.includes(matter))) {
            results.push(info);
          }
        });

        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
      return results;
    }
  };
})();

if (typeof window !== 'undefined') {
  window.CalendarEngine = CalendarEngine;
}
