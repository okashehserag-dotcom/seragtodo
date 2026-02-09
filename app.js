// سِراج — MVP (Timer + Coins + Levels + Store + Stats)
// كل البيانات محفوظة محليًا LocalStorage

const $ = (id) => document.getElementById(id);

const DURATIONS = { study: 25 * 60, short: 5 * 60, long: 15 * 60 };
const REWARDS = { sessionStudy: 10, dailyGoal: 30, streak3: 50 };

const STORE_ITEMS = [
  { id:"theme-darkfocus", type:"theme", name:"Dark Focus", price:120, value:"theme-golden", desc:"ثيم داكن ذهبي احترافي" },
  { id:"theme-pastel", type:"theme", name:"Pastel Calm", price:160, value:"theme-pastel", desc:"ألوان هادئة للتركيز" },
  { id:"theme-midnight", type:"theme", name:"Midnight Blue", price:200, value:"theme-midnight", desc:"داكن جدًا ومريح" },

  { id:"timer-classic", type:"timer", name:"Classic Circle", price:0, value:"Classic", desc:"الافتراضي" },
  { id:"timer-glow", type:"timer", name:"Glow Ring", price:120, value:"Glow", desc:"توهّج خفيف عند التقدّم" },
  { id:"timer-neon", type:"timer", name:"Neon Pulse", price:180, value:"Neon", desc:"نبض بسيط وتحفيزي" },
];

const TITLES = [
  { lvl: 1, name: "طالب منير" },
  { lvl: 3, name: "باحث سِراج" },
  { lvl: 6, name: "محترف التركيز" },
  { lvl: 10, name: "أسطورة الإنجاز" },
];

const DEFAULT_STATE = {
  username: "سراج",
  coins: 0,
  xp: 0,
  level: 1,
  streak: 0,
  lastStudyDate: null, // YYYY-MM-DD
  dailyGoal: 4,
  sound: "on",
  owned: {
    themes: ["theme-darkfocus"], // نعتبره مجاني كبداية
    timers: ["timer-classic"]
  },
  activeTheme: "theme-darkfocus",
  activeTimer: "timer-classic",
  history: [] // {ts, mode, subject, minutes, coins}
};

const storage = {
  get() {
    try {
      const raw = localStorage.getItem("siraj_state");
      return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : structuredClone(DEFAULT_STATE);
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  },
  set(state) {
    localStorage.setItem("siraj_state", JSON.stringify(state));
  },
  reset() {
    localStorage.removeItem("siraj_state");
  }
};

let state = storage.get();

// --------- UI helpers ----------
function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1800);
}

function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

// --------- Level System ----------
function xpForNextLevel(level){
  // بسيط وواضح: يزيد تدريجيًا
  return 100 + (level - 1) * 40;
}

function recalcLevel(){
  while (state.xp >= xpForNextLevel(state.level)) {
    state.xp -= xpForNextLevel(state.level);
    state.level += 1;
    state.coins += 20; // مكافأة مستوى
    toast(`🎉 مستوى جديد! +20 نور`);
  }
}

function currentTitle(){
  let t = TITLES[0].name;
  for (const x of TITLES) if (state.level >= x.lvl) t = x.name;
  return t;
}

// --------- Navigation ----------
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const v = btn.dataset.view;
    document.querySelectorAll(".view").forEach(s=>s.classList.remove("show"));
    $(`view-${v}`).classList.add("show");
    renderAll(); // تحديث حسب الصفحة
  });
});

// --------- Timer ----------
let timer = {
  total: DURATIONS.study,
  remaining: DURATIONS.study,
  running: false,
  intervalId: null,
  mode: "study"
};

function setMode(mode){
  timer.mode = mode;
  timer.total = DURATIONS[mode];
  timer.remaining = DURATIONS[mode];
  $("timerLabel").textContent = mode === "study" ? "دراسة" : (mode === "short" ? "استراحة قصيرة" : "استراحة طويلة");
  $("rewardPreview").textContent = mode === "study" ? `+${REWARDS.sessionStudy}` : "+0";
  renderTimer();
}

