from django.http import HttpResponseRedirect
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
def google_auth_url(request):
    """
    Returns a Google OAuth2 consent URL. The frontend redirects the user here.
    We store the JWT access token in the OAuth 'state' param so we can identify
    the user when Google redirects back.
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

    auth_url, state = flow.authorization_url(
        access_type='offline',   # We need a refresh_token
        prompt='consent',        # Force consent to always get refresh_token
        include_granted_scopes='true'
    )

    # Store the state and code_verifier in UserProfile instead of session
    # This is MUCH more reliable than browser cookies
    profile = request.user.profile
    profile.pending_oauth_state = state
    profile.pending_oauth_verifier = flow.code_verifier
    profile.save()

    return Response({'auth_url': auth_url})


# ── GOOGLE OAUTH: Callback ──
@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """
    Google redirects here after the user approves access.
    We exchange the code for tokens, store them, create the sheet.
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

        # Find the profile using the state parameter
        state = request.GET.get('state')
        profile = UserProfile.objects.filter(pending_oauth_state=state).first()
        if not profile:
            logger.error(f"No profile found for state: {state}")
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}/?error=invalid_state")

        # Restore the PKCE code_verifier from the database
        flow.code_verifier = profile.pending_oauth_verifier

        # Exchange authorization code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # We now have the user from the profile we found
        user = profile.user

        # Store OAuth tokens
        profile.google_access_token = credentials.token
        profile.google_refresh_token = credentials.refresh_token or profile.google_refresh_token
        if credentials.expiry:
            from django.utils import timezone
            import pytz
            profile.google_token_expiry = credentials.expiry.replace(tzinfo=pytz.UTC)
        # Clear temporary fields
        profile.pending_oauth_state = None
        profile.pending_oauth_verifier = None
        profile.save()

        # Create the Google Sheet in the user's own Drive (if not already created)
        if not profile.google_sheet_id:
            try:
                sheet_id = create_user_sheet_oauth(profile, user.username)
                profile.google_sheet_id = sheet_id
                profile.save()
                logger.info(f"Created Google Sheet for {user.username}: {sheet_id}")
            except Exception as e:
                logger.error(f"Failed to create sheet for {user.username}: {e}")
                return redirect('/?error=sheet_creation_failed')

        # Clean up session
        request.session.pop('google_oauth_state', None)
        request.session.pop('google_oauth_jwt', None)

        logger.info(f"Google OAuth completed for {user.username}")
        return redirect('/?google=connected')

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}", exc_info=True)
        return redirect('/?error=oauth_failed')


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
        user = self.request.user
        try:
            profile = user.profile
            if profile.google_sheet_id:
                expenses = Expense.objects.filter(user=user).order_by('date')
                sync_sheet(profile.google_sheet_id, expenses, profile.monthly_budget, profile=profile)
        except Exception as e:
            logger.error(f"Sheet sync failed for {user.username}: {e}")

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