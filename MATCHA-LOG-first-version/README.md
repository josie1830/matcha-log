# MATCHA LOG｜我的抹茶圖鑑

私人抹茶收藏管理 App（手機與電腦共用、Supabase 雲端同步）。

## 本機啟動
1. 安裝 Node.js 20 或更新版本。
2. 複製 `.env.example` 並改名為 `.env`。
3. 填入 Supabase Project URL 與 Publishable Key。
4. 執行 `npm install`，再執行 `npm run dev`。

## Supabase
在 Supabase SQL Editor 執行 `supabase-setup.sql`。此 App 使用 Google OAuth；需在 Supabase Authentication > Providers 啟用 Google，並設定 Google OAuth client 與 redirect URL。

## 第一版功能
- Google 登入
- 新增品牌與抹茶品項
- 想收集／已入手／已開封／已喝完
- 收藏與品飲分開記錄
- 限定品標記、容量、價格、備註
- 搜尋、狀態篩選、收藏統計

圖片、風味標籤、評分與匯入完整品牌目錄可在後續版本加入。
