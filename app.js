const $ = (id) => document.getElementById(id);

/* ====== State ====== */
const DUR = { study: 25*60, short: 5*60, long: 15*60 };
const REWARD = { studySession: 10, dailyGoal: 30, levelUp: 20, streak3: 50 };

const STORE = [
  { id:"theme-light", type:"theme", name:"Light Clean", price:0, value:"", desc:"الثيم الفاتح الافتراضي" },
  { id:"theme-dark", type:"theme", name:"Dark Focus", price:150, value:"theme-dark", desc:"داكن مريح للعين" },

  { id:"timer-classic", type:"timer", name:"Classic Ring", price:0, value:"Classic", desc:"حلقة بسيطة" },
  { id:"timer-glow", type:"timer", name:"Glow Ring", price:120, value:"Glow", desc:"توهّج خفيف" },
  { id:"timer-neon", type:"timer", name:"Neon Pulse", price:180, value:"Neon", desc:"نبض بسيط" },
];

const TITLES = [
  { lvl:1,  name:"طالب منير" },
  { lvl:3,  name:"باحث سراج" },
  { lvl:6,  name:"محترف التركيز" },
  { lvl:10, name:"أسطورة الإنجاز" },
];

const DEFAULT = {
  username: "سراج",
  coins: 0,
  level: 1,
  xp: 0,
  streak: 0,
  lastStudyDate: null,   // YYYY-MM-DD
  dailyGoal: 4,
  sound: "on",
  focus: false,
  owned: { themes:["theme-light"], timers:["timer-classic"] },
  activeTheme: "theme-light",
  activeTimer: "timer-classic",
  history: [] // {ts,date,mode,subject,minutes,coins}
};

const storage = {
  get(){
    try{
      const raw = localStorage.getItem("siraj_v2");
      return raw ? { ...DEFAULT, ...JSON.parse(raw) } : structuredClone(DEFAULT);
    }catch{
      return structuredClone(DEFAULT);
    }
  },
  set(s){ localStorage.setItem("siraj_v2", JSON.stringify(s)); },
  reset(){ localStorage.removeItem("siraj_v2"); }
};

let state = storage.get();

/* ====== Helpers ====== */
function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1600);
}
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function format(sec){
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function xpNext(level){ return 100 + (level-1)*40; }
function titleForLevel(lv){
  let t = TITLES[0].name;
  for (const x of TITLES) if (lv >= x.lvl) t = x.name;
  return t;
}
function isOwned(item){
  if (item.type==="theme") return state.owned.themes.includes(item.id);
  if (item.type==="timer") return state.owned.timers.includes(item.id);
  return false;
}
function getItem(id){ return STORE.find(x=>x.id===id); }

/* ====== Tabs ====== */
document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const v = btn.dataset.view;
    document.querySelectorAll(".view").forEach(s=>s.classList.remove("show"));
    $(`view-${v}`).classList.add("show");
    renderAll();
  });
});
document.querySelectorAll("[data-jump]").forEach(b=>{
  b.addEventListener("click", ()=>{
    const to = b.dataset.jump;
    document.querySelectorAll(".tab").forEach(x=>{
      x.classList.toggle("active", x.dataset.view===to);
    });
    document.querySelectorAll(".view").forEach(s=>s.classList.remove("show"));
    $(`view-${to}`).classList.add("show");
    renderAll();
  });
});

/* ====== Focus + Sound ====== */
$("toggleFocus").addEventListener("click", ()=>{
  state.focus = !state.focus;
  storage.set(state);
  applyFocus();
  toast(state.focus ? "🎯 وضع التركيز مفعّل" : "🎯 وضع التركيز متوقف");
});
$("toggleSound").addEventListener("click", ()=>{
  state.sound = (state.sound==="on") ? "off" : "on";
  storage.set(state);
  renderTop();
  toast(state.sound==="on" ? "🔔 الصوت مفعّل" : "🔕 الصوت مطفأ");
});

function applyFocus(){
  document.body.classList.toggle("focus", !!state.focus);
}
function applyTheme(){
  document.body.classList.remove("theme-dark");
  const theme = getItem(state.activeTheme);
  if (theme?.value) document.body.classList.add(theme.value);
}

