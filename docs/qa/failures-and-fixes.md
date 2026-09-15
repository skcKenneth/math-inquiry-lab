# 2026-09-15 接手：失敗與修復紀錄

## 原始檔保留

- 輸入：`Math_Inquiry_Lab_Codex_Starter.zip`，41 個檔案。
- ZIP SHA-256：`fc96450aab45de7d22b65e3b59a840861991b6be63cd60648cb6d386523953d9`。
- Git 原始提交：`f03f305`，直接按 ZIP 內容建立，原 ZIP 未改動。
- 原有 `docs/qa/unit-and-links.txt`、`http-routes.txt`、`in-memory-ui.txt` 及
  `docs/previews/` 保留為 starter 的歷史材料。當次新證據使用 `current-*` 名稱。

## 真實瀏覽器首輪失敗

執行原有 `python tests/browser_smoke.py`，Chromium 143.0.7499.4，結果為
9 項中的 8 PASS、1 ERROR。唯一 ERROR 是 `test_04_real_json_download`：

```text
UnicodeDecodeError: 'cp950' codec can't decode byte 0x8c in position 75
```

瀏覽器已下載 JSON；測試以 Windows 預設 cp950 讀取 UTF-8 檔案而失敗。
修正測試明確以 UTF-8 讀取，並補上文字匯出核對；沒有刪除測試或改成假下載。
完整修復後的結果見 `current-browser.txt`。

## 來源／視覺複核後修復

- 數值輸入：保留尚在輸入的小數編輯狀態；恢復有效值時清除 `aria-invalid`。
- seed：另起一組或重設後清除舊錯誤標示。
- 迴歸拖曳：追蹤開始拖曳的 pointer，避免另一個 pointer 干擾。
- SVG 頂點描述：與「顯示頂點」勾選狀態一致，a=0 仍有正確退化說明。
- 768px 兩欄圖像：原刻度經縮小後偏細；只放大 SVG 文字，保留固定數學刻度。
- 題目：二次函數指定比較高度；概率離堂題明示 p=0.5、獨立性及相對頻率；
  迴歸區分原線的垂直偏離、目前擬合殘差、槓桿與影響。
- HTTP 驗收：加入 project 目錄首頁本身，原有 13 條檢查增至 14 條。

## 獨立數學核算

原有八點從原始總和計算：Σx=36、Σy=46、Σx²=204、Σxy=252、Σy²=316，
得到 Sxx=42、Sxy=45、Syy=103/2、斜率=15/14、截距=13/14、SSE=23/7、R²=675/721。
另以 Python Fraction 核對：新增 (11,2)/(11,13) 的槓桿同為 95/179，斜率卻分別
為 105/358 及 391/358。這支持「高槓桿不等於必然高影響」。

以獨立 Python uint32 整數算法核對偽隨機序列：p=0.5、seed=5，前 100 次有
49 次正面，前 1,000 次有 528 次。相對頻率誤差由 0.01 增至 0.028，是有限反例，
不被表述為大數法則的證明。這些期望值已加入 Node 測試。

## 環境與發布

Playwright 1.57.0 安裝在專案 `.venv/`。預設瀏覽器快取安裝沒有完成，已中止；
使用受支援的 `PLAYWRIGHT_BROWSERS_PATH` 改在專案 `.artifacts/browsers/` 成功安裝。
沒有更改宿主 Chromium 政策；此次真實 HTTP 導航正常。

初次沙箱內 GitHub CLI／Git 憑證管理員沒有可用登入；瀏覽器未登入。
再以正常 Windows 使用者執行非互動 Git Credential Manager，成功使用既有憑證
驗證為 skcKenneth。這是環境邊界造成的存取差異，並非需要重建登入；沒有輸出或
保存 token。登入後已核對目標 repository 不存在，再按使用者授權建立及發布。
