# 相容整合驗收｜2026-10-13

狀態：`LOCAL_ACCEPTANCE_PASSED / NOT_YET_PUBLISHED`。

本批按使用者授權，把原有三個活動與統一數學教學工作區連接。六個舊頁面保留，
加入完整繁體中文／英文內容及依活動、語言選擇的工作區連結；沒有自動跳轉。

原有 `math-inquiry-lab:v1:<lab>`、schema 1、明確勾選才保存、數值參數分享、
本機匯出及列印繼續使用。新的共同儲存協調器合併不同欄位的更改，保留同欄衝突，
以事件 ID 合併新增／刪除紀錄；沒有 ID 的舊紀錄保留原文，包括重複的舊列。
開啟舊筆記不會改寫原始 JSON。數學計算模組 `math.mjs` 的 SHA-256 維持
`f2f621b48af299c1d9a6585b7a040781ed2a569874e892813eb967e18d78f66f`。
三個活動模組只更新 UI import 的快取版本；計算規則沒有改動。

已執行：

- `npm run verify`：28／28 獨立數學測試通過；6 個 HTML、85 個本地連結／錨點、
  164.7 KiB production assets；沒有外部 runtime assets。
- 真實 Chromium headless shell 149.0.7827.55：15／15 項通過（18.915 秒，0 skip），包括原有操作、
  390／768／1440px、實際下載與 PDF、剪貼簿、雙語六頁、工作區連結、
  舊紀錄保留與兩分頁合併、取消儲存後跨分頁停止保存、同活動所有舊 recovery 副本刪除。
- `node scripts/http-check.mjs http://127.0.0.1:4188/math-inquiry-lab/`：19／19 路由及
  資源通過，包含新的本地共同儲存、雙語、相容入口資源及正確 JavaScript MIME。
- 所有測試使用一次性 browser context 及合成筆記，沒有讀取個人瀏覽器資料。

Edge／一般 Chromium 在這台電腦的 HTTP 頁面被防毒軟件注入額外 script，會觸發
既有「沒有跨來源 runtime request」驗收。改用已安裝的 Playwright headless shell
重跑後保留同一斷言並通過，沒有略過或白名單處理這些額外請求。

實際輸出保存在未追蹤的 `.artifacts/r2-compatibility-headless/`。本批尚未提交、
push 或驗證正式 Pages；之前部署的證據仍見 `TEST_REPORT.md`，不代表本批已發布。
尚未經真實課堂試用；程式驗收不是教學成效證據。

取消儲存／清除時，在共同 writer lock 內核對原筆記仍已刪除，再清除此活動各 writer 的
recovery 副本；若另一分頁已重新明確勾選保存，不能刪除新一輪備份。其他活動及其他 app
的 key 保留。協調 metadata 只含版本、writer、revision 及 fingerprint，沒有筆記文字；
它保留作舊 writer 的偵測，因此舊的 `localStorage.length===0` 斷言改為更直接的私隱驗收：
原 key 不存在、此活動沒有任何 recovery 副本、剩餘儲存沒有測試筆記，且 unrelated app
sentinel 保持原值。初次未勾選前仍驗收完全沒有儲存寫入。

重跑命令（使用已安裝、沒有防毒 script 注入的 headless shell）：

```powershell
$env:CHROMIUM_EXECUTABLE="$env:LOCALAPPDATA\ms-playwright\chromium_headless_shell-1228\chrome-headless-shell-win64\chrome-headless-shell.exe"
$env:BROWSER_ARTIFACT_DIR='.artifacts\r2-compatibility-headless'
.venv\Scripts\python.exe tests/browser_smoke.py
```
