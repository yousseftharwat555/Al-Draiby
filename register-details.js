// register-details.js — استكمال البيانات + إنشاء/تحديث وثيقة codes/{referralId} مع ownerName/ownerEmail
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let currentUid = null;
onAuthStateChanged(auth, (user)=>{
  if(!user){ location.href = 'register.html'; return; }
  currentUid = user.uid;
});

const form = document.getElementById('detailsForm');
const dmsg = document.getElementById('dmsg');

// توليد referralId بدون أي استعلام
function myReferralFromUid(uid){ return "EW-" + (uid||"").slice(0,6).toUpperCase(); }

// تحليل حقل كود الدعوة
function parseReferralInput(raw){
  const code = (raw || "").trim().toUpperCase();
  if(!code) return { inviterUid:null, inviterReferralId:null };

  // UID
  const UID_RE = /^[A-Za-z0-9_-]{20,}$/;
  if(UID_RE.test(code)) return { inviterUid: code, inviterReferralId: null };

  // كود بالشكل EW-XXXXXX
  const RID_RE = /^EW-[A-Z0-9]{6}$/;
  if(RID_RE.test(code)) return { inviterUid: null, inviterReferralId: code };

  return { inviterUid:null, inviterReferralId:null, invalid:true };
}

// اسم افتراضي ذكي لو الاسم فاضي
function deriveOwnerName(firstName, email){
  if (firstName && firstName.trim()) return firstName.trim();
  if (email && email.includes("@")) return email.split("@")[0];
  return "مستخدم";
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(!currentUid){ dmsg.textContent = 'من فضلك سجّل الدخول أولاً.'; return; }

  const firstName  = document.getElementById('firstName').value.trim();
  const fatherName = document.getElementById('fatherName').value.trim();
  const phone      = document.getElementById('phone').value.trim();
  const gov        = document.getElementById('gov').value;
  const refRaw     = document.getElementById('refCode')?.value || '';
  const genderEl   = document.querySelector('input[name="gender"]:checked');
  const gender     = genderEl ? genderEl.value : "";

  if(!firstName || !fatherName || !phone || !gov || !gender){
    dmsg.textContent = 'من فضلك اكمل جميع الحقول واختر النوع.';
    return;
  }

  try{
    await auth.currentUser.getIdToken(true);

    const mySnap   = await getDoc(doc(db, 'users', currentUid));
    const existing = mySnap.exists() ? mySnap.data() : {};

    const myReferralId = existing.referralId || myReferralFromUid(currentUid);

    // فك حقل الدعوة بدون أي قراءات/Queries
    const parsed = parseReferralInput(refRaw);
    if(parsed.invalid){
      dmsg.textContent = 'تنبيه: صيغة كود/UID الدعوة غير صحيحة. تم حفظ بياناتك بدون ربط.';
    }

    const payload = {
      firstName, fatherName, phone, governorate: gov,
      gender,
      email: auth.currentUser.email,
      referralId: myReferralId,
      createdAt: mySnap.exists() ? (existing.createdAt || serverTimestamp()) : serverTimestamp()
    };

    // لا نعدّل role/status لو موجودين
    if(!('role' in existing))   payload.role   = 'student';
    if(!('status' in existing)) payload.status = 'active';

    // ربط الدعوة (مرة واحدة فقط)
    if(!existing.invitedByUid){
      if(parsed.inviterUid){
        payload.invitedByUid = parsed.inviterUid;
        payload.invitedAt = serverTimestamp();
      }else if(parsed.inviterReferralId){
        payload.invitedByReferralId = parsed.inviterReferralId;
        payload.invitedAt = serverTimestamp();
      }
    }

    // 1) حفظ بيانات المستخدم
    await setDoc(doc(db, 'users', currentUid), payload, { merge:true });

    // 2) إنشاء/تأكيد وثيقة الكود في مجموعة codes/{referralId} + تخزين اسم/إيميل المالك للعرض العام
    try{
      const codeRef = doc(db, 'codes', myReferralId);
      const codeSnap = await getDoc(codeRef);

      const ownerName  = deriveOwnerName(firstName, auth.currentUser.email);
      const ownerEmail = auth.currentUser.email || '';

      if (!codeSnap.exists()) {
        await setDoc(codeRef, {
          ownerUid: currentUid,
          isActive: true,
          usageCount: 0,
          createdAt: serverTimestamp(),
          // معلومات العرض (يُقرأها الجميع من صفحة الدعوة)
          ownerName,
          ownerEmail
          // (اختياري) maxUses: 0
        }, { merge: true });
      } else {
        // تأكيد الملكية + ضمان وجود بيانات العرض (لا نلمس usageCount)
        await setDoc(codeRef, {
          ownerUid: currentUid,
          isActive: true,
          ownerName,
          ownerEmail
        }, { merge: true });
      }
    }catch(e){ console.warn('ensure code doc failed', e); }

    dmsg.textContent = 'تم حفظ البيانات بنجاح.';
    setTimeout(()=> location.href = 'profile.html', 700);

  }catch(err){
    console.error(err);
    dmsg.textContent = err.message || 'حصل خطأ أثناء الحفظ';
  }
});
