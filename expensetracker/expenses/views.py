from django.http import HttpResponseRedirect, JsonResponse
import os
import logging
import json
from datetime import datetime
from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.shortcuts import redirect
from django.conf import settings
from django.db import connection
from expenses.models import *
from expenses.serializers import ExpenseSerializer
from expenses.sheets import sync_sheet, highlight_category
import firebase_admin
from firebase_admin import auth


logger = logging.getLogger('expenses')

def _get_service_account_email():
    try:
        import json
        with open(settings.GOOGLE_CREDENTIALS_FILE) as f:
            creds_data = json.load(f)
            return creds_data.get('client_email', '')
    except Exception:
        return 'expense-tracker-bot@expense-tracker-496312.iam.gserviceaccount.com'

# ── Google OAuth2 scopes ──
GOOGLE_SCOPES = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
]


# ── USER COUNT ──
@api_view(['GET'])
@permission_classes([AllowAny])
def user_count(request):
    count = User.objects.count()
    users = User.objects.values('id', 'username', 'email', 'date_joined')
    return Response({'total_users': count, 'users': list(users)})


# ── UPDATE BUDGET ──
@api_view(['POST'])
def update_budget(request):
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)

    import pytz
    from datetime import datetime
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = datetime.now(ist)
    current_calendar_month = now_ist.strftime('%Y-%m')

    target_month = request.data.get('target_month') or current_calendar_month
    mode = request.data.get('budget_mode', 'monthly')
    
    if target_month == current_calendar_month:
        profile.budget_mode = mode
        if mode == 'balance':
            profile.current_balance = request.data.get('current_balance', 0)
            profile.fixed_daily_budget = request.data.get('fixed_daily_budget', 0)
            profile.balance_setup_date = now_ist.date()
            profile.budget_month = current_calendar_month
        else:
            profile.monthly_budget = request.data.get('monthly_budget', 0)
            profile.budget_month = current_calendar_month
        profile.save()

    # Track per-month budget history
    from expenses.models import MonthlyBudgetHistory
    m_budget = request.data.get('monthly_budget', 0) if mode == 'monthly' else 0
    s_balance = request.data.get('current_balance', 0) if mode == 'balance' else 0
    d_budget = request.data.get('fixed_daily_budget', 0) if mode == 'balance' else (float(m_budget) / 30.0 if float(m_budget) > 0 else 0)

    MonthlyBudgetHistory.objects.update_or_create(
        user=request.user,
        month=target_month,
        defaults={
            'budget_mode': mode,
            'monthly_budget': m_budget,
            'starting_balance': s_balance,
            'fixed_daily_budget': d_budget
        }
    )

    sheet_url = ''
    if profile.google_sheet_id:
        sheet_url = f"https://docs.google.com/spreadsheets/d/{profile.google_sheet_id}"
        
        # Trigger background sheet sync when budget is updated
        import threading
        user_id = request.user.id
        def run_sync():
            from django.contrib.auth.models import User
            try:
                user = User.objects.get(id=user_id)
                prof = user.profile
                expenses = Expense.objects.filter(user=user).order_by('date')
                sync_sheet(prof.google_sheet_id, expenses, prof.monthly_budget, profile=prof)
            except Exception as e:
                logger.error(f"Async sheet sync from update_budget failed: {e}")
        t = threading.Thread(target=run_sync)
        t.daemon = True
        t.start()

    histories = {}
    for h in MonthlyBudgetHistory.objects.filter(user=request.user):
        histories[h.month] = {
            'budget_mode': h.budget_mode,
            'monthly_budget': float(h.monthly_budget),
            'starting_balance': float(h.starting_balance),
            'fixed_daily_budget': float(h.fixed_daily_budget)
        }

    total_savings = calculate_total_savings(request.user)
    return Response({
        'budget_mode': profile.budget_mode,
        'monthly_budget': profile.monthly_budget,
        'current_balance': profile.current_balance,
        'fixed_daily_budget': profile.fixed_daily_budget,
        'balance_setup_date': profile.balance_setup_date,
        'budget_month': profile.budget_month,
        'monthly_histories': histories,
        'google_connected': bool(profile.google_sheet_id),
        'sheet_url': sheet_url,
        'total_savings': total_savings,
        'service_account_email': _get_service_account_email()
    })


