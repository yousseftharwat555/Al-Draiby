import admin from 'firebase-admin';
import fs from 'fs';

// حمِّل مفاتيح الخدمة
const sa = JSON.parse(fs.readFileSync('./serviceAccount.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(sa) });

// ← حط الـUID هنا
const UID = 'JzTyBWiXvCdb2ntDc1QjEVSaHPP2';

await admin.auth().setCustomUserClaims(UID, { admin: true });
console.log('✅ Admin claim set for', UID);
process.exit(0);
