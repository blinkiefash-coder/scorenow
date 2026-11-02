import 'package:flutter/widgets.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/features/profile/profile_setup_screen.dart';

// Matches the web's onboarding gate: until a credit profile exists, the dashboard is replaced by the profile form.
// A failed dashboard load (no data yet) does not gate the app.
class ProfileGate extends StatelessWidget {
  const ProfileGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    // The shell can build a frame before DashboardHost has inserted its scope after sign-in.
    final scope = context.dependOnInheritedWidgetOfExactType<DashboardScope>();
    if (scope == null) return child;
    final controller = scope.notifier!;
    final dashboard = controller.dashboard;
    if (dashboard.data != null && dashboard.data!.profile == null) {
      return const ProfileSetupScreen(gated: true);
    }
    return child;
  }
}