/* ====== Timer ====== */
let timer = { mode:"study", total:DUR.study, left:DUR.study, running:false, id:null };

function setMode(mode){
  timer.mode = mode;
  timer.total = DUR[mode];
  timer.left = DUR[mode];

  const label = mode==="study" ? "جاهز — اضغط ابدأ" :
                mode==="short" ? "استراحة قصيرة" : "استراحة طويلة";
  $("timerLabel").textContent = label;

  $("rewardPreview").textContent = mode==="study" ? `+${REWARD.studySession} نور` : "+0";
  $("mode").value = mode;
  renderTimer();
}

function start(){
  if (timer.running) return;
  timer.running = true;
  $("timerLabel").textContent = "شغّال… ركّز";
  timer.id = setInterval(()=>{
    timer.left -= 1;
    if (timer.left <= 0){
      timer.left = 0;
      renderTimer();
      stop();
();
      onDone();
      beep();
      return;
    }
    renderTimer();
  }, 1000);
}
function stop(){
  timer.running = false;
  if (timer.id) clearInterval(timer.id);
  timer.id = null;
}
function reset(){
  stop();
  timer.left = timer.total;
  $("timerLabel").textContent = "جاهز — اضغط ابدأ";
  renderTimer();
}
function next(){
  stop();
  if (timer.mode==="study") setMode("short");
  else setMode("study");
  reset();
  toast("⏭️ تم الانتقال");
}

$("mode").addEventListener("change", (e)=>{ setMode(e.target.value); });
$("startBtn").addEventListener("click", ()=> start());
$("pauseBtn").addEventListener("click", ()=>{
  if (timer.running){ stop(); toast("⏸️ إيقاف مؤقت"); }
  else { start(); toast("▶️ متابعة"); }
});
$("resetBtn").addEventListener("click", ()=>{ reset(); toast("🔁 إعادة"); });
$("nextBtn").addEventListener("click", ()=> next());

function renderTimer(){
  $("time").textContent = format(timer.left);
  const pct = 100 - (timer.left/timer.total)*100;
  $("timerFill").style.width = `${clamp(pct,0,100)}%`;

  // Timer style effects
  const ring = $("timerRing");
  ring.style.boxShadow = "0 0 0 8px rgba(245,158,11,.08) inset";
  const style = getItem(state.activeTimer)?.value || "Classic";
  if (style==="Glow") ring.style.boxShadow = "0 0 0 8px rgba(245,158,11,.10) inset, 0 0 26px rgba(245,158,11,.18)";
  if (style==="Neon") ring.style.boxShadow = "0 0 0 8px rgba(245,158,11,.10) inset, 0 0 30px rgba(14,165,233,.18)";
}

function beep(){
  if (state.sound !== "on") return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.04;
    o.start();
    setTimeout(()=>{ o.stop(); ctx.close(); }, 160);
  }catch{}
}

/* ====== Rewards / Progress ====== */
function countTodayStudy(){
  const t = todayKey();
  return state.history.filter(h=>h.date===t && h.mode==="study").length;
}
function handleStreak(){
  const t = todayKey();
  const last = state.lastStudyDate;

  if (!last){
    state.streak = 1;
    state.lastStudyDate = t;
    return;
  }

  const d1 = new Date(last+"T00:00:00");
  const d2 = new Date(t+"T00:00:00");
  const diff = Math.round((d2-d1)/(1000*60*60*24));

  if (diff===0) return;
  if (diff===1){
    state.streak += 1;
    state.lastStudyDate = t;
    if (state.streak === 3){
      state.coins += REWARD.streak3;
      toast(`🔥 ستريك 3 أيام! +${REWARD.streak3} نور`);
    }
    return;
  }
  state.streak = 1;
  state.lastStudyDate = t;
}
function levelUpIfNeeded(){
  while (state.xp >= xpNext(state.level)){
    state.xp -= xpNext(state.level);
    state.level += 1;
    state.coins += REWARD.levelUp;
    toast(`🎉 مستوى جديد! +${REWARD.levelUp} نور`);
  }
}
function onDone(){
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
    entry.coins = REWARD.studySession;
    state.coins += REWARD.studySession;
    state.xp += 20;
    handleStreak();

    const nowCount = countTodayStudy();
    if (nowCount === state.dailyGoal){
      state.coins += REWARD.dailyGoal;
      toast(`🎯 حققت هدف اليوم! +${REWARD.dailyGoal} نور`);
    }

    toast(`✅ جلسة مكتملة! +${REWARD.studySession} نور`);
  }else{
    toast("✅ استراحة مكتملة");
  }

  state.history.unshift(entry);
  state.history = state.history.slice(0, 60);

  levelUpIfNeeded();
  storage.set(state);
  renderAll();

  // auto switch (Pomodoro)
  if (timer.mode==="study") setMode("short");
  else setMode("study");
  reset();
}

