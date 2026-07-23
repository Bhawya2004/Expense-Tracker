import gspread
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from google.oauth2.credentials import Credentials as UserCredentials
from google.auth.transport.requests import Request
from django.conf import settings
import logging

logger = logging.getLogger('expenses')

SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]

# ── Service Account client (kept as fallback for syncing existing sheets) ──
def get_sheets_client():
    creds = ServiceAccountCredentials.from_service_account_file(
        settings.GOOGLE_CREDENTIALS_FILE,
        scopes=SCOPES
    )
    return gspread.authorize(creds)


# ── OAuth-based client (uses the user's own Google credentials) ──
def get_user_sheets_client(profile):
    """
    Build a gspread client using the user's own OAuth2 tokens.
    Automatically refreshes the access token if it is expired.
    """
    creds = UserCredentials(
        token=profile.google_access_token,
        refresh_token=profile.google_refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
        scopes=SCOPES
    )

    # Refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Save the new access token back to the profile
        profile.google_access_token = creds.token
        if creds.expiry:
            from django.utils import timezone
            import pytz
            profile.google_token_expiry = creds.expiry.replace(tzinfo=pytz.UTC)
        profile.save(update_fields=['google_access_token', 'google_token_expiry'])
        logger.info(f"Refreshed Google token for user {profile.user.username}")

    return gspread.authorize(creds)


def create_user_sheet_oauth(profile, username):
    """
    Create a new Google Sheet in the USER's own Google Drive
    using their OAuth2 credentials.
    Returns the sheet ID.
    """
    client = get_user_sheets_client(profile)
    sheet = client.create(f"Expense Tracker - {username}")
    # Share so it can be embedded in an iframe
    sheet.share(None, perm_type='anyone', role='reader')
    # Add headers
    worksheet = sheet.get_worksheet(0)
    worksheet.append_row(['Date', 'Description', 'Category', 'Amount (₹)', 'Remaining Budget (₹)', 'Daily Budget (₹)', 'Daily Expense (₹)', 'Daily Saving (₹)'])
    # Format header row bold
    worksheet.format('A1:H1', {'textFormat': {'bold': True}})
    return sheet.id


def get_user_worksheet(sheet_id, profile=None):
    """Get a worksheet. Uses user's OAuth client if profile is provided, else service account."""
    if profile and profile.google_refresh_token:
        client = get_user_sheets_client(profile)
    else:
        client = get_sheets_client()
    sheet = client.open_by_key(sheet_id)
    return sheet.get_worksheet(0)


import threading
from collections import defaultdict

# Thread locks to prevent concurrent write race conditions on the same Google Sheet
_sheet_locks = defaultdict(threading.Lock)
_locks_lock = threading.Lock()

def get_sheet_lock(sheet_id):
    with _locks_lock:
        return _sheet_locks[sheet_id]


def sync_sheet(sheet_id, expenses, monthly_budget, profile=None):
    """Sync all expenses to the Google Sheet with thread locking."""
    lock = get_sheet_lock(sheet_id)
    with lock:
        _sync_sheet_inner(sheet_id, expenses, monthly_budget, profile)


