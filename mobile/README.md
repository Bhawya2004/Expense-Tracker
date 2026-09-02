# 📱 ExpenseTrack Mobile App (React Native + Expo)

A user-friendly, high-performance mobile application for **ExpenseTrack**, built with **React Native**, **Expo**, and **Firebase Authentication**.

Featuring a cyberpunk glassmorphic dark theme, interactive SVG charts (Category Donut & Weekly Trends), dual-mode budgeting engine, real-time Google Sheets sync, and smart spending insights.

---

## ✨ Features

- 🔐 **Firebase Authentication**: Email/Password login & registration with instant backend JWT token exchange (`/api/token/firebase/`) and Google Sheet auto-provisioning.
- 💎 **Cyberpunk Dark Theme**: Glassmorphism surfaces, neon lime/cyan/magenta accents, and smooth feedback.
- 📊 **Interactive Category Donut Chart**: Touch-to-inspect category slices with percentage breakdowns and emoji badges.
- 📈 **Weekly Spending Trend Bar Chart**: 7-day spending bars with dynamic daily budget limit baseline.
- 💡 **Smart Financial Insights**: AI-style spending analysis (largest expense area %, burn rate, and end-of-month projected savings).
- 💰 **Dual Budget Engine**: Switch effortlessly between **Monthly Budget Mode** (with automatic 30-day daily division) and **Balance & Daily Limit Mode** (ideal for mid-month tracking).
- ⚡ **Instant Floating Action Button (FAB)**: Quick-add expense modal with amount keypad, category chips, and notes.
- 🔍 **Search & Filter Transactions**: Filter by text, category chips, time horizons (All time, This Month, Last 7 Days), and sort by date or amount.
- 🌐 **Google Sheets Integration**: Direct in-app sheet launch link and live sync status.
- ⚙️ **Configurable Backend Server**: Switch between localhost, Android emulator (`10.0.2.2`), local Wi-Fi IP, or live cloud API directly in the app.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Start Expo Development Server
```bash
npm start
# or
npx expo start
```

### 3. Run on Device / Simulator
- **iOS Simulator**: Press `i` in the Expo terminal.
- **Android Emulator**: Press `a` in the Expo terminal.
- **Physical Device**: Install **Expo Go** from App Store / Google Play and scan the QR code.

---

## ⚙️ Backend Connectivity

When testing on physical devices or emulators, make sure your Django backend is running (`python manage.py runserver 0.0.0.0:8000`):
- **iOS Simulator**: `http://localhost:8000/api`
- **Android Emulator**: `http://10.0.2.2:8000/api`
- **Physical Phone**: `http://<YOUR_COMPUTER_LOCAL_IP>:8000/api` (e.g. `http://192.168.1.15:8000/api`)

You can set or update this anytime in the app under **Profile ➔ Server Endpoint** or right from the **Auth screen**.
