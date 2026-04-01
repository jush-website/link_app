import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Globe, Link as LinkIcon, AlignLeft, Bookmark } from 'lucide-react';

export default function App() {
  // 預設的捷徑資料 (已清空)
  const [links, setLinks] = useState([]);

  // 樣式載入狀態
  const [isStylesLoaded, setIsStylesLoaded] = useState(false);

  // 控制 Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' 或 'edit'
  
  // 表單狀態
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ title: '', url: '', description: '' });

  // 開啟新增視窗
  const openAddModal = () => {
    setModalMode('add');
    setFormData({ title: '', url: '', description: '' });
    setIsModalOpen(true);
  };

  // 開啟修改視窗
  const openEditModal = (link, e) => {
    e.stopPropagation(); // 避免觸發外層的連結跳轉
    setModalMode('edit');
    setCurrentId(link.id);
    setFormData({ title: link.title, url: link.url, description: link.description || '' });
    setIsModalOpen(true);
  };

  // 關閉視窗
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // 處理表單輸入
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 儲存捷徑 (新增或修改)
  const handleSave = () => {
    if (!formData.title.trim() || !formData.url.trim()) return;

    // 簡單確保網址有 http/https 前綴
    let finalUrl = formData.url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    if (modalMode === 'add') {
      const newLink = {
        id: Date.now(),
        title: formData.title.trim(),
        url: finalUrl,
        description: formData.description.trim(),
      };
      setLinks([newLink, ...links]);
    } else {
      setLinks(links.map(link => 
        link.id === currentId 
          ? { ...link, title: formData.title.trim(), url: finalUrl, description: formData.description.trim() }
          : link
      ));
    }
    closeModal();
  };

  // 刪除捷徑
  const handleDelete = (id, e) => {
    e.stopPropagation(); // 避免觸發外層的連結跳轉
    setLinks(links.filter(link => link.id !== id));
  };

  // 動態載入 Tailwind CSS 樣式
  useEffect(() => {
    if (window.tailwind) {
      setIsStylesLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.onload = () => setIsStylesLoaded(true);
    document.head.appendChild(script);
  }, []);

  // 在樣式載入完成前，顯示不依賴 Tailwind 的純內聯樣式 (Inline-style) 載入畫面
  if (!isStylesLoaded) {
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* 頂部裝飾背景 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-10 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-6 pt-16 relative z-10">
        
        {/* 標題列 */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">我的常用捷徑</h1>
            <p className="text-slate-500 font-medium">目前共收錄了 {links.length} 個實用連結</p>
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
                {/* 編輯/刪除按鈕 (Hover 時顯示，放在絕對定位的右上角) */}
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

                {/* 卡片主體 (點擊跳轉) */}
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
          // 外層遮罩：點擊這裡會觸發 closeModal
          onClick={closeModal}
        >
          {/* 半透明毛玻璃背景 */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          
          {/* 視窗本體：加入 e.stopPropagation() 確保點擊內部不會觸發關閉 */}
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