def _sync_sheet_inner(sheet_id, expenses, monthly_budget, profile=None):
    """Core synchronization logic."""
    worksheet = get_user_worksheet(sheet_id, profile=profile)
    # Clear all data starting from row 1 to refresh everything including headers dynamically
    worksheet.batch_clear(['A1:Z1000'])
    
    # Overwrite headers to match current structure
    worksheet.update('A1:H1', [['Date', 'Description', 'Category', 'Amount (₹)', 'Remaining Budget (₹)', 'Daily Budget (₹)', 'Daily Expense (₹)', 'Daily Saving (₹)']])
    worksheet.format('A1:H1', {'textFormat': {'bold': True}})

    # Reset all data cells to white background and normal text first to prevent sticky red formatting
    white_fmt = {
        'backgroundColor': {'red': 1.0, 'green': 1.0, 'blue': 1.0},
        'textFormat': {
            'bold': False,
            'foregroundColor': {'red': 0.0, 'green': 0.0, 'blue': 0.0}
        }
    }
    try:
        worksheet.format('A2:H1000', white_fmt)
    except Exception as e:
        logger.error(f"Failed to reset sheet formatting: {e}")
    
    import calendar
    from collections import defaultdict    # Calculate daily totals across all expenses
    daily_totals = defaultdict(float)
    for e in expenses:
        daily_totals[str(e.date)] += float(e.amount)

    if profile and profile.budget_mode == 'balance':
        remaining = float(profile.current_balance)
        daily_budget = round(float(profile.fixed_daily_budget), 2)
    else:
        remaining = float(monthly_budget)
        daily_budget = round(float(monthly_budget) / 30.0, 2)
        
    rows = []
    
    # We will build rows and keep track of cell formatting requests
    # Header is row 1. Next row to write is row 2.
    current_row_idx = 2
    
    # Group expenses by date (in order, since expenses are pre-sorted by date ascending)
    from collections import OrderedDict
    expenses_by_date = OrderedDict()
    for e in expenses:
        d_str = str(e.date)
        if d_str not in expenses_by_date:
            expenses_by_date[d_str] = []
        expenses_by_date[d_str].append(e)
        
    expense_row_formats = [] # List of tuples: (row_idx, category, is_exceeded_saving)
    day_ended_rows = []      # List of row_idx
    
    for date_str, date_expenses in expenses_by_date.items():
        daily_exp = round(daily_totals[date_str], 2)
        daily_saving = round(daily_budget - daily_exp, 2)
        is_exceeded = (daily_saving < 0)
        
        # Add all expenses for this date
        for e in date_expenses:
            remaining -= float(e.amount)
            rows.append([
                str(e.date),
                e.description or '—',
                e.category,
                float(e.amount),
                round(remaining, 2),
                daily_budget,
                daily_exp,
                daily_saving
            ])
            expense_row_formats.append((current_row_idx, e.category, is_exceeded))
            current_row_idx += 1
            
        # Insert the highlighted "day is ended" summary row after all expenses for this day
        # ONLY if the date is in the past (the day has really ended).
        import pytz
        from datetime import datetime
        ist = pytz.timezone('Asia/Kolkata')
        today_date = datetime.now(ist).date()
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except Exception:
            date_obj = today_date
            
        if date_obj < today_date:
            rows.append([
                date_str,
                'day is ended',
                '',
                '',
                '',
                '',
                '',
                ''
            ])
            day_ended_rows.append(current_row_idx)
            current_row_idx += 1
        
    if rows:
        worksheet.append_rows(rows)

        # Sync category background colors and savings highlights
        COLOR_MAP = {
            'food': {'red': 0.78, 'green': 0.95, 'blue': 0.21},
            'transport': {'red': 0.21, 'green': 0.83, 'blue': 0.95},
            'shopping': {'red': 0.95, 'green': 0.21, 'blue': 0.78},
            'health': {'red': 0.95, 'green': 0.26, 'blue': 0.21},
            'entertainment': {'red': 0.95, 'green': 0.63, 'blue': 0.21},
            'bills': {'red': 0.21, 'green': 0.63, 'blue': 0.95},
            'other': {'red': 0.55, 'green': 0.55, 'blue': 0.55}
        }
        
        red_fmt = {'red': 1.0, 'green': 0.8, 'blue': 0.8}  # light red highlight
        day_ended_color = {'red': 0.92, 'green': 0.92, 'blue': 0.96} # soft lavender-gray

        try:
            requests = []
            
            # 1. Format the "day is ended" rows
            for row_idx in day_ended_rows:
                requests.append({
                    "repeatCell": {
                        "range": {
                            "sheetId": int(worksheet.id),
                            "startRowIndex": row_idx - 1,
                            "endRowIndex": row_idx,
                            "startColumnIndex": 0,
                            "endColumnIndex": 8
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": day_ended_color,
                                "textFormat": {
                                    "italic": True,
                                    "bold": True,
                                    "foregroundColor": {"red": 0.4, "green": 0.4, "blue": 0.5}
                                }
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor,textFormat)"
                    }
                })

            # 2. Format the category and exceeded savings cells for normal expense rows
            for row_idx, category, is_exceeded in expense_row_formats:
                color = COLOR_MAP.get(category.lower(), COLOR_MAP['other'])
                requests.append({
                    "repeatCell": {
                        "range": {
                            "sheetId": int(worksheet.id),
                            "startRowIndex": row_idx - 1,
                            "endRowIndex": row_idx,
                            "startColumnIndex": 2,  # Column C (Category)
                            "endColumnIndex": 3
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": color,
                                "textFormat": {
                                    "bold": True,
                                    "foregroundColor": {"red": 0, "green": 0, "blue": 0}
                                }
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor,textFormat)"
                    }
                })
                
                if is_exceeded:
                    requests.append({
                        "repeatCell": {
                            "range": {
                                "sheetId": int(worksheet.id),
                                "startRowIndex": row_idx - 1,
                                "endRowIndex": row_idx,
                                "startColumnIndex": 7,  # Column H (Daily Saving)
                                "endColumnIndex": 8
                            },
                            "cell": {
                                "userEnteredFormat": {
                                    "backgroundColor": red_fmt,
                                    "textFormat": {
                                        "bold": True,
                                        "foregroundColor": {"red": 0.6, "green": 0, "blue": 0}  # dark red text
                                    }
                                }
                            },
                            "fields": "userEnteredFormat(backgroundColor,textFormat)"
                        }
                    })
                    
            if requests:
                worksheet.spreadsheet.batch_update({"requests": requests})
        except Exception as err:
            logger.error(f"Failed to apply sheet formatting: {err}")


