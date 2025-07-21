import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import {
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from '@/lib/firebase';
import { Theme, StickyNote, Connection } from '@/types';

export interface UserData {
  themes: Theme[];
  currentThemeId: string | null;
  notes: StickyNote[];
  connections: Connection[];
  lastModified: unknown; // Firestore Timestamp
  userId: string;
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

class FirebaseService {
  private currentUser: User | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    // 監聽認證狀態變化
    if (isFirebaseConfigured && auth) {
      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
      });
    }
  }

  // 檢查 Firebase 是否已配置
  private checkFirebaseConfig(): void {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase 未配置，請檢查環境變數');
    }
  }


  // 匿名登入（帶重試機制和診斷）
  async signInAnonymously(): Promise<User> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase 未配置，無法進行身份驗證');
    }
    
    // 簡化診斷，避免 CORS 問題
    console.log('🔧 Firebase 連線嘗試開始');
    console.log('📋 配置檢查: Project ID =', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    
    if (!navigator.onLine) {
      throw new Error('檢測到網路連線問題，請檢查網路設定');
    }
    
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`嘗試匿名登入... (${attempt}/${maxRetries})`);
        const result = await signInAnonymously(auth!);
        this.currentUser = result.user;
        console.log(`匿名登入成功 (嘗試 ${attempt}/${maxRetries})`, {
          uid: result.user.uid,
          isAnonymous: result.user.isAnonymous
        });
        return result.user;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        interface FirebaseError extends Error {
          code: string;
        }
        const errorData = error instanceof Error && 'code' in error ? error as FirebaseError : { code: 'unknown', message: String(error) };
        console.warn(`匿名登入失敗 (嘗試 ${attempt}/${maxRetries}):`, {
          code: errorData?.code || 'unknown',
          message: errorData?.message || String(error),
          details: error
        });
        
        // 如果是網路錯誤，等待後重試
        if (errorData?.code === 'auth/network-request-failed' && attempt < maxRetries) {
          const waitTime = attempt * 2000; // 2秒, 4秒, 6秒
          console.log(`等待 ${waitTime}ms 後重試...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // 如果不是網路錯誤或已達最大重試次數，直接拋出錯誤
        break;
      }
    }
    
    // 記錄詳細的診斷信息
    interface FirebaseError extends Error {
      code: string;
    }
    const errorData = lastError && lastError instanceof Error && 'code' in lastError ? lastError as FirebaseError : { code: 'unknown', message: String(lastError) };
    const errorInfo = {
      error: {
        code: errorData?.code || 'unknown',
        message: errorData?.message || 'unknown error',
        stack: errorData && 'stack' in errorData ? errorData.stack : undefined,
        fullError: lastError
      },
      environment: {
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        connection: 'connection' in navigator ? (navigator as Navigator & { connection?: NetworkInformation }).connection : undefined,
        timestamp: new Date().toISOString()
      },
      config: {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        isConfigured: isFirebaseConfigured
      }
    };
    
    console.error('匿名登入最終失敗，診斷信息:', errorInfo);
    
    // 提供更詳細的錯誤訊息
    if (errorData?.code === 'auth/network-request-failed') {
      const errorMessage = `網路請求失敗\n\n可能的解決方案：\n1. 檢查防火牆設定\n2. 檢查代理伺服器設定\n3. 嘗試關閉VPN\n4. 檢查DNS設定\n5. 確認 Firebase 專案設定正確`;
      throw new Error(errorMessage);
    }
    
    throw lastError || new Error('Unknown authentication error');
  }

  // 獲取當前用戶
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // 等待用戶認證
  async waitForAuth(): Promise<User> {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase 未配置');
    }

    return new Promise((resolve, reject) => {
      if (this.currentUser) {
        resolve(this.currentUser);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth!, (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        }
      });

      // 如果30秒內沒有認證，嘗試匿名登入
      setTimeout(async () => {
        unsubscribe();
        try {
          const user = await this.signInAnonymously();
          resolve(user);
        } catch (error) {
          reject(error);
        }
      }, 2000);
    });
  }

  // 保存用戶數據到 Firestore
  async saveUserData(data: Omit<UserData, 'lastModified' | 'userId'>): Promise<void> {
    if (!isFirebaseConfigured || !db) {
      throw new Error('Firebase 未配置，無法保存數據');
    }

    try {
      const user = await this.waitForAuth();
      const userDoc = doc(db!, 'users', user.uid);
      
      await setDoc(userDoc, {
        ...data,
        userId: user.uid,
        lastModified: serverTimestamp(),
      }, { merge: true });
      
      console.log('數據保存成功');
    } catch (error) {
      console.error('保存數據失敗:', error);
      throw error;
    }
  }

  // 從 Firestore 讀取用戶數據
  async loadUserData(): Promise<UserData | null> {
    this.checkFirebaseConfig();
    
    try {
      const user = await this.waitForAuth();
      const userDoc = doc(db!, 'users', user.uid);
      const docSnap = await getDoc(userDoc);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserData;
      } else {
        console.log('找不到用戶數據');
        return null;
      }
    } catch (error) {
      console.error('讀取數據失敗:', error);
      throw error;
    }
  }

  // 即時監聽數據變化
  subscribeToUserData(callback: (data: UserData | null) => void): () => void {
    if (!isFirebaseConfigured) {
      // 如果 Firebase 未配置，返回空函數
      return () => {};
    }

    this.waitForAuth().then((user) => {
      const userDoc = doc(db!, 'users', user.uid);
      
      this.unsubscribe = onSnapshot(userDoc, (doc) => {
        if (doc.exists()) {
          callback(doc.data() as UserData);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('即時同步錯誤:', error);
        callback(null);
      });
    }).catch((error) => {
      console.error('認證失敗:', error);
      callback(null);
    });

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    };
  }

  // 停止監聽
  unsubscribeFromUserData(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // 啟用網絡（線上模式）
  async enableNetwork(): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    
    try {
      await enableNetwork(db);
      console.log('網絡已啟用');
    } catch (error) {
      console.error('啟用網絡失敗:', error);
    }
  }

  // 禁用網絡（離線模式）
  async disableNetwork(): Promise<void> {
    if (!isFirebaseConfigured || !db) return;
    
    try {
      await disableNetwork(db);
      console.log('網絡已禁用（離線模式）');
    } catch (error) {
      console.error('禁用網絡失敗:', error);
    }
  }

  // 檢查網絡狀態
  isOnline(): boolean {
    return navigator.onLine;
  }

  // 獲取用戶ID（用於分享）
  getUserId(): string | null {
    return this.currentUser?.uid || null;
  }

}

// 創建單例實例
export const firebaseService = new FirebaseService();