function formatTime(sec){
  const m = Math.floor(sec/60);
  const s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function renderTimer(){
  $("time").textContent = formatTime(timer.remaining);
  const pct = 100 - (timer.remaining / timer.total) * 100;
  $("timerFill").style.width = `${clamp(pct,0,100)}%`;

  // شكل المؤقت (سريع)
  const style = activeTimerItem().value;
  $("timerStyleBadge").textContent = `⏱️ ${style}`;
  const circle = $("timerCircle");
  circle.style.boxShadow = "0 0 0 6px rgba(255,200,87,.05) inset";
  if (style === "Glow") circle.style.boxShadow = "0 0 0 6px rgba(255,200,87,.06) inset, 0 0 28px rgba(255,200,87,.12)";
  if (style === "Neon") circle.style.boxShadow = "0 0 0 6px rgba(255,200,87,.06) inset, 0 0 38px rgba(140,233,253,.10)";
}

function beep(){
  if (state.sound !== "on") return;
  // Beep بسيط عبر Web Audio
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.04;
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 180);
  }catch{}
}

function stopTimer(){
  timer.running = false;
  if (timer.intervalId) clearInterval(timer.intervalId);
  timer.intervalId = null;
}

function startTimer(){
  if (timer.running) return;
  timer.running = true;
  timer.intervalId = setInterval(()=>{
    timer.remaining -= 1;
    if (timer.remaining <= 0){
      timer.remaining = 0;
      renderTimer();
      stopTimer();
      onSessionComplete();
      beep();
      return;
    }
    renderTimer();
  }, 1000);
}

function resetTimer(){
  stopTimer();
  timer.remaining = timer.total;
  renderTimer();
}

$("mode").addEventListener("change", (e)=> setMode(e.target.value));
$("startBtn").addEventListener("click", ()=> startTimer());
$("pauseBtn").addEventListener("click", ()=>{
  if (timer.running) { stopTimer(); toast("⏸️ تم الإيقاف المؤقت"); }
  else { startTimer(); toast("▶️ متابعة"); }
});
$("resetBtn").addEventListener("click", ()=> { resetTimer(); toast("🔁 إعادة"); });

// --------- Completion logic ----------
function onSessionComplete(){
  const subject = ($("subject").value || "بدون مادة").trim();
  const minutes = Math.round(timer.total/60);

  const entry = {
    ts: Date.now(),
    date: todayKey(),
    mode: timer.mode,
    subject,
    minutes,
    coins: 0
  };

  if (timer.mode === "study"){
    // coins + xp + streak
    entry.coins = REWARDS.sessionStudy;
    state.coins += REWARDS.sessionStudy;
    state.xp += 20; // XP ثابت لكل جلسة دراسة
    handleStreak();
    toast(`✅ جلسة مكتملة! +${REWARDS.sessionStudy} نور`);
  } else {
    toast("✅ استراحة مكتملة");
  }

  state.history.unshift(entry);
  state.history = state.history.slice(0, 60);

  // daily goal reward
  const todayCount = countTodayStudySessions();
  if (timer.mode === "study" && todayCount === state.dailyGoal){
    state.coins += REWARDS.dailyGoal;
    toast(`🎯 حققت هدف اليوم! +${REWARDS.dailyGoal} نور`);
  }

  recalcLevel();
  storage.set(state);
  renderAll();

  // جهّز للجلسة التالية تلقائيًا (Pomodoro بسيط)
  if (timer.mode === "study") setMode("short");
  else setMode("study");
  resetTimer();
}

function countTodayStudySessions(){
  const t = todayKey();
  return state.history.filter(h=> h.date === t && h.mode === "study").length;
}

function handleStreak(){
  const t = todayKey();
  const last = state.lastStudyDate;

  if (!last){
    state.streak = 1;
    state.lastStudyDate = t;
    return;
  }

  // حساب فرق الأيام
  const d1 = new Date(last + "T00:00:00");
  const d2 = new Date(t + "T00:00:00");
  const diffDays = Math.round((d2 - d1) / (1000*60*60*24));

  if (diffDays === 0){
    // نفس اليوم: ما تزيد الستريك
    return;
  }
  if (diffDays === 1){
    state.streak += 1;
    state.lastStudyDate = t;
    if (state.streak === 3){
      state.coins += REWARDS.streak3;
      toast(`🔥 ستريك 3 أيام! +${REWARDS.streak3} نور`);
    }
    return;
  }

  // انقطع
  state.streak = 1;
  state.lastStudyDate = t;
}

