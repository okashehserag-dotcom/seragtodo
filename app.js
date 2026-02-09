// app.js
(() => {
  'use strict';

  // ---------- Safe DOM helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  const on = (el, ev, fn, opts) => { if (el) el.addEventListener(ev, fn, opts); };
  const onId = (id, ev, fn, opts) => on(byId(id), ev, fn, opts);

  const pad2 = (n) => String(n).padStart(2, '0');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const addDays = (d, days) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };

  // ---------- Storage ----------
  const LS_KEY = 'serag_v1';
  const defaults = {
    lang: 'ar',
    coins: 0,
    level: 1,
    xp: 0,
    streak: 0,
    lastActiveDate: '',

    settings: {
      dailyGoalMin: 60,
      soundOn: true,
      theme: 'midnight',
      timerStyle: 'ring'
    },

    purchases: {
      themes: ['midnight'],       // owned
      timerStyles: ['ring']       // owned
    },

    history: {
      sessions: [],  // {id, type, mode, minutes, subject, startISO, endISO, dateKey, coins, xp}
      quizzes: [],   // {id, subject, total, correct, coins, xp, dateKey, tsISO}
      activity: []   // unified feed
    },

    meta: {
      dailyGoalClaimedOn: '', // dateKey
      cycleStudyCount: 0
    }
  };

  const loadState = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(defaults);
      const parsed = JSON.parse(raw);
      // Shallow merge with defaults to avoid missing keys
      return deepMerge(structuredClone(defaults), parsed);
    } catch {
      return structuredClone(defaults);
    }
  };

  const saveState = () => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  };

  const deepMerge = (base, extra) => {
    if (!extra || typeof extra !== 'object') return base;
    for (const k of Object.keys(extra)) {
      const v = extra[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        base[k] = deepMerge(base[k] ?? {}, v);
      } else {
        base[k] = v;
      }
    }
    return base;
  };

  // ---------- i18n ----------
  const I18N = {
    ar: {
      focus_mode: 'وضع التركيز',
      coins: 'النور',
      level: 'المستوى',
      xp: 'XP',
      tab_timer: 'المؤقت',
      tab_quizzes: 'كوينز',
      tab_store: 'المتجر',
      tab_stats: 'الإحصائيات',
      tab_settings: 'الإعدادات',
      level_progress: 'تقدم المستوى',
      daily_goal: 'هدف اليوم',
      minutes: 'دقيقة',

      timer_title: 'المؤقت',
      timer_sub: 'جلسة • استراحة قصيرة • استراحة طويلة',
      study: 'دراسة',
      short_break: 'استراحة قصيرة',
      long_break: 'استراحة طويلة',
      study_session: 'جلسة دراسة',
      start: 'ابدأ',
      pause: 'إيقاف مؤقت',
      reset: 'إعادة',
      next: 'التالي',
      subject: 'المادة',
      session_minutes: 'دقائق الجلسة',
      reward_hint: 'مكافآت: النور + XP عند إكمال جلسات الدراسة وتحقيق الهدف اليومي والستريك.',
      sessions_history: 'آخر الجلسات',
      no_sessions: 'لا يوجد جلسات بعد',
      no_sessions_sub: 'ابدأ جلسة دراسة وستظهر هنا تلقائيًا.',
      achievement_line: 'خط الإنجاز',
      today: 'اليوم',
      daily_target: 'هدف اليوم',
      daily_target_sub: 'حافظ على الاستمرارية وخلّيك على الستريك.',
      levelup_reward: 'مكافأة رفع المستوى',
      levelup_reward_sub: 'عند كل Level Up بتحصل نور إضافي.',
      quiz_bonus: 'بونص الكوينز',
      quiz_bonus_sub: 'كمان الكوينز بتزيد لما تحل كوينز.',
      quick_actions: 'إجراءات سريعة',
      claim_daily: 'تحصيل مكافأة الهدف',
      claim_daily_sub: 'تتفعل لما تكمّل هدف اليوم.',
      locked: 'مقفول',
      go_quizzes: 'روح على الكوينز',
      go_quizzes_sub: 'اختبر نفسك بنمط وزاري سريع.',
      go_store: 'افتح المتجر',
      go_store_sub: 'ثيمات وستايلات للمؤقت.',

      quizzes_title: 'كوينز',
      quizzes_sub: 'نمط وزاري سريع + نقاط XP + نور',
      new_quiz: 'كوينز جديد',
      quiz_subject: 'المادة',
      quiz_count: 'عدد الأسئلة',
      quiz_empty: 'ابدأ كوينز جديد',
      quiz_empty_sub: 'اختر مادة وعدد أسئلة واضغط “كوينز جديد”.',
      quiz_history: 'سجل الكوينز',
      no_quiz_history: 'لا يوجد كوينز سابقًا',
      no_quiz_history_sub: 'سجل محاولاتك بيظهر هون.',
      skip: 'تخطي',
      close: 'إغلاق',
      save: 'حفظ',

      store_title: 'المتجر',
      store_sub: 'اشترِ ثيمات وستايلات للمؤقت ثم فعّلهم من الإعدادات/الملف.',
      purchases: 'مشترياتي',
      no_purchases: 'لا مشتريات بعد',
      no_purchases_sub: 'لما تشتري ثيم/ستايل بيظهر هون.',
      buy: 'شراء',
      owned: 'مملوك',
      apply: 'تفعيل',

      stats_title: 'الإحصائيات',
      export: 'تصدير',
      today_minutes: 'دقائق اليوم',
      week_minutes: 'دقائق الأسبوع',
      total_minutes: 'إجمالي الدقائق',
      top_subject: 'أكثر مادة',
      weekly_line: 'آخر 7 أيام',
      recent_activity: 'النشاط الأخير',
      no_activity: 'لا نشاط بعد',
      no_activity_sub: 'الجلسات والكوينز بتظهر هون.',

      settings_title: 'الإعدادات',
      settings_sub: 'خصّص هدفك اليومي، الصوت، والثيم، ووضع التركيز.',
      daily_goal_minutes: 'هدف اليوم (بالدقائق)',
      sound: 'الصوت',
      on: 'تشغيل',
      off: 'إيقاف',
      active_theme: 'الثيم المفعل',
      timer_style: 'ستايل المؤقت',
      reset_all: 'إعادة ضبط كل شيء',
      reset_all_sub: 'يمسح النور والمستوى والستريك والسجل والمشتريات والإعدادات.',
      profile: 'الملف',
      name: 'الاسم',
      streak: 'ستريك',
      modal_hint: 'تقدر تشتري ثيمات/ستايلات من المتجر ثم تفعيلها من هنا أو من الإعدادات.',
      footer_note: 'يعمل محليًا وعلى GitHub Pages — بدون مكتبات.',

      // Toast titles
      toast_ok: 'تمام',
      toast_warn: 'تنبيه',
      toast_bad: 'خطأ',
    },
    en: {
      focus_mode: 'Focus mode',
      coins: 'Noor',
      level: 'Level',
      xp: 'XP',
      tab_timer: 'Timer',
      tab_quizzes: 'Quizzes',
      tab_store: 'Store',
      tab_stats: 'Stats',
      tab_settings: 'Settings',
      level_progress: 'Level progress',
      daily_goal: 'Daily goal',
      minutes: 'min',

      timer_title: 'Timer',
      timer_sub: 'Study • Short break • Long break',
      study: 'Study',
      short_break: 'Short break',
      long_break: 'Long break',
      study_session: 'Study session',
      start: 'Start',
      pause: 'Pause',
      reset: 'Reset',
      next: 'Next',
      subject: 'Subject',
      session_minutes: 'Session minutes',
      reward_hint: 'Rewards: coins + XP for completed study sessions, daily goal, and streak.',
      sessions_history: 'Recent sessions',
      no_sessions: 'No sessions yet',
      no_sessions_sub: 'Start a study session and it will appear here.',
      achievement_line: 'Achievement line',
      today: 'Today',
      daily_target: 'Daily target',
      daily_target_sub: 'Stay consistent and keep your streak.',
      levelup_reward: 'Level-up reward',
      levelup_reward_sub: 'Each level-up gives you extra coins.',
      quiz_bonus: 'Quiz bonus',
      quiz_bonus_sub: 'You also gain coins when you complete quizzes.',
      quick_actions: 'Quick actions',
      claim_daily: 'Claim daily reward',
      claim_daily_sub: 'Unlocks when you finish your daily goal.',
      locked: 'Locked',
      go_quizzes: 'Go to quizzes',
      go_quizzes_sub: 'Quick “exam-style” practice.',
      go_store: 'Open store',
      go_store_sub: 'Themes & timer styles.',

      quizzes_title: 'Quizzes',
      quizzes_sub: 'Quick exam-style + XP + Coins',
      new_quiz: 'New quiz',
      quiz_subject: 'Subject',
      quiz_count: 'Questions',
      quiz_empty: 'Start a new quiz',
      quiz_empty_sub: 'Pick a subject & count, then press “New quiz”.',
      quiz_history: 'Quiz history',
      no_quiz_history: 'No quiz history yet',
      no_quiz_history_sub: 'Your attempts will appear here.',
      skip: 'Skip',
      close: 'Close',
      save: 'Save',

      store_title: 'Store',
      store_sub: 'Buy themes & timer styles, then activate them from profile/settings.',
      purchases: 'My purchases',
      no_purchases: 'No purchases yet',
      no_purchases_sub: 'Bought items will appear here.',
      buy: 'Buy',
      owned: 'Owned',
      apply: 'Apply',

      stats_title: 'Stats',
      export: 'Export',
      today_minutes: 'Today minutes',
      week_minutes: 'Week minutes',
      total_minutes: 'Total minutes',
      top_subject: 'Top subject',
      weekly_line: 'Last 7 days',
      recent_activity: 'Recent activity',
      no_activity: 'No activity yet',
      no_activity_sub: 'Sessions & quizzes show up here.',

      settings_title: 'Settings',
      settings_sub: 'Customize your daily goal, sound, theme, and focus mode.',
      daily_goal_minutes: 'Daily goal (minutes)',
      sound: 'Sound',
      on: 'On',
      off: 'Off',
      active_theme: 'Active theme',
      timer_style: 'Timer style',
      reset_all: 'Reset everything',
      reset_all_sub: 'Clears coins, level, streak, history, purchases, and settings.',
      profile: 'Profile',
      name: 'Name',
      streak: 'Streak',
      modal_hint: 'Buy themes/styles from the store, then activate them here or in settings.',
      footer_note: 'Runs locally and on GitHub Pages — no libraries.',

      toast_ok: 'Done',
      toast_warn: 'Heads up',
      toast_bad: 'Error',
    }
  };

  const t = (key) => (I18N[state.lang] && I18N[state.lang][key]) || key;

  const applyLang = () => {
    const html = document.documentElement;
    const isAR = state.lang === 'ar';
    html.lang = isAR ? 'ar' : 'en';
    html.dir = isAR ? 'rtl' : 'ltr';

    const langToggle = byId('langToggle');
    if (langToggle) {
      const k = $('.chip__k', langToggle);
      const v = $('.chip__v', langToggle);
      if (k) k.textContent = isAR ? 'AR' : 'EN';
      if (v) v.textContent = isAR ? '/ EN' : '/ AR';
      langToggle.setAttribute('aria-label', isAR ? 'تبديل اللغة' : 'Toggle language');
    }

    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });

    // Placeholders
    const subjectInput = byId('subjectInput');
    if (subjectInput) subjectInput.placeholder = isAR ? 'مثال: رياضيات' : 'e.g. Math';
    const quizSubject = byId('quizSubject');
    if (quizSubject) quizSubject.placeholder = isAR ? 'مثال: فيزياء' : 'e.g. Physics';
    const nameInput = byId('nameInput');
    if (nameInput) nameInput.placeholder = isAR ? 'اكتب اسمك' : 'Type your name';

    const profileName = byId('profileName');
    if (profileName && !state.profileNameTouched) {
      // keep user's custom name, only default label changes
      profileName.textContent = isAR ? 'طالب توجيهي' : 'Student';
    }
  };

  // ---------- Toasts (safe + delegated close) ----------
  let toastSeq = 0;
  const toast = (msg, type = 'ok', titleKey) => {
    const root = byId('toastRoot');
    if (!root) return;

    const id = `t${Date.now()}_${toastSeq++}`;
    const title = titleKey ? t(titleKey) : (type === 'ok' ? t('toast_ok') : type === 'warn' ? t('toast_warn') : t('toast_bad'));

    const div = document.createElement('div');
    div.className = `toast toast--${type}`;
    div.setAttribute('role', 'status');
    div.dataset.toastId = id;

    div.innerHTML = `
      <div class="toast__txt">
        <div class="toast__title"></div>
        <div class="toast__msg"></div>
      </div>
      <button class="toast__x" type="button" data-toast-close="${id}" aria-label="${state.lang === 'ar' ? 'إغلاق' : 'Close'}">✕</button>
    `;

    const tt = $('.toast__title', div);
    const mm = $('.toast__msg', div);
    if (tt) tt.textContent = title;
    if (mm) mm.textContent = msg;

    root.appendChild(div);

    // auto remove
    const ttl = 3500;
    window.setTimeout(() => {
      const el = root.querySelector(`[data-toast-id="${id}"]`);
      if (el) el.remove();
    }, ttl);
  };

