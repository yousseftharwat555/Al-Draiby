const admin = require('firebase-admin');

admin.initializeApp({
  // لو شغّال من جهازك ومُسجّل بـ firebase login، تقدر تسيبها فاضية
  // أو استخدم service account JSON لو عندك
});

async function main() {
  const email = 'ytrfuturedevelopers@gmail.com'; // <-- غيّر ده لإيميلك
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
  console.log('✅ تم تعيين الدور admin لـ', email, 'UID:', user.uid);
}
main().catch(e=>{ console.error(e); process.exit(1); });
