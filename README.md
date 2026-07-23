# 🚀 ExpenseTrack: Premium Full-Stack Dashboard

A modern, high-performance expense management application built with **React**, **Django REST Framework**, and **Google Sheets API**. This project features a stunning premium dark-mode UI, real-time Google Sheet synchronization, and a robust security architecture.

![Expense Tracker Dashboard](https://img.shields.io/badge/Status-Complete-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Django%20%7C%20Postgres-blue)

---

## ✨ Key Features

- 💎 **Premium UI & Charts**: Modern dark-mode dashboard featuring glassmorphism, interactive SVG charts (Category breakdown doughnut and weekly trend bar chart), and custom animations.
- 💰 **Dual Budget Modes**: Set a standard monthly budget (with 30-day daily divisions) or input a custom starting balance and daily limit (ideal for mid-month onboarding).
- 📊 **Google Sheets Sync**: Every transaction is mirrored to a private Google Sheet automatically. Syncs run in background threads protected by thread locks to keep the app fast and safe from race conditions.
- 📆 **Date Range Filtering**: Filter transaction lists and analytics charts by specific starting and ending dates.
- 🔒 **Unified Google Sign-In**: Register or Login instantly with Google from the auth screen. This immediately creates and authorizes your Google Sheet in a single step.
- 📉 **Daily Budget & Saving Sync**: Google Sheets dynamically computes and tracks your Daily Budget, Daily Expense, and Daily Saving. Exceeded budgets highlight in soft red.
- 🏷️ **Dynamic Category Filtering**: Color-coded category tags with real-time sidebar filters.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Axios, Lucide Icons, CSS3 (BEM) |
| **Backend** | Django 6.x, Django REST Framework, JWT (SimpleJWT) |
| **Database** | **Neon PostgreSQL** (Production), SQLite (Fallback) |
| **Integrations** | Google Sheets API, Google Drive API, OAuth2 |
| **Deployment** | Vercel (Frontend), Render (Backend), WhiteNoise |

---

## 📂 Project Structure

```bash
Expense-Tracker/
├── frontend/             # React (Vite) Application
│   ├── src/
│   │   ├── components/   # Modular UI Components
│   │   ├── api.js        # Centralized Axios with Interceptors
│   │   └── index.css     # Global Design System
├── expensetracker/       # Django Backend
│   ├── expenses/         # Main logic, Models, Views, Sheets integration
│   ├── settings.py       # Configured for Neon Postgres & CORS
│   └── urls.py           # API Router
├── requirements.txt      # Python Dependencies
├── vercel.json           # Vercel Deployment Config
└── .env                  # Environment Secrets
```

---

## ⚙️ Setup & Installation

### 1. Backend Setup
```bash
# Clone the repo
git clone https://github.com/Bhawya2004/Expense-Tracker.git
cd Expense-Tracker

# Setup Virtual Env
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
cd expensetracker
python manage.py migrate
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

### 3. Environment Configuration (.env)
Create a `.env` file in the root directory with these keys:
```ini
SECRET_KEY=your_django_secret
DEBUG=True
DATABASE_URL=your_neon_postgres_url
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:8000/api/google/callback/
FRONTEND_URL=http://localhost:5173
```

---

## 🌐 API Documentation

Detailed API documentation can be found in [API_DOCUMENTATION.md](file:///Users/bhawyagulati/Documents/Projects/Expense-Tracker%20/API_DOCUMENTATION.md).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register/` | Register new user |
| `POST` | `/api/token/` | Login & get JWT |
| `GET` | `/api/google/auth-url/` | Get Google OAuth link (`?flow=login` or `?flow=register`) |
| `GET` | `/api/expenses/` | List current user expenses & filter by category/date |
| `POST` | `/api/expenses/` | Create a new expense & auto-sync to Sheets |
| `POST` | `/api/budget/update/` | Update monthly budget & auto-sync to Sheets |
| `POST` | `/api/sheet/highlight/` | Highlight specific category rows in Google Sheet |

---

## 📝 License
MIT License. Feel free to use and modify for your own projects!
