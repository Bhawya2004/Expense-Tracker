import logging
from rest_framework import viewsets, permissions
from .models import Expense
from .serializers import ExpenseSerializer

from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from django.contrib.auth.models import User

@api_view(['GET'])
@permission_classes([AllowAny])
def user_count(request):
    count = User.objects.count()
    users = User.objects.values('id', 'username', 'email', 'date_joined')
    return Response({'total_users': count, 'users': list(users)})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')
    if User.objects.filter(username=username).exists():
        return Response({'username': ['Username already taken.']}, status=400)
    User.objects.create_user(username=username, password=password, email=email)
    return Response({'message': 'User created successfully.'}, status=201)

logger = logging.getLogger('expenses')

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    
    def get_queryset(self):
        queryset = Expense.objects.filter(user=self.request.user)

        # filter by category  →  GET /expenses/?category=food
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # filter by date range  →  GET /expenses/?start=2026-01-01&end=2026-05-01
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if start:
            queryset = queryset.filter(date__gte=start)
        if end:
            queryset = queryset.filter(date__lte=end)

        logger.debug(f"User {self.request.user.id} fetched expenses | filters: category={category} start={start} end={end}")
        return queryset

    def perform_create(self, serializer):
        expense = serializer.save(user=self.request.user)
        logger.info(f"Expense created: id={expense.id} amount={expense.amount} user={self.request.user.id}")

    def handle_exception(self, exc):
        logger.error(f"ExpenseViewSet error: {exc}", exc_info=True)
        return super().handle_exception(exc)