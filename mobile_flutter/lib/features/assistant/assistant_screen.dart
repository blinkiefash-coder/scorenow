import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/content/chat_content.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/assistant/assistant_bubble.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:url_launcher/url_launcher.dart';

const _whatsappNumber = '919114141011';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({super.key});

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  final _scroll = ScrollController();
  final _phone = TextEditingController();
  int _step = 0;
  String _concern = '';
  String _scoreRange = '';
  String _error = '';
  bool _saving = false;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    _phone.text = AppScope.of(context).auth.customer?.user.mobile ?? '';
  }

  @override
  void dispose() {
    _scroll.dispose();
    _phone.dispose();
    super.dispose();
  }

  String get _digits => _phone.text.replaceAll(RegExp(r'\D'), '');

  void _goTo(int step) {
    setState(() => _step = step);
    Future<void>.delayed(const Duration(milliseconds: 80), () {
      if (!mounted || !_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  void _reset() {
    setState(() {
      _error = '';
      _concern = '';
      _scoreRange = '';
    });
    _goTo(0);
  }

  Future<void> _submit(String name) async {
    final digits = _digits;
    if (digits.length != 10) {
      setState(() => _error = 'Enter a valid 10-digit mobile number.');
      return;
    }
    final services = AppScope.of(context);
    final token = services.auth.customer?.token ?? '';
    setState(() {
      _error = '';
      _saving = true;
    });
    try {
      await services.api.request(
        'POST',
        '/api/inquiries',
        token: token,
        body: {
          'fullName': name,
          'mobile': digits,
          'concern': _concern,
          'scoreRange': _scoreRange,
        },
      );
      if (mounted) _goTo(4);
    } catch (caught) {
      if (mounted) {
        setState(() {
          _error = caught is ApiException
              ? caught.message
              : 'Unable to save your callback request.';
        });
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _openWhatsApp(String name) async {
    final digits = _digits;
    final text = Uri.encodeComponent(
      'Hello Scorenow, I am $name. I need help with: ${_concern.isEmpty ? 'credit guidance' : _concern}. '
      'My credit score range is: ${_scoreRange.isEmpty ? 'not shared' : _scoreRange}. '
      'My phone number is: ${digits.length == 10 ? digits : 'not provided'}.',
    );
    await launchUrl(
      Uri.parse('https://wa.me/$_whatsappNumber?text=$text'),
      mode: LaunchMode.externalApplication,
    );
  }

  List<({bool fromBot, String text})> _messages(String name) {
    final firstName = name.split(' ').first;
    return [
      (
        fromBot: true,
        text:
            "Hi $firstName! I'm Neha, your credit assistant. What do you need help with?",
      ),
      if (_step >= 1) ...[
        (fromBot: false, text: _concern),
        (
          fromBot: true,
          text: 'Got it. What is your current credit score range?',
        ),
      ],
      if (_step >= 2) ...[
        (fromBot: false, text: _scoreRange),
        (fromBot: true, text: chatSuggestion(_concern, _scoreRange)),
      ],
      if (_step >= 2 && _step < 4)
        (
          fromBot: true,
          text:
              'Want an expert to call you back? Share your 10-digit mobile number.',
        ),
      if (_step >= 4) ...[
        (fromBot: false, text: _phone.text),
        (
          fromBot: true,
          text:
              'Thanks! Your callback request is saved. Our team will reach out shortly.',
        ),
      ],
    ];
  }

  @override
  Widget build(BuildContext context) {
    final name = AppScope.of(context).auth.customer?.user.fullName ?? '';
    final messages = _messages(name);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const ModalHeader(title: 'Neha · Credit assistant'),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scroll,
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.all(16),
              children: [
                for (final message in messages)
                  ChatBubble(fromBot: message.fromBot, text: message.text),
              ],
            ),
          ),
          _footer(name),
        ],
      ),
    );
  }

  Widget _footer(String name) {
    return SafeArea(
      top: false,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: const BoxDecoration(
          color: AppColors.card,
          border: Border(top: BorderSide(color: AppColors.line)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_step == 0)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final option in chatConcerns)
                    ChatChoice(
                      label: option,
                      onTap: () => setState(() => _concern = option),
                    ),
                ],
              ),
            if (_step == 1)
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final option in scoreRanges)
                    ChatChoice(
                      label: option,
                      onTap: () {
                        setState(() => _scoreRange = option);
                        _goTo(2);
                      },
                    ),
                ],
              ),
            if (_step == 2 || _step == 3) ...[
              AppField(
                controller: _phone,
                hint: '10-digit mobile number',
                keyboardType: TextInputType.number,
                maxLength: 10,
                error: _error.isEmpty ? null : _error,
                onChanged: (_) => setState(() {}),
              ),
              AppButton(
                label: 'Request callback',
                loading: _saving,
                onPressed: _saving ? null : () => _submit(name),
              ),
            ],
            if (_step >= 2) ...[
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: () => _openWhatsApp(name),
                icon: const Icon(Icons.chat, size: 18, color: AppColors.green),
                label: const Text('Chat on WhatsApp'),
              ),
            ],
            if (_step >= 1)
              AppButton(
                label: 'Start over',
                variant: AppButtonVariant.ghost,
                onPressed: _reset,
              ),
          ],
        ),
      ),
    );
  }
}
