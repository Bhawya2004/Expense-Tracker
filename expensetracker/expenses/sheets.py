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


def sync_sheet(sheet_id, expenses, monthly_budget, profile=None):
    """Sync all expenses to the Google Sheet."""
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
    from collections import defaultdict
    from datetime import datetime

    # Calculate daily totals across all expenses
    daily_totals = defaultdict(float)
    for e in expenses:
        daily_totals[str(e.date)] += float(e.amount)

    remaining = float(monthly_budget)
    rows = []
    for e in expenses:
        remaining -= float(e.amount)
        
        daily_budget = round(float(monthly_budget) / 30.0, 2)
        daily_exp = round(daily_totals[str(e.date)], 2)
        daily_saving = round(daily_budget - daily_exp, 2)

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

        try:
            requests = []
            for idx, e in enumerate(expenses):
                row_idx = idx + 1  # 0-indexed in Google Sheets API (row 2 is index 1)
                
                # 1. Category color mapping
                color = COLOR_MAP.get(e.category.lower(), COLOR_MAP['other'])
                requests.append({
                    "repeatCell": {
                        "range": {
                            "sheetId": int(worksheet.id),
                            "startRowIndex": row_idx,
                            "endRowIndex": row_idx + 1,
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
                
                # 2. Daily saving highlight if negative (exceeded daily budget)
                daily_budget_val = float(monthly_budget) / 30.0
                daily_exp_val = daily_totals[str(e.date)]
                daily_saving_val = daily_budget_val - daily_exp_val
                
                if daily_saving_val < 0:
                    requests.append({
                        "repeatCell": {
                            "range": {
                                "sheetId": int(worksheet.id),
                                "startRowIndex": row_idx,
                                "endRowIndex": row_idx + 1,
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
    If category is None, clear all highlights (whilst preserving red alert highlights).
    """
    worksheet = get_user_worksheet(sheet_id, profile=profile)
    all_values = worksheet.get_all_values()
    if len(all_values) <= 1:
        return  # Only header, nothing to highlight

    data_rows = all_values[1:]  # Skip header
    num_rows = len(data_rows)

    # Reset all columns except Column H (Daily Saving) to white background first (A to G)
    white_fmt = {'backgroundColor': {'red': 1, 'green': 1, 'blue': 1}}
    worksheet.format(f'A2:G{num_rows + 1}', white_fmt)

    if not category:
        return  # Just clearing highlights

    # Find rows that match the category (column C = index 2)
    highlight_fmt = {'backgroundColor': {'red': 1, 'green': 0.95, 'blue': 0.6}}
    for i, row in enumerate(data_rows):
        if len(row) > 2 and row[2].lower() == category.lower():
            row_num = i + 2  # +2 because 1-indexed and skip header
            worksheet.format(f'A{row_num}:G{row_num}', highlight_fmt)