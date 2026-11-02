import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/firebase_auth_service.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/auth/auth_input.dart';
import 'package:scorenow_mobile/features/auth/otp_boxes.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

enum _Mode { login, signup }

enum _Method { mobile, email }

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  _Mode _mode = _Mode.login;
  _Method _method = _Method.mobile;
  final _name = TextEditingController();
  final _mobile = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  bool _showPassword = false;
  bool _otpStep = false;
  bool _loading = false;
  String _error = '';
  int _resendIn = 0;
  String? _verificationId;

  bool get _emailLogin => _mode == _Mode.login && _method == _Method.email;

  bool get _submitDisabled {
    if (_mode != _Mode.login) return false;
    return _method == _Method.mobile
        ? _mobile.text.length != 10
        : _email.text.isEmpty || _password.text.isEmpty;
  }

  @override
  void dispose() {
    for (final c in [_name, _mobile, _email, _password, _code]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _run(Future<void> Function() task) async {
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      await task();
    } catch (caught) {
      if (mounted) setState(() => _error = caught.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startResendTimer() {
    setState(() => _resendIn = 28);
    Future.doWhile(() async {
      await Future<void>.delayed(const Duration(seconds: 1));
      if (!mounted || _resendIn <= 0) return false;
      setState(() => _resendIn -= 1);
      return _resendIn > 0;
    });
  }

  Future<void> _submitForm() => _run(() async {
    final services = AppScope.of(context);
    if (_mode == _Mode.login && _method == _Method.email) {
      await services.customerAuth.emailLogin(
        email: _email.text.trim(),
        password: _password.text,
      );
      if (mounted) context.go('/home');
      return;
    }
    if (_mode == _Mode.signup) {
      if (_name.text.trim().length < 2)
        throw const FirebaseFlowException('Enter your full name.');
      if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(_email.text.trim())) {
        throw const FirebaseFlowException('Enter a valid email address.');
      }
      if (_password.text.length < 8)
        throw const FirebaseFlowException(
          'Choose a password of at least 8 characters.',
        );
    }
    _verificationId = await services.firebase.sendPhoneCode(_mobile.text);
    _code.clear();
    _startResendTimer();
    setState(() => _otpStep = true);
  });

  Future<void> _submitOtp() => _run(() async {
    final services = AppScope.of(context);
    final verificationId = _verificationId;
    if (verificationId == null)
      throw const FirebaseFlowException(
        'Request a new SMS code and try again.',
      );
    final idToken = await services.firebase.confirmPhoneCode(
      verificationId,
      _code.text,
    );
    await services.customerAuth.firebaseSession(
      idToken: idToken,
      intent: _mode.name,
      fullName: _name.text.trim(),
      email: _email.text.trim(),
      password: _password.text,
    );
    if (mounted) context.go('/home');
  });

  Future<void> _resend() => _run(() async {
    _verificationId = await AppScope.of(
      context,
    ).firebase.sendPhoneCode(_mobile.text, resend: true);
    _code.clear();
    _startResendTimer();
  });

  Future<void> _google() => _run(() async {
    final services = AppScope.of(context);
    final idToken = await services.firebase.googleIdToken();
    await services.customerAuth.googleSession(idToken: idToken);
    if (mounted) context.go('/home');
  });

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
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0x59286EE6),
                ),
              ),
            ),
          ),
          SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.fromLTRB(
              20,
              padding.top + 40,
              20,
              padding.bottom + 40,
            ),
            child: Column(
              children: [
                _card(),
                const SizedBox(height: 20),
                TextButton.icon(
                  onPressed: () => context.push('/admin/login'),
                  icon: Icon(
                    Icons.shield_outlined,
                    size: 14,
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                  label: Text(
                    'Admin sign in',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
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
          if (!_otpStep) _modeTabs(),
          if (_otpStep) ..._otpContent() else ..._formContent(),
        ],
      ),
    );
  }

  List<Widget> _otpContent() {
    final last4 = _mobile.text.length >= 4
        ? _mobile.text.substring(_mobile.text.length - 4)
        : _mobile.text;
    return [
      _badge(Icons.verified_user),
      const Text(
        'Verify Your Mobile Number',
        textAlign: TextAlign.center,
        style: _titleStyle,
      ),
      const SizedBox(height: 4),
      Text.rich(
        TextSpan(
          style: const TextStyle(fontSize: 13, color: AppColors.muted),
          children: [
            const TextSpan(text: 'Enter the 6-digit code sent to\n'),
            TextSpan(
              text: '+91 •••••$last4',
              style: const TextStyle(
                color: AppColors.navy,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        textAlign: TextAlign.center,
      ),
      const SizedBox(height: 12),
      if (_error.isNotEmpty) ErrorBanner(message: _error),
      const SizedBox(height: 12),
      OtpBoxes(
        value: _code.text,
        onChanged: (value) => setState(() => _code.text = value),
      ),
      Center(
        child: TextButton(
          onPressed: _resendIn > 0 || _loading ? null : _resend,
          child: Text(
            _resendIn > 0
                ? 'Resend OTP in 00:${_resendIn.toString().padLeft(2, '0')}'
                : 'Resend OTP',
            style: TextStyle(
              color: _resendIn <= 0 ? AppColors.blueDark : AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              decoration: _resendIn <= 0
                  ? TextDecoration.underline
                  : TextDecoration.none,
            ),
          ),
        ),
      ),
      AppButton(
        label: 'Verify & Continue',
        onPressed: _code.text.length == 6 ? _submitOtp : null,
        loading: _loading,
      ),
      const SizedBox(height: 12),
      const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.lock, size: 12, color: AppColors.green),
          SizedBox(width: 6),
          Flexible(
            child: Text(
              'Your information is protected with bank-level security.',
              style: TextStyle(color: AppColors.muted, fontSize: 10.5),
            ),
          ),
        ],
      ),
      Center(
        child: TextButton(
          onPressed: () => setState(() {
            _otpStep = false;
            _error = '';
          }),
          child: const Text('Change number', style: _switchLinkStyle),
        ),
      ),
    ];
  }

  List<Widget> _formContent() {
    final isLogin = _mode == _Mode.login;
    return [
      _badge(Icons.person),
      Text(
        isLogin ? 'Welcome Back' : 'Create Your Account',
        textAlign: TextAlign.center,
        style: _titleStyle,
      ),
      const SizedBox(height: 4),
      Text(
        isLogin
            ? 'Sign in to continue to Scorenow.'
            : 'Start improving your credit profile in just a few steps.',
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 13, color: AppColors.muted),
      ),
      const SizedBox(height: 16),
      if (isLogin) _methodTabs(),
      if (_error.isNotEmpty) ErrorBanner(message: _error),
      if (!isLogin)
        AuthInput(
          label: 'Full Name',
          icon: Icons.person_outline,
          controller: _name,
          hint: 'Enter your full name',
          capitalization: TextCapitalization.words,
          autofill: const [AutofillHints.name],
          onChanged: (_) => setState(() {}),
        ),
      if (!isLogin || _method == _Method.mobile)
        AuthInput(
          label: 'Mobile Number',
          prefix: '🇮🇳 +91',
          controller: _mobile,
          hint: 'Enter your mobile number',
          keyboardType: TextInputType.number,
          autofill: const [AutofillHints.telephoneNumber],
          onChanged: (value) {
            final digits = value.replaceAll(RegExp(r'\D'), '');
            final trimmed = digits.length > 10
                ? digits.substring(0, 10)
                : digits;
            if (trimmed != value) {
              _mobile.value = TextEditingValue(
                text: trimmed,
                selection: TextSelection.collapsed(offset: trimmed.length),
              );
            }
            setState(() {});
          },
        ),
      if (!isLogin || _method == _Method.email)
        AuthInput(
          label: 'Email Address',
          icon: Icons.mail_outline,
          controller: _email,
          hint: 'Enter your email',
          keyboardType: TextInputType.emailAddress,
          autofill: const [AutofillHints.email],
          onChanged: (_) => setState(() {}),
        ),
      if (!isLogin || _method == _Method.email)
        AuthInput(
          label: isLogin ? 'Password' : 'Create Password',
          icon: Icons.lock_outline,
          controller: _password,
          hint: isLogin ? 'Enter your password' : 'Minimum 8 characters',
          obscure: !_showPassword,
          onChanged: (_) => setState(() {}),
          trailing: IconButton(
            onPressed: () => setState(() => _showPassword = !_showPassword),
            icon: Icon(
              _showPassword
                  ? Icons.visibility_off_outlined
                  : Icons.visibility_outlined,
              size: 19,
              color: AppColors.muted,
            ),
          ),
        ),
      if (!_emailLogin)
        const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: Row(
            children: [
              Icon(
                Icons.verified_user_outlined,
                size: 14,
                color: AppColors.green,
              ),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  "We'll send a one-time code to verify it's you.",
                  style: TextStyle(
                    color: AppColors.muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      AppButton(
        label: _emailLogin
            ? 'Sign In'
            : (isLogin ? 'Send OTP' : 'Create Account'),
        onPressed: _submitDisabled ? null : _submitForm,
        loading: _loading,
      ),
      if (isLogin) ...[
        const SizedBox(height: 18),
        const Row(
          children: [
            Expanded(child: Divider(color: AppColors.line)),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                'or continue with',
                style: TextStyle(
                  color: AppColors.muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Expanded(child: Divider(color: AppColors.line)),
          ],
        ),
        const SizedBox(height: 14),
        AppButton(
          label: 'Continue with Google',
          variant: AppButtonVariant.outline,
          onPressed: _loading ? null : _google,
        ),
      ],
    ];
  }

  Widget _modeTabs() {
    Widget tab(_Mode mode, String label) {
      final selected = _mode == mode;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() {
            _mode = mode;
            _error = '';
          }),
          child: Container(
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? AppColors.buttonBlue : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : AppColors.muted,
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F6FB),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          tab(_Mode.login, 'Sign in'),
          const SizedBox(width: 4),
          tab(_Mode.signup, 'Create account'),
        ],
      ),
    );
  }

  Widget _methodTabs() {
    Widget tab(_Method method, String label, IconData icon) {
      final selected = _method == method;
      return Expanded(
        child: GestureDetector(
          onTap: () => setState(() {
            _method = method;
            _error = '';
          }),
          child: Container(
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? Colors.white : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              boxShadow: selected
                  ? const [
                      BoxShadow(
                        color: Color(0x241746A2),
                        blurRadius: 8,
                        offset: Offset(0, 4),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 14,
                  color: selected ? AppColors.blueDark : AppColors.muted,
                ),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: selected ? AppColors.blueDark : AppColors.muted,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F6FB),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          tab(_Method.mobile, 'Mobile Number', Icons.phone_iphone),
          const SizedBox(width: 4),
          tab(_Method.email, 'Email', Icons.mail_outline),
        ],
      ),
    );
  }

  Widget _badge(IconData icon) {
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
      child: Icon(icon, size: 24, color: Colors.white),
    );
  }
}

const _titleStyle = TextStyle(
  fontSize: 22,
  fontWeight: FontWeight.w800,
  color: AppColors.navy,
);
const _switchLinkStyle = TextStyle(
  color: AppColors.blueDark,
  fontWeight: FontWeight.w800,
  fontSize: 12,
  decoration: TextDecoration.underline,
);
