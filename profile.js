// profile.js — نسخة آمنة وتعرض الداعي للمستخدم العادي عبر codes/{refId}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, deleteDoc,
  collection, getDocs, query, where, collectionGroup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ========== Helpers ========== */
function showToast(text){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = text;
  t.setAttribute('aria-hidden','false');
  t.classList.add('show');
  setTimeout(()=>{
    t.classList.remove('show');
    t.setAttribute('aria-hidden','true');
  },1400);
}
function fmtDateAr(d){
  try{ return new Date(d).toLocaleString('ar-EG'); }catch{ return '—'; }
}
function el(tag, { className, text, attrs } = {}, ...children){
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(typeof text === 'string') node.textContent = text;
  if(attrs){ for(const [k,v] of Object.entries(attrs)) node.setAttribute(k, v); }
  children.filter(Boolean).forEach(c => node.append(c));
  return node;
}

/* ========== Firebase ========== */
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
const db   = getFirestore(app);

/* ========== DOM refs ========== */
const headerArea = document.getElementById('headerArea');
const pmsg       = document.getElementById('pmsg');
const logoutBtn  = document.getElementById('logoutBtn');
const deleteBtn  = document.getElementById('deleteBtn');

const editGroup   = document.querySelector('.ios-group a[href="profile-edit.html"]')?.closest('.ios-group');
const notificationsGroup = document.getElementById('notificationsGroup');
const accountGroup = document.getElementById('accountGroup');
const footerWrap  = document.querySelector('.ios-footer');
const avatarEl    = document.querySelector('.ios-avatar');

/* ========== Logged-out ========== */
function renderLoggedOut(){
  document.body.classList.add('logged-out');
  if (avatarEl) avatarEl.style.display = 'none';
  if (editGroup)          editGroup.style.display = 'none';
  if (notificationsGroup) notificationsGroup.style.display = 'none';
  if (accountGroup)       accountGroup.style.display = 'none';
  if (footerWrap)         footerWrap.style.display = 'none';

  if(headerArea){
    const actions = el('div', { className:'auth-actions' });
    const loginA  = el('a', { attrs:{ href:'login.html' }, className:'btn-primary', text:'تسجيل الدخول' });
    const regA    = el('a', { attrs:{ href:'register.html' }, className:'btn-outline', text:'إنشاء حساب' });
    actions.append(loginA, regA);
    headerArea.replaceChildren(actions);
  }

  if (logoutBtn){ logoutBtn.disabled = true; logoutBtn.style.opacity = .6; }
  if (deleteBtn){ deleteBtn.disabled = true; deleteBtn.style.opacity = .6; }
}

