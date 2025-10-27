
// admin.bundle.v2.js — لوحة تحكم الأدمن (تفاصيل + إحصائيات) — بدون زر "فتح الملف" + يعرض referralId
import { app } from "./firebase-config.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  deleteDoc,
  getCountFromServer,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const auth = getAuth(app);
const db   = getFirestore(app);

// ====== DOM bootstrap ======
const container = document.querySelector('main.container') || document.body;

// Inject stats section if missing
let statSection = document.getElementById('adminStatsSection');
if (!statSection) {
  statSection = document.createElement('section');
  statSection.className = 'card';
  statSection.id = 'adminStatsSection';
  statSection.innerHTML = `
    <h2>إحصائيات المستخدمين</h2>
    <div class="stats">
      <div class="stat">
        <div class="stat-label">إجمالي المسجلين</div>
        <div id="statTotal" class="stat-value">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">نشط</div>
        <div id="statActive" class="stat-value">—</div>
      </div>
      <div class="stat">
        <div class="stat-label">محظور</div>
        <div id="statBlocked" class="stat-value">—</div>
      </div>
    </div>
  `;
  const manageCard = container.querySelector('.card:not(.warning)');
  if (manageCard) container.insertBefore(statSection, manageCard);
  else container.prepend(statSection);
}

// Ensure table has first column "تفاصيل"
const usersTable = document.getElementById('usersTable');
const usersTbody = document.getElementById('usersTbody');
if (usersTable && usersTable.tHead && usersTable.tHead.rows[0]) {
  const headRow = usersTable.tHead.rows[0];
  const firstThText = headRow.cells[0]?.textContent?.trim() || '';
  if (firstThText !== 'تفاصيل') {
    const th = document.createElement('th');
    th.style.width = '48px';
    th.textContent = 'تفاصيل';
    headRow.insertBefore(th, headRow.cells[0] || null);
    // Fix loading colspan
    const loadingRow = usersTbody?.querySelector('tr>td[colspan]');
    if (loadingRow) {
      const cs = parseInt(loadingRow.getAttribute('colspan') || '6', 10);
      loadingRow.setAttribute('colspan', String(cs + 1));
    }
  }
}

const loadMoreBtn     = document.getElementById('loadMoreBtn');
const rowsCountEl     = document.getElementById('rowsCount');
const signOutBtn      = document.getElementById('signOutBtn');
const showOnlyBanned  = document.getElementById('showOnlyBanned');
const searchInput     = document.getElementById('searchInput');
const clearSearch     = document.getElementById('clearSearch');
const banEmailInput   = document.getElementById('banEmailInput');
const banEmailBtn     = document.getElementById('banEmailBtn');
const adminGuardMsg   = document.getElementById('adminGuardMsg');

let lastDocSnap = null;
let unsubscribe = null;
let cacheDocs   = [];

// Helpers
const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(d);
};
const emailIdFrom = (email) => (email || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '_');

// Stats
async function refreshStats(){
  try{
    const usersCol = collection(db, 'users');
    const totalSnap   = await getCountFromServer(usersCol);
    const activeSnap  = await getCountFromServer(query(usersCol, where('status','==','active')));
    const blockedSnap = await getCountFromServer(query(usersCol, where('status','==','blocked')));
    const setVal = (id, n) => { const el = document.getElementById(id); if(el) el.textContent = (n || 0).toLocaleString('ar-EG'); };
    setVal('statTotal', totalSnap.data().count);
    setVal('statActive', activeSnap.data().count);
    setVal('statBlocked', blockedSnap.data().count);
  }catch(e){ console.warn('stats error:', e); }
}