/* ====== Store ====== */
function buy(id){
  const item = getItem(id);
  if (!item) return;

  if (isOwned(item)) return toast("✅ مملوك");
  if (state.coins < item.price) return toast("❌ رصيد نور غير كافي");

  state.coins -= item.price;
  if (item.type==="theme") state.owned.themes.push(item.id);
  if (item.type==="timer") state.owned.timers.push(item.id);

  storage.set(state);
  toast(`🛍️ تم الشراء: ${item.name}`);
  renderAll();
}

function renderStore(){
  const grid = $("storeGrid");
  grid.innerHTML = "";

  STORE.forEach(item=>{
    const owned = isOwned(item);
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `
      <div class="row between">
        <div>
          <div style="font-weight:900">${item.name}</div>
          <div class="muted" style="margin-top:6px">${item.desc}</div>
        </div>
        <span class="pill">🪙 <strong>${item.price}</strong></span>
      </div>
      <div class="divider"></div>
      <div class="row between">
        <span class="muted">${item.type==="theme" ? "🎨 ثيم" : "⏱️ شكل مؤقت"}</span>
        <button class="btn ${owned ? "primary" : ""}" data-buy="${item.id}">
          ${owned ? "مملوك" : "شراء"}
        </button>
      </div>
    `;
    grid.appendChild(c);
  });

  grid.querySelectorAll("[data-buy]").forEach(b=>{
    b.addEventListener("click", ()=> buy(b.dataset.buy));
  });

  $("coins2").textContent = state.coins;
}

/* ====== Settings/Profile ====== */
$("saveProfile").addEventListener("click", ()=>{
  state.username = ($("username").value || "سراج").trim();
  state.dailyGoal = clamp(parseInt($("dailyGoalInput").value || "4",10), 1, 12);

  state.activeTheme = $("themeSelect").value;
  state.activeTimer = $("timerStyleSelect").value;
  state.sound = $("soundSelect").value;

  storage.set(state);
  applyTheme();
  renderAll();
  toast("✅ تم الحفظ");
});

$("resetAll").addEventListener("click", ()=>{
  storage.reset();
  state = storage.get();
  stop();
  applyTheme();
  applyFocus();
  setMode("study");
  reset();
  renderAll();
  toast("🧹 تم تصفير كل شيء");
});

$("clearHistory").addEventListener("click", ()=>{
  state.history = [];
  storage.set(state);
  renderAll();
  toast("🧹 تم مسح السجل");
});