# ── REGISTER ──
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')
    monthly_budget = request.data.get('monthly_budget', 0)

    if User.objects.filter(username=username).exists():
        return Response({'username': ['Username already taken.']}, status=400)

    user = User.objects.create_user(username=username, password=password, email=email)

    # Save profile with budget — no sheet yet, user must connect Google first
    UserProfile.objects.create(
        user=user,
        monthly_budget=monthly_budget,
        google_sheet_id=""
    )

    logger.info(f"New user registered: {username}")
    return Response({'message': 'User created successfully.'}, status=201)


# ── UPDATE USER PROFILE / NAME ──
@api_view(['POST', 'PUT', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_user_profile(request):
    user = request.user
    name = request.data.get('name') or request.data.get('username')
    if not name or not str(name).strip():
        return Response({'error': 'Name cannot be empty'}, status=400)

    clean_name = str(name).strip()
    user.first_name = clean_name
    # Also update username if it's alphanumeric/valid and doesn't conflict
    try:
        user.username = clean_name
        user.save()
    except Exception:
        user.first_name = clean_name
        user.save()

    logger.info(f"Updated profile name for user {user.id}: {clean_name}")
    return Response({'message': 'Name updated successfully', 'name': clean_name, 'username': user.username}, status=200)


# ── DELETE USER ──
@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_user(request):
    user = request.user
    username = user.username
    try:
        user.delete()
        logger.info(f"User deleted: {username}")
        return Response({'message': 'User deleted successfully.'}, status=200)
    except Exception as e:
        logger.error(f"Error deleting user {username}: {e}")
        return Response({'error': 'Failed to delete user.'}, status=500)



def calculate_total_savings(user):
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return 0.0

    import pytz
    from datetime import datetime
    ist = pytz.timezone('Asia/Kolkata')
    today_date = datetime.now(ist).date()
    
    if profile.budget_mode == 'balance':
        daily_budget = float(profile.fixed_daily_budget)
        setup_date = profile.balance_setup_date
        expenses = Expense.objects.filter(user=user)
        if setup_date:
            expenses = expenses.filter(date__gte=setup_date)
    else:
        daily_budget = float(profile.monthly_budget) / 30.0
        # In monthly mode, compute savings for the current month expenses
        current_month_str = today_date.strftime('%Y-%m')
        expenses = Expense.objects.filter(user=user, date__startswith=current_month_str)

    from collections import defaultdict
    daily_totals = defaultdict(float)
    for e in expenses:
        if e.date < today_date:
            daily_totals[str(e.date)] += float(e.amount)
    
    total_savings = 0.0
    for date_str, daily_exp in daily_totals.items():
        total_savings += (daily_budget - daily_exp)
    return round(total_savings, 2)


# ── GET BUDGET ──
@api_view(['GET'])
def get_budget(request):
    try:
        profile = request.user.profile
        sheet_url = ''
        if profile.google_sheet_id:
            sheet_url = f"https://docs.google.com/spreadsheets/d/{profile.google_sheet_id}"
            
        import pytz
        from datetime import datetime
        ist = pytz.timezone('Asia/Kolkata')
        now_ist = datetime.now(ist)
        current_calendar_month = now_ist.strftime('%Y-%m')
        month_name = now_ist.strftime('%B %Y')

        is_new_month = False
        if profile.budget_mode == 'monthly':
            if not profile.budget_month or profile.budget_month != current_calendar_month:
                is_new_month = True

        from expenses.models import MonthlyBudgetHistory
        histories = {}
        for h in MonthlyBudgetHistory.objects.filter(user=request.user):
            histories[h.month] = {
                'budget_mode': h.budget_mode,
                'monthly_budget': float(h.monthly_budget),
                'starting_balance': float(h.starting_balance),
                'fixed_daily_budget': float(h.fixed_daily_budget)
            }

        total_savings = calculate_total_savings(request.user)
        return Response({
            'budget_mode': profile.budget_mode,
            'monthly_budget': profile.monthly_budget,
            'current_balance': profile.current_balance,
            'fixed_daily_budget': profile.fixed_daily_budget,
            'balance_setup_date': profile.balance_setup_date,
            'budget_month': profile.budget_month,
            'current_calendar_month': current_calendar_month,
            'month_name': month_name,
            'is_new_month': is_new_month,
            'monthly_histories': histories,
            'google_sheet_id': profile.google_sheet_id,
            'google_connected': bool(profile.google_sheet_id),
            'sheet_url': sheet_url,
            'total_savings': total_savings,
            'service_account_email': _get_service_account_email()
        })
    except UserProfile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)


# ── HIGHLIGHT SHEET ROWS ──
@api_view(['POST'])
def highlight_sheet(request):
    """Highlight rows in the Google Sheet matching a category."""
    try:
        profile = request.user.profile
        if not profile.google_sheet_id:
            return Response({'error': 'No sheet connected'}, status=400)
        category = request.data.get('category')  # None = clear highlights
        highlight_category(profile.google_sheet_id, category, profile=profile)
        return Response({'status': 'ok'})
    except Exception as e:
        logger.error(f"Highlight failed: {e}")
        return Response({'error': str(e)}, status=500)


# ── GENERATE USER SHEET ──
@api_view(['POST'])
def generate_user_sheet(request):
    """
    Creates or connects a Google Sheet for the user profile.
    If 'sheet_url' is passed, parses the sheet ID, verifies access, and connects it.
    Otherwise, attempts to create one via Service Account with a fallback response.
    """
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)

    sheet_url_input = request.data.get('sheet_url')
    if sheet_url_input:
        import re
        match = re.search(r'/d/([a-zA-Z0-9-_]+)', sheet_url_input)
        if match:
            sheet_id = match.group(1)
        else:
            sheet_id = sheet_url_input.strip()

        try:
            from expenses.sheets import get_user_worksheet, sync_sheet
            # Try to get worksheet using Service Account to verify sharing permissions
            worksheet = get_user_worksheet(sheet_id, profile=profile)
            
            # Share sheet as reader with anyone so it can be embedded in iframe
            try:
                # Open the sheet and share it
                from expenses.sheets import get_sheets_client
                client = get_sheets_client()
                sheet = client.open_by_key(sheet_id)
                sheet.share(None, perm_type='anyone', role='reader')
            except Exception as share_err:
                logger.warning(f"Could not share sheet with anyone: {share_err}")

            profile.google_sheet_id = sheet_id
            profile.save()

            # Sync existing expenses immediately
            import threading
            user_id = request.user.id
            def run_initial_sync():
                try:
                    u = User.objects.get(id=user_id)
                    p = u.profile
                    exps = Expense.objects.filter(user=u).order_by('date')
                    sync_sheet(p.google_sheet_id, exps, p.monthly_budget, profile=p)
                except Exception as ex:
                    logger.error(f"Background sheet sync failed: {ex}")
            t = threading.Thread(target=run_initial_sync)
            t.daemon = True
            t.start()

            return Response({
                'message': 'Sheet connected successfully',
                'google_sheet_id': sheet_id,
                'sheet_url': f"https://docs.google.com/spreadsheets/d/{sheet_id}"
            })
        except Exception as e:
            email = _get_service_account_email()
            return Response({
                'error': f"Failed to access Google Sheet. Make sure you shared it with the service account email: {email} as Editor."
            }, status=400)

    if profile.google_sheet_id:
        return Response({
            'message': 'Sheet already exists',
            'google_sheet_id': profile.google_sheet_id,
            'sheet_url': f"https://docs.google.com/spreadsheets/d/{profile.google_sheet_id}"
        })

    try:
        from expenses.sheets import create_user_sheet_service_account
        sheet_id = create_user_sheet_service_account(profile, request.user.username, request.user.email)
        profile.google_sheet_id = sheet_id
        profile.save()

        # Sync existing expenses immediately
        import threading
        user_id = request.user.id
        def run_initial_sync():
            try:
                u = User.objects.get(id=user_id)
                p = u.profile
                exps = Expense.objects.filter(user=u).order_by('date')
                sync_sheet(p.google_sheet_id, exps, p.monthly_budget, profile=p)
            except Exception as ex:
                logger.error(f"Background sheet sync failed: {ex}")
        t = threading.Thread(target=run_initial_sync)
        t.daemon = True
        t.start()

        return Response({
            'message': 'Sheet created successfully',
            'google_sheet_id': sheet_id,
            'sheet_url': f"https://docs.google.com/spreadsheets/d/{sheet_id}"
        })
    except Exception as e:
        logger.error(f"Failed to generate user sheet: {e}")
        email = _get_service_account_email()
        return Response({
            'error': f"Google has restricted storage quotas for service accounts. Please create a new Google Sheet on your own Drive, share it with {email} as Editor, and paste the URL here to link it."
        }, status=400)


