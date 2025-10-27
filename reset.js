import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

const form     = document.getElementById('resetForm');
const rmsg     = document.getElementById('rmsg');
const resetBtn = document.getElementById('resetBtn');

function setBusy(b){ resetBtn.disabled = b; resetBtn.textContent = b ? 'جارٍ الإرسال...' : 'إرسال رابط التغيير'; }

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  rmsg.textContent = '';
  setBusy(true);

  const email = document.getElementById('email').value.trim();
  if(!email){ rmsg.textContent = 'من فضلك أدخل بريدك الإلكتروني.'; setBusy(false); return; }

  try{
    await sendPasswordResetEmail(auth, email, {
      url: 'https://eaglewolf-524ea.web.app/login.html',
      handleCodeInApp: false,
    });
    rmsg.textContent = 'لو البريد مسجّل، هيصلك رابط إعادة تعيين كلمة المرور خلال دقائق. تفقد البريد غير الهام.';
    setTimeout(()=> location.href = 'login.html', 1500);

  }catch(err){
    console.error('Reset error:', err.code, err.message);
    if (err.code === 'auth/invalid-email') {
      rmsg.textContent = 'صيغة البريد غير صحيحة.';
    } else if (err.code === 'auth/network-request-failed') {
      rmsg.textContent = 'مشكلة اتصال. افتح الصفحة عبر سيرفر محلي أو الاستضافة (ليس file://).';
    } else if (err.code === 'auth/invalid-continue-uri') {
      rmsg.textContent = 'رابط الرجوع غير معتمد. أضِف دومين web.app إلى Authorized domains.';
    } else if (err.code === 'auth/missing-continue-uri') {
      rmsg.textContent = 'إعداد رابط الرجوع مفقود.';
    } else if (err.code === 'auth/too-many-requests') {
      rmsg.textContent = 'طلبات كثيرة جدًا. حاول بعد قليل.';
    } else {
      rmsg.textContent = 'تعذّر إرسال البريد الآن.';
    }
    setBusy(false);
  }
});
