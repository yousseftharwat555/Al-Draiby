import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Elements
const emsg = document.getElementById('emsg');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

const firstNameEl = document.getElementById('firstName');
const emailEl     = document.getElementById('email');
const phoneEl     = document.getElementById('phone');
const govEl       = document.getElementById('gov');

function setGenderDisabled(disabled){
  document.querySelectorAll('input[name="gender"]').forEach(r=>{ r.disabled = disabled; });
}
// اقفل النوع افتراضيًا (عشان يظهر الرمز الحالي فقط)
setGenderDisabled(true);

function enableField(key){
  if(key === 'firstName') firstNameEl.disabled = false;
  else if(key === 'phone') phoneEl.disabled = false;
  else if(key === 'gov')   govEl.disabled = false;
  else if(key === 'gender') setGenderDisabled(false);
}

// أزرار التعديل
Array.from(document.querySelectorAll('[data-edit]')).forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const key = btn.getAttribute('data-edit');
    enableField(key);
    if(key==='gender') return; // لا نستخدم focus مع الراديو
    const el = ({firstName:firstNameEl, phone:phoneEl, gov:govEl})[key];
    el?.focus();
  });
});

// تحميل البيانات
let currentUid = null;
onAuthStateChanged(auth, async (user)=>{
  if(!user){ location.href = 'login.html'; return; }
  currentUid = user.uid;
  emailEl.value = user.email || '';

  try{
    const snap = await getDoc(doc(db,'users', user.uid));
    const d = snap.exists() ? snap.data() : {};
    firstNameEl.value = d.firstName || '';
    phoneEl.value     = d.phone || '';
    if(d.governorate) govEl.value = d.governorate;
    if(d.gender){
      const r = document.querySelector(`input[name="gender"][value="${d.gender}"]`);
      if(r) r.checked = true;
    }
  }catch(e){ emsg.textContent = 'تعذّر تحميل البيانات.'; }
});

function validate(){
  if(!firstNameEl.value.trim()) return 'أدخل الاسم.';
  if(!phoneEl.value.trim())     return 'أدخل رقم التلفون.';
  if(!govEl.value)              return 'اختر المحافظة.';
  const g = document.querySelector('input[name="gender"]:checked');
  if(!g)                        return 'اختر النوع.';
  return '';
}

saveBtn?.addEventListener('click', async ()=>{
  emsg.textContent = '';
  const err = validate();
  if(err){ emsg.textContent = err; return; }
  if(!currentUid){ emsg.textContent = 'من فضلك سجّل الدخول أولاً.'; return; }

  saveBtn.disabled = true; saveBtn.textContent = 'جارٍ الحفظ...';
  try{
    const gender = document.querySelector('input[name="gender"]:checked')?.value || '';
    await setDoc(doc(db,'users', currentUid), {
      firstName: firstNameEl.value.trim(),
      phone: phoneEl.value.trim(),
      governorate: govEl.value,
      gender
    }, { merge:true });

    emsg.textContent = 'تم حفظ التعديلات بنجاح.';
    setTimeout(()=> location.href = 'profile.html', 700);
  }catch(e){
    console.error(e);
    emsg.textContent = 'تعذّر حفظ التعديلات.';
  }finally{
    saveBtn.disabled = false; saveBtn.textContent = 'حفظ';
  }
});

cancelBtn?.addEventListener('click', ()=>{ location.href = 'profile.html'; });