// --------- Store ----------
function isOwned(item){
  if (item.type === "theme") return state.owned.themes.includes(item.id);
  if (item.type === "timer") return state.owned.timers.includes(item.id);
  return false;
}
function activeThemeItem(){
  return STORE_ITEMS.find(x=>x.id===state.activeTheme) || STORE_ITEMS[0];
}
function activeTimerItem(){
  return STORE_ITEMS.find(x=>x.id===state.activeTimer) || STORE_ITEMS.find(x=>x.id==="timer-classic");
}

function buy(itemId){
  const item = STORE_ITEMS.find(x=>x.id===itemId);
  if (!item) return;
  if (isOwned(item)) { toast("✅ تمتلكه بالفعل"); return; }
  if (state.coins < item.price) { toast("❌ رصيد نور غير كافي"); return; }

  state.coins -= item.price;
  if (item.type === "theme") state.owned.themes.push(item.id);
  if (item.type === "timer") state.owned.timers.push(item.id);

  storage.set(state);
  toast(`🛍️ تم الشراء: ${item.name}`);
  renderAll();
}

function renderStore(){
  const grid = $("storeGrid");
  grid.innerHTML = "";
  STORE_ITEMS.forEach(item=>{
    // نخلي timer-classic يظهر حتى لو مجاني
    const owned = isOwned(item);
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="row between">
        <div>
          <div style="font-weight:800">${item.name}</div>
          <div class="muted" style="margin-top:6px">${item.desc}</div>
        </div>
        <div class="pill"><span class="muted">🪙</span><strong>${item.price}</strong></div>
      </div>
      <div class="divider"></div>
      <div class="row between">
        <div class="muted">${item.type === "theme" ? "🎨 ثيم" : "⏱️ شكل تايمر"}</div>
        <button class="btn ${owned ? "primary" : ""}" data-buy="${item.id}">
          ${owned ? "مملوك" : "شراء"}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-buy]").forEach(btn=>{
    btn.addEventListener("click", ()=> buy(btn.dataset.buy));
  });

  $("coins2").textContent = state.coins;
}

// --------- Profile / Settings ----------
function applyTheme(){
  document.body.classList.remove("theme-golden","theme-pastel","theme-midnight");
  const th = activeThemeItem().value; // CSS class
  document.body.classList.add(th);
}

