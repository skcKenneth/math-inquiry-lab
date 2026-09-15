請接手此 math-inquiry-lab 專案，將它核對、修正並部署為我的獨立 GitHub Pages
數學探究網站。這個 ZIP 已經有可操作原型，不要重建成另一套模板。

先讀 AGENTS.md、README.md、docs/DESIGN.md、docs/DEPLOY.md 和
 docs/TEST_REPORT.md，再檢查現有 HTML、CSS、JavaScript 及測試。

目標：skcKenneth/math-inquiry-lab。
本次任務授權你在此名稱未被使用時建立一個新的 public repository，發布本專案
不含私人資料的程式及教材；若已存在，先讀取內容再合併，不得覆寫 unrelated work。
絕對不要改動 skcKenneth/skcKenneth.github.io、原有網誌、CNAME 或自訂網域。

保持既有極簡介面、繁體中文、三個活動、核心／深究／挑戰、教師手冊與本機筆記。
不要加入 React／Next.js、database、登入、付費 API、外部字型、追蹤、排行榜、
裝飾圖片或 AI 自動判分。學生資料不得公開；課堂成效不得虛構。

先實際執行 npm run verify，再安裝 requirements-dev.txt 及 Playwright Chromium，
執行 python tests/browser_smoke.py。不能以 tests/in_memory_ui.py 的模擬結果
代替真實 HTTP、localStorage、下載及深層連結測試。
遇到失敗就查明原因及修正，不刪測試、不直接降低標準。

檢查 390／768／1440px、手機調參時的圖像可見性、鍵盤操作、投影模式、
分享連結不含筆記、a=0、p=0/1、迴歸特殊情況、文字／JSON 匯出及列印。
目標是可用的教具，不是只產生一張好看的截圖。

確認將公開的內容沒有學生資料或其他敏感資料後，建立／連接目標 repo，
啟用 GitHub Pages 的 GitHub Actions publishing source，再提交及部署。
只發布 site/。權限不足時，完成其他可做事項，再明確列出我需要授權或點選的那一步；
不要聲稱已經上線，也不要改用其他平台。

部署後等待 workflow 完成，開啟實際 Pages 首頁、三個活動、教師手冊，測試深連結及
重新整理；執行 node scripts/http-check.mjs <實際網址>。只有真正成功後才交付 live URL。

最後簡潔交代：修改了甚麼、實際跑過的測試與結果、repo／Pages／workflow URL、
仍未驗證的項目，以及我如何改題目。保持「尚未經課堂試用」標示，勿改成已證實有效。
