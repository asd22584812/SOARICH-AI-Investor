# SOARICH AI Investor 修復紀錄

分支：`fix/market-radar-financial-valuation`。基底：`743154e`。
狀態：本機修復與測試完成；沒有合併 main，也沒有部署。GitHub 建立遠端分支回傳 403 `Resource not accessible by integration`，因此尚未推送。

## 原因與修正

- 雷達只讀取本機 SQLite，空資料卻回傳「正在更新」，沒有啟動掃描。改為每次推薦請求執行最多四檔、兩條工作流程的掃描批次，持久化清單與游標；首頁每 15 秒更新。交易所目前名單提供台股上市／上櫃與美股 Nasdaq／其他交易所股票，沒有固定選股池。真正無符合條件的股票仍允許空結果。
- 移除台、美股寫死的備援清單使用路徑。來源不通時明確失敗。ETF、測試證券、權證等不以普通股模型推薦。掃描使用交易所對應的精確 Yahoo 代碼，不用相似名稱搜尋替代。
- 掃描不再先刪除舊資料。加入跨程序租約與中斷恢復，保留兩天內且符合新版模型的快照，舊版錯誤估值不混入結果。單檔資料不足會計入失敗，不能當作成功刷新。每日命令的一個市場失敗不會中止另一個市場。
- Yahoo 財報百分率依來源單位轉換，負債權益比一律由百分數轉為倍數，保留零負債、零成長與負值；補足 sector／industry 欄位。EPS 不再用 forward EPS 冒充 TTM；自由現金流不再用營業現金流或 EPS × 0.75 代替。
- 分開記錄報價幣別與財報幣別；不明或不一致時停止金額估值，不猜匯率或 ADR 股數換算。實際查詢 TSM 確認 USD 股價搭配 TWD 財務資料。市值分級也不再直接對 TWD 套用 USD 門檻。
- DCF 移除股價倍數上下限及 EPS 替代，允許負成長假設；PEG 改為盈餘成長率 × 目標 PEG，資料缺少時不用 PEG 模型。移除現價回填合理價。資料不足回傳 null，介面不畫假合理價與安全邊際。
- 低估清單排除負安全邊際。移除熱門股及個股頁生成的假歷史行情，以及以今日資產回填過去每天的假績效曲線。自選股改讀取使用者本機儲存清單，不再預載示範股票。

## 驗證

- `npm test`：10／10 通過。涵蓋財務單位、缺少 FCF、跨幣別、ETF 排除、DCF、PEG、零／負數、雷達分類、交易所清單解析、來源失敗、兩市場掃描與 API、保留快照、租約及舊版快照隔離。測試使用隔離的測試資料與暫存資料庫，不會注入正式回應。
- `npx tsc --noEmit`：通過。
- `npm run build`：通過；Turbopack 有 SQLite 可設定路徑導致檔案追蹤範圍偏大的警告。
- 修改範圍的 ESLint 檢查：無錯誤；normalizer 有一項既有型別常數警告。
- 全專案 lint 基底有 12 errors／18 warnings；本次後仍有 8 errors／14 warnings，主要在既有 analysis 頁、search-bar、持股表單、splash-gate、use-portfolio、mini-area-chart 與 input。沒有關閉 lint 規則掩蓋問題。
- 真實來源連線：TSM 查詢成功並確認幣別錯配；2330.TW、AAPL、TWSE／TPEx 與 Nasdaq 清單在此環境測試逾時。因此沒有完成全市場即時端到端驗收，也不保證目前一定出現推薦股。

## 執行條件與待驗收事項

1. 此架構仍使用 SQLite；服務及排程需共用可寫入、持久化的 `MARKET_DATA_DIR`。多個獨立無伺服器實例的暫存磁碟不會共用資料。未修改任何正式環境設定。
2. 首頁批次掃描只在有人請求時推进；完整市場更新應執行既有 `npm run scan:daily` 排程。這次沒有替使用者建立外部排程。
3. 上線前需在實際運行環境確認交易所與 Yahoo 可連線、全市場掃描成功數與缺漏數、資料時效，以及頁面結果。來源限流或缺資料會明確顯示，不用假資料補足。
4. 模型仍是帶有固定假設的啟發式估值，並非官方合理價。DCF 折現率 10%、永續成長 2.5%、營收成長代理，以及 PE/PB 倍數等假設仍需後續校準；跨幣別 ADR 與 ETF 需要獨立方法，目前不硬算。
5. 本次未接入真實歷史行情。相關圖表顯示缺資料，沒有用示意曲線冒充歷史價格。

## 套用修補檔（不部署）

先確認儲存庫乾淨並更新 main，建立同名修復分支，再執行 `git am SOARICH-Investor-repair.patch`；若 main 已變更而衝突，先人工檢查衝突，不要強制覆蓋。執行 `npm ci`、`npm test`、`npm run build` 後才進行程式審查。修補檔不包含資料庫、node_modules、憑證或實際行情快照。

## Preview follow-up — 2026-10-14

- Vercel now opens SQLite in its writable temporary directory when MARKET_DATA_DIR is not set, instead of the deployed application directory. This is a preview compatibility fix, not shared durable storage: cold starts may restart scanning and separate function instances may have different snapshots. Production still requires a shared persistent database or a persistent scanner host.
- Empty radar sections show the actual loading/error message instead of claiming no eligible stocks when retrieval failed.
- Buffett panel explicitly labels its cash-flow score, displays actual debt/equity, formats ROE, and avoids implying Buffett endorsement.
- Quote badge no longer claims LIVE without verifying quote freshness.
- Preview endpoint could not be inspected anonymously due to Vercel Authentication. Current screenshots do not establish financial source freshness or validate the fair-value estimate.
