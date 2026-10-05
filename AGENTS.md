# AGENTS.md — Crypto Arbitrage Telegram Mini App

## 📌 Overview & Project Identity
This repository contains a full-featured, high-performance **Telegram Mini App (TWA)** for cryptocurrency arbitrage investment. The application enables users to explore real-time cross-exchange price spreads, activate automated arbitrage yield strategies, manage multi-chain crypto wallets and deposits, track portfolio balances, and interact with a dedicated Telegram bot.

- **App Name:** Crypto Arbitrage Mini App
- **Primary Platform:** Telegram Mini App (TWA) & Cloud Run / Web
- **Target Audience:** Crypto traders, arbitrage investors, Telegram bot users
- **Design Aesthetic:** Dark high-contrast trading terminal (`#0C0C0E` background, `#121318` cards, emerald green & cyan accents, gold highlight elements)

---

## 🔑 Administrative & Security Credentials
The application features built-in role-based access control (RBAC). Admin privileges are granted automatically based on Telegram User IDs or Usernames:

- **Primary Admin Telegram ID:** `5951882585`
- **Primary Admin Telegram Username:** `@ai_zke`
- **Default Support Username:** `@ai_zke`
- **Environment Admin Override:** Defined via `VITE_ADMIN_TELEGRAM_IDS` in `.env`
- **Admin Control Portals:** Accessible via the UI when logged in as an admin (`InternalSecurityDesk.tsx`, `AdminControlPortal.tsx`, and `AdminBotsHub.tsx`).

---

## 🏗️ Architecture & Tech Stack

### Frontend Stack
- **Framework:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS (utility classes with custom dark theme)
- **Icons:** `lucide-react`
- **Telegram SDK:** `@twa-dev/sdk` for native Telegram Mini App integration (`window.Telegram.WebApp`)
- **Real-time Feeds:** WebSockets (`useBinanceTicker.ts`) for live Binance market ticker streams

### Backend & Storage
- **Database:** Firebase Firestore (`ai-studio-cryptoarbitragem-a3f5675b-4cfc-409d-8438-086c8f3aaebe`)
- **Authentication:** Anonymous Firebase Auth paired with Telegram WebApp InitData validation and auto-user provisioning (`AuthContext.tsx`)
- **API Server / Routing:** Client SPA served via Vite / Cloud Run, proxying Telegram Bot Webhooks via `telegramBotService.ts`

---

## 📁 Key Files & Directory Structure

```
/src
├── App.tsx                     # Main router & tab navigation controller
├── main.tsx                    # Entry point
├── types.ts                     # Centralized TypeScript types & interfaces
├── context/
│   └── AuthContext.tsx         # Telegram user auto-auth, admin role resolution, referral link parsing
├── components/
│   ├── InternalSecurityDesk.tsx # Primary Admin Panel (user balance edits, deposit approvals, audit logs)
│   ├── AdminControlPortal.tsx  # System settings, wallet management, announcement banners
│   ├── AdminBotsHub.tsx        # Telegram Bot management, webhook status, bot token setup
│   ├── BlockchainScannerModal.tsx # Embedded transaction hash inspector (Etherscan, BscScan, Tronscan)
│   └── Layout.tsx              # Application navbar, header stats, and container framing
├── pages/
│   ├── Home.tsx                # Market arbitrage matrix, live ticker, active bot stats
│   ├── Earn.tsx                # Arbitrage strategy plans (Flash Loan, Cross-Exchange, Triangular)
│   ├── Assets.tsx              # Portfolio overview, deposit/withdrawal history, bonus balance
│   ├── Deposit.tsx             # Multi-chain crypto deposit modal with QR codes & proof submission
│   ├── Profile.tsx             # User profile, referral link generator, live support link (@ai_zke)
│   └── DemoTerminal.tsx        # Interactive sandbox terminal for testing strategy execution
├── services/
│   ├── systemService.ts        # Firestore CRUD operations for settings, wallets, deposits, users
│   └── telegramBotService.ts   # Telegram Bot API integration, webhook handler, notification sender
├── hooks/
│   └── useBinanceTicker.ts     # Live crypto price stream hook
└── lib/
    └── firebase.ts             # Firebase app & Firestore initialization
```

---

## 🗄️ Firestore Collections Schema