/* ========== Logged-in ========== */
function renderLoggedIn(user, data){
  document.body.classList.remove('logged-out');
  if (avatarEl) avatarEl.style.display = '';

  const name   = data?.firstName || (user.email?.split('@')[0]) || 'مستخدم';
  const rid    = data?.referralId || (user.uid ? 'EW-' + user.uid.slice(0,6).toUpperCase() : '-');
  const email  = user.email || '';
  const role   = data?.role || 'student';
  const status = data?.status || 'active';
  const last   = user?.metadata?.lastSignInTime ? fmtDateAr(user.metadata.lastSignInTime) : '—';

  if(headerArea){
    const wrap   = el('div');

    const hello  = el('div', { className:'hello', text:`مرحبًا، ${name}` });
    const mail   = el('div', { className:'email-line', text: email });

    const idLine = el('div', { className:'id-line' });
    const idTxt  = el('span', { className:'hint-row' });
    const idStrong = el('strong', { attrs:{ id:'ridVal' }, text: rid });
    idTxt.append('ID: ', idStrong);
    const copyBtn = el('button', { className:'copy-btn', attrs:{ id:'copyBtn', type:'button', title:'نسخ' } });
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
           viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    idLine.append(idTxt, copyBtn);

    const badges  = el('div', { className:'badges' }); badges.style.display = 'none';
    const b1 = el('span', { className:'badge' }, el('span',{className:'badge-dot'}), el('span',{text:` ${status==='active'?'حساب نشط':status}`}));
    const b2 = el('span', { className:'badge', text:`الدور: ${role==='student'?'طالب':role}`});
    badges.append(b1,b2);

    const lastWrap = el('div', { className:'hint-row', attrs:{ id:'lastLoginInlineWrap' } });
    lastWrap.style.display = 'none';
    const lastSpan = el('span', { attrs:{ id:'lastLoginInline' }, text:last });
    lastWrap.append('آخر تسجيل دخول: ', lastSpan);

    wrap.append(hello, mail, idLine, badges, lastWrap);
    headerArea.replaceChildren(wrap);

    document.getElementById('copyBtn')?.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(rid); showToast('تم نسخ الـ ID'); }
      catch{ showToast('تعذر النسخ، انسخه يدويًا'); }
    });
  }

  const statusBadge = document.getElementById('statusBadge');
  if(statusBadge){ statusBadge.textContent = (status === 'active' ? 'Active' : status); }

  const lastLogin = document.getElementById('lastLogin');
  if(lastLogin){ lastLogin.textContent = last; }

  if (editGroup)          editGroup.style.display = '';
  if (notificationsGroup) notificationsGroup.style.display = '';
  if (accountGroup)       accountGroup.style.display = '';
  if (footerWrap)         footerWrap.style.display = '';
  if (logoutBtn){ logoutBtn.disabled = false; logoutBtn.style.opacity = 1; }
  if (deleteBtn){ deleteBtn.disabled = false; deleteBtn.style.opacity = 1; }

  const missing = [];
  if(!data?.firstName)   missing.push('الاسم');
  if(!data?.phone)       missing.push('رقم التلفون');
  if(!data?.governorate) missing.push('المحافظة');
  if(!data?.gender)      missing.push('النوع');
  if(missing.length){
    showToast('من فضلك استكمل بياناتك: ' + missing.join('، '));
    const titleWrap = document.querySelector('.ios-title-wrap');
    if(titleWrap){
      const banner = el('div', { className:'ios-card' });
      banner.style.cssText = 'padding:12px; margin:8px 0;';
      const left  = el('div');
      const h     = el('div', { text:'بياناتك غير مكتملة' }); h.style.fontWeight = '900';
      const sub   = el('div', { className:'cell-sub', text:`أكمل: ${missing.join('، ')}` });
      left.append(h, sub);
      const btn   = el('a', { className:'btn-primary', attrs:{ href:'profile-edit.html', style:'text-decoration:none;padding:8px 12px;border-radius:10px' }, text:'إكمال الآن' });

      const row   = el('div', { attrs:{ style:'display:flex; align-items:center; gap:10px; justify-content:space-between' } }, left, btn);
      banner.append(row);
      titleWrap.after(banner);
    }
  }
}

/* ========== inviter cell (من وثيقة الكود) ========== */
async function prependInviterCellFromCode(codeId){
  if(!codeId) return;
  const group = document.getElementById('accountGroup');
  if(!group) return;

  // نقرأ codes/{codeId} (مسموح قراءته لأي مستخدم مسجّل)
  const cSnap = await getDoc(doc(db, 'codes', codeId));
  if(!cSnap.exists()) return;

  const c = cSnap.data() || {};
  const who  = c.ownerName  || 'مستخدم';
  const mail = c.ownerEmail || '';
  const ref  = codeId;

  const cell = el('div', { className:'ios-cell' });
  const text = el('div', { className:'cell-text' });
  const t1   = el('div', { className:'cell-title', text:'الداعي' });
  const t2   = el('div', { className:'cell-sub', text: [who, mail, ref].filter(Boolean).join(' — ') });
  text.append(t1, t2);
  const chev = el('span', { className:'cell-chevron', text:'›', attrs:{ 'aria-hidden':'true' } });
  cell.append(text, chev);
  group.prepend(cell);
}

