# link_app · Windows／Android 容器

此目錄負責原捷徑系統的原生打包。前端入口直接使用 ../src/main.jsx，不是另一套提醒 App。Google 登入、捷徑、資料夾和提醒共用 ../src/firebase.js 的 default Firebase app 及 UID。

0.4.0 精簡手機導覽與卡片，捷徑操作收在「⋯」選單；提醒設定以獨立視窗開啟，清單位置不變。0.3.0 使用者可按「檢查更新」取得本版。

## 使用方式

1. 使用原本的 Google 帳號登入，在「我的捷徑」與「待辦提醒」切換。
2. 清單與填寫表單分開，按「新增事項」或編輯才開啟表單，儲存後關閉。輸入「下週一要訂便當」，確認到期日。也支援今天、明天、後天、週幾、10/12、10月12日、2026-10-12；無日期事項也可儲存。
3. 預設每天 09:00 提醒直到完成。每件事情可設定提醒時間和 1–30 天間隔；到期後仍提醒，勾選完成才停止。
4. 開啟提醒設定、允許通知並送出測試通知；Android 可再允許精確提醒。
5. 訪客事項沿用本機儲存鍵；Google 登入後可按「匯入本機事項」。不自動混入其他使用者資料。

Windows 10／11 x64：完整解壓縮打包 ZIP，再執行 Remember.exe。Google 登入會開啟預設瀏覽器，按 Google 登入完成後回到工具。關閉視窗後留在通知區，仍會同步與提醒；通知區的「結束程式」會停止提醒。

Android 7.0 以上：安裝 debug APK，開啟後允許通知。套件 com.jush.remember 與原測試版相同，可使用同簽章更新，應用程式名稱為「捷徑與提醒」。

## 自動偵測新版

0.3.0 起自動在啟動、視窗／App 恢復，以及六小時的檢查時點讀取公開 GitHub Releases。不傳送 Google 帳號或本機事項，也不需要把 GitHub token 放入安裝包。成功檢查快取六小時，失敗十五分鐘後可再自動重試；手動「檢查更新」可立即重查，重疊請求會合併。

只選 jush-website/link_app 的已發布 link-app-vX.Y.Z，依數字版本比對，忽略草稿及缺少對應安裝包的版本。目前亦接受已發布的測試版，提示會標示「新版為測試版」。Windows 開啟這個版本的 Download-LinkApp-Windows.cmd（或完整 ZIP）；Android 開啟對應版本 APK。下載 URL 只允許這個 repository 的版本化 HTTPS release assets，Windows IPC 另驗證 sender。

找到新版後會提示，可先收起、之後再下載。離線／逾時／API 限流會顯示檢查失敗，保留已找到的更新；不會誤報為最新版本。通知提醒及雲端同步不依賴版本檢查成功。

這是**自動偵測與下載入口**，沒有靜默安裝：Windows 需執行下載工具、解壓新版，從通知區結束舊程式再開新版；Android 由系統確認 APK 安裝與瀏覽器的未知來源權限。直接覆蓋更新、保留原資料，不要解除安裝或清除儲存空間。

**0.1.0／0.2.0 必須先手動安裝 0.3.0 一次**，舊安裝包沒有版本檢查程式，無法事後自動加上。版本及簽章請沿用，Windows 的 appId／productName 與 Android package 均不變。

發布新版時須同步提高 package.json／lockfile 的 version、Android versionName 與 versionCode，保留同一簽章。使用 tag link-app-vX.Y.Z，先建立 draft，上傳並驗證平台安裝包後才 publish；Windows helper 名稱維持 Download-LinkApp-Windows.cmd，APK 使用 LinkApp-X.Y.Z-android-debug.apk（或 LinkApp-X.Y.Z-android.apk）。此偵測直接使用 Releases metadata，不需維護另一個更新 manifest。

## Android Google 登入設定

