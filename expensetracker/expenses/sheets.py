import gspread
from google.oauth2.service_account import Credentials as ServiceAccountCredentials
from google.oauth2.credentials import Credentials as UserCredentials
from google.auth.transport.requests import Request
from django.conf import settings
import logging

logger = logging.getLogger('expenses')

SCOPES = [
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
    worksheet.append_row(['Date', 'Description', 'Category', 'Amount (₹)', 'Remaining Budget (₹)'])
    # Format header row bold
    worksheet.format('A1:E1', {'textFormat': {'bold': True}})
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
    # Clear all data starting from row 2 (leaves empty rows intact for a better visual experience)
    worksheet.batch_clear(['A2:Z1000'])
    
    # Recalculate all rows with running budget
    remaining = float(monthly_budget)
    rows = []
    for e in expenses:
        remaining -= float(e.amount)
        rows.append([
            str(e.date),
            e.description or '—',
            e.category,
            float(e.amount),
            round(remaining, 2)
        ])
    if rows:
        worksheet.append_rows(rows)


def highlight_category(sheet_id, category, profile=None):
    """
    Highlight rows in the Google Sheet that match the given category.
    If category is None, clear all highlights.
    """
    worksheet = get_user_worksheet(sheet_id, profile=profile)
    all_values = worksheet.get_all_values()
    if len(all_values) <= 1:
        return  # Only header, nothing to highlight

    data_rows = all_values[1:]  # Skip header
    num_rows = len(data_rows)

    # Reset all data rows to white background first
    white_fmt = {'backgroundColor': {'red': 1, 'green': 1, 'blue': 1}}
    worksheet.format(f'A2:E{num_rows + 1}', white_fmt)

    if not category:
        return  # Just clearing highlights

    # Find rows that match the category (column C = index 2)
    highlight_fmt = {'backgroundColor': {'red': 1, 'green': 0.95, 'blue': 0.6}}
    for i, row in enumerate(data_rows):
        if len(row) > 2 and row[2].lower() == category.lower():
            row_num = i + 2  # +2 because 1-indexed and skip header
            worksheet.format(f'A{row_num}:E{row_num}', highlight_fmt)