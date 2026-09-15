# GitHub Pages 部署

## 決策：獨立 project site，不碰原網誌

建議新 repository：`skcKenneth/math-inquiry-lab`。
原有 `skcKenneth/skcKenneth.github.io` 不改動、不遷移、不重建、不刪除。
預期 project URL 為 `https://skckenneth.github.io/math-inquiry-lab/`，但仍須以 Pages
實際回傳網址及 live check 為準；目前包內沒有聲稱它已上線。

所有內部連結均用相對路徑。沒有 CNAME，不更動自訂網域或 blog routing。

## 本機先確認

1. `npm run verify`。
2. 安裝 `requirements-dev.txt` 及 Playwright Chromium。
3. `python tests/browser_smoke.py`。
4. `npm start`，在桌面及手機寬度檢查，走完整個活動：輸入 → 紀錄 → 匯出。
5. 確認沒有學生資料、秘密、私人 email、相片、無權發布素材。

真正的 HTTP 瀏覽器測試必須跑；`in_memory_ui.py` 只能輔助，不得冒充端對端驗證。

### 本次接手的登入方式（2026-09-15）

沙箱內 `gh auth status` 沒有登入；Windows 原有 Git Credential Manager 在正常
使用者環境可用。透過既有 Git 憑證完成 API 帳戶驗證為 `skcKenneth`，沒有輸出或
保存 token。以登入身分核對目標 repository 不存在後，才可按使用者授權建立。
後續若目前環境已可透過既有憑證操作，不需重複登入或再索取發布同意。

## 在 Codex 有 GitHub 授權的環境

先 `gh auth status`（只確認狀態，勿輸出 token）；檢查 remote 與目標 repo。
若新 repo 不存在，而且使用者已授權公開，可建立；若已存在，先閱讀及比較，
不能 force-push 或假設可覆寫。只在新的 repo 使用 `main`。

將本專案檔案放在新 repo 根目錄。不是把 zip 直接上傳後當成網站。
提交前確認 `.github/workflows/pages.yml` 有包括在內。

Pages 設定：Settings → Pages → Build and deployment → Source → GitHub Actions。
可用 GitHub UI 或具有相應權限的 API 設定；沒有權限就列出此具體步驟，勿改成付費主機。

Workflow 會先跑數學／連結及真實瀏覽器測試，再只上傳 `site/`。
Pull request 跑測試、不部署；`main` 的 push 或指定的 workflow dispatch 才部署。

## 發布後不可省略

- 檢查 Actions 的 verify 與 deploy 都成功，不只看到 commit 已 push。
- 打開實際 Pages URL，依次打開三個活動及教師手冊。
- 直接輸入一個 lab 深層網址並重新整理；確認 CSS 與 .mjs 不是 404。
- 點 home 的 link 確認返回 project 首頁，不跳到原本網誌根目錄。
- 分享含參數網址，確認沒有學生文字，並能重現參數。
- 匯出、列印、localStorage 勾選與清除要在真實瀏覽器確認。
- `node scripts/http-check.mjs <actual-pages-url>` 檢查公開路由與資源。
- 最終輸出 repo URL、Pages URL、commit hash、workflow run URL、實際測試結果及未測項。

## 不要把部署說成教學成效

v0.1 可發布作原型。頁尾「尚未經課堂試用」只有教師實際試用並確認後才更新；
不能由 Codex 根據程式測試自動改成「已驗證教學成效」。

## 官方參考（核對日期 2026-09-15）

- GitHub Pages project sites / static files:
  https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- GitHub Pages publishing source:
  https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Custom workflow permissions and artifact:
  https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Codex AGENTS.md:
  https://developers.openai.com/codex/guides/agents-md/
- Playwright browser configuration:
  https://playwright.dev/python/docs/browsers

版本與權限可能改變，真正部署時按官方文件及實際 repository 設定核對。
