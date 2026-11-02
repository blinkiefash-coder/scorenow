import 'package:flutter/widgets.dart';

import '../features/landing/assessment_draft.dart';
import 'api.dart';
import 'auth.dart';
import 'customer_auth.dart';
import 'firebase_auth_service.dart';

// Shared app dependencies, exposed to the widget tree through AppScope.
class AppServices {
  AppServices({required this.auth, required this.api, required this.firebase})
    : customerAuth = CustomerAuthService(api: api, auth: auth);

  factory AppServices.create() {
    late final AuthController auth;
    final api = ApiClient(
      onUnauthorized: (token) {
        if (auth.customer?.token == token) auth.signOutCustomer();
        if (auth.admin?.token == token) auth.signOutAdmin();
      },
    );
    auth = AuthController();
    return AppServices(auth: auth, api: api, firebase: FirebaseAuthService());
  }

  final AuthController auth;
  final ApiClient api;
  final FirebaseAuthService firebase;
  final CustomerAuthService customerAuth;

  // Assessment a guest filled in before logging in; sent once they reach the dashboard.
  AssessmentDraft? pendingAssessment;
}

class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.services, required super.child});

  final AppServices services;

  static AppServices of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope is missing above this context');
    return scope!.services;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => services != oldWidget.services;
}
