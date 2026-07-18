from django.http import HttpResponseRedirect
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
from expenses.models import *
from expenses.serializers import ExpenseSerializer
from expenses.sheets import create_user_sheet_oauth, sync_sheet, highlight_category
from google_auth_oauthlib.flow import Flow

logger = logging.getLogger('expenses')

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

    profile.monthly_budget = request.data.get('monthly_budget', 0)
    profile.budget_month = datetime.today().strftime('%Y-%m')
    profile.save()

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

    return Response({
        'monthly_budget': profile.monthly_budget,
        'budget_month': profile.budget_month,
        'google_connected': bool(profile.google_refresh_token),
        'sheet_url': sheet_url
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


# ── GET BUDGET ──
@api_view(['GET'])
def get_budget(request):
    try:
        profile = request.user.profile
        sheet_url = ''
        if profile.google_sheet_id:
            sheet_url = f"https://docs.google.com/spreadsheets/d/{profile.google_sheet_id}"
        return Response({
            'monthly_budget': profile.monthly_budget,
            'budget_month': profile.budget_month,
            'google_sheet_id': profile.google_sheet_id,
            'google_connected': bool(profile.google_refresh_token),
            'sheet_url': sheet_url
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

# ── GOOGLE OAUTH: Generate auth URL ──
@api_view(['GET'])
@permission_classes([AllowAny])
def google_auth_url(request):
    """
    Returns a Google OAuth2 consent URL. The frontend redirects the user here.
    """
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI]
            }
        },
        scopes=GOOGLE_SCOPES
    )
    flow.redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI

    flow_param = request.GET.get('flow', 'register')
    auth_params = {
        'access_type': 'offline',
        'include_granted_scopes': 'true'
    }

    if flow_param == 'register':
        # Force consent screen to always get refresh_token during registration
        auth_params['prompt'] = 'consent'
    else:
        # Avoid forcing consent screen during login, allowing account/session remembrance
        auth_params['prompt'] = 'select_account'

    auth_url, state = flow.authorization_url(**auth_params)

    # Store state and code_verifier in GoogleOAuthState table
    user = request.user if request.user.is_authenticated else None
    GoogleOAuthState.objects.create(
        state=state,
        code_verifier=flow.code_verifier,
        user=user
    )

    return Response({'auth_url': auth_url})


# ── GOOGLE OAUTH: Callback ──
@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """
    Google redirects here after the user approves access.
    We exchange the code for tokens, store them, login/register the user,
    and initialize their Google Sheet.
    """
    code = request.GET.get('code')
    if not code:
        return Response({'error': 'No authorization code provided'}, status=400)

    try:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_OAUTH_REDIRECT_URI]
                }
            },
            scopes=GOOGLE_SCOPES
        )
        flow.redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI

        # Find the OAuth state in the database
        state = request.GET.get('state')
        logger.info(f"Incoming OAuth state: {state}")
        
        oauth_state = GoogleOAuthState.objects.filter(state=state).first()
        if not oauth_state:
            logger.error(f"No pending OAuth state found for state: {state}")
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}/?error=invalid_state")

        # Restore the PKCE code_verifier from the database
        flow.code_verifier = oauth_state.code_verifier

        # Exchange authorization code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Fetch user profile info from Google
        import requests
        userinfo_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {credentials.token}'}
        )
        if userinfo_response.status_code != 200:
            logger.error(f"Failed to fetch userinfo from Google: {userinfo_response.text}")
            return redirect(f"{settings.FRONTEND_URL}/?error=google_userinfo_failed")

        user_info = userinfo_response.json()
        email = user_info.get('email')
        if not email:
            logger.error("No email found in userinfo response")
            return redirect(f"{settings.FRONTEND_URL}/?error=no_email_provided")

        # Determine user: check if linking an existing logged-in user, otherwise login/register
        is_new = False
        if oauth_state.user:
            user = oauth_state.user
            logger.info(f"Linking Google account for existing user: {user.username}")
        else:
            user = User.objects.filter(email=email).first()
            if not user:
                # Username from email prefix
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1
                user = User.objects.create_user(username=username, email=email)
                is_new = True
                logger.info(f"Created new Google user: {username}")
            else:
                logger.info(f"Existing Google user logged in: {user.username}")

        # Ensure user profile exists
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created or is_new:
            profile.monthly_budget = 0
            profile.budget_month = datetime.today().strftime('%Y-%m')

        # Store OAuth tokens
        profile.google_access_token = credentials.token
        profile.google_refresh_token = credentials.refresh_token or profile.google_refresh_token
        if credentials.expiry:
            from django.utils import timezone
            import pytz
            profile.google_token_expiry = credentials.expiry.replace(tzinfo=pytz.UTC)
        profile.save()

        # Delete the temp state record
        oauth_state.delete()

        # Create the Google Sheet in the user's own Drive (if not already created)
        if not profile.google_sheet_id:
            try:
                sheet_id = create_user_sheet_oauth(profile, user.username)
                profile.google_sheet_id = sheet_id
                profile.save()
                logger.info(f"Created Google Sheet for {user.username}: {sheet_id}")
            except Exception as e:
                logger.error(f"Failed to create sheet for {user.username}: {e}")
                # Log error, but allow flow to proceed

        # Sync existing expenses immediately so the spreadsheet is not empty/unformatted
        if profile.google_sheet_id:
            import threading
            user_id = user.id
            def run_callback_sync():
                from django.contrib.auth.models import User
                try:
                    u = User.objects.get(id=user_id)
                    p = u.profile
                    exps = Expense.objects.filter(user=u).order_by('date')
                    sync_sheet(p.google_sheet_id, exps, p.monthly_budget, profile=p)
                except Exception as e:
                    logger.error(f"Initial sync in callback failed: {e}")
            t = threading.Thread(target=run_callback_sync)
            t.daemon = True
            t.start()

        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Redirect to frontend with JWT credentials
        redirect_url = f"{settings.FRONTEND_URL}/?access={access_token}&refresh={refresh_token}&username={user.username}&google=connected"
        if is_new:
            redirect_url += "&new=true"

        logger.info(f"Google OAuth login callback completed successfully for {user.username}")
        return redirect(redirect_url)

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        return redirect(f"{settings.FRONTEND_URL}/?error=oauth_failed")


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