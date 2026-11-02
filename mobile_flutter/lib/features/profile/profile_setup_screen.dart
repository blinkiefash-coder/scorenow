import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/features/profile/indian_states.dart';
import 'package:scorenow_mobile/features/profile/profile_formatters.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/select_field.dart';

const _genders = ['Male', 'Female', 'Other'];
final _panPattern = RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$', caseSensitive: false);

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key, this.gated = false});

  // When true, the form is the whole app until a profile is saved, as on the web.
  final bool gated;

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _name = TextEditingController();
  final _pan = TextEditingController();
  final _dob = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _pincode = TextEditingController();
  final _email = TextEditingController();
  String _gender = '';
  String _state = '';
  bool _consent = false;
  bool _initialized = false;
  bool _loading = false;
  String _error = '';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    final profile = DashboardScope.of(context).dashboard.data?.profile;
    final user = AppScope.of(context).auth.customer?.user;
    final profileName = profile?.nameAsPerPan ?? '';
    _name.text = profileName.isNotEmpty ? profileName : (user?.fullName ?? '');
    _city.text = profile?.city ?? '';
    _state = profile?.state ?? '';
  }

  @override
  void dispose() {
    for (final controller in [
      _name,
      _pan,
      _dob,
      _address,
      _city,
      _pincode,
      _email,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _fail(String message) => setState(() => _error = message);

  Future<void> _submit() async {
    setState(() => _error = '');
    final pan = _pan.text.toUpperCase();
    final dateOfBirth = dobToIsoDate(_dob.text);
    if (!_panPattern.hasMatch(pan))
      return _fail('Enter a valid 10-character PAN, e.g. ABCDE1234F.');
    if (dateOfBirth.isEmpty)
      return _fail('Enter your date of birth as DD/MM/YYYY.');
    if (_gender.isEmpty) return _fail('Select your gender.');
    if (_state.isEmpty) return _fail('Select your state.');
    if (!_consent)
      return _fail(
        'Please agree to share your details with the credit bureau to continue.',
      );

    final services = AppScope.of(context);
    final dashboard = DashboardScope.of(context);
    final token = services.auth.customer?.token ?? '';
    final existingEmail = services.auth.customer?.user.email ?? '';
    final typedEmail = _email.text.trim();

    setState(() => _loading = true);
    try {
      await services.api.request(
        'POST',
        '/api/profile',
        token: token,
        body: {
          'nameAsPerPan': _name.text.trim(),
          'pan': pan,
          'dateOfBirth': dateOfBirth,
          'gender': _gender.toLowerCase(),
          'addressLine1': _address.text.trim(),
          'city': _city.text.trim(),
          'state': _state,
          'pincode': _pincode.text,
          'email': typedEmail,
        },
      );
      if (typedEmail.isNotEmpty && existingEmail.isEmpty) {
        await services.auth.updateCustomer(
          (current) => current.copyWith(email: typedEmail.toLowerCase()),
        );
      }
      dashboard.dashboard.reload();
      if (!mounted) return;
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/profile');
      }
    } catch (caught) {
      if (!mounted) return;
      _fail(
        caught is ApiException
            ? caught.message
            : 'Unable to save your profile.',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasEmail =
        (AppScope.of(context).auth.customer?.user.email ?? '').isNotEmpty;
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: widget.gated ? null : const ModalHeader(title: 'Credit profile'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 40),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF4D6),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      size: 14,
                      color: Color(0xFF9A6A00),
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Almost there',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF9A6A00),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Complete your credit profile',
                style: _introTitleStyle,
              ),
              const SizedBox(height: 6),
              const Text(
                'We need these details to fetch your credit report from CIBIL, Equifax, or Experian.',
                style: TextStyle(
                  color: AppColors.muted,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Use the details exactly as they appear on your PAN card.',
                style: TextStyle(
                  color: AppColors.muted,
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.line),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0F0A3D9C),
                      blurRadius: 24,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: _formChildren(hasEmail),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _formChildren(bool hasEmail) {
    return [
      if (_error.isNotEmpty) ErrorBanner(message: _error),
      AppField(
        label: 'Name as per PAN',
        controller: _name,
        hint: 'Enter your full name',
      ),
      AppField(
        label: 'PAN',
        controller: _pan,
        hint: 'ABCDE1234F',
        inputFormatters: [
          UpperCaseFormatter(),
          LengthLimitingTextInputFormatter(10),
        ],
        textInputAction: TextInputAction.next,
      ),
      AppField(
        label: 'Date of birth',
        controller: _dob,
        hint: 'DD/MM/YYYY',
        keyboardType: TextInputType.number,
        inputFormatters: [DobInputFormatter()],
      ),
      SelectField(
        label: 'Gender',
        value: _gender,
        options: _genders,
        onChanged: (value) => setState(() => _gender = value),
      ),
      if (!hasEmail)
        AppField(
          label: 'Email',
          controller: _email,
          keyboardType: TextInputType.emailAddress,
        ),
      AppField(
        label: 'Address',
        controller: _address,
        hint: 'House no., street, area',
      ),
      AppField(label: 'City', controller: _city),
      SelectField(
        label: 'State',
        value: _state,
        options: indianStates,
        onChanged: (value) => setState(() => _state = value),
      ),
      AppField(
        label: 'PIN code',
        controller: _pincode,
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(6),
        ],
      ),
      const SizedBox(height: 4),
      CheckboxListTile(
        value: _consent,
        onChanged: (value) => setState(() => _consent = value ?? false),
        controlAffinity: ListTileControlAffinity.leading,
        contentPadding: EdgeInsets.zero,
        dense: true,
        activeColor: AppColors.buttonBlue,
        title: const Text(
          'I agree to let Scorenow share these details with the credit bureau I choose to fetch my credit report.',
          style: TextStyle(fontSize: 12, color: AppColors.muted, height: 1.4),
        ),
      ),
      const SizedBox(height: 8),
      AppButton(
        label: _loading ? 'Saving profile…' : 'Save profile',
        loading: _loading,
        onPressed: _loading ? null : _submit,
      ),
      if (widget.gated) ...[
        const SizedBox(height: 4),
        Center(
          child: TextButton(
            onPressed: () => AppScope.of(context).customerAuth.signOut(),
            child: const Text(
              'Log out',
              style: TextStyle(color: AppColors.muted),
            ),
          ),
        ),
      ],
    ];
  }
}

const _introTitleStyle = TextStyle(
  fontSize: 22,
  fontWeight: FontWeight.w900,
  color: AppColors.navy,
);
