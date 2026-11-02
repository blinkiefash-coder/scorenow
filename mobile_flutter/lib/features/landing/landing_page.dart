import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/features/landing/assessment_draft.dart';
import 'package:scorenow_mobile/features/landing/landing_hero.dart';
import 'package:scorenow_mobile/features/landing/landing_sections.dart';
import 'package:scorenow_mobile/features/landing/landing_stats.dart';
import 'package:scorenow_mobile/features/landing/landing_style.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/select_field.dart';

const _goalOptions = [
  'Correct report errors',
  'Improve a low score',
  'Prepare for a loan',
  'Maintain a healthy score',
];

// Public landing page for guests. It mirrors the web homepage section by section.
// The assessment is filled in freely; logging in is only asked for at submit.
class GuestHomeScreen extends StatefulWidget {
  const GuestHomeScreen({super.key});

  @override
  State<GuestHomeScreen> createState() => _GuestHomeScreenState();
}

class _GuestHomeScreenState extends State<GuestHomeScreen> {
  // Like the web, the login prompt opens only once per app session.
  static bool _authPrompted = false;
  final _scrollController = ScrollController();
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _homeKey = GlobalKey();
  final _formKey = GlobalKey();
  final _creditScoreKey = GlobalKey();
  final _journeyKey = GlobalKey();
  final _estimatorKey = GlobalKey();
  final _servicesKey = GlobalKey();
  final _plansKey = GlobalKey();
  final _subscriptionKey = GlobalKey();
  final _businessKey = GlobalKey();
  final _aboutKey = GlobalKey();
  final _partnerKey = GlobalKey();
  final _contactKey = GlobalKey();

