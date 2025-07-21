import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "demo-project.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

// 檢查是否配置了真實的 Firebase
const isFirebaseConfigured =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "demo-key";

let app: any = null;
let db: any = null;
let auth: any = null;

try {
  // 只有在配置了真實 Firebase 時才初始化
  if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    // 提供 mock 對象以避免錯誤
    app = null;
    db = null;
    auth = null;
  }
} catch (error) {
  console.warn("Firebase 初始化失敗，將使用離線模式:", error);
  app = null;
  db = null;
  auth = null;
}

export { db, auth, isFirebaseConfigured };

// 開發環境模擬器連接（已停用 - 使用生產環境 Firebase）
// 如需使用模擬器，請取消註解以下程式碼並確保模擬器正在運行
/*
if (process.env.NODE_ENV === "development" && auth && db) {
  try {
    if (auth && !(auth as any).emulatorConfig) {
      connectAuthEmulator(auth, "http://localhost:9099");
    }
  } catch {
    // 忽略重複連接錯誤
  }

  try {
    if (
      db &&
      (db as any)._delegate?._databaseId?.projectId &&
      !(db as any)._delegate._databaseId.projectId.includes("demo-")
    ) {
      connectFirestoreEmulator(db, "localhost", 8080);
    }
  } catch {
    // 忽略重複連接錯誤
  }
}
*/

const firebase = { app, db, auth };
export default firebase;