def highlight_category(sheet_id, category, profile=None):
    """
    Highlight rows in the Google Sheet that match the given category.
    If category is None, clear all highlights (whilst preserving red alerts and day ended rows).
    """
    worksheet = get_user_worksheet(sheet_id, profile=profile)
    all_values = worksheet.get_all_values()
    if len(all_values) <= 1:
        return  # Only header, nothing to highlight

    data_rows = all_values[1:]  # Skip header
    requests = []
    
    day_ended_color = {'red': 0.92, 'green': 0.92, 'blue': 0.96}
    highlight_color = {'red': 1.0, 'green': 0.95, 'blue': 0.6} # premium light yellow
    white_color = {'red': 1.0, 'green': 1.0, 'blue': 1.0}
    
    for i, row in enumerate(data_rows):
        row_idx = i + 2  # Skip header (row 1) and make it 1-based index
        start_row = row_idx - 1
        end_row = row_idx
        
        if len(row) > 1 and row[1] == 'day is ended':
            # Keep the "day is ended" styling
            requests.append({
                "repeatCell": {
                    "range": {
                        "sheetId": int(worksheet.id),
                        "startRowIndex": start_row,
                        "endRowIndex": end_row,
                        "startColumnIndex": 0,
                        "endColumnIndex": 8
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "backgroundColor": day_ended_color,
                            "textFormat": {
                                "italic": True,
                                "bold": True,
                                "foregroundColor": {"red": 0.4, "green": 0.4, "blue": 0.5}
                            }
                        }
                    },
                    "fields": "userEnteredFormat(backgroundColor,textFormat)"
                }
            })
        else:
            # Reset standard row columns A to G to white (preserving column H red alerts)
            requests.append({
                "repeatCell": {
                    "range": {
                        "sheetId": int(worksheet.id),
                        "startRowIndex": start_row,
                        "endRowIndex": end_row,
                        "startColumnIndex": 0,
                        "endColumnIndex": 7
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "backgroundColor": white_color,
                            "textFormat": {
                                "bold": False,
                                "foregroundColor": {"red": 0, "green": 0, "blue": 0}
                            }
                        }
                    },
                    "fields": "userEnteredFormat(backgroundColor,textFormat)"
                }
            })
            
            # Apply yellow highlight if matching category
            if category and len(row) > 2 and row[2].lower() == category.lower():
                requests.append({
                    "repeatCell": {
                        "range": {
                            "sheetId": int(worksheet.id),
                            "startRowIndex": start_row,
                            "endRowIndex": end_row,
                            "startColumnIndex": 0,
                            "endColumnIndex": 7
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": highlight_color
                            }
                        },
                        "fields": "userEnteredFormat(backgroundColor)"
                    }
                })
                
    if requests:
        try:
            worksheet.spreadsheet.batch_update({"requests": requests})
        except Exception as e:
            logger.error(f"Failed to batch update highlights: {e}")