  final _fullName = TextEditingController();
  final _mobile = TextEditingController();
  final _email = TextEditingController();
  final _city = TextEditingController();
  final _score = TextEditingController();
  String _goal = '';
  PlatformFile? _report;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_authPrompted || _scrollController.offset < 220) return;
    _authPrompted = true;
    if (mounted) context.push('/login');
  }

  @override
  void dispose() {
    _scrollController.dispose();
    for (final controller in [_fullName, _mobile, _email, _city, _score]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _scrollTo(GlobalKey key) {
    final context = key.currentContext;
    if (context == null) return;
    Scrollable.ensureVisible(
      context,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOut,
      alignment: 0.05,
    );
  }

  // The drawer must close before scrolling, otherwise the target is hidden behind it.
  void _navigateFromDrawer(GlobalKey key) {
    _scaffoldKey.currentState?.closeEndDrawer();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollTo(key));
  }

  String get _digits => _mobile.text.replaceAll(RegExp(r'\D'), '');

  String? _validate() {
    if (_fullName.text.trim().isEmpty) return 'Full name is required.';
    if (_digits.length != 10) return 'Enter a valid 10-digit mobile number.';
    if (!RegExp(r'^\S+@\S+\.\S+$').hasMatch(_email.text.trim())) {
      return 'Enter a valid email address.';
    }
    if (_city.text.trim().isEmpty) return 'City is required.';
    if (_goal.isEmpty) return 'Select what you would like to improve.';
    return null;
  }

  void _submit() async {
    final problem = _validate();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() => _error = '');
    final report = _report;
    AssessmentReport? attached;
    if (report != null) {
      final bytes = await report.readAsBytes();
      if (!mounted) return;
      attached = AssessmentReport(
        filename: report.name,
        bytes: bytes,
        contentType: reportContentType(report.extension ?? '')!,
      );
    }
    AppScope.of(context).pendingAssessment = AssessmentDraft(
      fields: {
        'fullName': _fullName.text.trim(),
        'mobile': _digits,
        'email': _email.text.trim(),
        'city': _city.text.trim(),
        'score': _score.text.trim(),
        'goal': _goal,
      },
      report: attached,
    );
    if (!mounted) return;
    context.push('/login');
  }

  Future<void> _pickReport() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: assessmentReportExtensions,
    );
    if (file == null || !mounted) return;
    final size = await file.length();
    if (!mounted) return;
    if (reportContentType(file.extension ?? '') == null) {
      setState(() => _error = 'Upload a PDF, JPG, or PNG report.');
      return;
    }
    if (size != null && size > assessmentReportMaxBytes) {
      setState(() => _error = 'The selected file exceeds 10 MB.');
      return;
    }
    setState(() {
      _report = file;
      _error = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: Colors.white,
      appBar: AppBar(
        toolbarHeight: 68,
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 14,
        shape: const Border(bottom: BorderSide(color: Color(0xFFE7EEF7))),
        title: Align(
          alignment: Alignment.centerLeft,
          child: GestureDetector(
            onTap: () => _scrollTo(_homeKey),
            child: Image.asset(
              'assets/brand/scorenow-logo-2026.jpg',
              height: 60,
              width: 150,
              fit: BoxFit.contain,
            ),
          ),
        ),
        actions: [
          InkResponse(
            onTap: () => context.push('/login'),
            child: Container(
              width: 46,
              height: 46,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                border: Border.all(color: LP.line),
              ),
              child: Container(
                decoration: const BoxDecoration(
                  color: LP.sky,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.person_outline,
                  size: 18,
                  color: LP.blue,
                ),
              ),
            ),
          ),
          IconButton(
            padding: const EdgeInsets.all(8),
            icon: const Icon(Icons.menu, size: 26, color: LP.navy),
            onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
          ),
          const SizedBox(width: 6),
        ],
      ),
      endDrawer: _navDrawer(context),
      body: SingleChildScrollView(
        controller: _scrollController,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LandingHero(
              key: _homeKey,
              onExpert: () => _scrollTo(_contactKey),
              onHowItWorks: () => _scrollTo(_journeyKey),
              onEstimator: () => _scrollTo(_estimatorKey),
            ),
            const LandingStats(),
            LandingPathways(onStartAssessment: () => _scrollTo(_formKey)),
            _assessmentSection(),
            LandingInsights(key: _creditScoreKey),
            LandingJourney(key: _journeyKey),
            LandingEstimator(
              key: _estimatorKey,
              onGetReview: () => _scrollTo(_formKey),
            ),
            LandingServices(key: _servicesKey),
            LandingPlans(key: _plansKey, subscriptionKey: _subscriptionKey),
            LandingBusiness(key: _businessKey),
            LandingAbout(
              key: _aboutKey,
              onContact: () => _scrollTo(_contactKey),
            ),
            LandingPartner(key: _partnerKey),
            LandingContact(key: _contactKey),
            const LandingFooter(),
          ],
        ),
      ),
    );
  }

  Widget _navDrawer(BuildContext context) {
    final items = <(String, GlobalKey)>[
      ('Home', _homeKey),
      ('Credit Score', _creditScoreKey),
      ('Services', _servicesKey),
      ('Plans', _plansKey),
      ('Subscription', _subscriptionKey),
      ('For Businesses', _businessKey),
      ('About Us', _aboutKey),
      ('Contact', _contactKey),
    ];
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          children: [
            ListTile(
              leading: const Icon(Icons.assignment_outlined, color: LP.blue),
              title: const Text(
                'Free Assessment',
                style: TextStyle(color: LP.navy, fontWeight: FontWeight.w700),
              ),
              onTap: () => _navigateFromDrawer(_formKey),
            ),
            const Divider(),
            for (final (label, key) in items)
              ListTile(
                title: Text(label, style: const TextStyle(color: LP.navy)),
                onTap: () => _navigateFromDrawer(key),
              ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.login, color: LP.navy),
              title: const Text('Log in', style: TextStyle(color: LP.navy)),
              onTap: () {
                _scaffoldKey.currentState?.closeEndDrawer();
                context.push('/login');
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _assessmentSection() {
    return LandingSection(
      background: Colors.white,
      child: Column(
        key: _formKey,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const LandingKicker('FREE ASSESSMENT'),
          const SizedBox(height: 14),
          const LandingTitle(
            before: 'Get Your Personal ',
            highlight: 'Credit Health Assessment',
            size: 31,
          ),
          const SizedBox(height: 14),
          const Text(
            'Share a few details so our team can understand what may be holding your credit profile back.',
            textAlign: TextAlign.center,
            style: TextStyle(color: LP.muted, fontSize: 14, height: 1.6),
          ),
          const SizedBox(height: 28),
          Container(
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFDCE8F3)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A083D7B),
                  blurRadius: 55,
                  offset: Offset(0, 22),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [_assessmentVisual(), _formCard()],
            ),
          ),
        ],
      ),
    );
  }

  Widget _assessmentVisual() {
    const points = [
      (Icons.verified_user_outlined, 'Privacy-conscious handling'),
      (Icons.manage_search, 'Structured report review'),
      (Icons.headset_mic_outlined, 'Expert-guided next steps'),
    ];
    return Container(
      color: LP.blue,
      padding: const EdgeInsets.symmetric(horizontal: 23, vertical: 32),
      child: Column(
        children: [
          Container(
            width: 66,
            height: 66,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.person_outline,
              color: Colors.white,
              size: 31,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Know where you stand',
            textAlign: TextAlign.center,
            style: sora(
              size: 25,
              weight: FontWeight.w700,
              color: Colors.white,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Understand your report, identify important issues, and choose the right improvement path.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Color(0xFFDBEAFF),
              fontSize: 13,
              height: 1.65,
            ),
          ),
          const SizedBox(height: 24),
          for (final point in points)
            Padding(
              padding: const EdgeInsets.only(bottom: 13),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(point.$1, size: 18, color: const Color(0xFF72E5B0)),
                  const SizedBox(width: 9),
                  Text(
                    point.$2,
                    style: const TextStyle(color: Colors.white, fontSize: 11),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _reportPicker() {
    final name = _report?.name;
    return InkWell(
      onTap: _pickReport,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        constraints: const BoxConstraints(minHeight: 47),
        padding: const EdgeInsets.symmetric(horizontal: 13),
        decoration: BoxDecoration(
          color: const Color(0xFFF7FBFF),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFFA9C6DF)),
        ),
        child: Row(
          children: [
            const Icon(Icons.task_outlined, color: LP.blue, size: 18),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                name ?? 'Choose PDF, JPG, or PNG (max 10 MB)',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: name == null ? LP.muted : LP.navy,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _note(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 13, color: LP.muted),
          const SizedBox(width: 7),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: LP.muted,
                fontSize: 9,
                height: 1.45,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _formCard() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 19, vertical: 27),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppField(
            webStyle: true,
            label: 'Full name *',
            controller: _fullName,
            hint: 'Enter your full name',
            textInputAction: TextInputAction.next,
          ),
          AppField(
            webStyle: true,
            label: 'Mobile number *',
            controller: _mobile,
            hint: '10-digit mobile number',
            keyboardType: TextInputType.phone,
            maxLength: 10,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            textInputAction: TextInputAction.next,
          ),
          AppField(
            webStyle: true,
            label: 'Email address *',
            controller: _email,
            hint: 'you@example.com',
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
          ),
          AppField(
            webStyle: true,
            label: 'City *',
            controller: _city,
            hint: 'Enter your city',
            textInputAction: TextInputAction.next,
          ),
          AppField(
            webStyle: true,
            label: 'Current credit score',
            controller: _score,
            hint: 'If known',
            keyboardType: TextInputType.number,
            textInputAction: TextInputAction.done,
          ),
          SelectField(
            webStyle: true,
            label: 'What would you like to improve? *',
            value: _goal,
            options: _goalOptions,
            placeholder: 'Select a goal',
            onChanged: (value) => setState(() => _goal = value),
          ),
          const Padding(
            padding: EdgeInsets.only(bottom: 7),
            child: Text(
              'Upload credit report (optional)',
              style: TextStyle(
                color: LP.navy,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          _reportPicker(),
          if (_error.isNotEmpty) ...[
            const SizedBox(height: 12),
            ErrorBanner(message: _error),
          ],
          const SizedBox(height: 10),
          _note(
            Icons.mail_outline,
            'Your details and optional report are saved securely for our team to review.',
          ),
          _note(
            Icons.lock_outline,
            'You need to log in or sign up before submitting. Your details are kept while you sign in.',
          ),
          const SizedBox(height: 18),
          AppButton(label: 'Send Assessment Securely', onPressed: _submit),
        ],
      ),
    );
  }
}
