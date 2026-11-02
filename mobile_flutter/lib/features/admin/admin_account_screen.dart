import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class AdminAccountScreen extends StatefulWidget {
  const AdminAccountScreen({super.key});

  @override
  State<AdminAccountScreen> createState() => _AdminAccountScreenState();
}

class _AdminAccountScreenState extends State<AdminAccountScreen> {
  bool _signingOut = false;

  Future<void> _signOut() async {
    final auth = AppScope.of(context).auth;
    setState(() => _signingOut = true);
    try {
      await auth.signOutAdmin();
      if (mounted) context.go('/login');
    } finally {
      if (mounted) setState(() => _signingOut = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = AppScope.of(context).auth.admin;
    return AppScreen(
      header: const ScreenHeader(title: 'Account', subtitle: 'Admin session'),
      children: [
        AppCard(
          child: Column(
            children: [
              InfoRow(label: 'Admin ID', value: session?.adminId ?? ''),
              InfoRow(label: 'Role', value: titleCase(session?.role ?? '')),
            ],
          ),
        ),
        const SizedBox(height: 16),
        AppButton(
          label: 'Sign out',
          variant: AppButtonVariant.danger,
          loading: _signingOut,
          onPressed: _signingOut ? null : _signOut,
        ),
      ],
    );
  }
}
