# 接手驗證報告｜2026-09-15

狀態：`LOCAL_REAL_BROWSER_VERIFIED / DEPLOYMENT_IN_PROGRESS`。

本機數學、HTTP 及完整 Chromium 測試已通過。Windows 既有 Git 憑證已驗證為
skcKenneth，目標名稱已確認未使用；正在進行獨立 repository 發布。正式網址與
Actions 結果必須待實際部署及 live 驗收後更新。頁面仍明示「尚未經課堂試用」。

## 本次真正執行的測試

| 檢查 | 結果 | 實際範圍 |
|---|---|---|
| `npm run verify` | 28/28 數學 PASS；靜態檢查 PASS | 6 個 HTML 頁、61 個本地連結／錨點、0 遠端 runtime assets |
| `node scripts/http-check.mjs http://127.0.0.1:4173/math-inquiry-lab/` | 14/14 PASS | 目錄首頁、6 HTML、CSS、5 modules、favicon；HTML／module MIME |
| `.venv/Scripts/python.exe tests/browser_smoke.py` | 13/13 PASS；0 skip | 最後整套執行 14.062 秒；12 項實際 Chromium 測試加 1 項明示剪貼簿拒絕故障注入 |
| 螢幕寬度 | 18/18 頁面組合 PASS | 6 頁 × 390/768/1440px；無水平溢出，保存實際截圖 |
| 手機操作 | 3/3 活動 PASS | 390×844px 調參時，完整圖像及輸入框可見；輸入框未被 sticky 圖覆蓋 |
| 真實下載 | 6 個檔案 PASS | 三活動各一份 UTF-8 JSON 與文字檔；核對筆記與紀錄 |
| 真實剪貼簿與分享 | 3/3 活動 PASS | 瀏覽器 context 授予權限後讀寫真實 clipboard；參數／seed／層級重載還原，URL 無自由文字 |
| 本機儲存 | PASS | 預設不儲存、明確勾選後跨重載保留、取消勾選後移除、只清除本活動、不影響另一活動及其他 key |
| 鍵盤及輸入 | PASS | 方向鍵改變滑桿、小數逐字輸入、非法值不更新圖像、重設／滑桿清除錯誤標記 |
| 投影及 PDF | 3 份 PDF PASS | 每份 2 頁；圖像／紀錄／筆記保留；含投影模式列印樣式恢復筆記的斷言 |
| PDF 內容與視覺核對 | PASS | pypdf 讀取三份 PDF，各含預測／解釋／離堂答案；頁面渲染檢視未見裁切 |
| 公開內容審查 | 未見敏感資料 | 原始 41 個 tracked files、5 張預覽圖及修訂；全為原型／合成數據，無學生資料或憑證 |

環境：Windows、Node v24.18.0、Python 3.14.6、Playwright 1.57.0、
Chromium 143.0.7499.4（Playwright build 1200）。Production `site/` 為 14 檔、
84,005 bytes（82.0 KiB），沒有增加 runtime 依賴或大型框架。

另外使用 Codex 內建真實瀏覽器檢視本機首頁、390px 二次／概率、768px 二次、
1440px 迴歸及投影模式。768px 刻度偏小已修正並重看；手機圖像置頂可見。
這些是桌面瀏覽器調整 viewport 的驗證，不是實體手機試用。

## 數學及操作修正

- 二次函數：比較伸縮時明示 y=2；a=0 的所有實數／無實數零點與無唯一頂點均正確；
  SVG 描述與頂點提示勾選一致。
- 概率：離堂題明示獨立試驗及 p=0.5，指定比較相對頻率；核對 n=0、p=0/1、
  20,000 次及四條序列。加入 seed=5 的非單調接近反例。
- 迴歸：區分原線的垂直偏離與目前擬合殘差；以獨立有理數計算核對 OLS、
  R²、相同槓桿但不同影響。保留退化 OLS／常數 y 的單元測試。
- 修正逐字小數輸入、錯誤標記復原、儲存預設狀態與多 pointer 拖曳處理。
- 修正 Windows 測試讀取 UTF-8 下載檔案的編碼；新增實際下載及 clipboard 核對。
- 放大平板刻度；HTTP 檢查補上目錄首頁。極簡視覺、繁體中文、三活動及教師手冊保留。

## 證據與重跑

- 最新：`docs/qa/current-unit-and-links.txt`、`current-http-routes.txt`、`current-browser.txt`。
- 修復及原始失敗：`docs/qa/failures-and-fixes.md`。
- 公開資源逐檔 SHA-256：`docs/qa/site-sha256.json`。
- 本機真實瀏覽器截圖、6 份測試匯出、3 份 PDF：`.artifacts/browser-qa/`（不提交、不部署）。
- 原有 `docs/previews/` 與沒有 `current-` 前綴的 QA 記錄是 starter 歷史材料，未被當成此次真實驗證。
- 重跑指令及專案內 Windows 瀏覽器安裝方式見 README；瀏覽器套件及 cache 不納入公開檔案。

`tests/in_memory_ui.py` 的原始 12 項模擬結果只保留為歷史診斷，本次未重跑。
第 8 項 browser test 注入剪貼簿拒絕以驗證 fallback，不能證明 OS 權限提示；
第 10 項另以真正的瀏覽器 clipboard 核對成功路徑。其他導航、儲存、下載均無替身。

## 尚未完成與權限

1. **登入能力已解決**：CLI 沒有獨立登入，但 Windows 原有 Git 憑證在沙箱外可用；
   已驗證帳戶為 skcKenneth，無須使用者另行登入。未輸出／保存 token。
2. **遠端存在性已確認**：以登入身分查詢，math-inquiry-lab 不存在；可按授權建立。
3. **Actions／Pages／live 驗收**：正在部署，待 workflow 完成及實際網址核對。
4. **裝置與無障礙**：實體手機／平板、觸控多指、手機軟鍵盤、Safari／Firefox、
   完整螢幕閱讀器、200% 縮放及正式無障礙稽核未驗證。沒有合規認證聲稱。
5. **列印及權限 UI**：已產生並核對 Chromium PDF；實體紙張列印、原生列印對話框
   及 OS 剪貼簿權限提示未驗證。
6. **課堂**：教師按當期課程核對、實際學生試用及學習成效尚未進行，不能由程式測試代替。

原網誌 `skcKenneth/skcKenneth.github.io` 沒有被本次工作修改。
建立及公開發布 math-inquiry-lab 已獲使用者授權。
