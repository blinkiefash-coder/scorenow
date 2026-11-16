import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/auth.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

// Accepts an admin team invite (signs in on success) or a password-reset link.
class AdminAcceptScreen extends StatefulWidget {
  const AdminAcceptScreen({super.key});

  @override
  State<AdminAcceptScreen> createState() => _AdminAcceptScreenState();
}

class _AdminAcceptScreenState extends State<AdminAcceptScreen> {
  final _token = TextEditingController();
  final _password = TextEditingController();
  final _pin = TextEditingController();
  bool _invite = true;
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _token.dispose();
    _password.dispose();
    _pin.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _token.text.trim().length == 64 &&
      _password.text.length >= 12 &&
      (!_invite || _pin.text.length == 6);

  Future<void> _submit() async {
    final services = AppScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final router = GoRouter.of(context);
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      if (_invite) {
        final json = await services.api.request(
          'POST',
          '/api/admin/team/invitations/accept',
          body: {
            'token': _token.text.trim(),
            'password': _password.text,
            'pin': _pin.text,
          },
        );
        await services.auth.signInAdmin(
          AdminSession(
            token: json['token'] as String,
            adminId: json['adminId'] as String,
            role: json['role'] as String,
          ),
        );
        router.go('/admin');
      } else {
        final json = await services.api.request(
          'POST',
          '/api/admin/password-reset/accept',
          body: {'token': _token.text.trim(), 'password': _password.text},
        );
        messenger.showSnackBar(
          SnackBar(content: Text(json['message'] as String? ?? 'Password updated. Sign in again.')),
        );
        router.go('/admin/login');
      }
    } catch (caught) {
      if (mounted) {
        setState(() => _error = caught is ApiException ? caught.message : 'Unable to complete this step.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.navy),
        leading: IconButton(
          tooltip: 'Back',
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/admin/login'),
        ),
        title: const Text('Admin invite or reset', style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: true, label: Text('Accept invite')),
              ButtonSegment(value: false, label: Text('Reset password')),
            ],
            selected: {_invite},
            onSelectionChanged: _loading
                ? null
                : (selection) => setState(() {
                      _invite = selection.first;
                      _error = '';
                    }),
          ),
          const SizedBox(height: 16),
          if (_error.isNotEmpty) ErrorBanner(message: _error),
          AppField(
            label: _invite ? 'Invite token' : 'Reset token',
            hint: 'Paste the 64-character token from your link',
            controller: _token,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          AppField(
            label: 'New password (12+ characters)',
            controller: _password,
            obscure: true,
            onChanged: (_) => setState(() {}),
          ),
          if (_invite) ...[
            const SizedBox(height: 12),
            AppField(
              label: 'Create a 6-digit PIN',
              controller: _pin,
              obscure: true,
              keyboardType: TextInputType.number,
              maxLength: 6,
              onChanged: (_) => setState(() {}),
            ),
          ],
          const SizedBox(height: 20),
          AppButton(
            label: _invite ? 'Accept invite' : 'Update password',
            loading: _loading,
            onPressed: _canSubmit && !_loading ? _submit : null,
          ),
        ],
      ),
    );
  }
}