// Rendering
function renderRows(list) {
  const term = (searchInput?.value || '').trim().toLowerCase();
  const filtered = list.filter(u => {
    const isBlocked = (u.status || 'active') === 'blocked';
    const bannedOk = showOnlyBanned?.checked ? isBlocked : true;
    const termOk = term
      ? ((u.email||'').toLowerCase().includes(term) ||
         (u.displayName||'').toLowerCase().includes(term) ||
         (u.firstName||'').toLowerCase().includes(term) ||
         (u.uid||'').includes(term))
      : true;
    return bannedOk && termOk;
  });

  if (rowsCountEl) rowsCountEl.textContent = `إجمالي المعروض: ${filtered.length}`;
  if (!usersTbody) return;
  usersTbody.innerHTML = '';

  if (!filtered.length) {
    usersTbody.innerHTML = '<tr><td colspan="7" style="text-align:center">لا توجد نتائج</td></tr>';
    return;
  }

  for (const u of filtered) {
    const isBlocked = (u.status || 'active') === 'blocked';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <button class="disc-btn" type="button" aria-label="عرض التفاصيل"
                aria-expanded="false" data-action="toggle" data-uid="${u.uid}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        </button>
      </td>
      <td>${u.displayName || u.firstName ? `<strong>${u.displayName || u.firstName}</strong>` : '<span class="muted">بدون اسم</span>'}</td>
      <td>${u.email || '<span class="muted">—</span>'}</td>
      <td class="uid">${u.uid || '—'}</td>
      <td>${isBlocked ? '<span class="badge banned">محظور</span>' : '<span class="badge ok">نشط</span>'}</td>
      <td>${u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
      <td class="actions-cell">
        ${isBlocked
          ? `<button class="btn btn-ok" data-action="unban" data-uid="${u.uid}" data-email="${u.email||''}">رفع الحظر</button>`
          : `<button class="btn btn-danger" data-action="ban" data-uid="${u.uid}" data-email="${u.email||''}">حظر</button>`}
      </td>
    `;
    usersTbody.appendChild(tr);

    // Details row — includes referralId (the generated ID)
    const det = document.createElement('tr');
    det.className = 'details-row';
    det.hidden = true;
    det.innerHTML = `
      <td colspan="7">
        <div class="details-grid">
          <div><strong>UID:</strong> ${u.uid || '—'}</div>
          <div><strong>الاسم:</strong> ${u.displayName || u.firstName || '—'}</div>
          <div><strong>البريد:</strong> ${u.email || '—'}</div>
          <div><strong>الهاتف:</strong> ${u.phone || '—'}</div>
          <div><strong>المحافظة:</strong> ${u.governorate || '—'}</div>
          <div><strong>النوع:</strong> ${u.gender === 'male' ? 'ذكر' : (u.gender === 'female' ? 'أنثى' : '—')}</div>
          <div><strong>الدور:</strong> ${u.role || 'student'}</div>
          <div><strong>الحالة:</strong> ${(u.status || 'active') === 'blocked' ? 'محظور' : 'نشط'}</div>
          <div><strong>الـ ID المُولّد:</strong> ${u.referralId || (u.uid ? ('EW-' + u.uid.slice(0,6).toUpperCase()) : '—')}</div>
        </div>
      </td>
    `;
    usersTbody.appendChild(det);
  }
}

// Live page (paginated)
async function subscribeFirstPage() {
  if (unsubscribe) unsubscribe();
  const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
  unsubscribe = onSnapshot(qy, (snap) => {
    cacheDocs = [];
    snap.forEach(docSnap => {
      cacheDocs.push({ uid: docSnap.id, ...docSnap.data() });
    });
    if (snap.docs.length) lastDocSnap = snap.docs[snap.docs.length - 1];
    renderRows(cacheDocs);
    refreshStats();
  }, (err) => {
    console.error('onSnapshot error:', err);
    if (usersTbody) usersTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#fca5a5">تعذّر تحميل البيانات</td></tr>';
  });
}

async function loadMore() {
  if (!lastDocSnap) return;
  const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(lastDocSnap), limit(50));
  onSnapshot(qy, (snap) => {
    const more = [];
    snap.forEach(docSnap => more.push({ uid: docSnap.id, ...docSnap.data() }));
    if (snap.docs.length) lastDocSnap = snap.docs[snap.docs.length - 1];
    cacheDocs = cacheDocs.concat(more).slice(-200);
    renderRows(cacheDocs);
    refreshStats();
  });
}

// Actions
usersTbody?.addEventListener('click', async (e) => {
  const toggleBtn = e.target.closest('button[data-action="toggle"]');
  if (toggleBtn) {
    const row = toggleBtn.closest('tr');
    const detailsRow = row?.nextElementSibling;
    if (!detailsRow || !detailsRow.classList.contains('details-row')) return;
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', String(!expanded));
    detailsRow.hidden = expanded;
    return;
  }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const uid = btn.dataset.uid;
  const email = btn.dataset.email || '';

  try {
    if (action === 'ban') {
      if (!confirm('هل أنت متأكد من حظر هذا المستخدم؟')) return;
      await updateDoc(doc(db, 'users', uid), {
        status: 'blocked',
        bannedAt: serverTimestamp(),
        bannedBy: auth.currentUser ? auth.currentUser.uid : null,
      }).catch(async (err) => {
        if (String(err).includes('No document')) {
          await setDoc(doc(db, 'users', uid), {
            status: 'blocked',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } else {
          throw err;
        }
      });
      if (email) {
        await setDoc(doc(db, 'blockedEmails', emailIdFrom(email)), {
          email: (email || '').trim().toLowerCase(),
          reason: 'admin-block',
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser ? auth.currentUser.uid : null
        }, { merge: true });
      }
      await refreshStats();
    }

    if (action === 'unban') {
      await updateDoc(doc(db, 'users', uid), {
        status: 'active',
        unbannedAt: serverTimestamp(),
        unbannedBy: auth.currentUser ? auth.currentUser.uid : null,
      }).catch(() => {/* تجاهل */});

      if (email) {
        await deleteDoc(doc(db, 'blockedEmails', emailIdFrom(email))).catch(()=>{});
      }
      await refreshStats();
    }
  } catch (err) {
    console.error('Action error:', err);
    alert('تعذّر تنفيذ العملية.');
  }
});

// Ban by email
banEmailBtn?.addEventListener('click', async () => {
  const email = (banEmailInput?.value || '').trim().toLowerCase();
  if (!email) return alert('أدخل بريدًا صحيحًا');
  const id = emailIdFrom(email);
  try {
    await setDoc(doc(db, 'blockedEmails', id), {
      email,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser ? auth.currentUser.uid : null
    }, { merge: true });
    alert('تمت إضافة البريد لقائمة الحظر.');
    if (banEmailInput) banEmailInput.value = '';
    await refreshStats();
  } catch (e) {
    console.error(e);
    alert('تعذّر إضافة البريد الآن.');
  }
});

// Search & Filters
[searchInput, showOnlyBanned].forEach(el => el?.addEventListener('input', () => renderRows(cacheDocs)));
clearSearch?.addEventListener('click', () => { if (searchInput) searchInput.value = ''; renderRows(cacheDocs); });
loadMoreBtn?.addEventListener('click', loadMore);

// Admin Guard
async function isAdminUser(user) {
  try {
    const token = await getIdTokenResult(user, true);
    if (token.claims && token.claims.admin) return true;
  } catch {}
  try {
    const docSnap = await getDoc(doc(db, 'admins', user.uid));
    return docSnap.exists();
  } catch {
    return false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (adminGuardMsg) adminGuardMsg.hidden = false;
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
    return;
  }
  const ok = await isAdminUser(user);
  if (!ok) {
    alert('هذا الحساب ليس أدمن. سيتم تسجيل الخروج.');
    await signOut(auth);
    window.location.href = 'login.html';
    return;
  }
  subscribeFirstPage();
  refreshStats();
});

signOutBtn?.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'login.html';
});


/* ====== Referrals List Block (Direct Invites) — يظهر تحت "إدارة المستخدمين" ====== */
(function(){
  // Helpers
  function h(tag, attrs={}, ...children){
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})){
      if(k==='class') el.className = v;
      else if(k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if(v!==undefined && v!==null) el.setAttribute(k, v);
    }
    for(const c of children){
      if(c==null) continue;
      el.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function displayName(u){
    return u.firstName || u.displayName || (u.email ? u.email.split('@')[0] : 'مستخدم');
  }

  // UI injection (تحت كارت إدارة المستخدمين)
  const container = document.querySelector('main.container');
  const usersCard = container?.querySelector('.card:not(.warning)'); // "إدارة المستخدمين"
  if (!usersCard) return;

  let refCard = document.getElementById('referralsListCard');
  if (!refCard) {
    refCard = h('section', { id:'referralsListCard', class:'card' },
      h('h2', null, 'قائمة الدعوات (مباشرة)'),
      h('div', { class:'toolbar', style:'margin-bottom:10px' },
        h('div', { class:'search' },
          h('input', { id:'rl_search', type:'text', placeholder:'ابحث عن شخص أساسي بالاسم/البريد/UID/ID المُولّد' }),
          h('button', { id:'rl_clear', class:'btn btn-ghost' }, 'مسح')
        ),
        h('div', null),
        h('label', null,
          h('input', { id:'rl_showEmpty', type:'checkbox' }),
          ' عرض الجميع (حتى من ليس لديهم مدعوين)'
        ),
      ),
      h('div', { id:'rl_body' }, 'جارِ التحميل…')
    );
    usersCard.after(refCard);
  }

  const rlBody      = refCard.querySelector('#rl_body');
  const rlSearch    = refCard.querySelector('#rl_search');
  const rlClear     = refCard.querySelector('#rl_clear');
  const rlShowEmpty = refCard.querySelector('#rl_showEmpty');

  // Data
  let allUsers = [];
  let childrenMap = new Map(); // inviterUid -> [invitee user objects]
  let withChildren = [];       // users who have invitees

  async function loadUsers(){
    // نفس الـ DB الموجود في ملفك (متوفر فوق)
    const { getDocs, collection, query, orderBy } =
      await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qy);
    const arr = [];
    snap.forEach(d => arr.push({ uid:d.id, ...d.data() }));
    return arr;
  }

  function indexUsers(users){
    const byUid = new Map();
    childrenMap = new Map();
    users.forEach(u => byUid.set(u.uid, u));
    users.forEach(u => {
      if (u.invitedByUid){
        const invs = childrenMap.get(u.invitedByUid) || [];
        invs.push(u);
        childrenMap.set(u.invitedByUid, invs);
      }
    });
    withChildren = users.filter(u => (childrenMap.get(u.uid)?.length || 0) > 0);
    return { byUid };
  }

  function renderList(){
    const term = (rlSearch?.value || '').trim().toLowerCase();
    const includeEmpty = rlShowEmpty?.checked;
    const base = includeEmpty ? allUsers : withChildren;

    const filtered = base.filter(u => {
      if (!term) return true;
      const rid = u.referralId || (u.uid ? ('EW-' + u.uid.slice(0,6).toUpperCase()) : '');
      const hay = [displayName(u), u.email, u.uid, rid].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(term);
    });

    rlBody.innerHTML = '';
    if (!filtered.length){ rlBody.textContent = 'لا توجد نتائج.'; return; }

    const frag = document.createDocumentFragment();
    filtered.forEach(u => {
      const kids = childrenMap.get(u.uid) || [];

      // عنوان الشخص الأساسي
      const header = h('div', { class:'muted', style:'font-weight:900;margin:6px 0' },
        displayName(u)
      );

      // قائمة مرقّمة 1،2،3… بأسماء المدعوين المباشرين فقط
      const ol = h('ol', { style:'margin:4px 0 10px 18px' });
      kids.forEach((k) => {
        ol.append(h('li', null, displayName(k)));
      });

      if (kids.length === 0){
        if (includeEmpty){
          frag.append(
            header,
            h('div', { class:'muted', style:'margin-inline-start:6px' }, '— لا يوجد مدعوين'),
            h('hr', { style:'border-color:var(--border);opacity:.3' })
          );
        }
      } else {
        frag.append(header, ol, h('hr', { style:'border-color:var(--border);opacity:.3' }));
      }
    });
    rlBody.append(frag);
  }

  async function bootReferralsBlock(){
    try{
      rlBody.textContent = 'جارِ التحميل…';
      allUsers = await loadUsers();
      indexUsers(allUsers);
      renderList();
    }catch(e){
      console.error(e);
      rlBody.textContent = 'تعذّر تحميل قائمة الدعوات.';
    }
  }

  // تفاعل البحث والخيارات
  rlSearch?.addEventListener('input', renderList);
  rlClear?.addEventListener('click', () => { if (rlSearch) rlSearch.value = ''; renderList(); });
  rlShowEmpty?.addEventListener('change', renderList);

  // نستخدم نفس الـ Admin Guard الموجود عندك — هنشتغل بعد ما الأدمن يتأكد
  // نضيف مستمع Auth مستقل (لا يغيّر أي لوجيك سابق)
  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").then(({ onAuthStateChanged })=>{
    onAuthStateChanged(auth, async (user)=>{
      if(!user) { refCard.hidden = true; return; }
      try{
        // نعيد استخدام isAdminUser لو موجود (من الملف الأصلي)
        if (typeof isAdminUser === 'function') {
          const ok = await isAdminUser(user);
          if (!ok) { refCard.hidden = true; return; }
        }
        refCard.hidden = false;
        bootReferralsBlock();
      }catch{
        refCard.hidden = true;
      }
    });
  });
})();


/* ====== Orientation handling (phone/tablet) ====== */
const FORCE_LANDSCAPE = true; // غيّرها لـ false لو عايز خيار B (ملء العرض) بدل إجبار الدوران

function buildRotateOverlay(){
  const el = document.createElement('div');
  el.id = 'rotateOverlay';
  el.innerHTML = `
    <div class="box">
      <h3>لأفضل عرض</h3>
      <p>من فضلك لف جهازك للوضع الأفقي. بإمكانك أيضًا الضغط أدناه للمحاولة تلقائيًا.</p>
      <button class="btn" id="lockLandscapeBtn">تفعيل العرض الأفقي</button>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

async function tryLockLandscape(){
  try {
    // بعض المتصفحات تشترط الدخول في وضع ملء الشاشة قبل قفل الاتجاه
    if (!document.fullscreenElement && document.documentElement.requestFullscreen){
      await document.documentElement.requestFullscreen().catch(()=>{});
    }
    if (screen.orientation && screen.orientation.lock){
      await screen.orientation.lock('landscape');
    }
  } catch(e){ /* تجاهل */ }
}

function landscapeNeeded(){
  // نعتبر الأجهزة الصغيرة أقل من 1024px
  const smallSide = Math.min(window.innerWidth, window.innerHeight);
  return smallSide < 1024 && window.matchMedia('(orientation: portrait)').matches;
}

function setupOrientationFlow(){
  if (!FORCE_LANDSCAPE) return;

  const overlay = document.getElementById('rotateOverlay') || buildRotateOverlay();
  const show = () => overlay.style.display = 'grid';
  const hide = () => overlay.style.display = 'none';

  const update = () => {
    if (landscapeNeeded()) show(); else hide();
  };

  // زر التجربة اليدوية
  overlay.querySelector('#lockLandscapeBtn')?.addEventListener('click', async () => {
    await tryLockLandscape();
    // إن تم القفل أو لف المستخدم الجهاز، نخفي الـ overlay
    if (!landscapeNeeded()) overlay.style.display = 'none';
  });

  // راقب تغيّر الاتجاه والحجم
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update);

  // تشغيل أول مرة
  update();
}

document.addEventListener('DOMContentLoaded', setupOrientationFlow);
