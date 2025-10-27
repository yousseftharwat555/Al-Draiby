import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.getElementById('regForm');
const msg  = document.getElementById('msg');
const btn  = document.getElementById('signupBtn');

let busy = false;

function setBusy(b){
  busy = b;
  if(!btn) return;
  btn.disabled = b;
  btn.textContent = b ? 'جارٍ التسجيل...' : 'تسجيل';
}

// منع Enter من إرسال النموذج تلقائيًا
form.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
  }
});

btn.addEventListener('click', async ()=>{
  if(busy) return;
  msg.textContent = '';
  setBusy(true);

  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;
  const conf  = document.getElementById('confirm').value;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRe.test(email)){ msg.textContent = 'أدخل بريدًا صحيحًا.'; setBusy(false); return; }
  if(pass !== conf){ msg.textContent = 'كلمتا المرور غير متطابقتين.'; setBusy(false); return; }
  if(pass.length < 6){ msg.textContent = 'كلمة المرور يجب ألا تقل عن 6 أحرف.'; setBusy(false); return; }

  try{
    await createUserWithEmailAndPassword(auth, email, pass);
    // لا يوجد submit أصلاً، فمفيش reload — نوجّه يدويًا
    location.href = 'register-details.html';
  }catch(err){
    console.error(err);
    if (err.code === 'auth/email-already-in-use') msg.textContent = 'البريد مستخدم بالفعل.';
    else if (err.code === 'auth/invalid-email')   msg.textContent = 'صيغة البريد غير صحيحة.';
    else if (err.code === 'auth/network-request-failed') msg.textContent = 'مشكلة اتصال، حاول من جديد.';
    else msg.textContent = 'حدث خطأ أثناء إنشاء الحساب.';
  }finally{
    setBusy(false);
  }
});
