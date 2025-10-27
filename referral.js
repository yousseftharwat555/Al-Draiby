// referral.js — عرض الداعي من وثيقة الكود + قفل الإدخال بعد الربط
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* Helpers */
const $id = (id) => document.getElementById(id);
const setBusy = (b)=>{ const btn=$id('redeemBtn'); if(btn){ btn.disabled=b; btn.style.opacity=b?.7:1; } };
const showMsg = (t, type='ok') => { const el=$id('msg'); if(el){ el.textContent=t||''; el.dataset.type=type; } };
const norm = (v)=> (v||'').trim().toUpperCase();
const disableControls = (state=true)=>{ 
  const i=$id('inviteCode'), b=$id('redeemBtn'); 
  if(i){ i.disabled=state; } 
  if(b){ b.disabled=state; b.textContent = state ? 'تم الربط' : 'تفعيل الكود'; }
};

/* Firebase init */
(function initFirebase(){
  const cfg = window.FIREBASE_CONFIG || null;
  if(!getApps().length){ initializeApp(cfg || {}); }
})();
const auth = getAuth();
const db   = getFirestore();

let authedUser = null;
onAuthStateChanged(auth, async (u)=>{
  authedUser = u || null;
  if (!u) return;

  // لو الحساب مربوط بالفعل: اعرض بيانات الداعي من codes/{invitedByReferralId} (بدون قراءة users/{uid})
  try{
    const uSnap = await getDoc(doc(db,'users', u.uid));
    if(uSnap.exists()){
      const data = uSnap.data() || {};
      if (data.invitedByUid) {
        // أفضلية استعمال invitedByReferralId إن وجِد
        if (data.invitedByReferralId) {
          await showInviterFromCode(data.invitedByReferralId);
        } else {
          // fallback قديم: هنعرض مجرد "مستخدم" لو مافيش referralId محفوظ
          $id('inviterLine').textContent = 'مستخدم';
          $id('inviterCard')?.classList.add('show');
        }
        showMsg('تم ربط الدعوة بالفعل لهذا الحساب.', 'error');
        disableControls(true);
      }
    }
  }catch{}
});

/* اعرض الداعي انطلاقًا من وثيقة الكود فقط */
async function showInviterFromCode(codeId){
  const inviterCard = $id('inviterCard');
  const inviterLine = $id('inviterLine');
  inviterCard?.classList.remove('show');
  inviterLine && (inviterLine.textContent = '—');

  try{
    const snap = await getDoc(doc(db,'codes', codeId));
    if(!snap.exists()) return;
    const c = snap.data() || {};
    const name = c.ownerName || 'مستخدم';
    const mail = c.ownerEmail || '';
    inviterLine && (inviterLine.textContent = [name, mail].filter(Boolean).join(' — '));
    inviterCard?.classList.add('show');
  }catch{}
}

/* Preview على الكتابة */
let lastPreviewCode = '';
async function previewInviter(code){
  if(!/^EW-[A-Z0-9]{6}$/.test(code)) {
    $id('inviterCard')?.classList.remove('show');
    return;
  }
  await showInviterFromCode(code);
  const btn = $id('redeemBtn');
  if(btn) btn.textContent = 'ربط بالحساب ده';
}

/* تنفيذ الربط */
async function redeem(){
  const user = authedUser || auth.currentUser;
  if(!user){ showMsg('يجب تسجيل الدخول أولًا', 'error'); return; }

  const code = norm($id('inviteCode')?.value || '');
  if(!/^EW-[A-Z0-9]{6}$/.test(code)){
    showMsg('صيغة الكود غير صحيحة (EW-XXXXXX)', 'error');
    return;
  }

  try{
    setBusy(true);
    showMsg('جارِ التحقق من الكود…');

    const codeRef = doc(db, 'codes', code);
    const codeSnap = await getDoc(codeRef);
    if(!codeSnap.exists()){ showMsg('الكود غير موجود', 'error'); return; }

    await runTransaction(db, async (tx)=>{
      const uRef  = doc(db, 'users', user.uid);
      const uSnap = await tx.get(uRef);
      const uData = uSnap.exists() ? uSnap.data() : {};
      if(uData.invitedByUid) throw Object.assign(new Error('ALREADY_LINKED'), { code:'ALREADY_LINKED' });

      const cSnap = await tx.get(codeRef);
      if(!cSnap.exists()) throw Object.assign(new Error('CODE_NOT_FOUND'), { code:'CODE_NOT_FOUND' });
      const c = cSnap.data() || {};
      if(c.isActive === false) throw Object.assign(new Error('CODE_INACTIVE'), { code:'CODE_INACTIVE' });

      const used = typeof c.usageCount === 'number' ? c.usageCount : 0;
      const max  = (typeof c.maxUses === 'number' && c.maxUses > 0) ? c.maxUses : Infinity;
      if(used >= max) throw Object.assign(new Error('CODE_USED_UP'), { code:'CODE_USED_UP' });

      const inviterUid = c.ownerUid || null;
      if(!inviterUid) throw Object.assign(new Error('CODE_NO_OWNER'), { code:'CODE_NO_OWNER' });
      if(inviterUid === user.uid) throw Object.assign(new Error('SELF_INVITE'), { code:'SELF_INVITE' });

      tx.set(uRef, {
        invitedByUid: inviterUid,
        invitedByReferralId: code,           // مهم عشان نقدر نعرض الداعي لاحقًا بدون قراءة users
        referralLinkedAt: serverTimestamp(),
      }, { merge:true });

      tx.update(codeRef, {
        usageCount: used + 1,
        lastRedeemerUid: user.uid,
        lastRedeemedAt: serverTimestamp(),
      });
    });

    await showInviterFromCode(code);  // اعرض الداعي
    disableControls(true);
    showMsg('تم ربط حسابك بالداعي بنجاح 🎉', 'ok');
  }catch(e){
    console.error(e);
    const map = {
      ALREADY_LINKED: 'تم ربط الدعوة بالفعل لهذا الحساب.',
      CODE_NOT_FOUND: 'الكود غير موجود.',
      CODE_INACTIVE: 'الكود غير فعّال.',
      CODE_USED_UP: 'تم استهلاك الكود بالكامل.',
      CODE_NO_OWNER: 'هذا الكود غير مرتبط بمالك.',
      SELF_INVITE: 'لا يمكنك استخدام كودك الشخصي.',
      'permission-denied': 'لا تملك صلاحية لإتمام العملية (Rules).',
    };
    showMsg(map[e.code] || map[e.message] || 'تعذّر إتمام العملية الآن.', 'error');
  }finally{
    setBusy(false);
  }
}

/* Wire up */
function init(){
  const form = $id('referralForm');
  form?.addEventListener('submit', (e)=>{ e.preventDefault(); redeem(); });

  const input = $id('inviteCode');
  input?.addEventListener('input', ()=>{
    input.value = norm(input.value);
    if (input.value !== lastPreviewCode) {
      lastPreviewCode = input.value;
      previewInviter(input.value).catch(()=>{});
    }
  });
}
document.addEventListener('DOMContentLoaded', init);
