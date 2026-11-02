import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/auth_user.dart';

const customerStorageKey = 'scorenow-customer';
const adminStorageKey = 'scorenow-admin';

class CustomerSession {
  const CustomerSession({required this.user, required this.token});

  factory CustomerSession.fromJson(Map<String, dynamic> json) =>
      CustomerSession(
        user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
        token: json['token'] as String,
      );

  final AuthUser user;
  final String token;

  Map<String, dynamic> toJson() => {'user': user.toJson(), 'token': token};
}

class AdminSession {
  const AdminSession({
    required this.token,
    required this.adminId,
    required this.role,
  });

  factory AdminSession.fromJson(Map<String, dynamic> json) => AdminSession(
    token: json['token'] as String,
    adminId: json['adminId'] as String? ?? '',
    role: json['role'] as String? ?? 'support',
  );

  final String token;
  final String adminId;
  final String role;

  Map<String, dynamic> toJson() => {
    'token': token,
    'adminId': adminId,
    'role': role,
  };
}

class AuthController extends ChangeNotifier {
  AuthController({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  bool _ready = false;
  CustomerSession? _customer;
  AdminSession? _admin;

  bool get ready => _ready;
  CustomerSession? get customer => _customer;
  AdminSession? get admin => _admin;

  Future<void> restore() async {
    final storedCustomer = await _read(customerStorageKey);
    final storedAdmin = await _read(adminStorageKey);
    if (storedCustomer != null) {
      try {
        final session = CustomerSession.fromJson(storedCustomer);
        if (session.token.isNotEmpty && session.user.id.isNotEmpty)
          _customer = session;
      } catch (_) {}
    }
    if (storedAdmin != null) {
      try {
        final session = AdminSession.fromJson(storedAdmin);
        if (session.token.isNotEmpty) _admin = session;
      } catch (_) {}
    }
    _ready = true;
    notifyListeners();
  }

  Future<void> signInCustomer(CustomerSession session) async {
    await _storage.write(
      key: customerStorageKey,
      value: jsonEncode(session.toJson()),
    );
    _customer = session;
    notifyListeners();
  }

  Future<void> signInAdmin(AdminSession session) async {
    await _storage.write(
      key: adminStorageKey,
      value: jsonEncode(session.toJson()),
    );
    _admin = session;
    notifyListeners();
  }

  Future<void> updateCustomer(
    AuthUser Function(AuthUser current) update,
  ) async {
    final current = _customer;
    if (current == null) return;
    final next = CustomerSession(
      user: update(current.user),
      token: current.token,
    );
    _customer = next;
    notifyListeners();
    await _storage.write(
      key: customerStorageKey,
      value: jsonEncode(next.toJson()),
    );
  }

  Future<void> signOutCustomer() async {
    await _storage.delete(key: customerStorageKey);
    _customer = null;
    notifyListeners();
  }

  Future<void> signOutAdmin() async {
    await _storage.delete(key: adminStorageKey);
    _admin = null;
    notifyListeners();
  }

  Future<Map<String, dynamic>?> _read(String key) async {
    try {
      final raw = await _storage.read(key: key);
      if (raw == null || raw.isEmpty) return null;
      final value = jsonDecode(raw);
      return value is Map<String, dynamic> ? value : null;
    } catch (_) {
      return null;
    }
  }
}