function renderProfile(){
  $("username").value = state.username;
  $("title").textContent = currentTitle();

  // theme select
  const themeSel = $("themeSelect");
  themeSel.innerHTML = "";
  const themes = STORE_ITEMS.filter(x=>x.type==="theme" && isOwned(x));
  themes.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    if (t.id === state.activeTheme) opt.selected = true;
    themeSel.appendChild(opt);
  });

  // timer select
  const timerSel = $("timerStyleSelect");
  timerSel.innerHTML = "";
  const timers = STORE_ITEMS.filter(x=>x.type==="timer" && isOwned(x));
  timers.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    if (t.id === state.activeTimer) opt.selected = true;
    timerSel.appendChild(opt);
  });

  // achievements
  const ach = $("achievements");
  ach.innerHTML = "";
  const rows = [
    { label:"🔥 ستريك", value:`${state.streak} يوم` },
    { label:"🪙 مجموع نور", value:`${state.coins}` },
    { label:"⭐ المستوى", value:`${state.level}` },
    { label:"✅ جلسات دراسة", value:`${state.history.filter(h=>h.mode==="study").length}` },
  ];
  rows.forEach(r=>{
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div class="left"><strong>${r.label}</strong><div class="muted">إنجاز</div></div><div class="right"><strong>${r.value}</strong></div>`;
    ach.appendChild(el);
  });
}

$("saveProfile").addEventListener("click", ()=>{
  state.username = ($("username").value || "سراج").trim();
  state.activeTheme = $("themeSelect").value;
  state.activeTimer = $("timerStyleSelect").value;
  storage.set(state);
  applyTheme();
  renderAll();
  toast("✅ تم حفظ الملف");
});

function renderSettings(){
  $("dailyGoalInput").value = state.dailyGoal;
  $("soundSelect").value = state.sound;
}

$("saveSettings").addEventListener("click", ()=>{
  state.dailyGoal = clamp(parseInt($("dailyGoalInput").value || "4", 10), 1, 12);
  state.sound = $("soundSelect").value;
  storage.set(state);
  renderAll();
  toast("✅ تم حفظ الإعدادات");
});

$("resetAll").addEventListener("click", ()=>{
  storage.reset();
  state = storage.get();
  stopTimer();
  setMode("study");
  resetTimer();
  applyTheme();
  renderAll();
  toast("🧹 تم إعادة الضبط");
});

// --------- Stats / History ----------
function renderHistory(){
  const mini = $("historyMini");
  const full = $("historyFull");
  mini.innerHTML = "";
  full.innerHTML = "";

  const items = state.history.slice(0, 8);
  if (items.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "لا يوجد جلسات بعد.";
    mini.appendChild(empty.cloneNode(true));
    full.appendChild(empty);
    return;
  }

  items.forEach(h=>{
    const when = new Date(h.ts).toLocaleString("ar", { hour:"2-digit", minute:"2-digit", weekday:"short" });
    const tag = h.mode === "study" ? "دراسة" : "استراحة";
    const right = h.coins ? `+${h.coins} 🪙` : "—";
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="left">
        <strong>${tag} • ${h.subject}</strong>
        <div class="muted">${when} • ${h.minutes} دقيقة</div>
      </div>
      <div class="right"><strong>${right}</strong></div>
    `;
    mini.appendChild(el.cloneNode(true));
  });

  // full list (آخر 20)
  state.history.slice(0, 20).forEach(h=>{
    const when = new Date(h.ts).toLocaleString("ar", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    const tag = h.mode === "study" ? "دراسة" : "استراحة";
    const right = h.coins ? `+${h.coins} 🪙` : "—";
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="left">
        <strong>${tag} • ${h.subject}</strong>
        <div class="muted">${when} • ${h.minutes} دقيقة</div>
      </div>
      <div class="right"><strong>${right}</strong></div>
    `;
    full.appendChild(el);
  });
}

$("clearHistory").addEventListener("click", ()=>{
  state.history = [];
  storage.set(state);
  renderAll();
  toast("🧹 تم مسح السجل");
});

function renderStats(){
  const today = todayKey();
  const todayCount = state.history.filter(h=>h.date===today && h.mode==="study").length;

  // الأسبوع: آخر 7 أيام حسب date
  const weekDates = new Set();
  for (let i=0;i<7;i++){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    weekDates.add(k);
  }
  const weekCount = state.history.filter(h=>weekDates.has(h.date) && h.mode==="study").length;

  const minutes = state.history.filter(h=>h.mode==="study").reduce((a,b)=>a+b.minutes,0);

  // top subject
  const map = new Map();
  state.history.filter(h=>h.mode==="study").forEach(h=>{
    map.set(h.subject, (map.get(h.subject)||0)+1);
  });
  let top = "—", best = 0;
  for (const [k,v] of map.entries()){
    if (v > best){ best = v; top = k; }
  }

  $("statToday").textContent = todayCount;
  $("statWeek").textContent = weekCount;
  $("statMinutes").textContent = minutes;
  $("statTop").textContent = top;
}

// --------- Progress bars ----------
function renderProgress(){
  const next = xpForNextLevel(state.level);
  $("xpNow").textContent = state.xp;
  $("xpNext").textContent = next;
  $("xpBar").style.width = `${clamp((state.xp/next)*100,0,100)}%`;

  $("dailyGoal").textContent = state.dailyGoal;
  const todayCount = countTodayStudySessions();
  $("todaySessions").textContent = todayCount;
  $("dailyBar").style.width = `${clamp((todayCount/state.dailyGoal)*100,0,100)}%`;
}

// --------- HUD ----------
function renderHUD(){
  $("coins").textContent = state.coins;
  $("level").textContent = state.level;
  $("streak").textContent = state.streak;
  $("coins2").textContent = state.coins;
}

// --------- Render All ----------
function renderAll(){
  applyTheme();
  renderHUD();
  renderProgress();
  renderHistory();
  renderStats();
  renderStore();
  renderProfile();
  renderSettings();
  renderTimer();
}

(function init(){
  // تأكد وجود مجانيات
  if (!state.owned.timers.includes("timer-classic")) state.owned.timers.push("timer-classic");
  if (!state.owned.themes.includes("theme-darkfocus")) state.owned.themes.push("theme-darkfocus");
  if (!state.activeTheme) state.activeTheme = "theme-darkfocus";
  if (!state.activeTimer) state.activeTimer = "timer-classic";

  storage.set(state);
  setMode("study");
  applyTheme();
  renderAll();
})();

