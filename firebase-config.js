// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

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

// أنشئ التطبيق مرّة واحدة فقط
export const app = initializeApp(firebaseConfig);