/* ========== Cleanup helpers ========== */
async function deleteUserData(db, uid){
  try{
    const myRefsSnap = await getDocs(collection(db, 'users', uid, 'referrals'));
    await Promise.all(myRefsSnap.docs.map(d => deleteDoc(d.ref)));
  }catch(e){ console.warn('referrals (owned) cleanup warning:', e); }

  try{
    const invitedMeSnap = await getDocs(
      query(collectionGroup(db, 'referrals'), where('inviteeUid','==', uid))
    );
    await Promise.all(invitedMeSnap.docs.map(d => deleteDoc(d.ref)));
  }catch(e){ console.warn('referrals (others) cleanup warning:', e); }

  await deleteDoc(doc(db, 'users', uid));
}

/* ========== Auth state ========== */
onAuthStateChanged(auth, async (user)=>{
  if(!user){ renderLoggedOut(); return; }
  try{
    // ===== فحص حظر بالبريد (اختياري)
    try{
      const k = (user.email || '').trim().toLowerCase();
      if(k){
        const b = await getDoc(doc(db, 'blockedEmails', k));
        if(b.exists()){
          alert('تم حظر حسابك. تواصل مع الدعم.');
          await signOut(auth);
          location.href = 'login.html?blocked=1';
          return;
        }
      }
    }catch(e){ console.warn('blockedEmails check failed', e); }

    const snap = await getDoc(doc(db, 'users', user.uid));
    const data = snap.exists() ? snap.data() : {};
    // ===== فحص حالة الحساب
    if(data?.status === 'blocked'){
      alert('تم حظر حسابك. تواصل مع الدعم.');
      await signOut(auth);
      location.href = 'login.html?blocked=1';
      return;
    }
    renderLoggedIn(user, data);

    // ===== عرض الداعي للمستخدم العادي عبر وثيقة الكود
    try{
      if (data?.invitedByReferralId) {
        await prependInviterCellFromCode(data.invitedByReferralId);
      } else if (data?.invitedByUid && data?.referralId) {
        // fallback قديم: لو ماعندناش invitedByReferralId، جرّب نعرض ref فقط
        await prependInviterCellFromCode(data.referralId);
      }
    }catch(e){ console.warn('inviter info', e); }

  }catch(e){
    console.error(e);
    if(pmsg) pmsg.textContent = 'تعذّر تحميل البيانات.';
  }
});

/* ========== Logout ========== */
logoutBtn?.addEventListener('click', async ()=>{
  const ok = confirm('هل أنت متأكد من تسجيل الخروج؟');
  if(!ok) return;
  try{ await signOut(auth); location.href = 'index.html'; }
  catch(e){ if(pmsg) pmsg.textContent = 'تعذّر تسجيل الخروج الآن.'; }
});

/* ========== Delete account ========== */
deleteBtn?.addEventListener('click', async ()=>{
  const u = auth.currentUser;
  if(!u){ showToast('يجب تسجيل الدخول أولًا'); return; }
  const ok = confirm('سيتم حذف حسابك نهائيًا، هل تريد المتابعة؟');
  if(!ok) return;

  const password = prompt('من فضلك أدخل كلمة السر لتأكيد حذف الحساب:');
  if(!password){ showToast('تم إلغاء العملية'); return; }

  try{
    const cred = EmailAuthProvider.credential(u.email, password);
    await reauthenticateWithCredential(u, cred);
    await deleteUserData(db, u.uid);
    await deleteUser(u);
    showToast('تم حذف الحساب نهائيًا');
    setTimeout(()=> location.href = 'index.html', 800);
  }catch(e){
    console.error(e);
    if(e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'){
      showToast('كلمة السر غير صحيحة');
    }else if(e.code === 'auth/requires-recent-login'){
      showToast('سجّل الدخول من جديد ثم حاول الحذف.');
    }else{
      showToast('تعذّر حذف الحساب الآن.');
    }
  }
});
