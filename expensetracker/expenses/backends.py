from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from django.db.models import Q
from django.db import connection

class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        connection.close_if_unusable_or_obsolete()
        if username is None:
            username = kwargs.get('email')
        if not username or not password:
            return None
        try:
            user = User.objects.filter(Q(username__iexact=username) | Q(email__iexact=username)).first()
            if user and user.check_password(password):
                return user
        except Exception:
            return None
        return None
