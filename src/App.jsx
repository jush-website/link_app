import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Globe, Link as LinkIcon, AlignLeft, Bookmark, LogOut, User, AlertCircle, ArrowRight } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// 1. 刪除原本的 getSafeFirebaseConfig 函數，直接貼上您從 Firebase 控制台複製的設定檔
const firebaseConfig = {
  apiKey: "AIzaSyBoJ_uCgQhXi2YvleASpBGl4G8E5g8nIUM",
  authDomain: "link-4339d.firebaseapp.com",
  projectId: "link-4339d",
  storageBucket: "link-4339d.firebasestorage.app",
  messagingSenderId: "1033240032653",
  appId: "1:1033240032653:web:949e87e2a492bfbfae79c4",
  measurementId: "G-9LVYQ90N1T"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// 2. 給您的應用程式一個固定的 ID (用作資料庫資料夾名稱)
const appId = 'my-shortcut-app';

export default function App() {
  // 捷徑資料
  const [links, setLinks] = useState([]);
  
  // 錯誤訊息狀態
  const [errorMessage, setErrorMessage] = useState("");

  // 樣式與畫面狀態
  const [isStylesLoaded, setIsStylesLoaded] = useState(false);
  const [showMainApp, setShowMainApp] = useState(false);
  
  // 新增：追蹤 Firebase 驗證是否回應完畢 (無論成功或失敗)
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  // 登入狀態管理
  const [user, setUser] = useState(null);

  // 控制 Modal (彈出視窗) 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' 或 'edit'
  
  // 表單輸入狀態
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ title: '', url: '', description: '' });

  // 處理 Firebase 驗證狀態
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth init error:", error);
        setErrorMessage("無法連線至驗證伺服器，您目前處於離線體驗模式。");
        setIsAuthLoaded(true); // 如果連線失敗，也要強制解除載入畫面
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoaded(true); // 伺服器回應了，解除載入畫面
      
      // 如果使用者已經正式登入過 (非匿名)，則自動進入主畫面
      if (currentUser && !currentUser.isAnonymous) {
        setShowMainApp(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // 監聽 Firestore 資料變化
  useEffect(() => {
    if (!user) return;

    try {
      // 使用安全的路徑結構來儲存使用者的專屬資料
      const linksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'links');
      
      const unsubscribe = onSnapshot(linksRef, (snapshot) => {
        const fetchedLinks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // 在記憶體中進行排序 (依建立時間反序，最新的在前面)
        fetchedLinks.sort((a, b) => b.createdAt - a.createdAt);
        setLinks(fetchedLinks);
      }, (error) => {
        console.error("讀取資料失敗:", error);
        if (showMainApp) {
          setErrorMessage("無法讀取資料，請檢查資料庫權限設定或網路連線。");
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Firestore 監聽設定失敗:", error);
    }
  }, [user, showMainApp]);

  // 動態載入 Tailwind CSS 樣式
  useEffect(() => {
    if (window.tailwind) {
      setIsStylesLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.onload = () => setIsStylesLoaded(true);
    script.onerror = () => {
      console.error("Tailwind 載入失敗");
      setIsStylesLoaded(true); // 避免卡在載入畫面
    };
    document.head.appendChild(script);
  }, []);

  // Modal 相關操作函數
  const openAddModal = () => {
    setModalMode('add');
    setFormData({ title: '', url: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (link, e) => {
    e.stopPropagation(); // 避免觸發外層的連結跳轉
    setModalMode('edit');
    setCurrentId(link.id);
    setFormData({ title: link.title, url: link.url, description: link.description || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Google 登入處理
  const handleGoogleLogin = async () => {
    try {
      setErrorMessage("");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowMainApp(true); // 登入成功後進入主畫面
    } catch (error) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setErrorMessage("登入失敗：目前網域未經授權。請將此網址的網域加入 Firebase 控制台的「Authentication > 設定 > 已授權網域」清單中。");
      } else if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMessage("登入過程中發生錯誤，請稍後再試。");
      }
    }
  };

  // 登出處理
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowMainApp(false); // 退回登入畫面
      await signInAnonymously(auth); // 確保退回預設的匿名登入狀態
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // 儲存捷徑 (新增或修改，寫入 Firestore)
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.url.trim() || !user) return;

    // 簡單確保網址有 http/https 前綴
    let finalUrl = formData.url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      if (modalMode === 'add') {
        const newLink = {
          title: formData.title.trim(),
          url: finalUrl,
          description: formData.description.trim(),
          createdAt: Date.now()
        };
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'links'), newLink);
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', currentId), {
          title: formData.title.trim(),
          url: finalUrl,
          description: formData.description.trim()
        });
      }
      closeModal();
    } catch (error) {
      console.error("儲存失敗:", error);
      setErrorMessage("儲存失敗，請檢查權限或網路連線。");
    }
  };

  // 刪除捷徑 (從 Firestore 刪除)
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // 避免觸發外層的連結跳轉
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', id));
    } catch (error) {
      console.error("刪除失敗:", error);
      setErrorMessage("刪除失敗，請檢查權限或網路連線。");
    }
  };

  // 在樣式或 Firebase 載入完成前，顯示不依賴 Tailwind 的純內聯樣式載入畫面
  // 將 !user 改為 !isAuthLoaded
  if (!isStylesLoaded || !isAuthLoaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', color: '#475569', fontWeight: 500, letterSpacing: '0.5px' }}>系統介面載入中...</p>
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  // 共用的錯誤提示元件
  const ErrorToast = () => (
    errorMessage && (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-in slide-in-from-top-4 fade-in duration-300">
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-lg shadow-rose-500/10 flex items-start gap-3">
          <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-rose-800">系統提示</h3>
            <p className="text-sm text-rose-600 mt-1 leading-relaxed">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-rose-400 hover:text-rose-600 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>
    )
  );

  // --- 畫面 1：精緻登入畫面 ---
  if (!showMainApp) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
        {/* 背景流體裝飾與動畫設定 */}
        <style>
          {`
            @keyframes blob {
              0% { transform: translate(0px, 0px) scale(1); }
              33% { transform: translate(30px, -50px) scale(1.1); }
              66% { transform: translate(-20px, 20px) scale(0.9); }
              100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob { animation: blob 7s infinite; }
            .animation-delay-2000 { animation-delay: 2s; }
            .animation-delay-4000 { animation-delay: 4s; }
          `}
        </style>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>

        <ErrorToast />

        {/* 登入卡片本體 */}
        <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white max-w-md w-full relative z-10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <Bookmark size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">常用捷徑管理</h1>
          <p className="text-slate-500 mb-10 font-medium leading-relaxed">
            集中管理您最愛的網站連結。<br className="hidden sm:block" />登入以啟用跨裝置雲端同步。
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin} 
              className="group w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-indigo-100 hover:bg-slate-50 px-6 py-3.5 rounded-2xl text-slate-700 font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 帳號登入
            </button>

            <button 
              onClick={() => setShowMainApp(true)} 
              className="group w-full flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 px-6 py-3 rounded-2xl font-medium transition-colors"
            >
              先以訪客身分體驗
              <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 畫面 2：主應用程式畫面 ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20 animate-in fade-in duration-500">
      {/* 頂部裝飾背景 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-10 pointer-events-none"></div>

      <ErrorToast />

      <div className="max-w-5xl mx-auto px-6 pt-16 relative z-10">
        
        {/* 標題列 */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-10">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">我的常用捷徑</h1>
              <p className="text-slate-500 font-medium">目前共收錄了 {links.length} 個實用連結</p>
            </div>
            
            {/* 使用者登入狀態區塊 */}
            <div className="flex items-center">
              {user && !user.isAnonymous ? (
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <User size={14} />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">{user.displayName || '使用者'}</span>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors" title="登出">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-indigo-200 transition-all text-sm font-medium text-slate-700"
                  title="登入以啟用雲端同步"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  升級為正式帳號
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={openAddModal}
            className="group flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 sm:py-2.5 rounded-full font-medium hover:bg-indigo-600 transition-all duration-300 shadow-lg shadow-slate-900/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>新增捷徑</span>
          </button>
        </header>

        {/* 捷徑卡片網格 */}
        {links.length === 0 ? (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-slate-100 border-dashed">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
              <Bookmark size={28} />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">目前沒有任何捷徑</h3>
            <p className="text-slate-500">點擊右上角的按鈕開始新增您的第一個連結吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {links.map(link => (
              <div 
                key={link.id} 
                className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1"
              >
                {/* 編輯/刪除按鈕 */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                  <button 
                    onClick={(e) => openEditModal(link, e)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-indigo-100 transition-all"
                    title="編輯"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(link.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-rose-100 transition-all"
                    title="刪除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* 卡片主體 */}
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block outline-none"
                >
                  <div className="flex items-start gap-4">
                    {/* 圖示區塊 */}
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300 transform group-hover:rotate-3 group-hover:scale-105">
                      <Globe size={22} />
                    </div>
                    
                    {/* 內容區塊 */}
                    <div className="flex-1 min-w-0 pr-14">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {link.title}
                      </h3>
                      <p className="text-sm text-indigo-500/80 truncate mt-0.5 group-hover:text-indigo-500 transition-colors">
                        {link.url.replace(/^https?:\/\//, '')}
                      </p>
                      {link.description && (
                        <p className="text-sm text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                          {link.description}
                        </p>
                      )}
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增/修改彈出視窗 (Modal) */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={closeModal}
        >
          {/* 半透明毛玻璃背景 */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 視窗標題列 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Bookmark size={20} className="text-indigo-500" />
                {modalMode === 'add' ? '新增捷徑' : '修改捷徑'}
              </h2>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 表單內容 */}
            <div className="p-6 space-y-5">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                  網站名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="例如：Google, Figma, 我的部落格..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200 text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                  <LinkIcon size={16} className="text-slate-400" />
                  網址 (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleChange}
                  placeholder="例如：https://..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200 text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                  <AlignLeft size={16} className="text-slate-400" />
                  描述 (選填)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="簡單描述這個網站的用途..."
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-200 text-slate-800 resize-none placeholder:text-slate-400"
                ></textarea>
              </div>
            </div>

            {/* 視窗底部按鈕區塊 */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title.trim() || !formData.url.trim()}
                className="px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all duration-200"
              >
                {modalMode === 'add' ? '儲存捷徑' : '確認修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