// ---------- Products ----------
const PRODUCTS = [
  { id: 'theme_sand', type: 'theme', value: 'sand', nameAR: 'ثيم Sand', nameEN: 'Sand theme', price: 60 },
  { id: 'theme_mint', type: 'theme', value: 'mint', nameAR: 'ثيم Mint', nameEN: 'Mint theme', price: 80 },

  { id: 'style_minimal', type: 'timerStyle', value: 'minimal', nameAR: 'ستايل Minimal', nameEN: 'Minimal style', price: 55 },
  { id: 'style_bold', type: 'timerStyle', value: 'bold', nameAR: 'ستايل Bold', nameEN: 'Bold style', price: 70 },

  { id: 'style_fire', type: 'timerStyle', value: 'fire', nameAR: 'ستايل ناري', nameEN: 'Fire style', price: 90 },
  { id: 'style_ice', type: 'timerStyle', value: 'ice', nameAR: 'ستايل ثلجي', nameEN: 'Ice style', price: 90 },
  { id: 'style_electric', type: 'timerStyle', value: 'electric', nameAR: 'ستايل كهرباء', nameEN: 'Electric style', price: 95 },
]; 
  
  // ---------- App state ----------
  let state = loadState();
  let timer = {
    mode: 'study',        // study|short|long
    running: false,
    secondsLeft: 25 * 60,
    totalSeconds: 25 * 60,
    lastTick: 0,
    raf: 0,
    startedAtISO: '',
    subject: ''
  };

  const XP_REWARD_PER_STUDY = 25;
  const COINS_REWARD_PER_STUDY = 10;
  const COINS_REWARD_LEVELUP = 15;
  const XP_REWARD_PER_QUIZ = 15;
  const COINS_REWARD_PER_QUIZ = 3;
  const COINS_REWARD_DAILY_GOAL = 20;

  // ---------- Theme + timer style ----------
  const applyTheme = () => {
    // Theme is applied by CSS variables via body dataset (simple + safe)
    document.body.dataset.theme = state.settings.theme || 'midnight';
    document.body.dataset.timerStyle = state.settings.timerStyle || 'ring';

    // Small visual differences for timer styles
    const face = byId('timerFace');
    if (!face) return;
    face.classList.toggle('timer--minimal', document.body.dataset.timerStyle === 'minimal');
    face.classList.toggle('timer--bold', document.body.dataset.timerStyle === 'bold');
  };

  const ensureOwned = (type, value) => {
    if (type === 'theme') return (state.purchases.themes || []).includes(value);
    if (type === 'timerStyle') return (state.purchases.timerStyles || []).includes(value);
    return false;
  };

  // ---------- Streak logic ----------
  const updateStreakOnActivity = () => {
    const nowKey = todayKey();
    const last = state.lastActiveDate || '';
    if (last === nowKey) return;

    // if last is yesterday => +1, else reset to 1
    const yKey = todayKey(addDays(new Date(), -1));
    if (last === yKey) state.streak = (state.streak || 0) + 1;
    else state.streak = 1;

    state.lastActiveDate = nowKey;
  };

  // ---------- XP/Level ----------
  const xpNeededFor = (level) => 100 + (Math.max(1, level) - 1) * 25;

  const addXP = (amount) => {
    amount = Math.max(0, Number(amount) || 0);
    if (!amount) return;

    state.xp = (state.xp || 0) + amount;

    // handle multi-level ups
    let leveled = false;
    while (state.xp >= xpNeededFor(state.level)) {
      state.xp -= xpNeededFor(state.level);
      state.level = (state.level || 1) + 1;
      state.coins = (state.coins || 0) + COINS_REWARD_LEVELUP;
      leveled = true;
    }

    if (leveled) toast(`${state.lang === 'ar' ? 'مبروك! رفعت مستوى' : 'Congrats! Level up'} → ${state.level} (+${COINS_REWARD_LEVELUP} ${t('coins')})`, 'ok');
  };

  const addCoins = (amount) => {
    amount = Math.trunc(Number(amount) || 0);
    if (!amount) return;
    state.coins = Math.max(0, (state.coins || 0) + amount);
  };

  // ---------- Timer core ----------
  const getStudyMinutes = () => clamp(Number(byId('customMinutes')?.value || 25), 5, 180);
  const getModeSeconds = (mode) => {
    if (mode === 'study') return getStudyMinutes() * 60;
    if (mode === 'short') return 5 * 60;
    if (mode === 'long') return 15 * 60;
    return 25 * 60;
  };

  const setMode = (mode) => {
    timer.mode = mode;
    timer.running = false;
    timer.totalSeconds = getModeSeconds(mode);
    timer.secondsLeft = timer.totalSeconds;
    timer.startedAtISO = '';
    updateModeUI();
    renderTimer();
    setStartBtnLabel();
  };

  const setStartBtnLabel = () => {
    const btn = byId('btnStartPause');
    if (!btn) return;
    const txt = $('.btn__txt', btn);
    const icon = $('.btn__icon', btn);
    if (!txt || !icon) return;

    if (timer.running) {
      txt.textContent = t('pause');
      icon.textContent = '⏸';
    } else {
      txt.textContent = t('start');
      icon.textContent = '▶';
    }
  };

  const renderTimer = () => {
    const disp = byId('timerDisplay');
    if (disp) {
      const m = Math.floor(timer.secondsLeft / 60);
      const s = timer.secondsLeft % 60;
      disp.textContent = `${pad2(m)}:${pad2(s)}`;
    }

    const label = byId('timerLabel');
    if (label) {
      const key = timer.mode === 'study' ? 'study_session' : (timer.mode === 'short' ? 'short_break' : 'long_break');
      label.textContent = t(key);
    }
  };

  const updateModeUI = () => {
    const ids = ['modeStudy', 'modeShort', 'modeLong'];
    ids.forEach(id => {
      const b = byId(id);
      if (!b) return;
      const m = b.dataset.mode;
      const active = m === timer.mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  const tick = (ts) => {
    if (!timer.running) return;
    if (!timer.lastTick) timer.lastTick = ts;
    const delta = Math.floor((ts - timer.lastTick) / 1000);
    if (delta >= 1) {
      timer.lastTick += delta * 1000;
      timer.secondsLeft = Math.max(0, timer.secondsLeft - delta);
      renderTimer();
      if (timer.secondsLeft <= 0) {
        completeTimer();
        return;
      }
    }
    timer.raf = requestAnimationFrame(tick);
  };

  const startTimer = () => {
    if (timer.running) return;
    timer.running = true;
    timer.lastTick = 0;
    if (!timer.startedAtISO) timer.startedAtISO = new Date().toISOString();
    setStartBtnLabel();
    timer.raf = requestAnimationFrame(tick);
  };

  const pauseTimer = () => {
    if (!timer.running) return;
    timer.running = false;
    setStartBtnLabel();
    if (timer.raf) cancelAnimationFrame(timer.raf);
    timer.raf = 0;
  };

  const resetTimer = () => {
    pauseTimer();
    timer.totalSeconds = getModeSeconds(timer.mode);
    timer.secondsLeft = timer.totalSeconds;
    timer.startedAtISO = '';
    renderTimer();
    toast(state.lang === 'ar' ? 'تمت إعادة المؤقت.' : 'Timer reset.', 'ok');
  };

  const nextMode = () => {
    pauseTimer();
    if (timer.mode === 'study') {
      state.meta.cycleStudyCount = (state.meta.cycleStudyCount || 0) + 1;
      // Every 4 studies => long break
      const longNow = (state.meta.cycleStudyCount % 4 === 0);
      setMode(longNow ? 'long' : 'short');
    } else {
      setMode('study');
    }
    saveState();
  };

  const completeTimer = () => {
    pauseTimer();

    const mode = timer.mode;
    const endISO = new Date().toISOString();

    if (mode === 'study') {
      const mins = Math.max(1, Math.round(timer.totalSeconds / 60));
      const subject = String(byId('subjectInput')?.value || '').trim() || (state.lang === 'ar' ? 'بدون مادة' : 'No subject');

      updateStreakOnActivity();

      addCoins(COINS_REWARD_PER_STUDY);
      addXP(XP_REWARD_PER_STUDY);

      // Session record
      const rec = {
        id: `s_${Date.now()}`,
        type: 'session',
        mode,
        minutes: mins,
        subject,
        startISO: timer.startedAtISO || endISO,
        endISO,
        dateKey: todayKey(),
        coins: COINS_REWARD_PER_STUDY,
        xp: XP_REWARD_PER_STUDY
      };
      state.history.sessions.unshift(rec);
      state.history.sessions = state.history.sessions.slice(0, 50);

      pushActivity({
        id: `a_${Date.now()}`,
        kind: 'session',
        title: state.lang === 'ar' ? `جلسة دراسة • ${subject}` : `Study session • ${subject}`,
        meta: `${mins} ${t('minutes')} • +${COINS_REWARD_PER_STUDY} ${t('coins')} • +${XP_REWARD_PER_STUDY} XP`,
        dateKey: rec.dateKey,
        tsISO: endISO
      });

      toast(state.lang === 'ar' ? `جلسة مكتملة! +${COINS_REWARD_PER_STUDY} نور و +${XP_REWARD_PER_STUDY} XP` : `Session complete! +${COINS_REWARD_PER_STUDY} coins & +${XP_REWARD_PER_STUDY} XP`, 'ok');

      // update daily goal + claim state
      updateAllUI();

      // auto-advance to break
      nextMode();
      return;
    }

    // breaks finished => back to study
    toast(state.lang === 'ar' ? 'خلصت الاستراحة. ارجع للدراسة 💪' : 'Break finished. Back to study 💪', 'ok');
    setMode('study');
    updateAllUI();
  };

  // ---------- History + stats ----------
  const minutesForDate = (dateK) => {
    const ss = state.history.sessions || [];
    return ss.filter(x => x.mode === 'study' && x.dateKey === dateK).reduce((a, b) => a + (Number(b.minutes) || 0), 0);
  };

  const weekMinutes = () => {
    const now = new Date();
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += minutesForDate(todayKey(addDays(now, -i)));
    return sum;
  };

  const totalMinutes = () => (state.history.sessions || []).filter(x => x.mode === 'study').reduce((a, b) => a + (Number(b.minutes) || 0), 0);

  const topSubject = () => {
    const map = new Map();
    (state.history.sessions || []).filter(x => x.mode === 'study').forEach(x => {
      const k = x.subject || '—';
      map.set(k, (map.get(k) || 0) + (Number(x.minutes) || 0));
    });
    let best = '—', bestV = 0;
    for (const [k, v] of map.entries()) if (v > bestV) { best = k; bestV = v; }
    return best || '—';
  };

  const pushActivity = (item) => {
    state.history.activity = state.history.activity || [];
    state.history.activity.unshift(item);
    state.history.activity = state.history.activity.slice(0, 60);
  };

  // ---------- Daily goal claiming ----------
  const isDailyGoalMet = () => minutesForDate(todayKey()) >= (Number(state.settings.dailyGoalMin) || 60);
  const canClaimDaily = () => isDailyGoalMet() && state.meta.dailyGoalClaimedOn !== todayKey();

  const claimDailyReward = () => {
    if (!canClaimDaily()) {
      toast(state.lang === 'ar' ? 'لسّا ما بتقدر تحصّل المكافأة.' : 'Not claimable yet.', 'warn');
      return;
    }
    state.meta.dailyGoalClaimedOn = todayKey();
    addCoins(COINS_REWARD_DAILY_GOAL);
    pushActivity({
      id: `a_${Date.now()}`,
      kind: 'daily',
      title: state.lang === 'ar' ? 'مكافأة الهدف اليومي' : 'Daily goal reward',
      meta: `+${COINS_REWARD_DAILY_GOAL} ${t('coins')}`,
      dateKey: todayKey(),
      tsISO: new Date().toISOString()
    });
    toast(state.lang === 'ar' ? `تم التحصيل! +${COINS_REWARD_DAILY_GOAL} نور` : `Claimed! +${COINS_REWARD_DAILY_GOAL} coins`, 'ok');
    saveState();
    updateAllUI();
  };

  // ---------- Quizzes ----------
  let quiz = {
    active: false,
    subject: '',
    total: 8,
    idx: 0,
    correct: 0,
    current: null
  };

  const genQuestion = () => {
    // Simple “exam-like” MCQ: arithmetic + logic. (Safe + deterministic structure)
    const a = clamp(Math.floor(Math.random() * 40) + 10, 10, 49);
    const b = clamp(Math.floor(Math.random() * 20) + 5, 5, 24);
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];

    let ans = 0;
    if (op === '+') ans = a + b;
    if (op === '-') ans = a - b;
    if (op === '×') ans = a * b;

    const choices = new Set([ans]);
    while (choices.size < 4) {
      const jitter = Math.floor(Math.random() * 9) - 4;
      choices.add(ans + jitter * (op === '×' ? 2 : 1));
    }
    const arr = Array.from(choices);
    // shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    const qText = state.lang === 'ar'
      ? `اختر الإجابة الصحيحة: ${a} ${op} ${b} = ؟`
      : `Choose the correct answer: ${a} ${op} ${b} = ?`;

    return { qText, ans, options: arr };
  };

  const startQuiz = () => {
    const subj = String(byId('quizSubject')?.value || '').trim() || (state.lang === 'ar' ? 'عام' : 'General');
    const count = clamp(Number(byId('quizCount')?.value || 8), 3, 20);

    quiz.active = true;
    quiz.subject = subj;
    quiz.total = count;
    quiz.idx = 0;
    quiz.correct = 0;
    quiz.current = null;

    // UI
    const box = byId('quizBox');
    const empty = byId('quizEmpty');
    if (box) box.hidden = false;
    if (empty) empty.hidden = true;

    nextQuizQuestion();
  };

  const endQuiz = (silent = false) => {
    quiz.active = false;

    const box = byId('quizBox');
    const empty = byId('quizEmpty');
    if (box) box.hidden = true;
    if (empty) empty.hidden = false;

    const feedback = byId('quizFeedback');
    if (feedback) feedback.textContent = '';

    if (!silent) toast(state.lang === 'ar' ? 'تم إنهاء الكوينز.' : 'Quiz ended.', 'ok');
  };

  const renderQuiz = () => {
    const step = byId('quizStepText');
    if (step) step.textContent = `${Math.min(quiz.idx + 1, quiz.total)}/${quiz.total}`;

    const bar = byId('quizBar');
    if (bar) bar.style.width = `${(quiz.total ? (quiz.idx / quiz.total) * 100 : 0)}%`;

    const q = byId('quizQuestion');
    if (q) q.textContent = quiz.current?.qText || '...';

    const opts = byId('quizOptions');
    if (opts) {
      opts.innerHTML = '';
      (quiz.current?.options || []).forEach((v, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.style.width = '100%';
        b.dataset.quizOption = String(v);
        b.textContent = `${String.fromCharCode(65 + i)}. ${v}`;
        opts.appendChild(b);
      });
    }

    const fb = byId('quizFeedback');
    if (fb) fb.textContent = '';
  };

  const nextQuizQuestion = () => {
    if (!quiz.active) return;
    if (quiz.idx >= quiz.total) return finishQuiz();

    quiz.current = genQuestion();
    renderQuiz();
  };

  const answerQuiz = (value) => {
    if (!quiz.active || !quiz.current) return;

    const fb = byId('quizFeedback');
    const v = Number(value);
    const ok = v === quiz.current.ans;

    if (ok) {
      quiz.correct += 1;
      if (fb) fb.textContent = state.lang === 'ar' ? 'صح ✅' : 'Correct ✅';
    } else {
      if (fb) fb.textContent = state.lang === 'ar'
        ? `غلط ❌ (الصح: ${quiz.current.ans})`
        : `Wrong ❌ (Answer: ${quiz.current.ans})`;
    }

    // lock options quickly (UI only; safe)
    const opts = byId('quizOptions');
    if (opts) $$('button[data-quiz-option]', opts).forEach(b => b.disabled = true);

    window.setTimeout(() => {
      quiz.idx += 1;
      nextQuizQuestion();
    }, 450);
  };

  const finishQuiz = () => {
    const endISO = new Date().toISOString();
    const correct = quiz.correct;
    const total = quiz.total;

    // rewards (scaled a bit)
    updateStreakOnActivity();
    const xp = XP_REWARD_PER_QUIZ + Math.round((correct / Math.max(1, total)) * 10);
    const coins = COINS_REWARD_PER_QUIZ + Math.round((correct / Math.max(1, total)) * 2);

    addXP(xp);
    addCoins(coins);

    const rec = {
      id: `q_${Date.now()}`,
      subject: quiz.subject,
      total,
      correct,
      coins,
      xp,
      dateKey: todayKey(),
      tsISO: endISO
    };
    state.history.quizzes.unshift(rec);
    state.history.quizzes = state.history.quizzes.slice(0, 50);

    pushActivity({
      id: `a_${Date.now()}`,
      kind: 'quiz',
      title: state.lang === 'ar' ? `كوينز • ${quiz.subject}` : `Quiz • ${quiz.subject}`,
      meta: `${correct}/${total} • +${coins} ${t('coins')} • +${xp} XP`,
      dateKey: rec.dateKey,
      tsISO: endISO
    });

    toast(state.lang === 'ar'
      ? `نتيجتك ${correct}/${total} • +${coins} نور • +${xp} XP`
      : `Score ${correct}/${total} • +${coins} coins • +${xp} XP`, 'ok');

    saveState();
    updateAllUI();
    endQuiz(true);
  };

  // ---------- Store ----------
  const renderStore = () => {
    const grid = byId('storeGrid');
    if (!grid) return;

    grid.innerHTML = '';
    PRODUCTS.forEach(p => {
      const owned = p.type === 'theme' ? ensureOwned('theme', p.value) : ensureOwned('timerStyle', p.value);
      const active = (p.type === 'theme' && state.settings.theme === p.value) ||
                     (p.type === 'timerStyle' && state.settings.timerStyle === p.value);

      const card = document.createElement('div');
      card.className = 'prod';
      card.dataset.pid = p.id;

      const name = state.lang === 'ar' ? p.nameAR : p.nameEN;
      const typeTxt = p.type === 'theme'
        ? (state.lang === 'ar' ? 'Theme' : 'Theme')
        : (state.lang === 'ar' ? 'Timer Style' : 'Timer Style');

      card.innerHTML = `
        <div class="prod__top">
          <div>
            <div class="prod__name"></div>
            <div class="prod__type"></div>
          </div>
          <span class="tag ${active ? '' : 'tag--soft'}">${active ? (state.lang === 'ar' ? 'مفعل' : 'Active') : (state.lang === 'ar' ? 'اختياري' : 'Optional')}</span>
        </div>
        <div class="prod__preview"></div>
        <div class="prod__buy">
          <div class="prod__price">
            <span class="dot dot--gold" aria-hidden="true"></span>
            <strong>${p.price}</strong>
            <span class="muted">${t('coins')}</span>
          </div>
          <button class="btn btn--tiny ${owned ? '' : 'btn--primary'} prod__btn" type="button"
            data-store-action="${owned ? 'apply' : 'buy'}" data-store-id="${p.id}">
            ${owned ? (active ? (state.lang === 'ar' ? 'مفعل' : 'Active') : t('apply')) : t('buy')}
          </button>
        </div>
      `;

      const nm = $('.prod__name', card);
      const tp = $('.prod__type', card);
      if (nm) nm.textContent = name;
      if (tp) tp.textContent = typeTxt;

      // small preview tint
      const preview = $('.prod__preview', card);
      if (preview) {
        if (p.type === 'theme') {
          preview.style.background =
            p.value === 'mint'
              ? 'radial-gradient(circle at 30% 20%, rgba(39,211,166,.22), rgba(255,255,255,.02))'
              : p.value === 'sand'
                ? 'radial-gradient(circle at 30% 20%, rgba(255,209,102,.22), rgba(255,255,255,.02))'
                : 'radial-gradient(circle at 30% 20%, rgba(124,92,255,.20), rgba(255,255,255,.02))';
        } else {
          preview.style.background =
            p.value === 'bold'
              ? 'radial-gradient(circle at 30% 20%, rgba(255,77,109,.18), rgba(255,255,255,.02))'
              : 'radial-gradient(circle at 30% 20%, rgba(124,92,255,.18), rgba(255,255,255,.02))';
        }
      }

      grid.appendChild(card);
    });
  };

  const renderPurchases = () => {
    const list = byId('purchasesList');
    const empty = byId('purchasesEmpty');
    if (!list) return;

    const ownedThemes = state.purchases.themes || [];
    const ownedStyles = state.purchases.timerStyles || [];
    const items = [
      ...ownedThemes.map(v => ({ type: 'theme', value: v })),
      ...ownedStyles.map(v => ({ type: 'timerStyle', value: v }))
    ].filter(x => !(x.type === 'theme' && x.value === 'midnight') && !(x.type === 'timerStyle' && x.value === 'ring'));

    list.innerHTML = '';
    if (items.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    items.forEach(it => {
      const li = document.createElement('li');
      li.className = 'item';

      const name = it.type === 'theme'
        ? (state.lang === 'ar' ? `ثيم: ${it.value}` : `Theme: ${it.value}`)
        : (state.lang === 'ar' ? `ستايل: ${it.value}` : `Style: ${it.value}`);

      const isActive = (it.type === 'theme' && state.settings.theme === it.value) ||
                       (it.type === 'timerStyle' && state.settings.timerStyle === it.value);

      li.innerHTML = `
        <div class="item__left">
          <div class="item__title"></div>
          <div class="item__sub">${isActive ? (state.lang === 'ar' ? 'مفعل الآن' : 'Active now') : (state.lang === 'ar' ? 'جاهز للتفعيل' : 'Ready to apply')}</div>
        </div>
        <div class="item__right">
          <button class="btn btn--tiny ${isActive ? '' : 'btn--primary'}" type="button" data-apply-owned="${it.type}:${it.value}">
            ${isActive ? (state.lang === 'ar' ? 'مفعل' : 'Active') : t('apply')}
          </button>
        </div>
      `;
      const tt = $('.item__title', li);
      if (tt) tt.textContent = name;

      list.appendChild(li);
    });
  };

  const buyProduct = (pid) => {
    const p = PRODUCTS.find(x => x.id === pid);
    if (!p) return;

    const owned = p.type === 'theme' ? ensureOwned('theme', p.value) : ensureOwned('timerStyle', p.value);
    if (owned) {
      toast(state.lang === 'ar' ? 'هذا المنتج مملوك.' : 'Already owned.', 'warn');
      return;
    }

    if ((state.coins || 0) < p.price) {
      toast(state.lang === 'ar' ? 'النور غير كافي.' : 'Not enough coins.', 'warn');
      return;
    }

    addCoins(-p.price);
    if (p.type === 'theme') {
      state.purchases.themes = Array.from(new Set([...(state.purchases.themes || []), p.value]));
    } else {
      state.purchases.timerStyles = Array.from(new Set([...(state.purchases.timerStyles || []), p.value]));
    }

    pushActivity({
      id: `a_${Date.now()}`,
      kind: 'purchase',
      title: state.lang === 'ar' ? `شراء من المتجر` : 'Store purchase',
      meta: `${state.lang === 'ar' ? (p.nameAR) : (p.nameEN)} • -${p.price} ${t('coins')}`,
      dateKey: todayKey(),
      tsISO: new Date().toISOString()
    });

    toast(state.lang === 'ar' ? 'تم الشراء!' : 'Purchased!', 'ok');
    saveState();
    updateAllUI();
  };

  const applyProduct = (pid) => {
    const p = PRODUCTS.find(x => x.id === pid);
    if (!p) return;

    const owned = p.type === 'theme' ? ensureOwned('theme', p.value) : ensureOwned('timerStyle', p.value);
    if (!owned) {
      toast(state.lang === 'ar' ? 'لازم تشتريه أولًا.' : 'You must buy it first.', 'warn');
      return;
    }

    if (p.type === 'theme') state.settings.theme = p.value;
    else state.settings.timerStyle = p.value;

    toast(state.lang === 'ar' ? 'تم التفعيل.' : 'Applied.', 'ok');
    saveState();
    updateAllUI();
  };

  const applyOwned = (type, value) => {
    if (!ensureOwned(type, value)) {
      toast(state.lang === 'ar' ? 'غير مملوك.' : 'Not owned.', 'warn');
      return;
    }
    if (type === 'theme') state.settings.theme = value;
    if (type === 'timerStyle') state.settings.timerStyle = value;
    saveState();
    updateAllUI();
    toast(state.lang === 'ar' ? 'تم التفعيل.' : 'Applied.', 'ok');
  };

  // ---------- Tabs + Modal + Focus ----------
  const setActiveTab = (tab) => {
    // Buttons
    $$('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    // Pages
    $$('.page').forEach(p => p.classList.toggle('is-active', p.dataset.page === tab));

    // persist
    state.lastTab = tab;
    saveState();
  };

  const openModal = (id) => {
    const m = byId(id);
    if (!m) return;
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
  };

  const closeModal = (id) => {
    const m = byId(id);
    if (!m) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
  };

  const toggleFocus = () => {
    const body = document.body;
    const now = !body.classList.contains('is-focus');
    body.classList.toggle('is-focus', now);
    const btn = byId('focusToggle');
    if (btn) btn.setAttribute('aria-pressed', now ? 'true' : 'false');
    state.settings.focusOn = now;
    saveState();
    toast(now ? (state.lang === 'ar' ? 'تم تفعيل وضع التركيز.' : 'Focus mode enabled.') : (state.lang === 'ar' ? 'تم إلغاء وضع التركيز.' : 'Focus mode disabled.'), 'ok');
  };

  // ---------- Rendering ----------
  const renderHeaderStats = () => {
    const coinsValue = byId('coinsValue');
    const levelValue = byId('levelValue');
    const xpValue = byId('xpValue');
    const streakValue = byId('streakValue');

    if (coinsValue) coinsValue.textContent = String(state.coins || 0);
    if (levelValue) levelValue.textContent = String(state.level || 1);
    if (xpValue) xpValue.textContent = String(state.xp || 0);
    if (streakValue) streakValue.textContent = String(state.streak || 0);

    const modalCoins = byId('modalCoins');
    const modalLevel = byId('modalLevel');
    if (modalCoins) modalCoins.textContent = String(state.coins || 0);
    if (modalLevel) modalLevel.textContent = String(state.level || 1);

    const profileCoins = byId('profileCoins');
    const profileLevel = byId('profileLevel');
    const profileStreak = byId('profileStreak');
    if (profileCoins) profileCoins.textContent = String(state.coins || 0);
    if (profileLevel) profileLevel.textContent = String(state.level || 1);
    if (profileStreak) profileStreak.textContent = String(state.streak || 0);
  };

  const renderProgress = () => {
    const xpNeed = xpNeededFor(state.level || 1);
    const xpNow = clamp(Number(state.xp) || 0, 0, xpNeed);
    const xpPct = xpNeed ? (xpNow / xpNeed) * 100 : 0;

    const xpNowEl = byId('xpNow');
    const xpNeedEl = byId('xpNeed');
    const levelBar = byId('levelBar');

    if (xpNowEl) xpNowEl.textContent = String(xpNow);
    if (xpNeedEl) xpNeedEl.textContent = String(xpNeed);
    if (levelBar) levelBar.style.width = `${xpPct}%`;

    // Daily goal
    const goalNeed = Math.max(10, Number(state.settings.dailyGoalMin) || 60);
    const goalNow = minutesForDate(todayKey());
    const goalPct = clamp(goalNow / goalNeed, 0, 1) * 100;

    const goalNowEl = byId('goalNow');
    const goalNeedEl = byId('goalNeed');
    const goalBar = byId('goalBar');

    if (goalNowEl) goalNowEl.textContent = String(goalNow);
    if (goalNeedEl) goalNeedEl.textContent = String(goalNeed);
    if (goalBar) goalBar.style.width = `${goalPct}%`;

    // mini bar
    const dailyMiniNeed = byId('dailyMiniNeed');
    const dailyMiniNow = byId('dailyMiniNow');
    const dailyMiniBar = byId('dailyMiniBar');

    if (dailyMiniNeed) dailyMiniNeed.textContent = String(goalNeed);
    if (dailyMiniNow) dailyMiniNow.textContent = String(goalNow);
    if (dailyMiniBar) dailyMiniBar.style.width = `${goalPct}%`;

    const todayMinutes = byId('todayMinutes');
    if (todayMinutes) todayMinutes.textContent = String(goalNow);

    // claim state
    const claim = byId('dailyClaimState');
    if (claim) claim.textContent = canClaimDaily() ? (state.lang === 'ar' ? 'جاهز' : 'Ready') : t('locked');

    // reward tags
    const levelRewardCoins = byId('levelRewardCoins');
    const quizBonusCoins = byId('quizBonusCoins');
    if (levelRewardCoins) levelRewardCoins.textContent = String(COINS_REWARD_LEVELUP);
    if (quizBonusCoins) quizBonusCoins.textContent = String(COINS_REWARD_PER_QUIZ);
  };

  const renderSessions = () => {
    const list = byId('sessionsList');
    const empty = byId('sessionsEmpty');
    if (!list) return;

    const items = (state.history.sessions || []).slice(0, 12);
    list.innerHTML = '';

    if (items.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    items.forEach(s => {
      const li = document.createElement('li');
      li.className = 'item';
      const when = new Date(s.endISO || s.startISO || Date.now());
      const hh = pad2(when.getHours());
      const mm = pad2(when.getMinutes());
      const title = state.lang === 'ar' ? `${s.subject}` : `${s.subject}`;
      const sub = state.lang === 'ar'
        ? `${s.minutes} دقيقة • ${hh}:${mm} • +${s.coins} نور • +${s.xp} XP`
        : `${s.minutes} min • ${hh}:${mm} • +${s.coins} coins • +${s.xp} XP`;

      li.innerHTML = `
        <div class="item__left">
          <div class="item__title"></div>
          <div class="item__sub"></div>
        </div>
        <div class="item__right">
          <span class="tag tag--soft">${s.dateKey}</span>
        </div>
      `;
      const tt = $('.item__title', li);
      const ss = $('.item__sub', li);
      if (tt) tt.textContent = title;
      if (ss) ss.textContent = sub;
      list.appendChild(li);
    });
  };

  const renderQuizHistory = () => {
    const list = byId('quizHistoryList');
    const empty = byId('quizHistoryEmpty');
    if (!list) return;

    const items = (state.history.quizzes || []).slice(0, 12);
    list.innerHTML = '';

    if (items.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    items.forEach(q => {
      const li = document.createElement('li');
      li.className = 'item';
      const title = state.lang === 'ar' ? `${q.subject}` : `${q.subject}`;
      const sub = state.lang === 'ar'
        ? `${q.correct}/${q.total} • +${q.coins} نور • +${q.xp} XP`
        : `${q.correct}/${q.total} • +${q.coins} coins • +${q.xp} XP`;

      li.innerHTML = `
        <div class="item__left">
          <div class="item__title"></div>
          <div class="item__sub"></div>
        </div>
        <div class="item__right">
          <span class="tag tag--soft">${q.dateKey}</span>
        </div>
      `;
      const tt = $('.item__title', li);
      const ss = $('.item__sub', li);
      if (tt) tt.textContent = title;
      if (ss) ss.textContent = sub;
      list.appendChild(li);
    });
  };

  const renderStats = () => {
    const kpiToday = byId('kpiToday');
    const kpiWeek = byId('kpiWeek');
    const kpiTotal = byId('kpiTotal');
    const kpiTop = byId('kpiTopSubject');

    const tMin = minutesForDate(todayKey());
    const wMin = weekMinutes();
    const allMin = totalMinutes();

    if (kpiToday) kpiToday.textContent = String(tMin);
    if (kpiWeek) kpiWeek.textContent = String(wMin);
    if (kpiTotal) kpiTotal.textContent = String(allMin);
    if (kpiTop) kpiTop.textContent = topSubject();

    // Week line bars
    const line = byId('weekLine');
    if (line) {
      line.innerHTML = '';
      const now = new Date();
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const dk = todayKey(addDays(now, -i));
        days.push({ dk, min: minutesForDate(dk) });
      }
      const max = Math.max(10, ...days.map(d => d.min));

      days.forEach(d => {
        const el = document.createElement('div');
        el.className = 'dayBar';
        const pct = clamp(d.min / max, 0, 1) * 100;

        const short = d.dk.slice(5); // MM-DD
        el.innerHTML = `
          <div class="dayBar__col"><div class="dayBar__fill" style="height:${pct}%"></div></div>
          <div class="dayBar__lbl">${short}</div>
          <div class="dayBar__val">${d.min}</div>
        `;
        line.appendChild(el);
      });
    }

    // Activity list
    const list = byId('activityList');
    const empty = byId('activityEmpty');
    if (list) {
      const items = (state.history.activity || []).slice(0, 16);
      list.innerHTML = '';

      if (items.length === 0) {
        if (empty) empty.hidden = false;
      } else {
        if (empty) empty.hidden = true;
        items.forEach(a => {
          const li = document.createElement('li');
          li.className = 'item';
          li.innerHTML = `
            <div class="item__left">
              <div class="item__title"></div>
              <div class="item__sub"></div>
            </div>
            <div class="item__right">
              <span class="tag tag--soft">${a.dateKey || ''}</span>
            </div>
          `;
          const tt = $('.item__title', li);
          const ss = $('.item__sub', li);
          if (tt) tt.textContent = a.title || '';
          if (ss) ss.textContent = a.meta || '';
          list.appendChild(li);
        });
      }
    }
  };

    // داخل renderSettings() بعد ما تحسب theme/style وتعمل fallback
const allStyles = [
  { v:'ring', label:'Ring' },
  { v:'minimal', label:'Minimal' },
  { v:'bold', label:'Bold' },
  { v:'fire', label: state.lang === 'ar' ? 'ناري' : 'Fire' },
  { v:'ice', label: state.lang === 'ar' ? 'ثلجي' : 'Ice' },
  { v:'electric', label: state.lang === 'ar' ? 'كهرباء' : 'Electric' },
];

// عبّي القائمة بناءً على owned
const owned = new Set(state.purchases.timerStyles || []);
const fillSelect = (sel) => {
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '';
  allStyles.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.v;
    opt.textContent = s.label;
    // خليه ظاهر حتى لو مش مملوك، بس disabled (اختياري)
    if (!owned.has(s.v)) opt.disabled = true;
    sel.appendChild(opt);
  });
  // ارجع على المختار الحالي (أو fallback)
  sel.value = owned.has(state.settings.timerStyle) ? state.settings.timerStyle : 'ring';
};

fillSelect(byId('timerStyleSelect'));
fillSelect(byId('modalTimerStyleSelect'));
  };

  const updateAllUI = () => {
    applyLang();
    applyTheme();

    renderHeaderStats();
    renderProgress();
    renderSessions();
    renderQuizHistory();
    renderStore();
    renderPurchases();
    renderStats();
    renderSettings();
    renderTimer();
    updateModeUI();

    const year = byId('yearNow');
    if (year) year.textContent = String(new Date().getFullYear());
    const openName = byId('profileName');
    const savedName = state.profileName || '';
    if (openName && savedName) openName.textContent = savedName;
  };

  // ---------- Export + reset ----------
  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `serag_export_${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(state.lang === 'ar' ? 'تم تصدير البيانات.' : 'Exported.', 'ok');
    } catch {
      toast(state.lang === 'ar' ? 'فشل التصدير.' : 'Export failed.', 'bad');
    }
  };

  const resetAll = () => {
    const ok = window.confirm(state.lang === 'ar'
      ? 'متأكد؟ رح يتم مسح كل شيء.'
      : 'Are you sure? This will erase everything.');
    if (!ok) return;

    state = structuredClone(defaults);
    timer.running = false;
    pauseTimer();
    saveState();
    toast(state.lang === 'ar' ? 'تمت إعادة الضبط.' : 'Reset completed.', 'ok');
    updateAllUI();
    setActiveTab('timer');
  };

  // ---------- Event delegation (single binding) ----------
  const bindOnce = () => {
    if (window.__SERAG_BOUND__) return;
    window.__SERAG_BOUND__ = true;

    // Tabs + delegated actions
    on(document, 'click', (e) => {
      const target = e.target;

      // close toasts
      const toastClose = target?.closest?.('[data-toast-close]');
      if (toastClose) {
        const id = toastClose.getAttribute('data-toast-close');
        const el = byId('toastRoot')?.querySelector?.(`[data-toast-id="${id}"]`);
        if (el) el.remove();
        return;
      }

      // Tabs
      const tabBtn = target?.closest?.('.tab');
      if (tabBtn && tabBtn.dataset.tab) {
        setActiveTab(tabBtn.dataset.tab);
        return;
      }

      // Timer mode segment
      const segBtn = target?.closest?.('.seg__btn');
      if (segBtn && segBtn.dataset.mode) {
        setMode(segBtn.dataset.mode);
        return;
      }

      // Quick actions
      if (target?.closest?.('#btnOpenQuiz')) { setActiveTab('quizzes'); return; }
      if (target?.closest?.('#btnOpenStore')) { setActiveTab('store'); return; }

      // Modal close
      const closeBtn = target?.closest?.('[data-close-modal]');
      if (closeBtn) {
        const mid = closeBtn.getAttribute('data-close-modal');
        if (mid) closeModal(mid);
        return;
      }

      // Store actions
      const storeBtn = target?.closest?.('[data-store-action]');
      if (storeBtn) {
        const action = storeBtn.getAttribute('data-store-action');
        const pid = storeBtn.getAttribute('data-store-id');
        if (!pid) return;
        if (action === 'buy') buyProduct(pid);
        if (action === 'apply') applyProduct(pid);
        return;
      }

      // Apply owned from purchases list
      const applyOwnedBtn = target?.closest?.('[data-apply-owned]');
      if (applyOwnedBtn) {
        const v = applyOwnedBtn.getAttribute('data-apply-owned') || '';
        const [type, value] = v.split(':');
        if (type && value) applyOwned(type, value);
        return;
      }

      // Quiz options
      const optBtn = target?.closest?.('[data-quiz-option]');
      if (optBtn && optBtn.getAttribute('data-quiz-option') != null) {
        answerQuiz(optBtn.getAttribute('data-quiz-option'));
        return;
      }
    });

    // Buttons (safe binds by id)
    onId('btnStartPause', 'click', () => { timer.running ? pauseTimer() : startTimer(); });
    onId('btnReset', 'click', resetTimer);
    onId('btnNext', 'click', nextMode);

    onId('btnClearHistory', 'click', () => {
      state.history.sessions = [];
      pushActivity({
        id: `a_${Date.now()}`,
        kind: 'system',
        title: state.lang === 'ar' ? 'مسح سجل الجلسات' : 'Cleared sessions history',
        meta: '',
        dateKey: todayKey(),
        tsISO: new Date().toISOString()
      });
      saveState();
      updateAllUI();
      toast(state.lang === 'ar' ? 'تم مسح الجلسات.' : 'Sessions cleared.', 'ok');
    });

    onId('btnClaimDaily', 'click', claimDailyReward);

    onId('btnNewQuiz', 'click', startQuiz);
    onId('btnExitQuiz', 'click', () => endQuiz());
    onId('btnQuizSkip', 'click', () => {
      if (!quiz.active) return;
      quiz.idx += 1;
      nextQuizQuestion();
    });
    onId('btnQuizNext', 'click', () => {
      if (!quiz.active) return;
      quiz.idx += 1;
      nextQuizQuestion();
    });

    onId('btnClearQuizHistory', 'click', () => {
      state.history.quizzes = [];
      saveState();
      updateAllUI();
      toast(state.lang === 'ar' ? 'تم مسح سجل الكوينز.' : 'Quiz history cleared.', 'ok');
    });

    onId('btnClearAllActivity', 'click', () => {
      state.history.activity = [];
      saveState();
      updateAllUI();
      toast(state.lang === 'ar' ? 'تم مسح النشاط.' : 'Activity cleared.', 'ok');
    });

    onId('btnExport', 'click', exportData);

    onId('dailyGoalInput', 'change', (e) => {
      const v = clamp(Number(e.target?.value || 60), 10, 600);
      state.settings.dailyGoalMin = v;
      saveState();
      updateAllUI();
      toast(state.lang === 'ar' ? 'تم حفظ الهدف اليومي.' : 'Daily goal saved.', 'ok');
    });

    onId('soundToggle', 'click', () => {
      state.settings.soundOn = !state.settings.soundOn;
      saveState();
      updateAllUI();
      toast(state.settings.soundOn ? (state.lang === 'ar' ? 'تم تشغيل الصوت.' : 'Sound on.') : (state.lang === 'ar' ? 'تم إيقاف الصوت.' : 'Sound off.'), 'ok');
    });

    const trySelectApply = (selectId, type) => {
      const sel = byId(selectId);
      if (!sel) return;
      const val = String(sel.value || '');
      if (!ensureOwned(type, val)) {
        toast(state.lang === 'ar' ? 'هذا الخيار غير مملوك. اشترِه من المتجر.' : 'Not owned. Buy it from the store.', 'warn');
        // revert
        sel.value = (type === 'theme') ? state.settings.theme : state.settings.timerStyle;
        return;
      }
      if (type === 'theme') state.settings.theme = val;
      if (type === 'timerStyle') state.settings.timerStyle = val;
      saveState();
      updateAllUI();
      toast(state.lang === 'ar' ? 'تم التفعيل.' : 'Applied.', 'ok');
    };

    onId('themeSelect', 'change', () => trySelectApply('themeSelect', 'theme'));
    onId('timerStyleSelect', 'change', () => trySelectApply('timerStyleSelect', 'timerStyle'));
    onId('btnSaveModal', 'click', () => {
      trySelectApply('modalThemeSelect', 'theme');
      trySelectApply('modalTimerStyleSelect', 'timerStyle');
      closeModal('profileModal');
    });

    onId('btnResetAll', 'click', resetAll);

    onId('btnSaveProfile', 'click', () => {
      const v = String(byId('nameInput')?.value || '').trim();
      if (v) {
        state.profileName = v;
        state.profileNameTouched = true;
        saveState();
        updateAllUI();
        toast(state.lang === 'ar' ? 'تم حفظ الاسم.' : 'Name saved.', 'ok');
      } else {
        toast(state.lang === 'ar' ? 'اكتب اسمًا أولًا.' : 'Please enter a name.', 'warn');
      }
    });

    onId('openProfile', 'click', () => openModal('profileModal'));

    onId('focusToggle', 'click', toggleFocus);

    onId('langToggle', 'click', () => {
      state.lang = (state.lang === 'ar') ? 'en' : 'ar';
      saveState();
      updateAllUI();
      toast(state.lang === 'ar' ? 'تم تغيير اللغة للعربية.' : 'Language switched to English.', 'ok');
    });

    onId('customMinutes', 'change', () => {
      if (timer.mode === 'study' && !timer.running) {
        timer.totalSeconds = getModeSeconds('study');
        timer.secondsLeft = timer.totalSeconds;
        renderTimer();
      }
    });

    // Esc closes modal
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape') closeModal('profileModal');
    });
  };

  // ---------- Init ----------
  const sanitizeState = () => {
    state.coins = Math.max(0, Math.trunc(Number(state.coins) || 0));
    state.level = Math.max(1, Math.trunc(Number(state.level) || 1));
    state.xp = Math.max(0, Math.trunc(Number(state.xp) || 0));
    state.streak = Math.max(0, Math.trunc(Number(state.streak) || 0));

    state.settings = state.settings || {};
    state.settings.dailyGoalMin = clamp(Number(state.settings.dailyGoalMin || 60), 10, 600);
    state.settings.soundOn = !!state.settings.soundOn;
    state.settings.theme = state.settings.theme || 'midnight';
    state.settings.timerStyle = state.settings.timerStyle || 'ring';

    state.purchases = state.purchases || { themes: ['midnight'], timerStyles: ['ring'] };
    state.purchases.themes = Array.from(new Set([...(state.purchases.themes || []), 'midnight']));
    state.purchases.timerStyles = Array.from(new Set([...(state.purchases.timerStyles || []), 'ring']));

    // Ensure active selections are owned
    if (!ensureOwned('theme', state.settings.theme)) state.settings.theme = 'midnight';
    if (!ensureOwned('timerStyle', state.settings.timerStyle)) state.settings.timerStyle = 'ring';
  };

  const boot = () => {
    sanitizeState();
    bindOnce();

    // Focus persisted
    const focusOn = !!state.settings.focusOn;
    document.body.classList.toggle('is-focus', focusOn);
    const focusBtn = byId('focusToggle');
    if (focusBtn) focusBtn.setAttribute('aria-pressed', focusOn ? 'true' : 'false');

    // Default timer
    setMode('study');

    // Restore last tab if valid
    const lastTab = state.lastTab || 'timer';
    const okTabs = new Set(['timer', 'quizzes', 'store', 'stats', 'settings']);
    setActiveTab(okTabs.has(lastTab) ? lastTab : 'timer');

    updateAllUI();
    saveState();
  };

  on(document, 'DOMContentLoaded', boot);
})();
