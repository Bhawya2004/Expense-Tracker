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
* **Purpose:** Retrieves the current authenticated user's `monthly_budget`, the `budget_month` (when it was last set), and the `sheet_url` to access their Google Sheet.
* **Why we use it:** The frontend uses this to display budget progress bars and embedded Google Sheets, and to determine if it should ask the user to set a budget for the new month.

### 7. Update Budget
* **Endpoint:** `POST /api/budget/update/`
* **Purpose:** Updates the user's `monthly_budget` and sets the `budget_month` to the current month.
* **Why we use it:** When a user logs in for the first time or starts a new month, they submit this to update their spending limits.

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
