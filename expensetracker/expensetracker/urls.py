from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from expenses.views import *

urlpatterns = [
    path('', health_check, name='health_check'),
    path('health/', health_check, name='health_check_alt'),
    path('healthz/', health_check, name='health_check_alt2'),
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('api/token/firebase/', firebase_login),
    path('api/register/', register_user),
    path('api/user/update/', update_user_profile),
    path('api/user/delete/', delete_user),
    path('api/users/', user_count),
    path('api/budget/', get_budget),
    path('api/budget/update/', update_budget),
    path('api/sheet/highlight/', highlight_sheet),
    path('api/sheet/create/', generate_user_sheet),
    path('api/', include('expenses.urls')),
]