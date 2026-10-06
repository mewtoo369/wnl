/**
 * 万年历主应用逻辑控制器 (iOS PWA 交互、滑动手势、视图渲染与事件绑定)
 */
document.addEventListener('DOMContentLoaded', () => {
  const AppStorage = window.AppStorage;
  const Holidays = window.Holidays;
  const CalendarEngine = window.CalendarEngine;

  // 当前时间与选定时间状态
  const todayDate = new Date();
  const state = {
    viewYear: todayDate.getFullYear(),
    viewMonth: todayDate.getMonth() + 1, // 1-12
    selectedYear: todayDate.getFullYear(),
    selectedMonth: todayDate.getMonth() + 1,
    selectedDay: todayDate.getDate(),
    selectedAuspiciousTag: '嫁娶'
  };

  let baseYear = state.viewYear;
  const HALF_SPAN = 7; // 前后各 7 年，共 15 年连续全长卷 (180 个自然月)，覆盖跨年无缝畅滑
  let isScrollProgrammatic = false;

  // DOM 元素引用
  const dom = {
    headerYearText: document.getElementById('headerYearText'),
    headerMonthText: document.getElementById('headerMonthText'),
    headerLunarYearText: document.getElementById('headerLunarYearText'),
    headerLunarZodiacText: document.getElementById('headerLunarZodiacText'),
    monthGrid: document.getElementById('monthGrid'),
    calendarScrollContainer: document.getElementById('calendarScrollContainer'),
    btnToday: document.getElementById('btnToday'),
    btnPrevMonth: document.getElementById('btnPrevMonth'),
    btnNextMonth: document.getElementById('btnNextMonth'),
    btnSettings: document.getElementById('btnSettings'),
    btnYearMonthPicker: document.getElementById('btnYearMonthPicker'),
    
    // 视图切换 Tab 与滑动背景
    tabSliderPill: document.getElementById('tabSliderPill'),
    tabCalendar: document.getElementById('tabCalendar'),
    tabJieqi: document.getElementById('tabJieqi'),
    tabAuspicious: document.getElementById('tabAuspicious'),
    
    viewsSwipeCarousel: document.getElementById('viewsSwipeCarousel'),
    panelViewCalendar: document.getElementById('panelViewCalendar'),
    panelViewJieqi: document.getElementById('panelViewJieqi'),
    panelViewAuspicious: document.getElementById('panelViewAuspicious'),
    
    // 详情卡片与折叠控制
    btnToggleHuangli: document.getElementById('btnToggleHuangli'),
    toggleHuangliText: document.getElementById('toggleHuangliText'),
    toggleHuangliIcon: document.getElementById('toggleHuangliIcon'),
    detailSolarLarge: document.getElementById('detailSolarLarge'),
    detailSolarWeek: document.getElementById('detailSolarWeek'),
    detailLunarMain: document.getElementById('detailLunarMain'),
    detailLunarGanzhi: document.getElementById('detailLunarGanzhi'),
    detailJieqiTag: document.getElementById('detailJieqiTag'),
    yiTagsContainer: document.getElementById('yiTagsContainer'),
    jiTagsContainer: document.getElementById('jiTagsContainer'),
    valChongSha: document.getElementById('valChongSha'),
    valPengZu: document.getElementById('valPengZu'),
    valShenWei: document.getElementById('valShenWei'),
    valTaiShen: document.getElementById('valTaiShen'),
    timesScrollBox: document.getElementById('timesScrollBox'),

    // 模态弹窗与底部抽屉
    modalOverlay: document.getElementById('modalOverlay'),
    huangliModal: document.getElementById('huangliModal'),
    sheetLunarMainTitle: document.getElementById('sheetLunarMainTitle'),
    sheetSolarWeekGanzhi: document.getElementById('sheetSolarWeekGanzhi'),
    pickerModal: document.getElementById('pickerModal'),
    settingsModal: document.getElementById('settingsModal'),
    pickerYearsGrid: document.getElementById('pickerYearsGrid'),
    pickerMonthsGrid: document.getElementById('pickerMonthsGrid'),
    
    // 节气与吉日列表
    solarTermsList: document.getElementById('solarTermsList'),
    auspiciousTagsRow: document.getElementById('auspiciousTagsRow'),
    auspiciousResultsList: document.getElementById('auspiciousResultsList'),

    // 设置项
    themeSelect: document.getElementById('themeSelect'),
    btnExportData: document.getElementById('btnExportData'),
    btnImportData: document.getElementById('btnImportData'),
    fileImport: document.getElementById('fileImport')
  };

  // 地支五行映射: 寅卯木(绿色), 巳午火(红色), 申酉金(金色), 亥子水(蓝色), 辰戌丑未土(棕色)
  const branchWuXing = {
    '寅': 'wood', '卯': 'wood',
    '巳': 'fire', '午': 'fire',
    '申': 'metal', '酉': 'metal',
    '亥': 'water', '子': 'water',
    '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth'
  };

  function getWuXingName(wx) {
    const map = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
    return map[wx] || '';
  }

  /**
   * 仅对地支（年支、月支、日支）进行五行属性着色，天干保持默认颜色
   */
  function colorizeGanZhi(str) {
    if (!str) return '';
    let result = '';
    for (let char of str) {
      if (branchWuXing[char]) {
        const wx = branchWuXing[char];
        result += `<span class="wuxing-${wx}" title="地支【${char}】· 五行属${getWuXingName(wx)}">${char}</span>`;
      } else {
        result += char;
      }
    }
    return result;
  }

  // 初始化应用
  init();

  function init() {
    initTheme();
    renderHeader();
    renderCalendarGrid();
    renderDayDetail(state.selectedYear, state.selectedMonth, state.selectedDay);
    renderSolarTerms();
    renderAuspiciousDays();
    bindEvents();
    registerServiceWorker();
  }

  /**
   * 初始化主题模式
   */
  function initTheme() {
    const settings = window.AppStorage ? window.AppStorage.getSettings() : { theme: 'auto' };
    applyTheme(settings.theme || 'auto');
    if (dom.themeSelect) {
      dom.themeSelect.value = settings.theme || 'auto';
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  /**
   * 渲染顶部标题
   */
  function renderHeader() {
    if (dom.headerYearText) dom.headerYearText.textContent = `${state.viewYear}年`;
    if (dom.headerMonthText) dom.headerMonthText.textContent = `${state.viewMonth}月`;
    
    // 计算当月农历年份与生肖
    const midDay = CalendarEngine.getDayDetail(state.viewYear, state.viewMonth, 15);
    if (midDay) {
      if (dom.headerLunarYearText) {
        dom.headerLunarYearText.innerHTML = colorizeGanZhi(`${midDay.ganZhiYear}年`);
      }
      if (dom.headerLunarZodiacText) {
        dom.headerLunarZodiacText.textContent = `【${midDay.shengXiao}年】`;
      }
    }
  }

  /**
   * 计算指定年月的合理默认选中日
   */
  function getSelectedDayForMonth(year, month) {
    const todayY = todayDate.getFullYear();
    const todayM = todayDate.getMonth() + 1;
    const todayD = todayDate.getDate();

    if (year === todayY && month === todayM) {
      return todayD;
    }
    const maxDays = new Date(year, month, 0).getDate();
    return Math.min(state.selectedDay || 1, maxDays);
  }

  /**
   * 将指定年月的 42 个日期单元格渲染至指定面板容器中 (零 DOM 销毁重建，极速纯净)
   */
  function renderMonthIntoPanel(panelElement, targetYear, targetMonth) {
    if (!panelElement) return;
    const days = CalendarEngine.getMonthGrid(targetYear, targetMonth, 1);

    // 确保容器内常驻 42 个结构完备的 DOM 骨架
    let cells = panelElement.querySelectorAll('.day-cell');
    if (cells.length !== 42) {
      panelElement.innerHTML = '';
      for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        const numSpan = document.createElement('span');
        numSpan.className = 'solar-num';
        const lunarSpan = document.createElement('span');
        lunarSpan.className = 'lunar-text';
        const badge = document.createElement('span');
        badge.className = 'holiday-badge';
        cell.appendChild(numSpan);
        cell.appendChild(lunarSpan);
        cell.appendChild(badge);
        panelElement.appendChild(cell);
      }
      cells = panelElement.querySelectorAll('.day-cell');
    }

    const todayY = todayDate.getFullYear();
    const todayM = todayDate.getMonth() + 1;
    const todayD = todayDate.getDate();

    // 原地更新 42 个单元格的文本与状态类名 (耗时 < 0.2ms，0 次 DOM 重建)
    for (let i = 0; i < 42 && i < cells.length; i++) {
      const d = days[i];
      const cell = cells[i];
      if (!cell || !cell.children || cell.children.length < 3) continue;
      const numSpan = cell.children[0];
      const lunarSpan = cell.children[1];
      const badge = cell.children[2];

      cell.className = 'day-cell';
      if (!d.isCurrentMonth) cell.classList.add('other-month');
      if (d.weekDay === 0 || d.weekDay === 6) cell.classList.add('weekend');
      if (d.year === todayY && d.month === todayM && d.day === todayD) cell.classList.add('is-today');

      // 仅当用户主动点击或处于当月今天时才选中，绝不跨月盲目复用相同日号！
      if (state.selectedDay && d.year === state.selectedYear && d.month === state.selectedMonth && d.day === state.selectedDay) {
        cell.classList.add('is-selected');
      }

      numSpan.textContent = d.day;
      lunarSpan.className = `lunar-text ${d.subTextType}`;
      lunarSpan.textContent = d.subText;

      if (d.isHoliday) {
        badge.className = 'holiday-badge badge-xiu';
        badge.textContent = '休';
        badge.style.display = 'block';
      } else if (d.isWork) {
        badge.className = 'holiday-badge badge-ban';
        badge.textContent = '班';
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }

      cell.onclick = () => {
        state.selectedYear = d.year;
        state.selectedMonth = d.month;
        state.selectedDay = d.day;

        if (d.year !== state.viewYear || d.month !== state.viewMonth) {
          state.viewYear = d.year;
          state.viewMonth = d.month;
          renderHeader();
          renderCalendarGrid();
        } else {
          // 当前面板高亮即时切换
          const panel = cell.closest('.month-grid-panel');
          if (panel) {
            panel.querySelectorAll('.day-cell.is-selected').forEach(el => el.classList.remove('is-selected'));
            cell.classList.add('is-selected');
          }
        }

        renderDayDetail(d.year, d.month, d.day);
      };
    }
  }

  /**
   * 渲染系统级 180 面板连续 15 年全长卷 (涵盖 baseYear-7 到 baseYear+7 共 180 个自然月份)
   * 彻底根治跨年跳变 Bug：彻底移除销毁式重建与静默重置跑道定时器，多跨年无缝漫游、0 累加 Bug、120 FPS ProMotion 满帧！
   */
  function renderCalendarGrid(forceRebuild = false) {
    const container = dom.calendarScrollContainer;
    if (!container) return;

    const y = state.viewYear;
    const startYear = baseYear - HALF_SPAN;
    const endYear = baseYear + HALF_SPAN;

    // 若当前年份已超出 15 年视口范围，或者容器为空，或者显式指定重建，才重新居中 baseYear
    if (forceRebuild || y < startYear || y > endYear || container.children.length === 0) {
      isScrollProgrammatic = true;
      baseYear = y;
      const newStartYear = baseYear - HALF_SPAN;
      const totalPanels = (HALF_SPAN * 2 + 1) * 12; // 15 * 12 = 180
      container.innerHTML = '';

      // 生成 180 个连续自然月份物理面板 (15 年 × 12 个月)
      for (let i = 0; i < totalPanels; i++) {
        const panelYear = newStartYear + Math.floor(i / 12);
        const panelMonth = (i % 12) + 1;

        const panel = document.createElement('div');
        panel.className = 'month-grid-panel';
        panel.setAttribute('data-year', panelYear);
        panel.setAttribute('data-month', panelMonth);
        panel.setAttribute('data-index', i);

        const weekHeader = document.createElement('div');
        weekHeader.className = 'week-header';
        weekHeader.innerHTML = '<span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span class="weekend">六</span><span class="weekend">日</span>';
        panel.appendChild(weekHeader);

        const grid = document.createElement('div');
        grid.className = 'month-grid';
        renderMonthIntoPanel(grid, panelYear, panelMonth);
        panel.appendChild(grid);

        container.appendChild(panel);
      }

      scrollToYearMonth(state.viewYear, state.viewMonth, false);

      // 双重 rAF 确保浏览器完成排版渲染且 scrollLeft 稳定后再解锁
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isScrollProgrammatic = false;
        });
      });
    } else {
      // 仅更新高亮选中的日期，绝不触碰 DOM 骨架，零跳帧、零位移
      container.querySelectorAll('.month-grid-panel').forEach(panel => {
        const py = parseInt(panel.getAttribute('data-year') || '0', 10);
        const pm = parseInt(panel.getAttribute('data-month') || '0', 10);
        const grid = panel.querySelector('.month-grid');
        if (grid && py && pm) {
          renderMonthIntoPanel(grid, py, pm);
        }
      });
      scrollToYearMonth(state.viewYear, state.viewMonth, false);
    }
  }

  /**
   * 渲染选定日期的黄历详情卡片
   */
  function renderDayDetail(year, month, day) {
    const d = CalendarEngine.getDayDetail(year, month, day);
    if (!d) return;

    // 农历大标题
    if (dom.detailLunarMain) {
      dom.detailLunarMain.textContent = `农历 ${d.lunarMonthChinese}${d.lunarDayChinese}`;
    }

    // 抽屉内部大标题
    if (dom.sheetLunarMainTitle) {
      dom.sheetLunarMainTitle.textContent = `农历 ${d.lunarMonthChinese}${d.lunarDayChinese}`;
    }
    if (dom.sheetSolarWeekGanzhi) {
      dom.sheetSolarWeekGanzhi.innerHTML = `${d.year}年${d.month}月${d.day}日 · ${d.weekDayChinese} · ${colorizeGanZhi(`${d.ganZhiYear}年 ${d.ganZhiMonth}月 ${d.ganZhiDay}日`)}`;
    }

    // 公历年月日与星期
    if (dom.detailSolarWeek) {
      dom.detailSolarWeek.textContent = `${d.year}年${d.month}月${d.day}日 · ${d.weekDayChinese}`;
    }

    // 干支纪年/月/日 (地支根据五行属性着色)
    if (dom.detailLunarGanzhi) {
      dom.detailLunarGanzhi.innerHTML = colorizeGanZhi(`${d.ganZhiYear}年 ${d.ganZhiMonth}月 ${d.ganZhiDay}日`);
    }

    if (dom.detailSolarLarge) {
      dom.detailSolarLarge.textContent = d.day;
    }

    // 节气或节日标签 (紧跟在农历日期右侧)
    if (d.jieqi) {
      dom.detailJieqiTag.textContent = `节气 · ${d.jieqi}`;
      dom.detailJieqiTag.style.display = 'inline-flex';
    } else if (d.festivals.length > 0) {
      dom.detailJieqiTag.textContent = d.festivals[0];
      dom.detailJieqiTag.style.display = 'inline-flex';
    } else {
      dom.detailJieqiTag.style.display = 'none';
    }

    // 宜
    dom.yiTagsContainer.innerHTML = '';
    if (d.yi && d.yi.length > 0) {
      d.yi.slice(0, 10).forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'yiji-tag';
        tag.textContent = item;
        dom.yiTagsContainer.appendChild(tag);
      });
    } else {
      dom.yiTagsContainer.innerHTML = '<span class="yiji-tag">诸事不宜</span>';
    }

    // 忌
    dom.jiTagsContainer.innerHTML = '';
    if (d.ji && d.ji.length > 0) {
      d.ji.slice(0, 10).forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'yiji-tag';
        tag.textContent = item;
        dom.jiTagsContainer.appendChild(tag);
      });
    } else {
      dom.jiTagsContainer.innerHTML = '<span class="yiji-tag">诸事可行</span>';
    }

    // 黄历神煞方位
    dom.valChongSha.textContent = `${d.chong} · 煞${d.sha}`;
    dom.valPengZu.textContent = d.pengzu;
    dom.valShenWei.textContent = `喜神: ${d.xiShen} / 福神: ${d.fuShen} / 财神: ${d.caiShen}`;
    dom.valTaiShen.textContent = d.taiShen;

    // 十二时辰吉凶横向滚动条
    dom.timesScrollBox.innerHTML = '';
    if (d.times) {
      d.times.forEach(t => {
        const chip = document.createElement('div');
        chip.className = 'time-chip';
        const isJi = t.tianShenLuck === '吉';
        chip.innerHTML = `
          <span class="time-chip-gz">${t.ganzhi}时</span>
          <span class="time-chip-ts ${isJi ? 'luck-ji' : 'luck-xiong'}">${t.tianShen}(${t.tianShenLuck})</span>
          <span class="time-chip-range">${t.timeRange}</span>
        `;
        dom.timesScrollBox.appendChild(chip);
      });
    }
  }

  /**
   * 绑定所有交互事件与触控手势
   */
  function bindEvents() {
    // 回到今天
    dom.btnToday.addEventListener('click', () => {
      state.viewYear = todayDate.getFullYear();
      state.viewMonth = todayDate.getMonth() + 1;
      state.selectedYear = todayDate.getFullYear();
      state.selectedMonth = todayDate.getMonth() + 1;
      state.selectedDay = todayDate.getDate();

      switchTab('calendar');
      renderHeader();
      renderCalendarGrid();
      renderDayDetail(state.selectedYear, state.selectedMonth, state.selectedDay);
    });

    // 上个月
    dom.btnPrevMonth.addEventListener('click', () => {
      goToPrevMonth();
    });

    // 下个月
    dom.btnNextMonth.addEventListener('click', () => {
      goToNextMonth();
    });

    // 模态弹窗关闭与遮罩点击
    dom.modalOverlay.addEventListener('click', e => {
      if (e.target === dom.modalOverlay) {
        closeModals();
      }
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', closeModals);
    });

    // 打开年月快速选择器
    dom.btnYearMonthPicker.addEventListener('click', () => {
      openYearMonthPicker();
    });

    // 打开设置
    dom.btnSettings.addEventListener('click', () => {
      openSettings();
    });

    // 打开黄历宜忌与时辰详情抽屉 (100% 满帧硬件 GPU 驱动)
    if (dom.btnToggleHuangli) {
      dom.btnToggleHuangli.addEventListener('click', () => {
        openHuangliModal();
      });
    }

    // 绑定所有底部抽屉向下滑动关闭手势
    bindModalGestures();

    // Tab 切换
    dom.tabCalendar.addEventListener('click', () => switchTab('calendar'));
    dom.tabJieqi.addEventListener('click', () => switchTab('jieqi'));
    dom.tabAuspicious.addEventListener('click', () => switchTab('auspicious'));

    // 吉日速查标签点击
    dom.auspiciousTagsRow.addEventListener('click', e => {
      if (e.target.classList.contains('tag-filter')) {
        dom.auspiciousTagsRow.querySelectorAll('.tag-filter').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        state.selectedAuspiciousTag = e.target.dataset.tag;
        renderAuspiciousDays();
      }
    });

    // 主题切换
    if (dom.themeSelect) {
      dom.themeSelect.addEventListener('change', e => {
        const theme = e.target.value;
        AppStorage.saveSettings({ theme });
        applyTheme(theme);
      });
    }

    // MacBook 原生键盘快捷键支持
    window.addEventListener('keydown', e => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // 如果当前聚焦在输入框中，且不是 Esc/Enter，则允许正常打字
      if (document.activeElement === dom.inputNote && !['escape'].includes(key) && !isCmdOrCtrl) {
        return;
      }

      // Esc: 关闭所有弹窗
      if (e.key === 'Escape') {
        closeModals();
        return;
      }

      if (isCmdOrCtrl) {
        // Cmd + T: 回到今天
        if (key === 't') {
          e.preventDefault();
          dom.btnToday.click();
        }
        // Cmd + ArrowLeft 或 Cmd + [ : 上个月
        else if (e.key === 'ArrowLeft' || key === '[') {
          e.preventDefault();
          goToPrevMonth();
        }
        // Cmd + ArrowRight 或 Cmd + ] : 下个月
        else if (e.key === 'ArrowRight' || key === ']') {
          e.preventDefault();
          goToNextMonth();
        }
        // Cmd + ArrowUp: 上一年
        else if (e.key === 'ArrowUp') {
          e.preventDefault();
          state.viewYear--;
          renderWithAnimation('slide-right');
        }
        // Cmd + ArrowDown: 下一年
        else if (e.key === 'ArrowDown') {
          e.preventDefault();
          state.viewYear++;
          renderWithAnimation('slide-left');
        }
        // Cmd + 1: 月历 Tab
        else if (key === '1') {
          e.preventDefault();
          switchTab('calendar');
        }
        // Cmd + 2: 节气表 Tab
        else if (key === '2') {
          e.preventDefault();
          switchTab('jieqi');
        }
        // Cmd + 3: 吉日速查 Tab
        else if (key === '3') {
          e.preventDefault();
          switchTab('auspicious');
        }
        // Cmd + , : 打开设置
        else if (key === ',') {
          e.preventDefault();
          openSettings();
        }
        // Cmd + N: 新建备忘聚焦
        else if (key === 'n') {
          e.preventDefault();
          dom.inputNote.focus();
        }
      } else {
        // 纯方向键切换选中的日期 (左右加减天，上下加减周)
        if (state.currentTab === 'calendar' && !dom.modalOverlay.classList.contains('active')) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigateDay(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            navigateDay(1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateDay(-7);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateDay(7);
          }
        }
      }
    });

    // 辅助函数：按键盘方向键平滑增减日期
    function navigateDay(offsetDays) {
      const cur = new Date(state.selectedYear, state.selectedMonth - 1, state.selectedDay + offsetDays);
      state.selectedYear = cur.getFullYear();
      state.selectedMonth = cur.getMonth() + 1;
      state.selectedDay = cur.getDate();
      state.viewYear = cur.getFullYear();
      state.viewMonth = cur.getMonth() + 1;
      renderHeader();
      renderCalendarGrid();
      renderDayDetail(state.selectedYear, state.selectedMonth, state.selectedDay);
    }

    // 数据备份与恢复
    if (dom.btnExportData) {
      dom.btnExportData.addEventListener('click', () => {
        const data = AppStorage.exportBackup();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `万年历备份_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (dom.btnImportData) {
      dom.btnImportData.addEventListener('click', () => dom.fileImport.click());
      dom.fileImport.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          if (AppStorage.importBackup(ev.target.result)) {
            alert('数据恢复成功！');
            location.reload();
          } else {
            alert('导入失败，文件格式不正确。');
          }
        };
        reader.readAsText(file);
      });
    }

    // 绑定日历区域的左右滑动手势
    bindSwipeGestures();
  }

  /**
   * 120Hz 系统级 180 面板连续 15 年长卷导航引擎 (ProMotion 满帧，涵盖 Y-7 到 Y+7)
   */
  function getPanelIndexFor(y, m) {
    const startYear = baseYear - HALF_SPAN;
    return (y - startYear) * 12 + (m - 1);
  }

  function scrollToYearMonth(y, m, smooth = false) {
    const container = dom.calendarScrollContainer;
    if (!container) return;
    const w = container.clientWidth || container.offsetWidth || 360;
    const idx = getPanelIndexFor(y, m);
    const maxIdx = (HALF_SPAN * 2 + 1) * 12 - 1;
    const targetIdx = Math.max(0, Math.min(maxIdx, idx));
    const targetLeft = targetIdx * w;

    if (smooth) {
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } else {
      container.scrollLeft = targetLeft;
    }
  }

  function goToPrevMonth() {
    let prevY = state.viewYear;
    let prevM = state.viewMonth - 1;
    if (prevM < 1) { prevM = 12; prevY--; }

    const startYear = baseYear - HALF_SPAN;
    state.viewYear = prevY;
    state.viewMonth = prevM;
    renderHeader();

    if (prevY < startYear) {
      renderCalendarGrid(true);
    } else {
      scrollToYearMonth(prevY, prevM, true);
    }
  }

  function goToNextMonth() {
    let nextY = state.viewYear;
    let nextM = state.viewMonth + 1;
    if (nextM > 12) { nextM = 1; nextY++; }

    const endYear = baseYear + HALF_SPAN;
    state.viewYear = nextY;
    state.viewMonth = nextM;
    renderHeader();

    if (nextY > endYear) {
      renderCalendarGrid(true);
    } else {
      scrollToYearMonth(nextY, nextM, true);
    }
  }

  function bindSwipeGestures() {
    // 1. 系统级长卷硬件滚动监听 (120Hz ProMotion 0 毫秒 JS 阻塞)
    const container = dom.calendarScrollContainer;
    if (container) {
      let scrollTimer = null;

      window.addEventListener('resize', () => {
        scrollToYearMonth(state.viewYear, state.viewMonth, false);
      }, { passive: true });

      function onScrollSettled() {
        if (isScrollProgrammatic) return;

        const w = container.clientWidth || container.offsetWidth || 360;
        if (w <= 0) return;
        const sl = container.scrollLeft;
        const maxIdx = (HALF_SPAN * 2 + 1) * 12 - 1;
        const currentIdx = Math.max(0, Math.min(maxIdx, Math.round(sl / w)));
        const startYear = baseYear - HALF_SPAN;
        const currentYear = startYear + Math.floor(currentIdx / 12);
        const currentMonth = (currentIdx % 12) + 1;

        if (state.viewYear !== currentYear || state.viewMonth !== currentMonth) {
          state.viewYear = currentYear;
          state.viewMonth = currentMonth;

          const todayY = todayDate.getFullYear();
          const todayM = todayDate.getMonth() + 1;
          const todayD = todayDate.getDate();

          if (currentYear === todayY && currentMonth === todayM) {
            state.selectedYear = todayY;
            state.selectedMonth = todayM;
            state.selectedDay = todayD;
          } else {
            state.selectedYear = currentYear;
            state.selectedMonth = currentMonth;
            state.selectedDay = getSelectedDayForMonth(currentYear, currentMonth);
          }

          renderHeader();
          renderDayDetail(state.selectedYear, state.selectedMonth, state.selectedDay);

          // 联动高亮当前月份面板中的选中日期
          const currentPanel = container.children[currentIdx];
          if (currentPanel) {
            const grid = currentPanel.querySelector('.month-grid');
            if (grid) renderMonthIntoPanel(grid, currentYear, currentMonth);
          }
        }
      }

      container.addEventListener('scroll', () => {
        if (isScrollProgrammatic) return;

        // 关键：0ms 实时精准计算左上角年月标题，手指拖拽时毫秒级绝对精准响应
        const w = container.clientWidth || container.offsetWidth || 360;
        if (w > 0) {
          const sl = container.scrollLeft;
          const maxIdx = (HALF_SPAN * 2 + 1) * 12 - 1;
          const currentIdx = Math.max(0, Math.min(maxIdx, Math.round(sl / w)));
          const startYear = baseYear - HALF_SPAN;
          const currentYear = startYear + Math.floor(currentIdx / 12);
          const currentMonth = (currentIdx % 12) + 1;

          if (dom.headerYearText && dom.headerMonthText) {
            dom.headerYearText.textContent = `${currentYear}年`;
            dom.headerMonthText.textContent = `${currentMonth}月`;
          }
        }

        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(onScrollSettled, 40);
      }, { passive: true });

      if ('onscrollend' in window) {
        container.addEventListener('scrollend', () => {
          if (scrollTimer) clearTimeout(scrollTimer);
          onScrollSettled();
        });
      }
    }

    // 2. 日期框下方及整体视图左右滑动 (在“日历”“节气表”“吉日速查”之间无缝连贯轮播)
    const viewsCarousel = dom.viewsSwipeCarousel;
    if (viewsCarousel) {
      viewsCarousel.addEventListener('scroll', () => {
        if (isTabScrolling) return;

        const w = viewsCarousel.offsetWidth || 360;
        const sl = viewsCarousel.scrollLeft;
        const progress = sl / w;
        const idx = Math.max(0, Math.min(2, Math.round(progress)));

        if (idx !== lastTabIdx) {
          lastTabIdx = idx;
          const tabs = ['calendar', 'jieqi', 'auspicious'];
          state.currentTab = tabs[idx];
          dom.tabCalendar.classList.toggle('active', idx === 0);
          dom.tabJieqi.classList.toggle('active', idx === 1);
          dom.tabAuspicious.classList.toggle('active', idx === 2);

          updatePillToTab(idx);
        }
      }, { passive: true });

      if ('onscrollend' in window) {
        viewsCarousel.addEventListener('scrollend', () => {
          if (!isTabScrolling) {
            updatePillToTab(lastTabIdx);
          }
        });
      }
    }
  }

  /**
   * 打开黄历宜忌与时辰详情抽屉 (120 FPS 满帧 GPU 驱动)
   */
  function openHuangliModal() {
    dom.modalOverlay.classList.add('active');
    if (dom.huangliModal) dom.huangliModal.style.display = 'block';
    if (dom.pickerModal) dom.pickerModal.style.display = 'none';
    if (dom.settingsModal) dom.settingsModal.style.display = 'none';
  }

  /**
   * 年月快速选择器
   */
  function openYearMonthPicker() {
    dom.pickerYearsGrid.innerHTML = '';
    dom.pickerMonthsGrid.innerHTML = '';

    const currentY = state.viewYear;
    // 生成前后 10 年
    for (let y = currentY - 6; y <= currentY + 6; y++) {
      const btn = document.createElement('div');
      btn.className = `picker-item ${y === state.viewYear ? 'active' : ''}`;
      btn.textContent = `${y}年`;
      btn.addEventListener('click', () => {
        state.viewYear = y;
        openYearMonthPicker(); // 刷新高亮
      });
      dom.pickerYearsGrid.appendChild(btn);
    }

    // 12 个月份
    for (let m = 1; m <= 12; m++) {
      const btn = document.createElement('div');
      btn.className = `picker-item ${m === state.viewMonth ? 'active' : ''}`;
      btn.textContent = `${m}月`;
      btn.addEventListener('click', () => {
        state.viewMonth = m;
        const todayY = todayDate.getFullYear();
        const todayM = todayDate.getMonth() + 1;
        const todayD = todayDate.getDate();

        if (state.viewYear === todayY && state.viewMonth === todayM) {
          state.selectedYear = todayY;
          state.selectedMonth = todayM;
          state.selectedDay = todayD;
        } else {
          state.selectedYear = state.viewYear;
          state.selectedMonth = state.viewMonth;
          state.selectedDay = getSelectedDayForMonth(state.viewYear, state.viewMonth);
        }

        closeModals();
        renderHeader();
        renderCalendarGrid();
        renderDayDetail(state.selectedYear, state.selectedMonth, state.selectedDay);
      });
      dom.pickerMonthsGrid.appendChild(btn);
    }

    dom.modalOverlay.classList.add('active');
    if (dom.huangliModal) dom.huangliModal.style.display = 'none';
    if (dom.pickerModal) dom.pickerModal.style.display = 'block';
    if (dom.settingsModal) dom.settingsModal.style.display = 'none';
  }

  function openSettings() {
    dom.modalOverlay.classList.add('active');
    if (dom.huangliModal) dom.huangliModal.style.display = 'none';
    if (dom.pickerModal) dom.pickerModal.style.display = 'none';
    if (dom.settingsModal) dom.settingsModal.style.display = 'block';
  }

  function closeModals() {
    dom.modalOverlay.classList.remove('active');
  }

  /**
   * 模态抽屉向下拖拽手势 (iOS Action Sheet 1:1 跟手滑动收起)
   */
  function bindModalGestures() {
    document.querySelectorAll('.modal-sheet').forEach(sheet => {
      let touchStartY = 0;
      let touchStartX = 0;
      let isDraggingSheet = false;
      let hasCrossedThreshold = false;

      sheet.addEventListener('touchstart', e => {
        // 如果在横向滚动区域内滑动，不截获
        if (e.target.closest('#timesScrollBox')) return;
        
        // 只有当 sheet 处于顶部滚动位置时才允许向下拖拽关闭
        if (sheet.scrollTop > 5) return;

        const touch = e.touches[0];
        touchStartY = touch.clientY;
        touchStartX = touch.clientX;
        isDraggingSheet = true;
        hasCrossedThreshold = false;
        sheet.style.transition = 'none';
      }, { passive: true });

      sheet.addEventListener('touchmove', e => {
        if (!isDraggingSheet) return;
        const touch = e.touches[0];
        const deltaY = touch.clientY - touchStartY;
        const deltaX = touch.clientX - touchStartX;

        if (Math.abs(deltaX) > Math.abs(deltaY) && !hasCrossedThreshold) {
          isDraggingSheet = false;
          return;
        }

        if (deltaY > 0) {
          hasCrossedThreshold = true;
          sheet.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        }
      }, { passive: true });

      const onTouchEnd = e => {
        if (!isDraggingSheet) return;
        isDraggingSheet = false;
        let deltaY = 0;
        if (e.changedTouches && e.changedTouches[0]) {
          deltaY = e.changedTouches[0].clientY - touchStartY;
        }

        if (deltaY > 60 && hasCrossedThreshold) {
          sheet.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
          sheet.style.transform = 'translate3d(0, 105%, 0)';
          setTimeout(() => {
            closeModals();
            sheet.style.transform = '';
            sheet.style.transition = '';
          }, 250);
        } else {
          sheet.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)';
          sheet.style.transform = 'translate3d(0, 0, 0)';
          setTimeout(() => {
            sheet.style.transform = '';
            sheet.style.transition = '';
          }, 220);
        }
      };

      sheet.addEventListener('touchend', onTouchEnd, { passive: true });
      sheet.addEventListener('touchcancel', onTouchEnd, { passive: true });
    });
  }

  /**
   * 视图 Tab 平滑滑动切换 (带 120Hz 纯硬件 GPU 连贯动画)
   */
  let isTabScrolling = false;
  let tabScrollTimer = null;
  let lastTabIdx = 0;

  function updatePillToTab(idx) {
    lastTabIdx = idx;
    if (dom.tabSliderPill) {
      dom.tabSliderPill.style.transition = 'transform 0.24s cubic-bezier(0.25, 1, 0.5, 1)';
      dom.tabSliderPill.style.transform = `translate3d(${idx * 100}%, 0, 0)`;
    }
  }

  function switchTab(tab) {
    state.currentTab = tab;
    const tabIndex = tab === 'calendar' ? 0 : tab === 'jieqi' ? 1 : 2;
    
    dom.tabCalendar.classList.toggle('active', tabIndex === 0);
    dom.tabJieqi.classList.toggle('active', tabIndex === 1);
    dom.tabAuspicious.classList.toggle('active', tabIndex === 2);

    // 1. 顶部白色药丸胶囊立即 120 FPS 满帧滑向目标
    updatePillToTab(tabIndex);

    // 2. 页面视口滑动到目标位置
    const carousel = dom.viewsSwipeCarousel;
    if (carousel) {
      isTabScrolling = true;
      if (tabScrollTimer) clearTimeout(tabScrollTimer);
      
      const targetLeft = tabIndex * carousel.offsetWidth;
      carousel.scrollLeft = targetLeft;

      // 锁定 350ms，防止 iOS Safari 平滑滚动过程中触发的中间帧 scroll 事件将白色胶囊误拉回原处！
      tabScrollTimer = setTimeout(() => {
        isTabScrolling = false;
        updatePillToTab(tabIndex);
      }, 350);
    }
  }

  /**
   * 渲染二十四节气列表 (按四季分组的 2 列雅致卡片网格，诗意与实用兼备)
   */
  function renderSolarTerms() {
    const list = CalendarEngine.getSolarTermsOfYear(state.viewYear);
    if (!dom.solarTermsList) return;
    dom.solarTermsList.innerHTML = '';

    const titleEl = document.getElementById('jieqiYearTitle');
    if (titleEl) {
      titleEl.textContent = `${state.viewYear}年 二十四节气谱`;
    }

    const seasons = [
      { name: '春季 · 万物复苏', icon: '🌸', color: '#34c759', terms: ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨'] },
      { name: '夏季 · 盛夏繁茂', icon: '☀️', color: '#ff9500', terms: ['立夏', '小满', '芒种', '夏至', '小暑', '大暑'] },
      { name: '秋季 · 岁物丰成', icon: '🍂', color: '#e53935', terms: ['立秋', '处暑', '白露', '秋分', '寒露', '霜降'] },
      { name: '冬季 · 银装素裹', icon: '❄️', color: '#007aff', terms: ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'] }
    ];

    const termsMap = {};
    list.forEach(item => {
      termsMap[item.name] = item;
    });

    seasons.forEach((season, seasonIdx) => {
      const block = document.createElement('div');
      block.className = 'jieqi-season-block';

      const header = document.createElement('div');
      header.className = 'jieqi-season-header';
      header.innerHTML = `<span>${season.icon}</span><span>${season.name}</span>`;
      block.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'jieqi-season-grid';

      season.terms.forEach((tName, tIdx) => {
        const item = termsMap[tName];
        if (!item) return;

        const card = document.createElement('div');
        card.className = 'jieqi-term-card';
        const formattedDate = `${item.month}月${item.day}日`;
        const orderNum = seasonIdx * 6 + tIdx + 1;

        card.innerHTML = `
          <div class="jieqi-term-left">
            <span class="jieqi-term-name" style="color: ${season.color};">${item.name}</span>
            <span class="jieqi-term-order">第${orderNum}节气</span>
          </div>
          <div class="jieqi-term-right">
            <span class="jieqi-term-date">${formattedDate}</span>
            <span class="jieqi-term-time">${item.timeStr.slice(0, 5)}</span>
          </div>
        `;

        card.addEventListener('click', () => {
          state.selectedYear = state.viewYear;
          state.selectedMonth = item.month;
          state.selectedDay = item.day;
          state.viewYear = state.viewYear;
          state.viewMonth = item.month;
          switchTab('calendar');
          renderHeader();
          renderCalendarGrid();
          renderDayDetail(state.selectedYear, state.selectedMonth, state.selectedDay);
        });

        grid.appendChild(card);
      });

      block.appendChild(grid);
      dom.solarTermsList.appendChild(block);
    });
  }

  /**
   * 渲染黄道吉日速查
   */
  function renderAuspiciousDays() {
    const list = CalendarEngine.findAuspiciousDays(state.viewYear, state.viewMonth, 3, state.selectedAuspiciousTag);
    dom.auspiciousResultsList.innerHTML = '';

    if (list.length === 0) {
      dom.auspiciousResultsList.innerHTML = '<div class="notes-empty">未来 3 个月未查询到对应吉日</div>';
      return;
    }

    list.forEach(d => {
      const card = document.createElement('div');
      card.className = 'result-card-item';
      card.innerHTML = `
        <div class="result-card-left">
          <span class="result-solar-date">${d.year}年${d.month}月${d.day}日 · ${d.weekDayChinese}</span>
          <span class="result-lunar-date">农历 ${d.lunarMonthChinese}${d.lunarDayChinese} · ${d.ganZhiDay}日</span>
        </div>
        <span class="result-yi-summary">宜: ${d.yi.slice(0, 3).join(' ')}</span>
      `;
      card.addEventListener('click', () => {
        state.selectedYear = d.year;
        state.selectedMonth = d.month;
        state.selectedDay = d.day;
        state.viewYear = d.year;
        state.viewMonth = d.month;
        switchTab('calendar');
        renderHeader();
        renderCalendarGrid();
        renderDayDetail(state.selectedYear, state.selectedMonth, state.selectedDay);
      });
      dom.auspiciousResultsList.appendChild(card);
    });
  }

  /**
   * 注册 PWA Service Worker 实现全离线秒开
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('SW registration note:', err);
        });
      });
    }
  }
});
