# Math Inquiry Lab｜數學探究室

程淑鍵（Kenneth Cheng）的極簡中學數學互動探究原型。

**不是只有設計稿：`site/` 已含可操作的三個活動、學生筆記及教師手冊。**
2026-10-13 相容更新加入完整繁體中文／英文介面、跨分頁安全儲存，以及連往
[統一數學教學工作區](https://skckenneth.github.io/zh/teaching/math/)的入口。
舊活動網址、`math-inquiry-lab:v1:<lab>` 儲存鍵及自願保存方式保留；開啟舊紀錄不會改寫內容。
此批更新的驗收與發布狀態見 [整合驗收紀錄](docs/INTEGRATION_20261013.md)。

以下 2026-09-15 的正式部署結果屬於之前版本，並非本批更新的發布證據。
目前版本 `0.1.0` 尚未在真實課堂試用。2026-09-15 已接手核對並修正數學題目與操作；
本機已完成真實 Chromium 導航，完整結果見 `docs/TEST_REPORT.md`。
已建立獨立 public repository 並部署；本機及正式網址的 13 項瀏覽器測試均通過，
另通過 28 項數學、14 條 HTTP 及 14 檔 SHA-256 核對。

## 你只需要先做甚麼

本專案已在獨立資料夾接手，原始 ZIP 保持完整，Git 第一個提交保存原始 41 個檔案。
原始版本的獨立交付流程見 `prompts/START_CODEX_ZH.md`。2026-10-13 按使用者授權整合
教學入口；兩個 repository 仍各自發布，本專案只發布 `site/`。

正式網站：[數學探究室](https://skckenneth.github.io/math-inquiry-lab/)。
獨立 repository：[skcKenneth/math-inquiry-lab](https://github.com/skcKenneth/math-inquiry-lab)。
首次部署及完整 live 驗收所對應的
[成功 workflow](https://github.com/skcKenneth/math-inquiry-lab/actions/runs/34971577603)。

## 本機試用：不用安裝 npm 套件

需要 Node.js 22 或以上。在專案根目錄執行：

```sh
npm start
```

再開 `http://127.0.0.1:4173/math-inquiry-lab/`。
本機 server 只監聽 `127.0.0.1`；不能直接供同一 Wi-Fi 的其他裝置使用。
不要直接雙擊 HTML：瀏覽器對 `file://` ES modules 的處理可能令活動無法載入。
正式部署後，學生端只需要瀏覽器，不需要 Node、Python 或 Codex。

## 已包含的活動

| 活動 | 操作 | 探究重點 |
|---|---|---|
| 二次函數 | a/h/k 滑桿與數值輸入、參考曲線、頂點、數值表 | 控制變量、平方項與頂點、a=0、由條件反推 |
| 概率 | 固定 seed、增加試驗、四條可重現序列 | 相對頻率、一般趨勢與必然性、獨立性 |
| 迴歸 | 移動一點、保留基準擬合、殘差及 R² | x 位置與垂直偏離、槓桿與影響、資料判斷 |

每個活動有核心／深究／挑戰、預測、最多八筆設定紀錄、解釋、離堂題。
另有投影模式、只分享參數的設定連結、文字及 JSON 匯出、列印筆記。
手機上圖像會在操作區內置頂，讓學生調參時仍看到圖像。

## 檔案位置

```text
site/                      # 唯一公開部署內容
  index.html               # 活動列表
  labs/                    # 三個可直接深連結的活動
  teacher-guide.html       # 公開教師提示與參考推理
  about.html               # 狀態、設計與資料說明
  assets/                  # 共用 CSS、純數學及互動程式
scripts/                   # 本機 server、連結與大小檢查
tests/                     # 數學、真實瀏覽器、受限環境 DOM 測試
docs/                      # 設計、部署、試教及 QA 紀錄
prompts/                   # Codex 工作指令
.github/workflows/         # 測試通過後才發布 Pages
AGENTS.md                  # Codex 必須遵守的邊界
```

## 測試

```sh
npm run verify
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_smoke.py
```

瀏覽器測試只用於開發。GitHub Actions 會自動安裝 Chromium 及所需系統依賴。
本機已裝 Chromium 時可設定環境變量 `CHROMIUM_EXECUTABLE`；一般不用。
實際完成及未完成的測試見 `docs/TEST_REPORT.md`，不要把 DOM 模擬測試當成真實部署測試。

### Windows：使用專案內的測試環境

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.artifacts\browsers"
.\.venv\Scripts\python.exe -m playwright install chromium
$env:BROWSER_ARTIFACT_DIR = "$PWD\.artifacts\browser-qa"
.\.venv\Scripts\python.exe tests/browser_smoke.py
```

`.venv/` 與 `.artifacts/` 不會提交或發布；測試筆記全部是合成資料。
部署後可設定 `BASE_URL` 為 Pages 實際回傳的 project 網址，再執行同一套瀏覽器測試。
未設定 `BASE_URL` 時，測試會自行啟動本機 HTTP server。

## 調整內容

- 文字及任務：修改 `site/labs/*.html` 時，同時維護 `site/assets/translations.mjs` 的英文內容。
- 配色、間距、字體：`site/assets/site.css` 最頂部的 CSS 變量。
- 純數學：`site/assets/math.mjs`；改動後必須補測試。
- 三個活動行為：相應名稱的 `.mjs`。
- 教師提示：`site/teacher-guide.html`。不另維護一份可能失同步的答案庫。

不需加入 React、Vite、KaTeX、Plotly 或 GeoGebra 才能運作。
本版數學符號足夠簡單，以 HTML/SVG 顯示；日後公式複雜才另作取捨。

## 資料及狀態

不設登入、不收姓名、不上傳答案、不做追蹤或 AI 判分。
預設不持久儲存文字；只有勾選才寫入本機 localStorage。
同一 GitHub Pages 主機的不同路徑不是安全隔離邊界，勿輸入敏感資料。
匯出由學生自己保管／交予教師；頁面不會自動提交作業。
沒有 service worker，重新開頁的離線可用性不保證。

不要把任何真實學生紀錄提交到公開 repository；`.gitignore` 只提供部分防呆。
本版沒有附加字型檔、學校校徽、照片、學生成績或第三方資料集。
授權條款尚未指定，發布前由權利持有人決定。

## 由原型到可以寫入 CV

先核對內容 → 部署及檢查 → 試教一個活動 → 保存匿名學習證據 → 根據回應修訂。
在試教前只能寫「設計及開發互動探究原型」，不能寫成「已提升學生學習表現」。
見 `docs/CLASSROOM_TRIAL.md`。
