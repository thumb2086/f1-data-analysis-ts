# F1 Data Analysis — TypeScript (Monza 2024)

Monza 2024 Italian Grand Prix 的完整 F1 數據分析，TypeScript 移植版。

## 快速開始

```bash
npm install
npm run build
npm run smoke       # 一次測試所有模組
```

## 專案結構

```
f1-data-analysis-ts/
├── raw/                          ← Monza 2024 原始 CSV
│   ├── laps.csv                  # 圈速、分段、輪胎、位置
│   ├── results.csv               # 最終排名、積分、起跑位
│   ├── weather.csv               # 氣溫、賽道溫度、濕度、降雨
│   ├── stints.csv                # 輪胎策略與 stint 長度
│   ├── race_control.csv          # 安全車、黃旗、紅旗
│   ├── telemetry_VER.csv         # VER 單圈遙測 (Speed, Throttle, Brake, RPM)
│   └── schedule_2024.csv         # 賽程資訊
├── src/
│   ├── data_loader.ts            ← 資料載入層 (CSV → typed interfaces)
│   ├── lap_analysis.ts           ← 圈速分析
│   ├── tyre_analysis.ts          ← 輪胎策略與衰退分析
│   ├── weather_analysis.ts       ← 天氣分析
│   ├── race_analysis.ts          ← 賽事分析（排名、得失位）
│   ├── telemetry_analysis.ts     ← 遙測分析（煞車點、油門、檔位）
│   ├── coaching.ts               ← Sim Racing 教練（VER benchmark）
│   ├── dashboard.ts              ← CLI 簡易儀表板
│   ├── prediction/
│   │   ├── types.ts              ← 預測型別
│   │   ├── features.ts           ← 特徵萃取
│   │   ├── baseline.ts           ← 規則為主的預測 baseline
│   │   ├── generator.ts          ← CSV/MD 產出
│   │   └── __main__.ts           ← CLI 入口
│   ├── reports/
│   │   ├── types.ts              ← 報告型別
│   │   ├── report_builder.ts     ← 賽事報告組合
│   │   └── render.ts             ← Markdown/HTML 渲染
│   ├── rating/
│   │   ├── types.ts              ← 評分型別
│   │   ├── features.ts           ← 評分特徵
│   │   └── scoring.ts            ← 加權評分系統
│   └── bot/
│       ├── types.ts              ← Bot 型別
│       ├── services.ts           ← 服務層
│       ├── commands.ts           ← 指令註冊器
│       ├── render.ts             ← 文字/JSON 渲染
│       └── demo.ts               ← CLI Demo 入口
└── scripts/
    └── smoke_test.ts             ← 一次性驗證
```

## 產品對照

| 產品 | Python | TypeScript |
|------|--------|------------|
| 儀表板 | `streamlit run src/dashboard.py` | `npm run dashboard` (Vite) |
| 預測 | `python -m src.prediction` | `npm run prediction` |
| 報告 | `python -m src.reports.report_builder` | `npm run report` |
| 評分 | `from src.rating import build_rating_leaderboard` | `npm run rating` |
| 教練 | `python src/coaching.py raw/telemetry_VER.csv` | `npm run coaching` |
| Bot | `python -m src.bot.demo` | `npm run bot` |

## 環境需求

- Node.js 18+