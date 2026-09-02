from django.contrib.auth.models import User
from django.db import models

class UserProfile(models.Model):
    BUDGET_MODE_CHOICES = [
        ('monthly', 'Monthly Budget'),
        ('balance', 'Current Balance & Daily Limit'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    budget_mode = models.CharField(max_length=20, choices=BUDGET_MODE_CHOICES, default='monthly')
    monthly_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    budget_month = models.CharField(max_length=7, blank=True)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fixed_daily_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_setup_date = models.DateField(null=True, blank=True)
    google_sheet_id = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.user.username} - Mode: {self.budget_mode} - Budget: {self.monthly_budget} ({self.budget_month})"

class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('food', 'Food'),
        ('dining', 'Dining'),
        ('groceries', 'Groceries'),
        ('housing', 'Housing'),
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


class MonthlyBudgetHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budget_histories')
    month = models.CharField(max_length=7)  # YYYY-MM
    budget_mode = models.CharField(max_length=20, default='monthly')
    monthly_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    starting_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fixed_daily_budget = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'month')
        ordering = ['-month']

    def __str__(self):
        return f"{self.user.username} - {self.month} - {self.budget_mode} - {self.monthly_budget or self.starting_balance}"