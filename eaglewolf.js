// ===== EagleWolf Auth-aware UI (username + enrolled count) =====

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvrNpH1TR2TBXOe5GXVBFxvPAWxdtoetg",
  authDomain: "eaglewolf-524ea.firebaseapp.com",
  databaseURL: "https://eaglewolf-524ea-default-rtdb.firebaseio.com",
  projectId: "eaglewolf-524ea",
  storageBucket: "eaglewolf-524ea.appspot.com",
  messagingSenderId: "737388153839",
  appId: "1:737388153839:web:d23d12d6febbd2ef0e441a",
  measurementId: "G-B99X2MBFVQ"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// ثبّت الجلسة محليًا (حتى يفضل مسجّل)
await setPersistence(auth, browserLocalPersistence);

// ===== Helpers =====
async function fetchEnrollmentCount(uid){
  // جرّب أكثر من مسار شائع في RTDB علشان نضمن يشتغل مع هيكلة مختلفة
  const CANDIDATE_PATHS = [
    `users/${uid}/enrollments`,   // {courseId: true, ...}
    `enrollments/${uid}`,         // {courseId: true, ...}
    `users/${uid}/courses`        // بديل محتمل
  ];
  try{
    for(const p of CANDIDATE_PATHS){
      const snap = await get(ref(db, p));
      if (snap.exists()){
        const v = snap.val();
        if (v && typeof v === "object"){
          // عدّ العناصر (مفاتيح) بغض النظر عن القيم
          return Object.keys(v).length;
        }
        // لو مخزّنين رقم جاهز
        if (typeof v === "number") return v;
      }
    }
  }catch(e){ console.error("fetchEnrollmentCount error:", e); }
  return 0;
}

async function fetchUsername(user){
  const { uid, displayName, email } = user || {};
  // 1) لو عنده displayName مستخدم جاهز
  if (displayName && displayName.trim()) return displayName.trim();

  // 2) جرّب قراءة username من الداتابيز
  const CANDIDATE_PATHS = [
    `users/${uid}/profile/username`,
    `users/${uid}/username`,
    `profiles/${uid}/username`
  ];
  try{
    for(const p of CANDIDATE_PATHS){
      const snap = await get(ref(db, p));
      if (snap.exists()){
        const v = snap.val();
        if (typeof v === "string" && v.trim()) return v.trim();
        if (v && typeof v.name === "string" && v.name.trim()) return v.name.trim();
      }
    }
  }catch(e){ console.error("fetchUsername error:", e); }

  // 3) اشتقّ اسم من الإيميل (قبل @) كحل أخير
  if (email && email.includes("@")) return email.split("@")[0];
  return "مستخدم";
}

// ===== UI rendering =====
const $welcomeTitle = document.getElementById("welcome-title");
const $introSlot   = document.getElementById("intro-cta-slot");
const $authCta     = document.getElementById("auth-cta");

function renderLoggedOut(){
  document.body.classList.add("logged-out");
  document.body.classList.remove("logged-in");

  if ($welcomeTitle) $welcomeTitle.textContent = "أهلاً بيك 👋";
  if ($introSlot){
    $introSlot.innerHTML = [
      `<a class="btn primary" href="login.html">تسجيل الدخول</a>`,
      `<a class="btn" href="register.html">إنشاء حساب</a>`
    ].join("");
  }
  if ($authCta) $authCta.hidden = false; // بيظهر بـ CSS كمان
}

function renderHeroWithUser({ name, count }){
  // واجهة نظيفة للمستخدم المسجّل فيها الاسم + عدد الكورسات
  return [
    '<div class="course-cta" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">',
      '<div class="course-cta__text" style="display:grid;gap:4px">',
        `<span class="muted">أنت مسجّل في <b>${count}</b> ${count === 1 ? "كورس" : "كورسات"}</span>`,
      '</div>',
      `<a class="btn" href="profile.html">الملف الشخصي</a>`,
    '</div>'
  ].join("");
}

async function renderLoggedIn(user){
  document.body.classList.add("logged-in");
  document.body.classList.remove("logged-out");

  const [name, count] = await Promise.all([
    fetchUsername(user),
    fetchEnrollmentCount(user.uid)
  ]);

  if ($welcomeTitle){
    $welcomeTitle.textContent = `مرحبًا ${name} 👋`;
  }

  if ($introSlot){
    $introSlot.innerHTML = renderHeroWithUser({ name, count });
  }

  if ($authCta){
    // أخفي كارت تسجيل الدخول نهائيًا للمسجّلين
    $authCta.hidden = true;
  }
}

// راقب حالة الدخول وحدّث الواجهة
onAuthStateChanged(auth, (user)=>{
  if (user) renderLoggedIn(user);
  else renderLoggedOut();
});

// ===== Search bar behavior =====
document.getElementById('site-search')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const q = (document.getElementById('q')?.value || '').trim();
  location.href = `search.html?q=${encodeURIComponent(q)}`;
});

// ===== Copy-to-Clipboard for course buttons =====
function showToast(msg){
  const t = document.getElementById('copy-toast');
  if(!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>{ t.hidden = true; }, 1600);
}

document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('[data-copy]');
  if(!btn) return;
  const value = btn.getAttribute('data-copy') || '';
  try{
    await navigator.clipboard.writeText(value);
    showToast('تم النسخ ✅');
  }catch(err){
    console.error(err);
    showToast('تعذّر النسخ ❌');
  }
});

