# link_app Android 0.4.1 系統列邊界驗證

本版修正 Android target SDK 36 的 edge-to-edge 內容遮擋：SystemBars 使用 native insetsHandling／LIGHT style，Android viewport-fit=auto，原生容器預留狀態列、cutout、底部導覽及鍵盤空間。共用前端使用實際容器百分比高度，只有內容及過高的表單捲動；移除登入切换主畫面時不必要的尺寸過渡。

| 檢查 | 結果 |
| --- | --- |
| 根目錄／原生容器 lint | 通過，0 errors |
| Web／原生前端 build | 通過，既有非阻擋 chunk 大小／Browserslist 提示 |
| Playwright UI | 11 個通過：原有事項、下載及更新操作，加上 393px × 420／360／760 可用高度變化時登入與表單可操作、沒有外層頁面溢出、長清單只有 main 捲動、sticky 導覽及清單底部操作保留 |
| Android build | assembleDebug 與 testDebugUnitTest 完成；4 個未改 Java 測試重用既有通過結果 |
| APK | com.jush.remember、versionCode 5、versionName 0.4.1；原 debug 簽章驗證通過 |
| APK 打包內容 | SystemBars native／LIGHT config 與 viewport-fit=auto 已存在 APK；10 個 dist 檔案逐位元組比對相同 |
| 網站下載 fallback | Windows 0.4.0、Android 0.4.1 分別提供合法公開附件，查詢失敗仍可下載；發布後另核對正式 feed |
| Windows | 本版不重新發布 Windows 二進位檔，維持已發布 0.4.0 |
| 真實 Android 系統列／鍵盤／橫向 cutout | 尚未實機驗證；此機器無 Android emulator／KVM，瀏覽器 viewport 縮放不能替代裝置系統列測試 |
| 真實 Google OAuth、原生通知及覆蓋安裝 | 尚未實機驗證；未變更 Auth／通知核心／資料路徑 |

未重跑未變更的 Node 核心／同步／下載器套件；前版相關檢查已通過。本版 UI 測試攔截正式 Auth 請求，使用訪客本機資料，不寫入正式 Firebase。

APK 簽章 SHA-1：4C:04:2D:C9:C2:D1:2B:B5:64:C7:AF:EE:39:99:7B:97:34:DC:07:5B。直接覆蓋安裝保留資料，不要解除安裝或清除資料。App 啟動或「檢查更新」可偵測新版；沒有靜默安裝。
