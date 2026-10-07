# link_app 整合版 0.2.0 驗證紀錄

日期：2026-10-07（台北）。前端為原捷徑系統加入提醒；Windows／Android 共用這份前端與 Google 登入，不提供另一套 Email／密碼帳號。

| 檢查 | 結果 |
| --- | --- |
| 根目錄 ESLint | 通過，0 errors |
| 原生容器與測試 ESLint | 通過，0 errors |
| Web／原生容器的 Vite 建置 | 通過；有非阻擋的 bundle 大小及 Browserslist 提示 |
| JavaScript 提醒核心及桌面排程 | 11 個測試通過，0 skipped |
| Windows Google loopback 回傳 | 2 個測試通過：正確 nonce、Origin、Host 靜態路徑、無效憑證拒絕、成功後關閉、逾時關閉 |
| 瀏覽器介面 | 3 個通過：原捷徑入口、Google 登入入口、無 Email／密碼表單、提醒記錄／重載／切換／修改／完成／刪除、393 px 版面與內建 CSS |
| Google 身分與跨装置 Firebase 模擬器 | 1 個端到端測試通過：同 Google provider UID、捷徑／資料夾／提醒同步、離線補送、切回捷徑時仍更新排程、完成取消排程、他人讀取 403、登出清空及重新登入仍保留原資料 |
| Android 原生時間計算 | 4 個通過，0 skipped／failures／errors；最後建置重用相同 Java 測試結果 |
| Android 原生 Google 登入插件 | Credential Manager、Google ID token 換 Firebase credential 及插件註冊編譯通過 |
| Android APK | Debug 編譯、簽章驗證通過；所有 assets/public 位元組與最後 Vite dist 一致 |
| Windows ZIP | 打包通過；Google 回傳服務、IPC、排程 source、兩個 HTML 及所有編譯 JS／CSS 和 app.asar 位元組一致；ZIP 中的 app.asar 與打包目錄一致 |
| Firebase 的 localhost 授權網域 | 公開專案設定查詢已確認 localhost 存在 |
| 真實 Google OAuth／原生帳號選擇器 | **尚未實測**；Android 需登記此 APK 的套件及 SHA，資料規則需允許 reminders |
| 真實 Windows／Android 通知送達 | **尚未實機驗證** |
| 正式網站更新 | 尚未合併／部署；整合變更提供 PR 供檢閱 |

共 21 個測試通過（13 Node、3 UI、1 Firebase 模擬器、4 Android Java）。模擬器只使用 demo-remember，不寫正式使用者資料；測試 Google JWT 沒有真實 Google 簽章，不能代替正式登入驗證。

原 Google 使用者及 links／folders 路徑沿用，提醒使用同 UID 的 reminders；未部署正式 Firebase 規則。Windows 使用原生通知區背景程序，Android 使用本機 AlarmManager。Android 的跨装置資料更新仍需開啟／恢復 App，尚未提供 FCM 背景同步。

Android 套件 com.jush.remember、versionCode 2、versionName 0.2.0；debug 簽章 SHA-1 與 README 一致。Windows 未程式碼簽章，Android 為 debug 簽章。安裝包不納入 Git。
