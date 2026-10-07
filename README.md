# link_app · 網站捷徑與待辦提醒

原有的捷徑、資料夾、移動與排序功能，加上「待辦提醒」。兩個入口共用原本的 Google 登入及 Firebase 使用者，不需要另建提醒帳號。

- 網頁：沿用 Google 登入視窗。
- Windows：相同介面，Google 登入在預設瀏覽器完成後回到工具；關閉視窗後保留通知區背景提醒。
- Android：相同介面，透過原生 Google 帳號選擇器登入；本機背景排程持續提醒。

輸入「下週一要訂便當」，確認日期後儲存。預設每天 09:00 提醒直到完成，也可以自訂每 1–30 天一次。捷徑和提醒共用帳號，資料仍各自保存在原有使用者路徑下。

## 開發與驗證

需要 Node.js ^20.19.0 或 >=22.12.0（目前使用 Node 24）。

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
npm run lint
npm test
npm run build

# 原生容器及瀏覽器操作／Firebase 模擬器測試
npm --prefix reminder-app ci
npm run test:ui
npm run test:sync
```

樣式透過 Tailwind 在建置時打包，不依賴執行時 CDN。原捷徑的 Firebase default app、project、appId 及 links／folders 路徑沿用。提醒使用同 UID 的 reminders 集合；Firestore 多分頁持久快取支援離線修改。

## Google 登入及資料設定

沿用 Firebase 專案 link-4339d 的 Google provider。實際網站網域需列在 Firebase Authentication 的 Authorized domains；已查到 localhost 在現有名單內，供 Windows 的本機瀏覽器登入使用。

Android 需要在相同 Firebase／Google Cloud 專案登記套件及簽章。完整步驟、這份測試 APK 的 SHA-1／SHA-256、提醒資料規則及打包方式見 [原生容器說明](reminder-app/README.md)。

正式 Firebase 規則須允許使用者存取自己的 reminders；若現有 owner 規則已涵蓋所有使用者子集合，可直接沿用。不要覆蓋原捷徑的 links／folders 規則。

## 提醒與同步

網頁需保持開啟才能送出通知。Windows 保持通知區程序運行時持續同步與提醒；從通知區結束程序會停止該電腦的提醒。

Android 背景提醒使用 AlarmManager，但雲端資料在開啟／恢復 App 後同步。在 Windows 完成事情後，手機可能仍有舊排程，需開啟 Android App 同步取消。強制停止 Android App 後也需重新開啟。此版尚未提供 FCM 背景資料同步。

[驗證紀錄](reminder-app/VERIFICATION.md) 區分模擬器測試、打包及尚未完成的真實裝置登入／通知驗證。網站正式部署前，請先檢閱並合併整合變更。
