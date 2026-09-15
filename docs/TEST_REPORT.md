# 本地原型檢查｜2026-09-15

狀態：`LOCAL_PROTOTYPE_CHECKED / REAL_BROWSER_AND_PAGES_PENDING`。
沒有建立或修改 GitHub 遠端 repository，也沒有完成 GitHub Actions 或 Pages 部署。

## 真正執行並通過

| 檢查 | 結果 | 範圍 |
|---|---|---|
| Node 數學單元測試 | 25/25 PASS | 二次函數、a=0、實根、可重現 Bernoulli、OLS、槓桿與輸入邊界 |
| 靜態站點檢查 | PASS | 6 個 HTML 頁、61 個本地連結／錨點、相對路徑、重複 id、無遠端 runtime assets |
| 本機 HTTP 檢查 | 13/13 PASS | project 子路徑的 HTML、CSS、.mjs、SVG 回傳 200；.mjs MIME 正確 |
| 受限環境 DOM／互動測試 | 12/12 PASS | 實際 HTML/CSS/JS 內存執行；記錄、分層、拖點、seed、匯出內容、列印鏡像、鍵盤及投影 |
| 版面寬度檢查 | PASS | 6 頁 × 390/768/1440px；未見水平溢出 |
| Python 語法檢查 | PASS | 兩份 browser 測試腳本可編譯 |
| 圖像人工檢視 | 已檢視 | 首頁、二次函數桌面及手機版；據手機觀察修正圖像／控制區的先後次序 |

可重跑的輸出在 `docs/qa/`。Production `site/` 約 80 KiB，不含開發文件及預覽圖。
本機 Node 為 v22.16.0，Python Playwright 為 1.57.0。

## 重要限制：未通過真正的瀏覽器導航

宿主 Chromium 政策禁止 URL 導航。實際執行
`python tests/browser_smoke.py BrowserSmoke.test_02_quadratic` 時，瀏覽器在
`http://127.0.0.1:4187/...` 收到 `ERR_BLOCKED_BY_ADMINISTRATOR`，無法完成。
沒有改動或繞過該政策。

作為替代診斷，`tests/in_memory_ui.py` 使用 `page.set_content` 載入本地產生的內容，
把實際 ES modules 的 import/export 組合後在記憶體執行；合成 URL、localStorage、
clipboard、download 與 print 都是明確的 test doubles。

因此這 12 個 PASS **不能證明**：真實 localStorage 跨重載、瀏覽器檔案下載／權限、
GitHub Pages 深連結、實際 clipboard 或實體列印正常。預覽圖不是已上線證據。
本機 HTTP 的 200 檢查亦不能代替瀏覽器載入 modules 的端對端測試。

## Codex 發布前仍必須完成

- 完整 `python tests/browser_smoke.py`（9 個真實 HTTP/browser checks）。
- 確認 GitHub Actions verify 與 deploy 成功；不能改用 mock tests 消除失敗。
- 在實際 Pages URL 驗證根頁、深連結、刷新、CSS、modules。
- 真實下載、列印至 PDF／紙張、clipboard permission 與本機儲存。
- 至少一部實際手機／平板；Safari／Firefox 尚未測試。
- 完整螢幕閱讀器、觸控、色彩對比、200% 縮放等無障礙稽核尚未完成，不聲稱合規認證。
- 教師課程核對與學生試用，未做任何學習成效驗證。

## 已修正而非隱藏的本地問題

- 初始 OLS 測試期待值有誤。獨立計算此組資料 Sxx=42、Sxy=45、ȳ=46/8，
  應為 slope=15/14、intercept=13/14，已更正測試並保留數學案例。
- 對收合 details 用 inner_text 讀數導致測試空字串；改用 text_content 核對內容，
  沒有把提示改為預設顯示。
- 手機初版先顯示整段控制區，調參時看不到圖。已重排，圖像在操作區內 sticky，
  並放大 SVG 刻度字體。
