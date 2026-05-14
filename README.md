# 🚀 ExpenseTrack: Premium Full-Stack Dashboard

A modern, high-performance expense management application built with **React**, **Django REST Framework**, and **Google Sheets API**. This project features a stunning premium dark-mode UI, real-time Google Sheet synchronization, and a robust security architecture.

![Expense Tracker Dashboard](https://img.shields.io/badge/Status-Complete-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Django%20%7C%20Postgres-blue)

---

## ✨ Key Features

- 💎 **Premium UI**: Modern dark-mode dashboard with glassmorphism, smooth animations, and a focus on visual excellence.
- 📊 **Google Sheets Sync**: Every expense is automatically mirrored to a private Google Sheet in YOUR drive.
- 📱 **Mobile Responsive**: Fully optimized for phones and tablets with a collapsible sidebar and responsive cards.
- 🔒 **Secure Auth**: JWT-based authentication (stateless) with automatic token refreshing.
- 🔄 **Reliable OAuth**: Engineered to handle Google Sign-In via database-backed PKCE (No session-loss errors).
- 🏷️ **Dynamic Categories**: Color-coded category management with real-time filtering.
- 💰 **Budget Tracking**: Visual progress bars and real-time "Spent vs Remaining" calculations.

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
| `GET` | `/api/expenses/` | List current user expenses |
| `POST` | `/api/google/auth-url/` | Get Google OAuth link |

---

## 📝 License
MIT License. Feel free to use and modify for your own projects!
