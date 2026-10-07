# link_app 0.4.0 手機介面驗證紀錄

此次修改共用前端，縮短手機頁首與卡片、移除重複選單按鈕，捷徑操作與提醒設定改以獨立視窗開啟。原 Google／Firebase 資料路徑與原生通知程式未變更。

| 檢查 | 結果 |
| --- | --- |
| 根目錄與原生容器 ESLint | 通過，0 errors |
| Web／原生前端 Vite build | 通過；有非阻擋的 bundle 大小及 Browserslist 提示 |
| Playwright UI | 9 個通過，含 320／393px、單一選單、設定視窗不推移清單、Escape／焦點還原、事項新增修改完成刪除、下載及更新重試 |
| demo Firebase 整合 | 2 個通過：原 Google UID／跨裝置同步／離線補送／帳號隔離，以及手機捷徑 ⋯ 選單編輯、移動、刪除、設定視窗及清單位置 |
| 手機視覺檢查 | 393px 捷徑卡片約 66px 高；提醒第一張卡片在頁面上方約 195px。已檢視 320／393px 螢幕截圖，無水平溢出 |
| Android | assembleDebug 與 testDebugUnitTest 完成；4 個既有 Java 測試結果重用，0 skipped／failures／errors；簽章驗證通過 |
| Android APK 內容 | 10 個 dist 檔案與 APK assets/public 逐位元組一致，套件 com.jush.remember、versionCode 4、versionName 0.4.0 |
| Windows ZIP | 打包成功；app.asar 內 17 個 dist／Electron／排程及版本偵測檔案與來源一致，package version 0.4.0，ZIP 裡 app.asar 與打包目錄相同 |
| Google／原生通知／系統更新安裝 | 尚未實機驗證；沿用原專案、套件及 debug 簽章，Android 設定步驟見 README |

本版新執行的瀏覽器測試共 11 個（9 UI、2 Firebase emulator），Java 的 4 個未修改測試重用既有通過結果。未重跑未修改的 19 個 Node 核心／排程／loopback／更新測試；這些套件先前 0.3.0 已通過。

所有 Firebase 寫入測試只使用 demo-remember，不修改正式使用者資料。測試 Google JWT 未簽章，不能代替真實 OAuth。Android 使用原 debug keystore：SHA-1 4C:04:2D:C9:C2:D1:2B:B5:64:C7:AF:EE:39:99:7B:97:34:DC:07:5B。Windows 未程式碼簽章，Android 是 debug APK；安裝包不納入 Git。

0.3.0 可自動偵測本版，Android 直接覆蓋安裝以保留資料，Windows 完整解壓縮後從通知區結束舊程式再開新版。網站部署与公開 asset 驗證結果於 GitHub Release 更新。
