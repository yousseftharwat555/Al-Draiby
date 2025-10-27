// login.js — نسخة أكثر صلابة ورسائل أوضح
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const form     = document.getElementById('loginForm');
const lmsg     = document.getElementById('lmsg');
const loginBtn = document.getElementById('loginBtn');

const emailKey = (e)=> (e || '').trim().toLowerCase();

function setBusy(b){
  loginBtn.disabled = b;
  loginBtn.textContent = b ? 'جارٍ الدخول...' : 'دخول';
}

onAuthStateChanged(auth, (user)=>{
  if(user) location.href = 'profile.html';
});

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  lmsg.textContent = '';
  setBusy(true);

  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;

  if(!email || !pass){
    lmsg.textContent = 'من فضلك أدخل البريد وكلمة المرور.';
    setBusy(false);
    return;
  }

  try{
    // 1) فحص البريد المحظور — لا تُسقط العملية لو الصلاحيات منعت القراءة
    try{
      const blocked = await getDoc(doc(db,'blockedEmails', emailKey(email)));
      if(blocked.exists()){
        lmsg.textContent = 'هذا البريد محظور من استخدام المنصة.';
        setBusy(false);
        return;
      }
    }catch(readErr){
      // لو permission-denied أو أي خطأ قراءة → نتجاهله ونكمل
      console.warn('[blockedEmails] skip check:', readErr?.code || readErr);
    }

    // 2) تسجيل الدخول
    await signInWithEmailAndPassword(auth, email, pass);

    // 3) بعد الدخول افحص حالة الحساب
    const u = auth.currentUser;
    if(u){
      const snap = await getDoc(doc(db,'users', u.uid));
      if(snap.exists() && snap.data().status === 'blocked'){
        lmsg.textContent = 'تم حظر حسابك. تواصل مع الدعم.';
        await signOut(auth);
        setBusy(false);
        return;
      }
    }

    location.href = 'profile.html';
  }catch(err){
    console.error(err);
    // تغطية أوسع لأكواد الأخطاء الشائعة
    const map = {
      'auth/invalid-email': 'صيغة البريد غير صحيحة.',
      'auth/user-not-found': 'لا يوجد حساب بهذا البريد.',
      'auth/wrong-password': 'كلمة المرور غير صحيحة.',
      'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
      'auth/too-many-requests': 'محاولات كثيرة. حاول لاحقًا.',
      'auth/network-request-failed': 'مشكلة اتصال، تأكد من الشبكة ثم حاول.',
      'auth/operation-not-allowed': 'تسجيل البريد/كلمة المرور غير مُفعّل للمشروع.',
      'auth/app-not-authorized': 'التطبيق غير مصرح له لهذا المشروع.',
      'auth/invalid-api-key': 'مفتاح الـAPI غير صحيح في الإعدادات.',
      'permission-denied': 'لا تملك صلاحية لهذه العملية.'
    };
    lmsg.textContent = map[err.code] || 'تعذّر تسجيل الدخول الآن.';
  }finally{
    setBusy(false);
  }
});
