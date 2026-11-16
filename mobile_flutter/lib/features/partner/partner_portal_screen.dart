import 'dart:async';

import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/models/admin_crm.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

const _pollInterval = Duration(seconds: 20);

class PartnerPortalScreen extends StatefulWidget {
  const PartnerPortalScreen({super.key});

  @override
  State<PartnerPortalScreen> createState() => _PartnerPortalScreenState();
}

class _PartnerPortalScreenState extends State<PartnerPortalScreen> {
  late final ApiResource<Map<String, dynamic>> _resource;
  Timer? _poll;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(fetch: () => fetchPartnerPortal(services))..reload();
    // The Dart http client can't stream SSE, so the portal refreshes on a timer.
    _poll = Timer.periodic(_pollInterval, (_) => _resource.refresh());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _resource.dispose();
    super.dispose();
  }

  Future<void> _openPayoutSheet() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      builder: (_) => const _PayoutSheet(),
    );
    if (saved == true) _resource.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      onRefresh: () => _resource.refresh(),
      header: ScreenHeader(
        title: 'My Portal',
        subtitle: 'Your customers, earnings and payouts',
        trailing: IconButton(
          tooltip: 'Payout details',
          icon: const Icon(Icons.account_balance_wallet_outlined),
          onPressed: _openPayoutSheet,
        ),
      ),
      children: [
        _resource.builder((context, data) {
          if (data == null) {
            return const FullScreenLoader(label: 'Loading your portal…');
          }
          final customers = data['customers'] as List<PortalCustomer>;
          final commissions = data['commissions'] as List<CommissionRow>;
          final earnings = data['earnings'] as Map<String, dynamic>;
          final pending = _paise(earnings['pending_paise']);
          final paid = _paise(earnings['paid_paise']);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: StatTile(
                      label: 'Pending',
                      value: formatMoney(pending / 100),
                      tone: AppColors.gold,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: StatTile(
                      label: 'Paid',
                      value: formatMoney(paid / 100),
                      tone: AppColors.green,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              AppButton(
                label: 'Update payout details',
                variant: AppButtonVariant.outline,
                onPressed: _openPayoutSheet,
              ),
              const SizedBox(height: 20),
              const SectionTitle('Assigned customers'),
              const SizedBox(height: 8),
              if (customers.isEmpty)
                const EmptyState(
                  title: 'No customers yet',
                  text: 'Customers you enquire about or are assigned will appear here.',
                ),
              for (final customer in customers)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: AppCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(customer.fullName, style: const TextStyle(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              Text(
                                'Assigned ${formatDate(customer.assignedAt)}',
                                style: const TextStyle(color: AppColors.muted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        if (customer.latestReportStatus != null)
                          AppPill(
                            label: titleCase(customer.latestReportStatus!),
                            color: AppColors.blue,
                          ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 20),
              const SectionTitle('Commissions'),
              const SizedBox(height: 8),
              if (commissions.isEmpty)
                const EmptyState(title: 'No commissions yet', text: 'Earnings appear here once reports are completed.'),
              for (final row in commissions)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: AppCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                formatMoney(row.amountPaise / 100),
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                row.note ?? formatDate(row.createdAt),
                                style: const TextStyle(color: AppColors.muted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        AppPill(
                          label: titleCase(row.status),
                          color: row.status == 'paid' ? AppColors.green : AppColors.gold,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        }),
      ],
    );
  }
}

int _paise(Object? value) => int.tryParse('${value ?? 0}') ?? 0;

class _PayoutSheet extends StatefulWidget {
  const _PayoutSheet();

  @override
  State<_PayoutSheet> createState() => _PayoutSheetState();
}

class _PayoutSheetState extends State<_PayoutSheet> {
  final _name = TextEditingController();
  final _upi = TextEditingController();
  final _account = TextEditingController();
  final _ifsc = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _maskedAccount;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _name.dispose();
    _upi.dispose();
    _account.dispose();
    _ifsc.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final profile = await fetchPayoutProfile(AppScope.of(context));
      if (!mounted) return;
      setState(() {
        _upi.text = profile.upiId ?? '';
        _ifsc.text = profile.ifsc ?? '';
        _maskedAccount = profile.bankAccountMasked;
        _loading = false;
      });
    } catch (caught) {
      if (!mounted) return;
      setState(() {
        _error = _messageOf(caught);
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Enter the name on your payout account.');
      return;
    }
    final account = _account.text.trim();
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await updatePayoutProfile(
        AppScope.of(context),
        fullName: name,
        upiId: _upi.text.trim(),
        bankAccountNumber: account.isEmpty ? null : account,
        ifsc: _ifsc.text.trim(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (caught) {
      if (!mounted) return;
      setState(() {
        _error = _messageOf(caught);
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottom),
      child: _loading
          ? const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()))
          : Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Payout details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                AppField(label: 'Account holder name', controller: _name),
                const SizedBox(height: 12),
                AppField(label: 'UPI ID', controller: _upi, hint: 'name@bank'),
                const SizedBox(height: 12),
                AppField(
                  label: 'Bank account number',
                  controller: _account,
                  hint: _maskedAccount ?? 'Enter to set or change',
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                AppField(label: 'IFSC', controller: _ifsc, maxLength: 11),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  ErrorBanner(message: _error!),
                ],
                const SizedBox(height: 18),
                AppButton(label: 'Save', loading: _saving, onPressed: _saving ? null : _save),
              ],
            ),
    );
  }
}

String _messageOf(Object caught) => caught is ApiException ? caught.message : 'Something went wrong. Try again.';
