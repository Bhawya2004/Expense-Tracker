import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:math';
import 'package:webview_flutter/webview_flutter.dart';

// ── DEPLOYED PRODUCTION BASE API URL ──
String getBaseUrl() {
  return 'https://expense-tracker-lils.onrender.com/api';
}

void main() {
  runApp(const ExpenseTrackerApp());
}

class ExpenseTrackerApp extends StatelessWidget {
  const ExpenseTrackerApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ExpenseTrack',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0D0D0D),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFC8F135),
          secondary: Color(0xFF35D4F1),
          surface: Color(0xFF161616),
          error: Color(0xFFFF4F4F),
        ),
        cardTheme: const CardThemeData(
          color: Color(0xFF161616),
          shadowColor: Colors.transparent,
        ),
        textTheme: const TextTheme(
          bodyMedium: TextStyle(fontFamily: 'Courier', color: Color(0xFFF0EDE6)),
        ),
      ),
      home: const SplashScreen(),
    );
  }
}

// ── SECURE STORAGE & API INTERCEPTOR SERVICE ──
class ApiService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: getBaseUrl(),
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 5),
  ));
  final _storage = const FlutterSecureStorage();

  ApiService() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (e, handler) async {
        if (e.response?.statusCode == 401) {
          final refresh = await _storage.read(key: 'refresh');
          if (refresh != null) {
            try {
              final res = await Dio(BaseOptions(
                baseUrl: getBaseUrl(),
                connectTimeout: const Duration(seconds: 5),
                receiveTimeout: const Duration(seconds: 5),
              )).post(
                '/token/refresh/',
                data: {'refresh': refresh},
              );
              final newAccess = res.data['access'];
              await _storage.write(key: 'access', value: newAccess);
              e.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
              
              // Retry original request
              final response = await _dio.fetch(e.requestOptions);
              return handler.resolve(response);
            } catch (err) {
              await _storage.delete(key: 'access');
              await _storage.delete(key: 'refresh');
            }
          }
        }
        return handler.next(e);
      },
    ));
  }

  Future<Map<String, dynamic>?> login(String username, String password) async {
    try {
      final res = await _dio.post('/token/', data: {
        'username': username,
        'password': password,
      });
      await _storage.write(key: 'access', value: res.data['access']);
      await _storage.write(key: 'refresh', value: res.data['refresh']);
      await _storage.write(key: 'username', value: username);
      return res.data;
    } catch (e) {
      return null;
    }
  }

  Future<bool> register(String username, String email, String password) async {
    try {
      await _dio.post('/register/', data: {
        'username': username,
        'email': email,
        'password': password,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<Map<String, dynamic>?> getBudget() async {
    try {
      final res = await _dio.get('/budget/');
      return res.data;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> updateBudget(Map<String, dynamic> data) async {
    try {
      final res = await _dio.post('/budget/update/', data: data);
      return res.data;
    } catch (e) {
      return null;
    }
  }

  Future<List<dynamic>?> getExpenses() async {
    try {
      final res = await _dio.get('/expenses/');
      return res.data;
    } catch (e) {
      return null;
    }
  }

  Future<bool> addExpense(Map<String, dynamic> data) async {
    try {
      await _dio.post('/expenses/', data: data);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> deleteExpense(int id) async {
    try {
      await _dio.delete('/expenses/$id/');
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> updateExpense(int id, Map<String, dynamic> data) async {
    try {
      await _dio.put('/expenses/$id/', data: data);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
  }
}

// ── SPLASH SCREEN (TOKEN AUTO-DETECT & LOGO TRANSITION) ──
class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeIn),
    );
    _scaleAnim = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutBack),
    );

    _animCtrl.forward();
    _checkLogin();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  void _checkLogin() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'access');
    
    // Allow the beautiful intro animation to play for at least 1.5 seconds
    await Future.delayed(const Duration(milliseconds: 1500));
    
    if (mounted) {
      if (token != null) {
        Navigator.pushReplacement(context, _createRoute(const DashboardScreen()));
      } else {
        Navigator.pushReplacement(context, _createRoute(const AuthScreen()));
      }
    }
  }

  Route _createRoute(Widget page) {
    return PageRouteBuilder(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
      transitionDuration: const Duration(milliseconds: 600),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D0D0D),
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: ScaleTransition(
            scale: _scaleAnim,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: Image.asset(
                    'assets/icon/app_icon.jpg',
                    width: 130,
                    height: 130,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 30),
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    color: Color(0xFFC8F135),
                    strokeWidth: 2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── AUTH SCREEN (LOGIN & REGISTER TABS) ──
class AuthScreen extends StatefulWidget {
  const AuthScreen({Key? key}) : super(key: key);

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final ApiService _api = ApiService();
  bool isLoginTab = true;

  final TextEditingController _userCtrl = TextEditingController();
  final TextEditingController _emailCtrl = TextEditingController();
  final TextEditingController _passCtrl = TextEditingController();
  bool loading = false;
  String errorMsg = '';

  void _loginWithGoogle() async {
    final success = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => GoogleOAuthWebViewScreen(
          flow: isLoginTab ? 'login' : 'register',
        ),
      ),
    );
    
    if (success == true) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
    }
  }

  void _submit() async {
    setState(() {
      errorMsg = '';
      loading = true;
    });

    final username = _userCtrl.text.trim();
    final password = _passCtrl.text.trim();
    final email = _emailCtrl.text.trim();

    if (username.isEmpty || password.isEmpty || (!isLoginTab && email.isEmpty)) {
      setState(() {
        errorMsg = 'Please fill out all fields.';
        loading = false;
      });
      return;
    }

    if (isLoginTab) {
      final success = await _api.login(username, password);
      if (success != null) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
      } else {
        setState(() {
          errorMsg = 'Invalid username or password.';
          loading = false;
        });
      }
    } else {
      final ok = await _api.register(username, email, password);
      if (ok) {
        // Automatically login
        final success = await _api.login(username, password);
        if (success != null) {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const DashboardScreen()));
        }
      } else {
        setState(() {
          errorMsg = 'Registration failed. Try a different username.';
          loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(
                child: Text(
                  'expense.track',
                  style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: Color(0xFFC8F135)),
                ),
              ),
              const SizedBox(height: 5),
              const Center(
                child: Text(
                  'PERSONAL FINANCE API — DJANGO + FLUTTER',
                  style: TextStyle(fontSize: 10, color: Color(0xFF6B6B6B), letterSpacing: 1.5),
                ),
              ),
              const SizedBox(height: 40),
              
              // Custom Tab Row
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF2A2A2A)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => isLoginTab = true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: isLoginTab ? const Color(0xFFC8F135) : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Login',
                            style: TextStyle(
                              color: isLoginTab ? Colors.black : const Color(0xFF6B6B6B),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => isLoginTab = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: !isLoginTab ? const Color(0xFFC8F135) : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Register',
                            style: TextStyle(
                              color: !isLoginTab ? Colors.black : const Color(0xFF6B6B6B),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 25),

              if (errorMsg.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF4F4F).withOpacity(0.1),
                    border: Border.all(color: const Color(0xFFFF4F4F).withOpacity(0.3)),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(errorMsg, style: const TextStyle(color: Color(0xFFFF4F4F), fontSize: 13)),
                ),
              const SizedBox(height: 15),

              // Inputs
              TextField(
                controller: _userCtrl,
                decoration: const InputDecoration(
                  labelText: 'USERNAME',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              if (!isLoginTab) ...[
                const SizedBox(height: 15),
                TextField(
                  controller: _emailCtrl,
                  decoration: const InputDecoration(
                    labelText: 'EMAIL ADDRESS',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
              ],
              const SizedBox(height: 15),
              TextField(
                controller: _passCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'PASSWORD',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock_outline),
                ),
              ),
              const SizedBox(height: 25),

              ElevatedButton(
                onPressed: loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFC8F135),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                    : Text(isLoginTab ? 'Login →' : 'Register →', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 15),
              const Center(
                child: Text('OR', style: TextStyle(color: Color(0xFF6B6B6B), fontSize: 12)),
              ),
              const SizedBox(height: 15),
              OutlinedButton(
                onPressed: loading ? null : _loginWithGoogle,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF2A2A2A)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.network(
                      'https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png',
                      height: 18,
                      width: 18,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const Icon(Icons.g_mobiledata, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    const Text('Continue with Google', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── MAIN DASHBOARD SCREEN ──
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ApiService _api = ApiService();
  
  String username = '';
  String budgetMode = 'monthly';
  double monthlyBudget = 0;
  double currentBalance = 0;
  double fixedDailyBudget = 0;
  String? balanceSetupDate;
  double totalSavings = 0;
  bool googleConnected = false;
  String sheetUrl = '';
  
  List<dynamic> expenses = [];
  bool loading = true;

  void _connectGoogle() async {
    final success = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => const GoogleOAuthWebViewScreen(flow: 'connect'),
      ),
    );
    if (success == true) {
      _loadData();
    }
  }

  void _openGoogleSheet() {
    if (sheetUrl.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => GoogleSheetWebViewScreen(url: sheetUrl),
        ),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => loading = true);
    final storage = const FlutterSecureStorage();
    final savedUser = await storage.read(key: 'username') ?? 'User';
    
    final budgetData = await _api.getBudget();
    final expenseData = await _api.getExpenses();

    if (budgetData != null) {
      setState(() {
        username = savedUser;
        budgetMode = budgetData['budget_mode'] ?? 'monthly';
        monthlyBudget = double.tryParse(budgetData['monthly_budget']?.toString() ?? '0') ?? 0;
        currentBalance = double.tryParse(budgetData['current_balance']?.toString() ?? '0') ?? 0;
        fixedDailyBudget = double.tryParse(budgetData['fixed_daily_budget']?.toString() ?? '0') ?? 0;
        balanceSetupDate = budgetData['balance_setup_date'];
        totalSavings = double.tryParse(budgetData['total_savings']?.toString() ?? '0') ?? 0;
        googleConnected = budgetData['google_connected'] ?? false;
        sheetUrl = budgetData['sheet_url'] ?? '';
      });
    }

    if (expenseData != null) {
      setState(() {
        expenses = expenseData;
      });
    }
    setState(() => loading = false);
  }

  double get _totalSpent {
    return expenses.fold(0.0, (sum, e) => sum + (double.tryParse(e['amount']?.toString() ?? '0') ?? 0));
  }

  double get _remaining {
    if (budgetMode == 'balance') {
      return currentBalance - _totalSpent;
    }
    return monthlyBudget - _totalSpent;
  }

  double get _budgetPool {
    return budgetMode == 'balance' ? currentBalance : monthlyBudget;
  }

  double get _percentSpent {
    final pool = _budgetPool;
    if (pool <= 0) return 0;
    return min((_totalSpent / pool) * 100, 100);
  }

  Map<String, double> get _categoryDistribution {
    final Map<String, double> map = {};
    for (var e in expenses) {
      final cat = e['category']?.toString() ?? 'other';
      final amt = double.tryParse(e['amount']?.toString() ?? '0') ?? 0;
      map[cat] = (map[cat] ?? 0) + amt;
    }
    return map;
  }

  Map<String, List<dynamic>> get _groupedExpenses {
    final Map<String, List<dynamic>> groups = {};
    for (var e in expenses) {
      final date = e['date']?.toString() ?? '—';
      if (!groups.containsKey(date)) {
        groups[date] = [];
      }
      groups[date]!.add(e);
    }
    return groups;
  }

  List<Map<String, dynamic>> _getWeeklyTrendData() {
    // Generates Monday-Sunday trend for current week
    final today = DateTime.now();
    final weekday = today.weekday; // 1 = Monday, ..., 7 = Sunday
    final monday = today.subtract(Duration(days: weekday - 1));

    final List<String> weekDates = [];
    for (int i = 0; i < 7; i++) {
      final d = monday.add(Duration(days: i));
      weekDates.add(d.toIso8601String().split('T')[0]);
    }

    final Map<String, double> dailySpent = {for (var date in weekDates) date: 0.0};
    for (var e in expenses) {
      final dateStr = e['date']?.toString();
      if (dateStr != null && dailySpent.containsKey(dateStr)) {
        dailySpent[dateStr] = dailySpent[dateStr]! + (double.tryParse(e['amount']?.toString() ?? '0') ?? 0);
      }
    }

    final weekdaysLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return List.generate(7, (i) {
      final date = weekDates[i];
      return {
        'label': weekdaysLabels[i],
        'amount': dailySpent[date] ?? 0.0,
      };
    });
  }

  void _showBudgetDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF161616),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => BudgetSetupSheet(
        initialMode: budgetMode,
        initialMonthlyBudget: monthlyBudget,
        initialCurrentBalance: currentBalance,
        initialFixedDailyBudget: fixedDailyBudget,
        onSave: (payload) async {
          final res = await _api.updateBudget(payload);
          if (res != null) {
            _loadData();
          }
        },
      ),
    );
  }

  void _showAddExpenseDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF161616),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => AddExpenseSheet(
        onSave: (payload) async {
          final success = await _api.addExpense(payload);
          if (success) {
            _loadData();
          }
        },
      ),
    );
  }

  void _showEditExpenseDialog(Map<String, dynamic> exp) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF161616),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => AddExpenseSheet(
        initialExpense: exp,
        onSave: (payload) async {
          final id = exp['id'] as int;
          final success = await _api.updateExpense(id, payload);
          if (success) {
            _loadData();
          }
        },
      ),
    );
  }

  void _showDeleteExpenseConfirm(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: const Text('Delete Transaction', style: TextStyle(color: Color(0xFFC8F135), fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to delete this transaction?', style: TextStyle(color: Colors.white)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFFB0B0B0))),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF4F4F)),
            child: const Text('Delete', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      final ok = await _api.deleteExpense(id);
      if (ok) {
        _loadData();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: Color(0xFFC8F135))));
    }

    final trendData = _getWeeklyTrendData();
    final maxSpent = trendData.map((d) => d['amount'] as double).reduce(max);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Expense Tracker', style: TextStyle(fontWeight: FontWeight.w800, color: Color(0xFFC8F135))),
        backgroundColor: const Color(0xFF0D0D0D),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Colors.white),
            onPressed: _showBudgetDialog,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFFFF4F4F)),
            onPressed: () async {
              await _api.logout();
              Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: const Color(0xFFC8F135),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Welcome Text
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Welcome back, $username 👋',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (googleConnected && sheetUrl.isNotEmpty)
                    TextButton.icon(
                      onPressed: _openGoogleSheet,
                      icon: const Icon(Icons.table_chart_outlined, size: 16, color: Color(0xFFC8F135)),
                      label: const Text('Open Sheet', style: TextStyle(color: Color(0xFFC8F135), fontSize: 12, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        backgroundColor: const Color(0xFFC8F135).withOpacity(0.08),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 15),

              if (!googleConnected) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF4F4F).withOpacity(0.08),
                    border: Border.all(color: const Color(0xFFFF4F4F).withOpacity(0.3)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          '⚠️ Link Google Sheets to sync your transactions live to a spreadsheet!',
                          style: TextStyle(color: Color(0xFFFF4F4F), fontSize: 12),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _connectGoogle,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF4F4F),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        child: const Text('Connect', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 15),
              ],

              // Summary Box Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF161616),
                  border: Border.all(color: const Color(0xFF2A2A2A)),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          budgetMode == 'balance' ? 'starting balance' : 'monthly budget',
                          style: const TextStyle(color: Color(0xFFB0B0B0), fontSize: 13),
                        ),
                        Text(
                          '₹${_budgetPool.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('total spent', style: TextStyle(color: Color(0xFFB0B0B0), fontSize: 13)),
                        Text(
                          '₹${_totalSpent.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFFC8F135)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('remaining', style: TextStyle(color: Color(0xFFB0B0B0), fontSize: 13)),
                        Text(
                          '₹${_remaining.abs().toStringAsFixed(2)}${_remaining < 0 ? ' over!' : ''}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: _remaining < 0 ? const Color(0xFFFF4F4F) : const Color(0xFF35D4F1),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 15),
                    
                    // Linear Progress Bar
                    Container(
                      height: 6,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2A2A2A),
                        borderRadius: BorderRadius.circular(3),
                      ),
                      alignment: Alignment.centerLeft,
                      child: FractionallySizedBox(
                        widthFactor: _percentSpent / 100,
                        child: Container(
                          decoration: BoxDecoration(
                            color: _percentSpent >= 100
                                ? const Color(0xFFFF4F4F)
                                : (_percentSpent >= 75 ? const Color(0xFFF1A035) : const Color(0xFFC8F135)),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 15),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('total savings till now', style: TextStyle(color: Color(0xFFB0B0B0), fontSize: 13)),
                        Text(
                          '${totalSavings < 0 ? '-' : ''}₹${totalSavings.abs().toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: totalSavings < 0 ? const Color(0xFFFF4F4F) : const Color(0xFFC8F135),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Custom Charts Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category Pie (Custom Painted)
                  Expanded(
                    flex: 1,
                    child: Container(
                      height: 200,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF161616),
                        border: Border.all(color: const Color(0xFF2A2A2A)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Categories', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 15),
                          Expanded(
                            child: expenses.isEmpty
                                ? const Center(child: Text('No data', style: TextStyle(fontSize: 11, color: Color(0xFF6B6B6B))))
                                : CustomPaint(
                                    painter: DoughnutChartPainter(
                                      data: _categoryDistribution,
                                      total: _totalSpent,
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Weekly Trend Bar (Custom Painted)
                  Expanded(
                    flex: 1,
                    child: Container(
                      height: 200,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF161616),
                        border: Border.all(color: const Color(0xFF2A2A2A)),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Weekly Trend', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 15),
                          Expanded(
                            child: CustomPaint(
                              painter: BarChartPainter(
                                data: trendData,
                                maxVal: maxSpent,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Expenses List Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('TRANSACTIONS HISTORY', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                  Text('${expenses.length} entries', style: const TextStyle(fontSize: 11, color: Color(0xFF6B6B6B))),
                ],
              ),
              const SizedBox(height: 10),

              // Transaction List
              if (expenses.isEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  alignment: Alignment.center,
                  child: const Text('No transactions found.', style: TextStyle(color: Color(0xFF6B6B6B))),
                )
              else ...[
                for (var entry in _groupedExpenses.entries) ...[
                  Padding(
                    padding: const EdgeInsets.only(top: 16, bottom: 8),
                    child: Text(
                      entry.key, // Group date header
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFC8F135),
                        letterSpacing: 1.0,
                        fontFamily: 'Courier',
                      ),
                    ),
                  ),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: entry.value.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final e = entry.value[index];
                      final id = e['id'] as int;
                      final category = e['category']?.toString() ?? 'other';
                      final amount = double.tryParse(e['amount']?.toString() ?? '0') ?? 0;
                      final desc = e['description']?.toString() ?? '—';

                      final emojis = {
                        'food': '🍔',
                        'transport': '🚗',
                        'shopping': '🛍',
                        'health': '💊',
                        'entertainment': '🎮',
                        'bills': '🧾',
                        'other': '📦',
                      };
                      
                      final colors = {
                        'food': const Color(0xFFC8F135),
                        'transport': const Color(0xFF35D4F1),
                        'shopping': const Color(0xFFF135C8),
                        'health': const Color(0xFFFF4F4F),
                        'entertainment': const Color(0xFFF1A035),
                        'bills': const Color(0xFF35A0F1),
                        'other': const Color(0xFF8B8B8B),
                      };

                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161616),
                          border: Border.all(color: const Color(0xFF2A2A2A)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Text(emojis[category] ?? '📦', style: const TextStyle(fontSize: 22)),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(desc, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(category.toUpperCase(), style: const TextStyle(color: Color(0xFFB0B0B0), fontSize: 10)),
                                ],
                              ),
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '-₹${amount.toStringAsFixed(2)}',
                                  style: TextStyle(fontWeight: FontWeight.bold, color: colors[category] ?? Colors.white),
                                ),
                                const SizedBox(width: 12),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFFB0B0B0)),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () => _showEditExpenseDialog(e),
                                ),
                                const SizedBox(width: 8),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 16, color: Color(0xFFFF4F4F)),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () => _showDeleteExpenseConfirm(id),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ],
              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFFC8F135),
        foregroundColor: Colors.black,
        child: const Icon(Icons.add),
        onPressed: _showAddExpenseDialog,
      ),
    );
  }
}

// ── CUSTOM PAINTERS FOR DOUGHNUT AND BAR CHARTS ──
class DoughnutChartPainter extends CustomPainter {
  final Map<String, double> data;
  final double total;

  DoughnutChartPainter({required this.data, required this.total});

  @override
  void paint(Canvas canvas, Size size) {
    if (total <= 0) return;
    
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 12;

    final colors = {
      'food': const Color(0xFFC8F135),
      'transport': const Color(0xFF35D4F1),
      'shopping': const Color(0xFFF135C8),
      'health': const Color(0xFFFF4F4F),
      'entertainment': const Color(0xFFF1A035),
      'bills': const Color(0xFF35A0F1),
      'other': const Color(0xFF8B8B8B),
    };

    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2 - 10;
    double startAngle = -pi / 2;

    data.forEach((cat, amt) {
      final sweepAngle = (amt / total) * 2 * pi;
      paint.color = colors[cat] ?? const Color(0xFF8B8B8B);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        paint,
      );
      startAngle += sweepAngle;
    });

    // Draw total spent text inside
    final textPainter = TextPainter(
      text: TextSpan(
        text: '₹${total.toStringAsFixed(0)}',
        style: const TextStyle(color: Color(0xFFC8F135), fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Courier'),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    
    textPainter.paint(
      canvas,
      center - Offset(textPainter.width / 2, textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class BarChartPainter extends CustomPainter {
  final List<Map<String, dynamic>> data;
  final double maxVal;

  BarChartPainter({required this.data, required this.maxVal});

  @override
  void paint(Canvas canvas, Size size) {
    final barPaint = Paint()
      ..color = const Color(0xFFC8F135).withOpacity(0.3)
      ..style = PaintingStyle.fill;
      
    final highlightPaint = Paint()
      ..color = const Color(0xFFC8F135)
      ..style = PaintingStyle.fill;

    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    final width = size.width;
    final height = size.height - 20; // reserve space for text
    final barSpacing = width / 7;
    final barWidth = barSpacing * 0.55;

    for (int i = 0; i < 7; i++) {
      final d = data[i];
      final amount = d['amount'] as double;
      final label = d['label'] as String;

      final barHeight = maxVal > 0 ? (amount / maxVal) * height : 2.0;
      final x = i * barSpacing + (barSpacing - barWidth) / 2;
      final y = height - barHeight;

      // Draw bar (highlight today's weekday index? Highlight if amount > 0)
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, y, barWidth, barHeight),
          const Radius.circular(4),
        ),
        amount > 0 ? highlightPaint : barPaint,
      );

      // Draw label
      textPainter.text = TextSpan(
        text: label,
        style: const TextStyle(color: Color(0xFFB0B0B0), fontSize: 9, fontFamily: 'Courier'),
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(x + (barWidth - textPainter.width) / 2, height + 4),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// ── BUDGET SETUP BOTTOM SHEET ──
class BudgetSetupSheet extends StatefulWidget {
  final String initialMode;
  final double initialMonthlyBudget;
  final double initialCurrentBalance;
  final double initialFixedDailyBudget;
  final Function(Map<String, dynamic>) onSave;

  const BudgetSetupSheet({
    Key? key,
    required this.initialMode,
    required this.initialMonthlyBudget,
    required this.initialCurrentBalance,
    required this.initialFixedDailyBudget,
    required this.onSave,
  }) : super(key: key);

  @override
  State<BudgetSetupSheet> createState() => _BudgetSetupSheetState();
}

class _BudgetSetupSheetState extends State<BudgetSetupSheet> {
  late String mode;
  final TextEditingController _monthlyCtrl = TextEditingController();
  final TextEditingController _balanceCtrl = TextEditingController();
  final TextEditingController _dailyLimitCtrl = TextEditingController();
  String error = '';

  @override
  void initState() {
    super.initState();
    mode = widget.initialMode;
    _monthlyCtrl.text = widget.initialMonthlyBudget > 0 ? widget.initialMonthlyBudget.toInt().toString() : '';
    _balanceCtrl.text = widget.initialCurrentBalance > 0 ? widget.initialCurrentBalance.toInt().toString() : '';
    _dailyLimitCtrl.text = widget.initialFixedDailyBudget > 0 ? widget.initialFixedDailyBudget.toInt().toString() : '';
  }

  void _submit() {
    setState(() => error = '');
    final Map<String, dynamic> payload = {'budget_mode': mode};
    
    if (mode == 'monthly') {
      final monthlyVal = double.tryParse(_monthlyCtrl.text.trim()) ?? 0;
      if (monthlyVal <= 0) {
        setState(() => error = 'Please enter a valid monthly budget.');
        return;
      }
      payload['monthly_budget'] = monthlyVal;
    } else {
      final balVal = double.tryParse(_balanceCtrl.text.trim()) ?? 0;
      final dailyVal = double.tryParse(_dailyLimitCtrl.text.trim()) ?? 0;
      if (balVal < 0 || _balanceCtrl.text.trim().isEmpty) {
        setState(() => error = 'Please enter a valid current balance.');
        return;
      }
      if (dailyVal <= 0) {
        setState(() => error = 'Please enter a valid daily budget limit.');
        return;
      }
      payload['current_balance'] = balVal;
      payload['fixed_daily_budget'] = dailyVal;
    }

    widget.onSave(payload);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('SET BUDGET MODE', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFC8F135))),
              IconButton(icon: const Icon(Icons.close, color: Color(0xFF6B6B6B)), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 15),

          // Custom Mode Selector Tab
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () => setState(() => mode = 'monthly'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: mode == 'monthly' ? const Color(0xFFC8F135) : const Color(0xFF2A2A2A),
                    foregroundColor: mode == 'monthly' ? Colors.black : Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Monthly Budget'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => setState(() => mode = 'balance'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: mode == 'balance' ? const Color(0xFFC8F135) : const Color(0xFF2A2A2A),
                    foregroundColor: mode == 'balance' ? Colors.black : Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Balance & Daily'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          if (error.isNotEmpty) ...[
            Text(error, style: const TextStyle(color: Color(0xFFFF4F4F), fontSize: 13)),
            const SizedBox(height: 10),
          ],

          if (mode == 'monthly')
            TextField(
              controller: _monthlyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Monthly Budget Limit (₹)',
                border: OutlineInputBorder(),
              ),
            )
          else ...[
            TextField(
              controller: _balanceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Current Starting Balance (₹)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 15),
            TextField(
              controller: _dailyLimitCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Fixed Daily Target Budget (₹)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
          const SizedBox(height: 25),

          ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC8F135),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Save configuration', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          ),
        ],
      ),
    );
  }
}

// ── ADD EXPENSE BOTTOM SHEET ──
class AddExpenseSheet extends StatefulWidget {
  final Function(Map<String, dynamic>) onSave;
  final Map<String, dynamic>? initialExpense;

  const AddExpenseSheet({Key? key, required this.onSave, this.initialExpense}) : super(key: key);

  @override
  State<AddExpenseSheet> createState() => _AddExpenseSheetState();
}

class _AddExpenseSheetState extends State<AddExpenseSheet> {
  final TextEditingController _amountCtrl = TextEditingController();
  final TextEditingController _descCtrl = TextEditingController();
  String category = 'food';
  DateTime date = DateTime.now();
  String error = '';

  @override
  void initState() {
    super.initState();
    if (widget.initialExpense != null) {
      final exp = widget.initialExpense!;
      _amountCtrl.text = exp['amount']?.toString() ?? '';
      _descCtrl.text = exp['description']?.toString() ?? '';
      category = exp['category']?.toString() ?? 'food';
      if (exp['date'] != null) {
        try {
          date = DateTime.parse(exp['date'].toString());
        } catch (_) {}
      }
    }
  }

  final categories = [
    {'id': 'food', 'label': 'Food'},
    {'id': 'transport', 'label': 'Transport'},
    {'id': 'shopping', 'label': 'Shopping'},
    {'id': 'health', 'label': 'Health'},
    {'id': 'entertainment', 'label': 'Entertainment'},
    {'id': 'bills', 'label': 'Bills'},
    {'id': 'other', 'label': 'Other'},
  ];

  void _submit() {
    setState(() => error = '');
    final amountVal = double.tryParse(_amountCtrl.text.trim()) ?? 0;
    
    if (amountVal <= 0) {
      setState(() => error = 'Please enter a valid amount.');
      return;
    }
    
    final payload = {
      'amount': amountVal,
      'description': _descCtrl.text.trim().isEmpty ? '—' : _descCtrl.text.trim(),
      'category': category,
      'date': date.toIso8601String().split('T')[0],
    };

    widget.onSave(payload);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(widget.initialExpense != null ? 'EDIT TRANSACTION' : 'ADD NEW TRANSACTION', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFC8F135))),
              IconButton(icon: const Icon(Icons.close, color: Color(0xFF6B6B6B)), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 15),

          if (error.isNotEmpty) ...[
            Text(error, style: const TextStyle(color: Color(0xFFFF4F4F), fontSize: 13)),
            const SizedBox(height: 10),
          ],

          TextField(
            controller: _amountCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'Amount (₹)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 15),
          
          TextField(
            controller: _descCtrl,
            decoration: const InputDecoration(
              labelText: 'Description',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 15),

          // Dropdown for Category
          DropdownButtonFormField<String>(
            value: category,
            dropdownColor: const Color(0xFF161616),
            decoration: const InputDecoration(
              labelText: 'Category',
              border: OutlineInputBorder(),
            ),
            items: categories.map((cat) {
              return DropdownMenuItem<String>(
                value: cat['id'],
                child: Text(cat['label']!),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) setState(() => category = val);
            },
          ),
          const SizedBox(height: 15),

          // Date Picker trigger
          InkWell(
            onTap: () async {
              final selected = await showDatePicker(
                context: context,
                initialDate: date,
                firstDate: DateTime(2020),
                lastDate: DateTime(2030),
              );
              if (selected != null) {
                setState(() => date = selected);
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFF2A2A2A)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Date', style: TextStyle(color: Color(0xFF6B6B6B))),
                  Text(
                    date.toIso8601String().split('T')[0],
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 25),

          ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFC8F135),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(widget.initialExpense != null ? 'Save Changes' : 'Add Transaction', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          ),
        ],
      ),
    );
  }
}

// ── GOOGLE OAUTH IN-APP WEBVIEW SCREEN ──
class GoogleOAuthWebViewScreen extends StatefulWidget {
  final String flow;
  const GoogleOAuthWebViewScreen({Key? key, required this.flow}) : super(key: key);

  @override
  State<GoogleOAuthWebViewScreen> createState() => _GoogleOAuthWebViewScreenState();
}

class _GoogleOAuthWebViewScreenState extends State<GoogleOAuthWebViewScreen> {
  late final WebViewController _controller;
  bool loading = true;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            setState(() => loading = true);
          },
          onPageFinished: (url) {
            setState(() => loading = false);
          },
          onNavigationRequest: (request) async {
            final url = request.url;

            // Map local dev loopbacks to Android emulator host loopback
            if (Platform.isAndroid && (url.startsWith('http://127.0.0.1:8000') || url.startsWith('http://localhost:8000'))) {
              final newUrl = url
                  .replaceAll('http://127.0.0.1:8000', 'http://10.0.2.2:8000')
                  .replaceAll('http://localhost:8000', 'http://10.0.2.2:8000');
              _controller.loadRequest(Uri.parse(newUrl));
              return NavigationDecision.prevent;
            }

            // Check if the URL contains access and refresh tokens (indicating redirect back to frontend)
            if (url.contains('access=') && url.contains('refresh=')) {
              final uri = Uri.parse(url);
              final access = uri.queryParameters['access'];
              final refresh = uri.queryParameters['refresh'];
              final username = uri.queryParameters['username'];

              if (access != null && refresh != null) {
                const storage = FlutterSecureStorage();
                await storage.write(key: 'access', value: access);
                await storage.write(key: 'refresh', value: refresh);
                if (username != null) {
                  await storage.write(key: 'username', value: username);
                }

                // Close WebView and navigate to Dashboard
                Navigator.pop(context, true);
                return NavigationDecision.prevent;
              }
            }
            return NavigationDecision.navigate;
          },
        ),
      );

    _fetchAndLoadUrl();
  }

  void _fetchAndLoadUrl() async {
    try {
      final apiBase = getBaseUrl();
      final storage = const FlutterSecureStorage();
      final token = await storage.read(key: 'access');

      final dio = Dio();
      final options = Options(headers: {});
      if (token != null) {
        options.headers!['Authorization'] = 'Bearer $token';
      }

      final res = await dio.get(
        '$apiBase/google/auth-url/?flow=${widget.flow}',
        options: options,
      );
      final authUrl = res.data['auth_url'];
      if (authUrl != null) {
        _controller.loadRequest(Uri.parse(authUrl));
      } else {
        Navigator.pop(context, false);
      }
    } catch (e) {
      Navigator.pop(context, false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Google Sign-In', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF161616),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (loading)
            const Center(child: CircularProgressIndicator(color: Color(0xFFC8F135))),
        ],
      ),
    );
  }
}

// ── GOOGLE SHEET SYNC EMBEDDED VIEWER SCREEN ──
class GoogleSheetWebViewScreen extends StatelessWidget {
  final String url;
  const GoogleSheetWebViewScreen({Key? key, required this.url}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final WebViewController controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(url));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Google Sheet Sync', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFC8F135))),
        backgroundColor: const Color(0xFF161616),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: WebViewWidget(controller: controller),
    );
  }
}
