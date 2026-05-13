# Expense Tracker API

A REST API built with Django and Django REST Framework that allows users to manage their personal expenses. Includes JWT authentication, category-based filtering, API rate limiting, and file-based logging.

---

## Tech Stack

- **Backend** — Django 6.x, Django REST Framework
- **Authentication** — JWT via `djangorestframework-simplejwt`
- **Database** — SQLite (development)
- **Frontend** — Vanilla HTML / CSS / JS (served via Django templates)
- **Other** — `django-cors-headers`, Python `logging`

---

## Features

- User registration and login with JWT authentication
- Create, read, update, and delete expenses
- Filter expenses by category and date range
- API rate limiting (20 requests/day for anonymous, 100/day for authenticated users)
- File-based logging to `expenses.log`
- Clean frontend UI served at `/`

---

## Project Structure

```
expensetracker/
├── templates/
│   └── index.html          # Frontend UI
├── expenses/
│   ├── models.py           # Expense model
│   ├── serializers.py      # ExpenseSerializer
│   ├── views.py            # ExpenseViewSet + register_user
│   └── urls.py             # Router config
├── expensetracker/
│   ├── settings.py         # JWT + throttling + logging config
│   └── urls.py             # Root URL config
├── expenses.log            # Auto-generated log file
└── manage.py
```

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd expensetracker
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

### 4. Run migrations

```bash
python manage.py migrate
```

### 5. Create a superuser

```bash
python manage.py createsuperuser
```

### 6. Start the server

```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000/` to open the frontend.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register/` | Register a new user |
| POST | `/api/token/` | Login — returns access + refresh token |
| POST | `/api/token/refresh/` | Get a new access token using refresh token |

### Expenses

All expense endpoints require `Authorization: Bearer <access_token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses/` | List all expenses |
| POST | `/api/expenses/` | Create a new expense |
| GET | `/api/expenses/<id>/` | Get a single expense |
| PUT | `/api/expenses/<id>/` | Update an expense |
| DELETE | `/api/expenses/<id>/` | Delete an expense |

### Filtering

```
GET /api/expenses/?category=food
GET /api/expenses/?start=2026-01-01&end=2026-05-01
GET /api/expenses/?category=food&start=2026-01-01
```

---

## Expense Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Auto-generated primary key |
| `user` | ForeignKey | Owner of the expense |
| `amount` | DecimalField | Amount in ₹ (must be > 0) |
| `category` | CharField | One of: food, transport, shopping, health, entertainment, other |
| `description` | TextField | Optional description |
| `date` | DateField | Date of the expense |
| `created_at` | DateTimeField | Auto-set on creation |

---

## Example Requests

### Register

```bash
curl -X POST http://127.0.0.1:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secret123"}'
```

### Login

```bash
curl -X POST http://127.0.0.1:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "secret123"}'
```

### Create Expense

```bash
curl -X POST http://127.0.0.1:8000/api/expenses/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": "250.00", "category": "food", "description": "Lunch", "date": "2026-05-13"}'
```

### Filter by Category

```bash
curl http://127.0.0.1:8000/api/expenses/?category=food \
  -H "Authorization: Bearer <access_token>"
```

---

## Key Design Decisions

**DecimalField for amount** — `FloatField` has floating point rounding errors. `DecimalField` ensures precise money calculations.

**JWT over session auth** — Stateless authentication suits REST APIs. The short-lived access token (5 min) + long-lived refresh token (7 days) pattern avoids re-login while staying secure.

**get_queryset filtering** — All queries start with `filter(user=request.user)` so users can never access each other's data, regardless of what filters they pass.

**CATEGORY_CHOICES** — Constraining category to a fixed set at the model level prevents invalid data from ever reaching the database.

**Rate limiting** — DRF's built-in throttling tracks request counts per user in Django's cache and returns `429 Too Many Requests` automatically — no extra view code needed.

---

## Admin Panel

Visit `http://127.0.0.1:8000/admin/` to manage users and expenses via Django's built-in admin interface.

---

## License

MIT
