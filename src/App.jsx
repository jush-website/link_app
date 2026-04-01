import React, { useState, useEffect } from 'react';
// 1. 移除 Loader2 的匯入，避免版本不支援導致白屏
import { Plus, Edit2, Trash2, X, Globe, Link as LinkIcon, AlignLeft, Bookmark, LogOut, User, AlertCircle, ArrowRight, Folder, FolderPlus, ArrowLeft, MoveRight, FolderOpen, Menu } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Firebase 初始化設定
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
const appId = 'my-shortcut-app';

export default function App() {
  // 核心資料狀態
  const [links, setLinks] = useState([]);
  const [folders, setFolders] = useState([]);
  
  // 系統與驗證狀態
  const [errorMessage, setErrorMessage] = useState("");
  const [isStylesLoaded, setIsStylesLoaded] = useState(false);
  const [showMainApp, setShowMainApp] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [user, setUser] = useState(null);

  // 版面與選單狀態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null); // null 代表首頁
  
  // Modal 視窗狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [linkToMove, setLinkToMove] = useState(null);
  
  // 儲存中狀態
  const [isSaving, setIsSaving] = useState(false);

  // 表單資料
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ title: '', url: '', description: '' });
  const [folderFormData, setFolderFormData] = useState({ name: '' });

  // 拖曳狀態
  const [isDragging, setIsDragging] = useState(false);
  const [draggedLink, setDraggedLink] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  // 1. Firebase 驗證監聽
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoaded(true);
        if (!currentUser.isAnonymous || localStorage.getItem('guest_mode') === 'true') {
          setShowMainApp(true);
        }
      } else {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Auth init error:", error);
          setErrorMessage("無法連線至驗證伺服器，您目前處於離線體驗模式。");
          setIsAuthLoaded(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Firestore 資料監聽
  useEffect(() => {
    if (!user) return;
    try {
      const linksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'links');
      const unsubscribeLinks = onSnapshot(linksRef, (snapshot) => {
        const fetchedLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedLinks.sort((a, b) => b.createdAt - a.createdAt);
        setLinks(fetchedLinks);
      }, () => {
        if (showMainApp) setErrorMessage("無法讀取資料，請檢查網路連線。");
      });

      const foldersRef = collection(db, 'artifacts', appId, 'users', user.uid, 'folders');
      const unsubscribeFolders = onSnapshot(foldersRef, (snapshot) => {
        const fetchedFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedFolders.sort((a, b) => b.createdAt - a.createdAt);
        setFolders(fetchedFolders);
      });

      return () => {
        unsubscribeLinks();
        unsubscribeFolders();
      };
    } catch (error) {
      console.error("Firestore 監聽失敗:", error);
    }
  }, [user, showMainApp]);

  // 3. 樣式載入
  useEffect(() => {
    if (window.tailwind) {
      setIsStylesLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.onload = () => setIsStylesLoaded(true);
    // 即使載入失敗也給予放行，避免永遠卡在載入圈圈
    script.onerror = () => setIsStylesLoaded(true); 
    document.head.appendChild(script);
  }, []);

  // --- 基本操作函數 ---
  const handleGoogleLogin = async () => {
    try {
      setErrorMessage("");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      localStorage.removeItem('guest_mode');
      setShowMainApp(true);
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMessage("登入過程中發生錯誤，請稍後再試。");
      }
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('guest_mode');
      setShowMainApp(false);
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // --- 捷徑 CRUD ---
  const openAddModal = () => {
    setModalMode('add');
    setFormData({ title: '', url: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (link, e) => {
    e.stopPropagation();
    setModalMode('edit');
    setCurrentId(link.id);
    setFormData({ title: link.title, url: link.url, description: link.description || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = async () => {
    // 2. 加入 ?. (Optional Chaining) 安全防護，避免字串未定義時崩潰
    if (!formData.title?.trim() || !formData.url?.trim() || !user) return;
    setIsSaving(true);

    let finalUrl = formData.url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      if (modalMode === 'add') {
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'links'), {
          title: formData.title.trim(),
          url: finalUrl,
          description: formData.description.trim(),
          folderId: currentFolderId || null,
          createdAt: Date.now()
        });
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', currentId), {
          title: formData.title.trim(),
          url: finalUrl,
          description: formData.description.trim()
        });
      }
      closeModal(); // 確保儲存後關閉視窗
    } catch (error) {
      setErrorMessage("儲存失敗，請檢查網路連線。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', id));
    } catch (error) {
      setErrorMessage("刪除失敗。");
    }
  };

  // --- 資料夾 CRUD ---
  const handleSaveFolder = async () => {
    // 加入 ?. 安全防護
    if (!folderFormData.name?.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'folders'), {
        name: folderFormData.name.trim(),
        createdAt: Date.now()
      });
      setIsFolderModalOpen(false);
      setFolderFormData({ name: '' });
    } catch (error) {
      setErrorMessage("新增資料夾失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFolder = async (id, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'folders', id));
      if (currentFolderId === id) setCurrentFolderId(null);
    } catch (error) {
      setErrorMessage("刪除資料夾失敗。");
    }
  };

  // --- 拖曳與移動邏輯 ---
  const handleDragStart = (e, link) => {
    setDraggedLink(link);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(link));
    setTimeout(() => setIsDragging(true), 10);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedLink(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetId) setDragOverTarget(targetId);
  };

  const handleDragLeave = (e, targetId) => {
    e.preventDefault();
    if (dragOverTarget === targetId) setDragOverTarget(null);
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    setIsDragging(false);
    setDragOverTarget(null);
    
    if (!draggedLink || !user || draggedLink.folderId === targetFolderId) {
      handleDragEnd();
      return;
    }

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', draggedLink.id), {
        folderId: targetFolderId
      });
    } catch (error) {
      setErrorMessage("移動捷徑失敗。");
    }
    handleDragEnd();
  };

  const openMoveModal = (link, e) => {
    e.stopPropagation();
    setLinkToMove(link);
    setIsMoveModalOpen(true);
  };

  const handleMoveLink = async (targetFolderId) => {
    if (!linkToMove || !user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'links', linkToMove.id), {
        folderId: targetFolderId
      });
      setIsMoveModalOpen(false);
      setLinkToMove(null);
    } catch (error) {
      setErrorMessage("移動捷徑失敗。");
    }
  };

  // --- 載入畫面 ---
  if (!isStylesLoaded || !isAuthLoaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', color: '#475569', fontWeight: 500 }}>系統介面載入中...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // --- 共用錯誤提示 ---
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

  // --- 畫面 1：登入畫面 ---
  if (!showMainApp) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <style>{`
          @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
          .animate-blob { animation: blob 7s infinite; } .animation-delay-2000 { animation-delay: 2s; } .animation-delay-4000 { animation-delay: 4s; }
        `}</style>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>

        <ErrorToast />

        <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 max-w-md w-full relative z-10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-8 transform -rotate-3 hover:rotate-0 transition-transform">
            <Bookmark size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">常用捷徑管理</h1>
          <p className="text-slate-500 mb-10 font-medium">集中管理您最愛的網站連結。<br className="hidden sm:block" />登入以啟用雲端同步。</p>
          
          <div className="space-y-4">
            <button onClick={handleGoogleLogin} className="group w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 hover:border-indigo-100 px-6 py-3.5 rounded-2xl text-slate-700 font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 帳號登入
            </button>
            <button onClick={() => { localStorage.setItem('guest_mode', 'true'); setShowMainApp(true); }} className="group w-full flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 px-6 py-3 rounded-2xl font-medium transition-colors">
              先以訪客身分體驗
              <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 捷徑卡片共用元件 ---
  const ShortcutCard = ({ link }) => (
    <div 
      draggable
      onDragStart={(e) => handleDragStart(e, link)}
      onDragEnd={handleDragEnd}
      className="group relative bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1 cursor-grab active:cursor-grabbing"
    >
      <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
        <button onClick={(e) => openMoveModal(link, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg shadow-sm border border-slate-100 transition-all" title="移動至...">
          <MoveRight size={16} />
        </button>
        <button onClick={(e) => openEditModal(link, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg shadow-sm border border-slate-100 transition-all" title="編輯">
          <Edit2 size={16} />
        </button>
        <button onClick={(e) => handleDelete(link.id, e)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shadow-sm border border-slate-100 transition-all" title="刪除">
          <Trash2 size={16} />
        </button>
      </div>

      <a href={link.url} target="_blank" rel="noopener noreferrer" className="block outline-none mt-2">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <Globe size={22} />
          </div>
          <div className="flex-1 min-w-0 pr-20">
            <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{link.title}</h3>
            <p className="text-sm text-indigo-500/80 truncate mt-0.5">{link.url.replace(/^https?:\/\//, '')}</p>
            {link.description && <p className="text-sm text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">{link.description}</p>}
          </div>
        </div>
      </a>
    </div>
  );

  const unclassifiedLinks = links.filter(l => !l.folderId);

  // --- 畫面 2：主應用程式 ---
  return (
    <div className="flex h-[100dvh] bg-white text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden animate-in fade-in duration-500">
      <ErrorToast />

      {/* --- 左側導覽列 (側邊欄) --- */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 lg:w-80 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bookmark size={20} className="text-indigo-500" />
            未分類導覽列
          </h2>
          <button className="md:hidden p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        
        {/* 未分類捷徑列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
          {unclassifiedLinks.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-10 px-4 border-2 border-dashed border-slate-100 rounded-2xl">
              目前沒有未分類的捷徑。<br/>所有捷徑都已歸檔！
            </div>
          ) : (
            unclassifiedLinks.map(link => (
              <div 
                key={link.id}
                draggable
                onDragStart={(e) => handleDragStart(e, link)}
                onDragEnd={handleDragEnd}
                className="group relative bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10">
                  <button onClick={(e) => openMoveModal(link, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors bg-white shadow-sm border border-slate-100" title="移動">
                    <MoveRight size={14} />
                  </button>
                  <button onClick={(e) => openEditModal(link, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors bg-white shadow-sm border border-slate-100" title="編輯">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => handleDelete(link.id, e)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors bg-white shadow-sm border border-slate-100" title="刪除">
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 outline-none mt-1">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Globe size={18} />
                  </div>
                  <div className="flex-1 min-w-0 pr-20">
                    <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">{link.title}</h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{link.url.replace(/^https?:\/\//, '')}</p>
                  </div>
                </a>
              </div>
            ))
          )}
        </div>

        {/* 底部：使用者大頭貼與登入/登出 (從上方移入此處) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          {user && !user.isAnonymous ? (
            <div className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"><User size={16} /></div>
                )}
                <span className="text-sm font-bold text-slate-700 truncate">{user.displayName || '使用者'}</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="登出">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all text-sm font-bold">
              <User size={16} />
              登入以啟用同步
            </button>
          )}
        </div>
      </aside>

      {/* --- 右側主畫面區塊 --- */}
      <main className="flex-1 h-full overflow-y-auto relative bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-5 sm:pt-10 relative z-10 pb-32">
          
          {/* 極簡單行頂部導覽列 */}
          <header className="flex items-center justify-between gap-3 mb-6 sm:mb-10 pb-4 border-b border-slate-200/60">
            {/* 左側：漢堡選單 + 標題 */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors shrink-0" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={24} />
              </button>
              
              {currentFolderId ? (
                <div className="flex items-center gap-1 sm:gap-3 min-w-0 animate-in slide-in-from-left-4 duration-300">
                  <button onClick={() => setCurrentFolderId(null)} className="p-1.5 sm:p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shrink-0">
                    <ArrowLeft size={22} className="sm:w-6 sm:h-6" />
                  </button>
                  <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 truncate">
                    {folders.find(f => f.id === currentFolderId)?.name || '未命名資料夾'}
                  </h1>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 truncate">我的資料夾</h1>
              )}
            </div>
            
            {/* 右側：精簡的操作按鈕 */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {currentFolderId === null && (
                <button onClick={() => setIsFolderModalOpen(true)} className="flex items-center justify-center p-2 sm:px-5 sm:py-2.5 bg-white text-slate-700 border border-slate-200 rounded-full font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm" title="新增資料夾">
                  <FolderPlus size={20} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline ml-2">新增資料夾</span>
                </button>
              )}
              <button onClick={openAddModal} className="group flex items-center justify-center p-2 sm:px-6 sm:py-2.5 bg-slate-900 text-white rounded-full font-medium hover:bg-indigo-600 transition-all shadow-lg hover:-translate-y-0.5" title="新增捷徑">
                <Plus size={20} className="sm:w-[18px] sm:h-[18px] group-hover:rotate-90 transition-transform" />
                <span className="hidden sm:inline ml-2">新增捷徑</span>
              </button>
            </div>
          </header>

          {/* 主畫面內容區塊 */}
          {currentFolderId === null ? (
            // 根目錄：資料夾網格
            <div>
              {folders.length === 0 ? (
                <div className="text-center py-20 sm:py-24 bg-white/40 rounded-[2rem] border border-slate-200 border-dashed">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-100 text-slate-400 mb-4 sm:mb-5">
                    <FolderOpen size={32} className="sm:w-9 sm:h-9" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-700 mb-2">打造您的專屬分類</h3>
                  <p className="text-sm sm:text-base text-slate-500">點擊右上角新增資料夾，或是展開左側選單。</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                  {folders.map(folder => (
                    <div 
                      key={folder.id}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="group cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1.5 relative flex flex-col items-center text-center"
                    >
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="p-1.5 sm:p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="刪除資料夾">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
                        <FolderOpen className="text-indigo-500" size={28} />
                      </div>
                      <h4 className="font-bold text-slate-800 text-base sm:text-lg truncate w-full">{folder.name}</h4>
                      <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">{links.filter(l => l.folderId === folder.id).length} 個項目</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // 資料夾內：顯示捷徑
            <div>
              {(() => {
                const folderLinks = links.filter(l => l.folderId === currentFolderId);
                if (folderLinks.length === 0) {
                  return (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border border-slate-100 border-dashed">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4"><Bookmark size={28} /></div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-1">這個資料夾是空的</h3>
                      <p className="text-sm sm:text-base text-slate-500">點擊右上角新增按鈕，或是從側邊欄拖曳進來吧！</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {folderLinks.map(link => <ShortcutCard key={link.id} link={link} />)}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      {/* --- 拖曳放置區 (Bottom Dropzone) --- */}
      {isDragging && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:p-6 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col items-center">
          <h3 className="text-white mb-4 sm:mb-6 font-bold flex items-center gap-2 text-sm sm:text-lg">
            <MoveRight size={20} className="text-indigo-400" />
            將捷徑拖曳至下方資料夾放開即可移動
          </h3>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto w-full max-w-5xl justify-center pb-2 sm:pb-4 scrollbar-hide items-center px-4">
            <div
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={(e) => handleDragLeave(e, null)}
              onDrop={(e) => handleDrop(e, null)}
              className={`flex flex-col items-center justify-center shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 transition-all duration-200 ${dragOverTarget === null ? 'border-indigo-400 bg-indigo-500/30 scale-110 text-white shadow-lg shadow-indigo-500/20' : 'border-slate-600 bg-slate-800 text-slate-400 border-dashed hover:border-slate-500 hover:text-slate-300'}`}
            >
              <Menu size={28} className="mb-2" />
              <span className="text-[10px] sm:text-xs font-medium">移至未分類</span>
            </div>
            {folders.map(f => (
              <div
                key={f.id}
                onDragOver={(e) => handleDragOver(e, f.id)}
                onDragLeave={(e) => handleDragLeave(e, f.id)}
                onDrop={(e) => handleDrop(e, f.id)}
                className={`flex flex-col items-center justify-center shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 transition-all duration-200 ${dragOverTarget === f.id ? 'border-indigo-400 bg-indigo-500/30 scale-110 text-white shadow-lg shadow-indigo-500/20' : 'border-slate-600 bg-slate-800 text-slate-400 border-dashed hover:border-slate-500 hover:text-slate-300'}`}
              >
                <FolderOpen size={28} className="mb-2" />
                <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center px-2 sm:px-3">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- 新增/修改捷徑 Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" onClick={closeModal}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"></div>
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Bookmark size={20} className="text-indigo-500" />
                {modalMode === 'add' ? '新增捷徑' : '修改捷徑'}
              </h2>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">網站名稱 <span className="text-rose-500">*</span></label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="例如：Google, Figma..." className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">網址 (URL) <span className="text-rose-500">*</span></label>
                <input type="url" name="url" value={formData.url} onChange={handleChange} placeholder="例如：https://..." className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">描述 (選填)</label>
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="簡單描述用途..." rows="2" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"></textarea>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
              <button type="button" onClick={closeModal} disabled={isSaving} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200/50 disabled:opacity-50 transition-colors">取消</button>
              {/* 3. 將按鈕內的 Loader2 換成純 CSS 動畫圈圈，並為按鈕加入安全防護與固定寬度 min-w-[96px] */}
              <button type="button" onClick={handleSave} disabled={!formData.title?.trim() || !formData.url?.trim() || isSaving} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md min-w-[96px]">
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (modalMode === 'add' ? '儲存' : '修改')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 新增資料夾 Modal --- */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" onClick={() => !isSaving && setIsFolderModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"></div>
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FolderPlus size={20} className="text-indigo-500" />
                新增資料夾
              </h2>
              <button onClick={() => setIsFolderModalOpen(false)} disabled={isSaving} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">資料夾名稱 <span className="text-rose-500">*</span></label>
              <input type="text" value={folderFormData.name} onChange={(e) => setFolderFormData({ name: e.target.value })} placeholder="例如：設計資源、工作專案..." className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium" autoFocus onKeyDown={(e) => e.key === 'Enter' && !isSaving && handleSaveFolder()} />
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsFolderModalOpen(false)} disabled={isSaving} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200/50 disabled:opacity-50 transition-colors">取消</button>
              {/* 這裡同樣換成原生 CSS 圈圈並加入安全防護 */}
              <button onClick={handleSaveFolder} disabled={!folderFormData.name?.trim() || isSaving} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all min-w-[96px]">
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '建立'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 手動移動捷徑 Modal --- */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6" onClick={() => setIsMoveModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"></div>
          <div className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MoveRight size={20} className="text-indigo-500" />
                移動至...
              </h2>
              <button onClick={() => setIsMoveModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto scrollbar-thin">
              <div onClick={() => handleMoveLink(null)} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 ${linkToMove?.folderId == null ? 'border-indigo-200 bg-indigo-50 text-indigo-700 font-bold' : 'border-transparent hover:bg-slate-50 text-slate-700 font-medium'}`}>
                <Menu size={20} className={linkToMove?.folderId == null ? 'text-indigo-600' : 'text-slate-400'} />
                <span>未分類導覽列</span>
              </div>
              {folders.map(folder => (
                <div key={folder.id} onClick={() => handleMoveLink(folder.id)} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border-2 mt-2 ${linkToMove?.folderId === folder.id ? 'border-indigo-200 bg-indigo-50 text-indigo-700 font-bold' : 'border-transparent hover:bg-slate-50 text-slate-700 font-medium'}`}>
                  <FolderOpen size={20} className={linkToMove?.folderId === folder.id ? 'text-indigo-600' : 'text-slate-400'} />
                  <span className="truncate">{folder.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