到 [Firebase 專案設定](https://console.firebase.google.com/project/link-4339d/settings/general)，在同一專案註冊 Android App：

- 套件名稱：com.jush.remember
- 此雲端測試版 debug 簽章 SHA-1：
  4C:04:2D:C9:C2:D1:2B:B5:64:C7:AF:EE:39:99:7B:97:34:DC:07:5B
- SHA-256：
  FB:F2:84:4A:76:96:C9:67:27:D7:4D:76:A2:4C:A7:90:C7:22:18:92:2F:A6:CD:AB:D3:F7:A3:EE:27:90:5D:E8

Google provider 沿用已啟用的專案設定。在 Google Cloud 的 OAuth clients 確認 Android client 的套件及 SHA-1 與上面相同，Web client 使用同一專案原 Google provider 的 client ID（公開設定在 ../src/firebase.js）。

此版使用 Android Credential Manager 取得 Google ID token，再透過共用 Firebase Web Auth 登入，和網頁使用相同 UID。未使用內嵌 WebView 跑 Google 登入，也不需要 Email／密碼或重設原 Google 帳號密碼。這個實作不需要 google-services.json，因為未使用 Firebase Android Auth SDK。

**尚未驗證真實 Android Google 登入。** 套件／SHA 設定不能由公開 API key 自動完成；未設定時登入會失敗。正式簽章或另一台電腦的 debug keystore 會有不同 SHA，需另外登記。Debug keystore 不納入 Git；需要正式上架時另使用自己的簽章。

## Firestore 規則

提醒路徑沿用原使用者：
```
artifacts/my-shortcut-app/users/{Firebase uid}/reminders/{事項 uuid}
```

若現有規則已允許帳號存取自己的全部子集合，可直接沿用。否則將下面 match 合併到現有 match /databases/{database}/documents 中，保留原 links／folders 規則：
```text
match /artifacts/my-shortcut-app/users/{uid}/reminders/{taskId} {
  allow read, delete: if request.auth != null && request.auth.uid == uid;
  allow create, update: if request.auth != null && request.auth.uid == uid
    && request.resource.data.title is string
    && request.resource.data.title.size() > 0
    && request.resource.data.title.size() <= 200
    && request.resource.data.completed is bool
    && request.resource.data.intervalDays is int
    && request.resource.data.intervalDays >= 1
    && request.resource.data.intervalDays <= 30
    && request.resource.data.reminderTime is string
    && request.resource.data.reminderTime.matches('([01][0-9]|2[0-3]):[0-5][0-9]');
}
```

測試規則 tests/firestore.rules 只用於 demo-remember 模擬器，本專案沒有部署正式 Firebase 規則。

## 同步與背景提醒

- Google 登入後，捷徑、資料夾、提醒使用同一個帳號，Firestore 在 App 開啟時同步；切換頁面不會停止提醒監聽或原生排程。
- 提醒離線修改先存快取，顯示「等待同步」，恢復連線後補送。
- Android 的原生 AlarmManager 在視窗關閉後繼續排程，重新開機會恢復；沒有有限次數上限。
- Android 的雲端變更在開啟／恢復 App 後同步；尚未加入 FCM／Cloud Functions。
- Windows 休眠／關機時無法提醒，恢復後最多補一次。Android 強制停止後需重新開啟 App。
- 提醒按裝置當地時區計算；主要情境為 Windows 和 Android 都設台北時間。
- 真實 Windows／Android 通知送達尚未驗證。

## 開發及打包

先在根目錄 npm ci，再在本目錄 npm ci。此目錄的 npm run dev 使用 5174；根目錄使用 5173。原生打包保留相同前端、內建樣式及同一個 Firebase 設定。
```sh
npm run lint
npm test
npm run test:ui
npm run test:sync
npm run package:windows

# JDK 21、Android SDK 36、Build Tools 36.0.0
npm run android:apk
```

Google 模擬器測試使用只允許 demo-remember 的未簽章測試 Google JWT，驗證 UID、捷徑／資料夾／提醒同步、離線补送、完成取消排程、登出及不同使用者隔離。它不代表真實 Google OAuth 或原生帳號選擇器已驗證。

Windows 使用 Electron 的原生通知與通知區；Google 登入透過只在登入期間開放的 loopback 端點回傳，nonce、Origin、Host、本文大小及 sender 都有驗證。

此雲端的原生建置 helper 為 /workspace/shared/build-remember-android.py，工具鏈位於 /workspace/tools/jdk-21、/workspace/tools/android-sdk、/workspace/tools/gradle-cache。TLS 與下載校驗保持啟用。

Windows 包裝是未程式碼簽章 ZIP，Android 使用 debug 簽章。產物不納入 Git，測試 keystore 也不納入 Git。

## Windows 下載器維護

`node scripts/create-windows-downloader.cjs manifest.json Download-LinkApp-Windows.cmd` 以包含 ZIP 和依序各分段名稱、大小及 SHA-256 的 manifest 產生單一 CMD。PowerShell 本體保存在 scripts/windows-downloader.ps1；不變更 execution policy，不執行 ZIP 內程式。錯誤重試 3 次，保留正確分段與校验完整 ZIP。發布時沿用已驗證的二進位校验碼，更新下載器及 SHA256SUMS，保存舊附件以供追溯。

`POWERSHELL_EXECUTABLE=/path/to/pwsh node --test tests/windows-downloader.test.js` 執行損壞／斷線重試、续傳、跨版本校验重用與整體 ZIP 校验測試。Windows 可使用現有 powershell.exe；Linux 需要 PowerShell 7。沒有 PowerShell 的測試會明確標為 skipped。
