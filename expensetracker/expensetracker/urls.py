from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from expenses.views import *

from django.http import HttpResponseRedirect

def frontend(request):
    if settings.DEBUG:
        return HttpResponseRedirect(settings.FRONTEND_URL)
    return render(request, 'index.html')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', frontend),                                        # ← this line serves the frontend
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('api/register/', register_user),
    path('api/user/delete/', delete_user),
    path('api/users/', user_count),
    path('api/budget/', get_budget),
    path('api/budget/update/', update_budget),
    path('api/sheet/highlight/', highlight_sheet),
    path('api/google/auth-url/', google_auth_url),
    path('api/google/callback/', google_callback),
    path('api/', include('expenses.urls')),
]