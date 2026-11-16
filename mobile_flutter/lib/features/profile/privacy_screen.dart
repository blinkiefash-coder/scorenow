import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';

const _consentLabels = {
  'marketing': 'Offers and product updates',
  'data_sharing': 'Share my data with partners',
  'push_notifications': 'Push notifications',
};

class _PrivacyData {
  const _PrivacyData({required this.current, required this.history});

  final Map<String, bool> current;
  final List<Map<String, dynamic>> history;
}

class PrivacyScreen extends StatefulWidget {
  const PrivacyScreen({super.key});

  @override
  State<PrivacyScreen> createState() => _PrivacyScreenState();
}

class _PrivacyScreenState extends State<PrivacyScreen> {
  late final ApiResource<_PrivacyData> _resource;
  bool _started = false;
  String? _savingType;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(fetch: () => _load(services))..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  Future<_PrivacyData> _load(AppServices services) async {
    final json = await services.api.request(
      'GET',
      '/api/consents',
      token: services.auth.customer!.token,
    );
    final current = <String, bool>{};
    for (final row in (json['current'] as List<dynamic>? ?? const [])) {
      final map = row as Map<String, dynamic>;
      current[map['consent_type'] as String] = map['granted'] == true;
    }
    final history = [
      for (final row in (json['history'] as List<dynamic>? ?? const []))
        row as Map<String, dynamic>,
    ];
    return _PrivacyData(current: current, history: history);
  }

  Future<void> _toggle(String type, bool granted) async {
    final services = AppScope.of(context);
    setState(() => _savingType = type);
    try {
      await services.api.request(
        'POST',
        '/api/consents',
        token: services.auth.customer!.token,
        body: {'type': type, 'granted': granted},
      );
      await _resource.refresh();
    } catch (caught) {
      _showError(caught);
    } finally {
      if (mounted) setState(() => _savingType = null);
    }
  }

  Future<void> _deleteAccount() async {
    final services = AppScope.of(context);
    final confirmed = await _askDeleteConfirmation();
    if (confirmed != true) return;
    try {
      await services.api.request(
        'POST',
        '/api/account/delete',
        token: services.auth.customer!.token,
        body: {'confirm': 'DELETE'},
      );
      await services.customerAuth.signOut();
    } catch (caught) {
      _showError(caught);
    }
  }

  Future<bool?> _askDeleteConfirmation() {
    final controller = TextEditingController();
    return showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) {
          final ready = controller.text.trim() == 'DELETE';
          return AlertDialog(
            title: const Text('Delete account'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Your name, email, mobile and login will be removed. '
                  'Payment and report records are kept as required by law. '
                  'Type DELETE to confirm.',
                ),
                const SizedBox(height: 12),
                AppField(
                  label: 'Type DELETE',
                  controller: controller,
                  onChanged: (_) => setDialogState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              TextButton(
                style: TextButton.styleFrom(foregroundColor: AppColors.red),
                onPressed: ready ? () => Navigator.of(dialogContext).pop(true) : null,
                child: const Text('Delete'),
              ),
            ],
          );
        },
      ),
    ).whenComplete(controller.dispose);
  }

  void _showError(Object caught) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(caught is ApiException ? caught.message : 'Something went wrong.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.navy),
        title: const Text('Privacy & data', style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w800)),
      ),
      body: RefreshIndicator(
        onRefresh: _resource.refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _resource.builder((context, data) {
              if (data == null) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Consents', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy)),
                        for (final entry in _consentLabels.entries)
                          SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(entry.value),
                            value: data.current[entry.key] ?? false,
                            onChanged: _savingType == entry.key
                                ? null
                                : (value) => _toggle(entry.key, value),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Consent history', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy)),
                        const SizedBox(height: 8),
                        if (data.history.isEmpty)
                          const Text('No changes yet.', style: TextStyle(color: AppColors.muted)),
                        for (final row in data.history.take(20))
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Text(
                              '${_consentLabels[row['consent_type']] ?? row['consent_type']} · '
                              '${row['granted'] == true ? 'Granted' : 'Withdrawn'} · '
                              '${formatDateTime(row['created_at'] as String?)}',
                              style: const TextStyle(fontSize: 12.5, color: AppColors.muted),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              );
            }),
            const SizedBox(height: 12),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Delete account', style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.red)),
                  const SizedBox(height: 6),
                  const Text(
                    'Removes your personal details and signs you out. Payment and report records are kept as required by law.',
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  AppButton(label: 'Delete my account', variant: AppButtonVariant.danger, onPressed: _deleteAccount),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