# ── FIREBASE AUTHENTICATION ──
@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_login(request):
    """
    Accepts a Firebase ID token, verifies it, finds or creates the corresponding
    Django User, creates/syncs their Google Sheet, and returns SimpleJWT tokens.
    """
    id_token = request.data.get('id_token')
    email = request.data.get('email')
    name = request.data.get('name', '')

    try:
        from django.db import connection
        connection.close_if_unusable_or_obsolete()

        if id_token:
            # Verify the Firebase ID token
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token.get('uid')
            email = decoded_token.get('email')
            name = decoded_token.get('name', '') or name

        if not email:
            return Response({'error': 'Valid email or Firebase token is required'}, status=400)

        # Look up or create Django User
        user = User.objects.filter(email=email).first()
        is_new = False
        if not user:
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
            
            import secrets
            user = User.objects.create_user(
                username=username,
                email=email,
                password=secrets.token_urlsafe(24)
            )
            if name:
                parts = name.split(' ', 1)
                user.first_name = parts[0]
                if len(parts) > 1:
                    user.last_name = parts[1]
                user.save()
            is_new = True
            logger.info(f"Created new Django user via Firebase Auth: {username}")
        else:
            logger.info(f"Logged in existing Django user via Firebase Auth: {user.username}")

        # Resolve User Profile
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created or is_new:
            profile.monthly_budget = 0
            profile.budget_month = ""
            profile.save()
            is_new = True

        # Initialize Google Sheet via Service Account if not already set
        if not profile.google_sheet_id:
            try:
                from expenses.sheets import create_user_sheet_service_account
                sheet_id = create_user_sheet_service_account(profile, user.username, email)
                profile.google_sheet_id = sheet_id
                profile.save()
                logger.info(f"Created Google Sheet via service account for {user.username}: {sheet_id}")
            except Exception as e:
                logger.error(f"Failed to auto-create Google Sheet for {user.username}: {e}", exc_info=True)

        # Trigger background sync on login to ensure sheet is fully up to date / self-healed
        if profile.google_sheet_id:
            import threading
            user_id = user.id
            def run_initial_sync():
                try:
                    from expenses.sheets import sync_sheet
                    u = User.objects.get(id=user_id)
                    p = u.profile
                    exps = Expense.objects.filter(user=u).order_by('date')
                    sync_sheet(p.google_sheet_id, exps, p.monthly_budget, profile=p)
                except Exception as ex:
                    logger.error(f"Background initial sheet sync failed: {ex}")
            t = threading.Thread(target=run_initial_sync)
            t.daemon = True
            t.start()

        # Generate SimpleJWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username,
            'email': user.email,
            'is_new': is_new,
            'google_connected': bool(profile.google_sheet_id),
            'service_account_email': _get_service_account_email()
        }, status=200)

    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}", exc_info=True)
        return Response({'error': f'Authentication failed: {str(e)}'}, status=401)