/* ====== Render ====== */
function renderTop(){
  // chips labels
  $("toggleSound").textContent = state.sound==="on" ? "🔔 صوت" : "🔕 صامت";
  $("toggleFocus").textContent = state.focus ? "🎯 تركيز ON" : "🎯 تركيز";
}
function renderHomeKPIs(){
  $("kpiTodaySessions").textContent = countTodayStudy();
  $("kpiGoal").textContent = state.dailyGoal;
  $("kpiCoins").textContent = state.coins;
  $("kpiStreak").textContent = state.streak;

  $("hudLevel").textContent = state.level;
  $("hudTitle").textContent = titleForLevel(state.level);

  $("hudCoinsPill").textContent = `🪙 ${state.coins}`;
}
function renderProgress(){
  const next = xpNext(state.level);
  $("xpNow").textContent = state.xp;
  $("xpNext").textContent = next;
  $("xpBar").style.width = `${clamp((state.xp/next)*100,0,100)}%`;

  $("dailyGoal").textContent = state.dailyGoal;
  const today = countTodayStudy();
  $("todaySessions").textContent = today;
  $("dailyBar").style.width = `${clamp((today/state.dailyGoal)*100,0,100)}%`;
}
function renderHistory(){
  const mini = $("historyMini");
  const full = $("historyFull");
  mini.innerHTML = "";
  full.innerHTML = "";

  const items = state.history.slice(0, 8);
  if (!items.length){
    mini.innerHTML = `<div class="muted">لا يوجد جلسات بعد.</div>`;
    full.innerHTML = `<div class="muted">ابدأ جلسة من تبويب "جلسات".</div>`;
    return;
  }

  items.forEach(h=>{
    const when = new Date(h.ts).toLocaleString("ar", { hour:"2-digit", minute:"2-digit", weekday:"short" });
    const tag = h.mode==="study" ? "دراسة" : "استراحة";
    const right = h.coins ? `+${h.coins} 🪙` : "—";
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div><strong>${tag} • ${h.subject}</strong><div class="muted">${when} • ${h.minutes} دقيقة</div></div><strong>${right}</strong>`;
    mini.appendChild(el.cloneNode(true));
    full.appendChild(el);
  });
}
function renderStats(){
  const today = todayKey();
  const todayCount = state.history.filter(h=>h.date===today && h.mode==="study").length;

  const week = new Set();
  for (let i=0;i<7;i++){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    week.add(k);
  }
  const weekCount = state.history.filter(h=>week.has(h.date) && h.mode==="study").length;

  const minutes = state.history.filter(h=>h.mode==="study").reduce((a,b)=>a+b.minutes,0);

  const map = new Map();
  state.history.filter(h=>h.mode==="study").forEach(h=>{
    map.set(h.subject, (map.get(h.subject)||0)+1);
  });
  let top="—", best=0;
  for (const [k,v] of map.entries()){
    if (v>best){ best=v; top=k; }
  }

  $("statToday").textContent = todayCount;
  $("statWeek").textContent = weekCount;
  $("statMinutes").textContent = minutes;
  $("statTop").textContent = top;
}
function renderSelectors(){
  // theme select: only owned
  const themeSel = $("themeSelect");
  themeSel.innerHTML = "";
  STORE.filter(x=>x.type==="theme" && isOwned(x)).forEach(t=>{
    const o = document.createElement("option");
    o.value = t.id; o.textContent = t.name;
    if (t.id===state.activeTheme) o.selected = true;
    themeSel.appendChild(o);
  });

  const timerSel = $("timerStyleSelect");
  timerSel.innerHTML = "";
  STORE.filter(x=>x.type==="timer" && isOwned(x)).forEach(t=>{
    const o = document.createElement("option");
    o.value = t.id; o.textContent = t.name;
    if (t.id===state.activeTimer) o.selected = true;
    timerSel.appendChild(o);
  });

  $("username").value = state.username;
  $("dailyGoalInput").value = state.dailyGoal;
  $("soundSelect").value = state.sound;
  $("title").textContent = titleForLevel(state.level);
}
function renderAchievements(){
  const box = $("achievements");
  box.innerHTML = "";
  const rows = [
    { k:"🪙 نور", v:`${state.coins}` },
    { k:"⭐ المستوى", v:`${state.level}` },
    { k:"🔥 ستريك", v:`${state.streak} يوم` },
    { k:"✅ جلسات دراسة", v:`${state.history.filter(h=>h.mode==="study").length}` },
  ];
  rows.forEach(r=>{
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `<div><strong>${r.k}</strong><div class="muted">ملخص</div></div><strong>${r.v}</strong>`;
    box.appendChild(el);
  });
}

function renderAll(){
  applyTheme();
  applyFocus();
  renderTop();
  renderHomeKPIs();
  renderProgress();
  renderHistory();
  renderStats();
  renderStore();
  renderSelectors();
  renderAchievements();
  renderTimer();
}

/* ====== Init ====== */
(function init(){
  // Ensure defaults
  if (!state.owned.themes.includes("theme-light")) state.owned.themes.push("theme-light");
  if (!state.owned.timers.includes("timer-classic")) state.owned.timers.push("timer-classic");
  if (!state.activeTheme) state.activeTheme = "theme-light";
  if (!state.activeTimer) state.activeTimer = "timer-classic";

  storage.set(state);
  setMode("study");
  applyTheme();
  applyFocus();
  renderAll();
})();
