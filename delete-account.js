import {
  EmailAuthProvider, reauthenticateWithCredential,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const delBtn   = document.getElementById("deleteBtn");
const delPw    = document.getElementById("delPassword");
const delMsg   = document.getElementById("delMsg");
const pwRow    = document.getElementById("pwRow");

function showDelMsg(t, type=""){ if(delMsg){ delMsg.textContent=t; delMsg.dataset.type=type; } }
function setDelBusy(b){ if(delBtn){ delBtn.disabled=b; delBtn.textContent = b?"جارٍ الحذف…":"حذف الحساب"; } }

if(delBtn){
  delBtn.addEventListener("click", async ()=>{
    const user = auth.currentUser;
    if(!user){ showDelMsg("غير مسجّل دخول.","error"); return; }

    try{
      setDelBusy(true);

      // لو الحساب بالبريد/باسورد → لازم إعادة مصادقة
      const providers = user.providerData.map(p=>p.providerId);
      if (providers.includes("password")){
        const pw = delPw.value.trim();
        if(!pw){ showDelMsg("من فضلك أدخل كلمة المرور.","error"); setDelBusy(false); return; }
        const cred = EmailAuthProvider.credential(user.email, pw);
        await reauthenticateWithCredential(user, cred);
      }

      // احذف وثيقة المستخدم من Firestore
      await deleteDoc(doc(db,"users",user.uid));

      // احذف حسابه من Auth
      await deleteUser(user);

      showDelMsg("تم حذف الحساب بنجاح ✔️","ok");
      // ممكن تعمله تحويل
      setTimeout(()=>location.href="register.html",1200);

    }catch(err){
      console.error(err);
      const map={
        "auth/wrong-password":"كلمة المرور غير صحيحة.",
        "auth/invalid-credential":"بيانات إعادة المصادقة غير صحيحة.",
        "auth/requires-recent-login":"سجّل الدخول من جديد ثم حاول الحذف.",
      };
      showDelMsg(map[err.code]||"غير قادر على حذف الحساب الآن.","error");
    }finally{
      setDelBusy(false);
    }
  });
}