# ── HEALTH MONITORING ──
@api_view(['GET', 'HEAD'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Minimal overhead API keep-alive check.
    Also verifies DB connectivity to catch offline databases.
    """
    db_ok = True
    try:
        connection.ensure_connection()
    except Exception as e:
        logger.error(f"Health check database connection failure: {e}")
        db_ok = False

    return JsonResponse({
        'status': 'healthy' if db_ok else 'unhealthy',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'database': 'connected' if db_ok else 'disconnected'
    }, status=200 if db_ok else 500)



# ── EXPENSES ──
class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Expense.objects.filter(user=self.request.user)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if start:
            queryset = queryset.filter(date__gte=start)
        if end:
            queryset = queryset.filter(date__lte=end)

        logger.debug(f"User {self.request.user.id} fetched expenses | filters: category={category} start={start} end={end}")
        return queryset

    def _sync(self):
        user_id = self.request.user.id
        import threading
        def run_sync():
            from django.contrib.auth.models import User
            try:
                user = User.objects.get(id=user_id)
                profile = user.profile
                if profile.google_sheet_id:
                    expenses = Expense.objects.filter(user=user).order_by('date')
                    sync_sheet(profile.google_sheet_id, expenses, profile.monthly_budget, profile=profile)
            except Exception as e:
                logger.error(f"Async sheet sync failed for user {user_id}: {e}")

        t = threading.Thread(target=run_sync)
        t.daemon = True
        t.start()

    def perform_create(self, serializer):
        expense = serializer.save(user=self.request.user)
        logger.info(f"Expense created: id={expense.id} amount={expense.amount} user={self.request.user.id}")
        self._sync()

    def perform_update(self, serializer):
        serializer.save()
        self._sync()

    def perform_destroy(self, instance):
        instance.delete()
        self._sync()

    def handle_exception(self, exc):
        logger.error(f"ExpenseViewSet error: {exc}", exc_info=True)
        return super().handle_exception(exc)