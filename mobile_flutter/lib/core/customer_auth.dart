import '../models/auth_user.dart';
import 'api.dart';
import 'auth.dart';

// Customer sign-in endpoints; each returns the same session shape.
class CustomerAuthService {
  CustomerAuthService({required ApiClient api, required AuthController auth})
    : _api = api,
      _auth = auth;

  final ApiClient _api;
  final AuthController _auth;

  Future<void> _store(Map<String, dynamic> response) async {
    final session = CustomerSession(
      user: AuthUser.fromJson(response['user'] as Map<String, dynamic>),
      token: response['token'] as String,
    );
    await _auth.signInCustomer(session);
  }

  Future<void> emailLogin({
    required String email,
    required String password,
  }) async {
    await _store(
      await _api.request(
        'POST',
        '/api/auth/email/login',
        body: {'email': email, 'password': password},
      ),
    );
  }

  Future<void> firebaseSession({
    required String idToken,
    required String intent,
    String? fullName,
    String? email,
    String? password,
  }) async {
    await _store(
      await _api.request(
        'POST',
        '/api/auth/firebase-session',
        body: {
          'idToken': idToken,
          'intent': intent,
          if (fullName != null) 'fullName': fullName,
          if (email != null) 'email': email,
          if (password != null) 'password': password,
        },
      ),
    );
  }

  Future<void> googleSession({required String idToken}) async {
    await _store(
      await _api.request(
        'POST',
        '/api/auth/google-session',
        body: {'idToken': idToken},
      ),
    );
  }

  Future<void> signOut() async {
    final token = _auth.customer?.token;
    if (token != null) {
      try {
        await _api.request('POST', '/api/auth/logout', token: token);
      } catch (_) {}
    }
    await _auth.signOutCustomer();
  }
}
