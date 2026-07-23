# Expense Tracker API Documentation

This document outlines all the available API endpoints in the Expense Tracker backend. All endpoints (except where noted) require authentication via JWT tokens. The base URL for the API is `http://localhost:8000/api`.

---

## 🔐 Authentication & User Management

### 1. Register User
* **Endpoint:** `POST /api/register/`
* **Purpose:** Creates a new user account. Upon successful registration, it automatically creates a new Google Sheet for the user and saves a `UserProfile` linked to the new account.
* **Why we use it:** To allow new users to sign up for the platform and initialize their personal Google Sheet for syncing transactions.

### 2. Login (Obtain Token)
* **Endpoint:** `POST /api/token/`
* **Purpose:** Authenticates the user with their `username` and `password`. Returns a JWT `access` token (used for authentication in headers) and a `refresh` token.
* **Why we use it:** To authenticate the user and start a session securely.

### 3. Refresh Token
* **Endpoint:** `POST /api/token/refresh/`
* **Purpose:** Exchanges a valid `refresh` token for a new `access` token.
* **Why we use it:** Access tokens expire quickly for security reasons. This allows the frontend to silently obtain a new token without forcing the user to log in again.

### 4. Delete Account
* **Endpoint:** `DELETE /api/user/delete/`
* **Purpose:** Deletes the authenticated user's account and all associated data from the database.
* **Why we use it:** Gives the user control over their data, allowing them to permanently remove their account from the application.

### 5. Get User Statistics
* **Endpoint:** `GET /api/users/`
* **Purpose:** Returns the total count of registered users and basic public user info. (Does not require authentication).
* **Why we use it:** To display platform usage statistics (e.g., total active users) on the frontend.

---

## 💰 Budget Management

### 6. Get Current Budget
* **Endpoint:** `GET /api/budget/`
* **Purpose:** Retrieves the current authenticated user's budget settings.
* **Response Body:**
  ```json
  {
    "budget_mode": "monthly", // or "balance"
    "monthly_budget": "6000.00",
    "current_balance": "2500.00",
    "fixed_daily_budget": "150.00",
    "balance_setup_date": "2026-07-23", // setup date in YYYY-MM-DD
    "budget_month": "2026-07",
    "google_sheet_id": "...",
    "google_connected": true,
    "sheet_url": "...",
    "total_savings": 110.00
  }
  ```
* **Why we use it:** The frontend uses this to display budget progress bars, dynamic sidebar statistics, embedded Google Sheets, and to determine the active tracking scenario.

### 7. Update Budget
* **Endpoint:** `POST /api/budget/update/`
* **Purpose:** Updates the user's budget configuration.
* **Request Body (Monthly Mode):**
  ```json
  {
    "budget_mode": "monthly",
    "monthly_budget": 6000
  }
  ```
* **Request Body (Balance Mode):**
  ```json
  {
    "budget_mode": "balance",
    "current_balance": 2500,
    "fixed_daily_budget": 150
  }
  ```
* **Why we use it:** When a user logs in for the first time or wants to adjust their spending targets, they submit this to toggle modes and specify budget parameters.

---

## 🛒 Expense Tracking

### 8. List Expenses
* **Endpoint:** `GET /api/expenses/`
* **Purpose:** Retrieves a list of all expenses created by the authenticated user.
* **Query Parameters:**
  * `?category=...` (Filter by category: food, transport, etc.)
  * `?start=YYYY-MM-DD` (Filter by start date)
  * `?end=YYYY-MM-DD` (Filter by end date)
* **Why we use it:** To load the user's transactions into the frontend interface and calculate statistics like total spent, remaining balance, and top categories.

### 9. Create Expense
* **Endpoint:** `POST /api/expenses/`
* **Purpose:** Records a new expense for the authenticated user and simultaneously syncs the data to their Google Sheet.
* **Why we use it:** This is the core function of the app. It records what the user spent and automatically recalculates their remaining budget in the background.

### 10. Get Specific Expense
* **Endpoint:** `GET /api/expenses/<id>/`
* **Purpose:** Retrieves the details of a single specific expense by its database ID.
* **Why we use it:** Useful if the frontend needs to view the detailed view of a single transaction.

### 11. Update Expense
* **Endpoint:** `PUT /api/expenses/<id>/` or `PATCH /api/expenses/<id>/`
* **Purpose:** Modifies an existing expense and re-syncs the entire history with the Google Sheet.
* **Why we use it:** If the user makes a typo in the amount or category, they can fix it without having to delete and recreate the expense.

### 12. Delete Expense
* **Endpoint:** `DELETE /api/expenses/<id>/`
* **Purpose:** Deletes an expense from the database and updates the Google Sheet to reflect the removed transaction.
* **Why we use it:** Allows users to undo or remove transactions that were added by mistake.

---

## 🔗 Google Sheets & OAuth Integrations

### 13. Generate Google OAuth URL
* **Endpoint:** `GET /api/google/auth-url/`
* **Query Parameters:**
  * `?flow=register` (default, requests full consent/offline access to get Google Sheet write scopes and refresh token)
  * `?flow=login` (requests account selection without forcing re-authorization if already consented)
* **Purpose:** Returns the Google login consent authorization URL.
* **Why we use it:** Redirects the user to Google to securely link their Google Drive and Google Sheets to the expense tracker.

### 14. Google OAuth Callback
* **Endpoint:** `GET /api/google/callback/`
* **Purpose:** Receives the Google auth code, logs in/registers the user, generates JWT tokens, and redirects back to the frontend with token parameters: `?access=...&refresh=...&username=...&google=connected`.
* **Why we use it:** Completes the Google authentication flow and issues session tokens.

### 15. Highlight Sheet Category Rows
* **Endpoint:** `POST /api/sheet/highlight/`
* **Request Body:**
  ```json
  { "category": "food" }
  ```
  *(Pass `null` to clear highlights)*
* **Purpose:** Highlights all rows matching the specified category in the user's active Google Sheet in its theme color, while leaving columns D to H unchanged (preserving red saving overrun flags).
* **Why we use it:** Triggered on hover/click filter actions on the dashboard sidebar to visually isolate matching transactions in the embedded Google Sheet view.
