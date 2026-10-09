# link_app · 網站捷徑與待辦提醒

原有的捷徑、資料夾、移動與排序功能，加上「待辦提醒」。兩個入口共用原本的 Google 登入及 Firebase 使用者，不需要另建提醒帳號。

- 網頁：沿用 Google 登入視窗。
- Windows：相同介面，Google 登入在預設瀏覽器完成後回到工具；關閉視窗後保留通知區背景提醒。
- Android：相同介面，透過原生 Google 帳號選擇器登入；本機背景排程持續提醒。

待辦頁平常只顯示事項清單。按「新增事項」或編輯才開啟獨立表單，儲存後回到清單，取消不寫入資料。輸入「下週一要訂便當」，確認日期後儲存。預設每天 09:00 提醒直到完成，也可以複選星期幾提醒（例如只在週一、三、五）。捷徑和提醒共用帳號，資料仍各自保存在原有使用者路徑下。

手機版共用一列功能導覽，只保留一個選單按鈕。捷徑採用較矮的卡片，移動／編輯／刪除放在「⋯」選單；提醒設定以獨立視窗開啟，不會將事項清單向下推。常用操作保留至少 44px 點擊區域。

Android 0.4.1 由原生容器預留狀態列、鏡頭缺口、底部導覽列及鍵盤空間，介面使用可用 viewport 高度，長清單只在內容區捲動。Windows 安裝包目前維持 0.4.0。

## 桌面／Android 版本檢查

網站右下角的「下載工具」不需要登入，即可取得 Windows 下載工具與 Android APK。開啟下載視窗時查詢已發布的相容版本，查詢失敗仍保留已驗證的 Windows 0.4.0 與 Android 0.5.0 下載連結；視窗也提供 Android Google 登入的套件／SHA-1 設定及 Firebase／Google Cloud 入口。

0.3.0 起，在啟動、回到 App 及每六小時自動比對 GitHub 已發布版本；也可按「檢查更新」。找到這台裝置可用的新版時提示版本與下載按鈕，不會因斷線而顯示「最新版」。網頁由 Vercel 部署更新，不顯示原生版本檢查。

Android 的更新改放在待辦提醒的「設定」視窗（原「提醒設定」按鈕改名為「設定」），不再顯示右下角浮動提示；找到新版時，每個版本送出一次系統通知（需已允許通知），點通知直接開啟「設定」，設定按鈕與「待辦提醒」分頁也會顯示紅點。檢查在 App 開啟、回到前景及開啟期間每六小時進行，App 完全關閉時不會檢查。Windows 維持右下角提示。

Windows 下載工具對每個分段檢查大小與 SHA-256，下載或校驗失敗時最多自動重試三次，清除失敗暫存檔，保留已驗證分段；再執行可續傳。若旧版快取分段校驗相同，也可直接重用。Windows 下載新版工具、完整解壓縮，從通知區結束舊程式後開啟新版。Android 下載 APK 後由系統確認覆蓋安裝。此功能自動偵測與提供下載，不會靜默替換執行檔或安裝 APK；直接更新並保留帳號／資料，不要解除安裝或清除資料。

0.1.0／0.2.0 尚無檢查功能，必須先[手動安裝新版](https://github.com/jush-website/link_app/releases) 一次，之後才會提示新版本。

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
