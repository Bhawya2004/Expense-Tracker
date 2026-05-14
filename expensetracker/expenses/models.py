from django.contrib.auth.models import User
from django.db import models

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    monthly_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    budget_month = models.CharField(max_length=7, blank=True)
    google_sheet_id = models.CharField(max_length=200, blank=True)
    # Google OAuth2 tokens — stored per-user so each user's sheet lives in THEIR Drive
    google_access_token = models.TextField(blank=True, default='')
    google_refresh_token = models.TextField(blank=True, default='')
    google_token_expiry = models.DateTimeField(null=True, blank=True)
    # Temporary storage for OAuth state/verifier to avoid session loss errors
    pending_oauth_state = models.CharField(max_length=255, blank=True, null=True)
    pending_oauth_verifier = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - Budget: {self.monthly_budget} ({self.budget_month})"

class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('food', 'Food'),
        ('transport', 'Transport'),
        ('shopping', 'Shopping'),
        ('health', 'Health'),
        ('entertainment', 'Entertainment'),
        ('bills', 'Bills'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    description = models.TextField(blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']   # newest expenses first by default

    def __str__(self):
        return f"{self.category} - {self.amount} ({self.date})"