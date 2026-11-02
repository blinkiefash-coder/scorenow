import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/support/support_api.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class NewTicketScreen extends StatefulWidget {
  const NewTicketScreen({super.key});

  @override
  State<NewTicketScreen> createState() => _NewTicketScreenState();
}

class _NewTicketScreenState extends State<NewTicketScreen> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _loading = false;
  String _error = '';

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _subject.text.trim().length >= 3 && _message.text.trim().length >= 3;

  Future<void> _submit() async {
    final services = AppScope.of(context);
    final token = services.auth.customer?.token ?? '';
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      await createSupportTicket(
        services.api,
        token: token,
        subject: _subject.text.trim(),
        message: _message.text.trim(),
      );
      if (!mounted) return;
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/support');
      }
    } catch (caught) {
      if (!mounted) return;
      setState(
        () => _error = caught is ApiException
            ? caught.message
            : 'Unable to submit your ticket.',
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: const ModalHeader(title: 'New ticket'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error.isNotEmpty) ErrorBanner(message: _error),
              AppField(
                label: 'Subject',
                controller: _subject,
                hint: 'What do you need help with?',
                maxLength: 180,
                textInputAction: TextInputAction.next,
                onChanged: (_) => setState(() {}),
              ),
              AppField(
                label: 'Message',
                controller: _message,
                hint: 'Describe the issue in detail',
                multiline: true,
                maxLength: 4000,
                onChanged: (_) => setState(() {}),
              ),
              AppButton(
                label: 'Submit ticket',
                loading: _loading,
                onPressed: _canSubmit && !_loading ? _submit : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