1. **`users`**
   - `id`: string (Telegram ID or UUID)
   - `telegramId`: number
   - `telegramUsername`: string
   - `balance`: number (USD main balance)
   - `bonusBalance`: number (USD bonus balance)
   - `role`: `'admin'` | `'user'`
   - `referredBy`: string (Referrer user ID)
   - `createdAt`: timestamp

2. **`deposits`**
   - `id`: string
   - `userId`: string
   - `telegramId`: number
   - `telegramUsername`: string
   - `coin`: string (`USDT`, `TON`, `BTC`, `ETH`)
   - `network`: string (`TRC20`, `BEP20`, `ERC20`, `TON`)
   - `amount`: number (USD)
   - `cryptoAmount`: number
   - `status`: `'pending'` | `'approved'` | `'rejected'`
   - `proofImageUrl`: string (optional proof screenshot)
   - `txHash`: string (blockchain transaction hash)
   - `createdAt`: timestamp

3. **`system_settings`**
   - `announcement`: string
   - `isAnnouncementActive`: boolean
   - `minDeposit`: number
   - `minWithdrawal`: number
   - `adminTelegramIds`: array of string/number IDs
   - `supportTelegramUsername`: string (`ai_zke`)
   - `maintenanceMode`: boolean

4. **`wallets`**
   - `coin`: string (`USDT_TRC20`, `USDT_BEP20`, `TON`, `BTC`, `ETH`)
   - `address`: string (Admin system deposit address)
   - `network`: string
   - `memo`: string (optional TON memo)

5. **`bot_configs`**
   - `botToken`: string (Telegram Bot API token)
   - `botUsername`: string
   - `webhookUrl`: string
   - `isActive`: boolean

---

## ⚙️ Core Business Logic & User Flows

### 1. Telegram Authentication & Onboarding
- When opened inside Telegram, `AuthContext.tsx` reads `window.Telegram.WebApp.initDataUnsafe.user`.
- Automatically registers new users in Firestore with a $5.00 starter bonus.
- Parses URL start parameters (`startapp`, `tgWebAppStartParam`, `ref`) to attribute referral credit.
- When accessed in a regular web browser, falls back to a interactive Demo/Guest session.

### 2. Arbitrage Deposit Flow
- Users navigate to **Deposit**, select a currency (USDT-TRC20, USDT-BEP20, TON, BTC, ETH) and enter an amount.
- Displays system wallet QR code and copyable deposit address.
- User submits payment proof or transaction hash (`txHash`).
- Triggers an instant automated Telegram notification to the Admin (`5951882585` / `@ai_zke`).
- Admin approves or rejects the deposit inside `InternalSecurityDesk.tsx`, updating the user's balance instantly.

### 3. Investment Strategies & ROI
- Users activate strategy bots in **Earn** using main or bonus balance.
- Yields accrue dynamically based on strategy percentage parameters.

### 4. Admin Security Desk & Bot Hub
- Admins see an "Admin Desk" button in the profile/navbar.
- Can view all user accounts, adjust balances, approve pending deposits, update wallet deposit addresses, send broadcast announcements to all bot users, and inspect webhooks.

---

## 🛡️ Special Webview & Cross-Origin Rules
To ensure the app renders smoothly inside Telegram webviews, Google Cloud Run, and Vite preview iframes without security exceptions:
- `index.html` contains a defensive `Location.prototype` getter polyfill to safely intercept cross-origin frame access errors (`Failed to read property 'origin' from 'Location'`).
- Always keep this polyfill intact in `index.html`.

---

## 🎯 Instructions for Future AI Agents
When extending or modifying this project:
1. **Respect Existing Admin Structure:** Keep admin IDs (`5951882585`, `@ai_zke`) authorized across components.
2. **Database Integration:** Always use Firestore via `systemService.ts` for database reads/writes.
3. **UI Consistency:** Maintain the high-contrast dark theme (`bg-[#0C0C0E]`, emerald `#10B981`, gold `#F59E0B`).
4. **Preserve Telegram WebApp Compatibility:** Ensure components handle both Telegram environment (`window.Telegram.WebApp`) and standard web browsers gracefully.
5. **No Mock Stubs:** Always ensure features are connected to real state and Firestore handlers.
