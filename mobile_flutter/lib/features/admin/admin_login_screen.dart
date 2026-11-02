import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/auth.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/auth/auth_input.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final _id = TextEditingController();
  final _password = TextEditingController();
  final _pin = TextEditingController();
  bool _loading = false;
  String _error = '';

  bool get _canSubmit =>
      _id.text.isNotEmpty && _password.text.isNotEmpty && _pin.text.length == 6;

  @override
  void dispose() {
    _id.dispose();
    _password.dispose();
    _pin.dispose();
    super.dispose();
  }

  void _onPinChanged(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    final trimmed = digits.length > 6 ? digits.substring(0, 6) : digits;
    if (trimmed != value) {
      _pin.value = TextEditingValue(
        text: trimmed,
        selection: TextSelection.collapsed(offset: trimmed.length),
      );
    }
    setState(() {});
  }

  Future<void> _submit() async {
    final services = AppScope.of(context);
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      final json = await services.api.request(
        'POST',
        '/api/admin/login',
        body: {
          'id': _id.text.trim(),
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
      if (mounted) context.go('/admin');
    } catch (caught) {
      if (mounted)
        setState(
          () => _error = caught is ApiException
              ? caught.message
              : 'Unable to sign in.',
        );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _back() {
    final signedIn = AppScope.of(context).auth.admin != null;
    context.go(signedIn ? '/admin' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.paddingOf(context);
    return Scaffold(
      backgroundColor: const Color(0xFF07173F),
      body: Stack(
        children: [
          Positioned(
            top: -120,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: 420,
                height: 420,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Color(0x59286EE6),
                ),
              ),
            ),
          ),
          SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.fromLTRB(
              20,
              padding.top + 56,
              20,
              padding.bottom + 40,
            ),
            child: Column(children: [_card()]),
          ),
          Positioned(
            top: padding.top + 4,
            left: 4,
            child: IconButton(
              tooltip: 'Back',
              onPressed: _back,
              icon: const Icon(Icons.arrow_back, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 22, 24, 26),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x59051437),
            blurRadius: 40,
            offset: Offset(0, 20),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Image.asset(
            'assets/brand/logo-full.jpg',
            height: 52,
            width: 150,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 14),
          Center(child: _badge()),
          const Text(
            'Admin sign in',
            textAlign: TextAlign.center,
            style: _titleStyle,
          ),
          const SizedBox(height: 4),
          const Text(
            'Restricted to Scorenow team members.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.muted),
          ),
          const SizedBox(height: 16),
          if (_error.isNotEmpty) ErrorBanner(message: _error),
          AuthInput(
            label: 'Admin ID',
            icon: Icons.badge_outlined,
            controller: _id,
            onChanged: (_) => setState(() {}),
          ),
          AuthInput(
            label: 'Password',
            icon: Icons.lock_outline,
            controller: _password,
            obscure: true,
            onChanged: (_) => setState(() {}),
          ),
          AuthInput(
            label: '6-digit PIN',
            icon: Icons.pin_outlined,
            controller: _pin,
            obscure: true,
            keyboardType: TextInputType.number,
            onChanged: _onPinChanged,
          ),
          const SizedBox(height: 4),
          AppButton(
            label: 'Sign in',
            loading: _loading,
            onPressed: _canSubmit && !_loading ? _submit : null,
          ),
        ],
      ),
    );
  }

  Widget _badge() {
    return Container(
      width: 52,
      height: 52,
      margin: const EdgeInsets.only(bottom: 12),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.blue,
        shape: BoxShape.circle,
        boxShadow: const [
          BoxShadow(
            color: Color(0x4D1746A2),
            blurRadius: 12,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: const Icon(Icons.verified_user, size: 24, color: Colors.white),
    );
  }
}

const _titleStyle = TextStyle(
  fontSize: 22,
  fontWeight: FontWeight.w800,
  color: AppColors.navy,
);
