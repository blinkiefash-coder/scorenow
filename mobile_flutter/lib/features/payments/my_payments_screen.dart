import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';

class CustomerPayment {
  const CustomerPayment({
    required this.id,
    required this.description,
    required this.total,
    required this.status,
    required this.refundStatus,
    required this.createdAt,
  });

  factory CustomerPayment.fromJson(Map<String, dynamic> json) {
    final bureau = json['report_bureau'] as String?;
    final plan = json['plan_id'] as String?;
    final amount = json['amount'] is num ? json['amount'] as num : num.tryParse('${json['amount']}') ?? 0;
    final gst = json['gst_amount'] is num ? json['gst_amount'] as num : num.tryParse('${json['gst_amount']}') ?? 0;
    return CustomerPayment(
      id: '${json['id']}',
      description: plan != null && plan.isNotEmpty
          ? 'Subscription plan'
          : 'Credit report${bureau == null ? '' : ' · ${titleCase(bureau)}'}',
      total: amount + gst,
      status: json['status'] as String? ?? '',
      refundStatus: json['refund_status'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }

  final String id;
  final String description;
  final num total;
  final String status;
  final String? refundStatus;
  final String? createdAt;

  // Mirrors the server rule: only paid payments without an open refund request can be requested.
  bool get canRequestRefund => status == 'paid' && refundStatus == null;
}

class MyPaymentsScreen extends StatefulWidget {
  const MyPaymentsScreen({super.key});

  @override
  State<MyPaymentsScreen> createState() => _MyPaymentsScreenState();
}

class _MyPaymentsScreenState extends State<MyPaymentsScreen> {
  late final ApiResource<List<CustomerPayment>> _resource;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(fetch: () => _fetch(services))..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  Future<List<CustomerPayment>> _fetch(AppServices services) async {
    final json = await services.api.request(
      'GET',
      '/api/payments',
      token: services.auth.customer!.token,
    );
    return [
      for (final item in (json['payments'] as List<dynamic>? ?? const []))
        CustomerPayment.fromJson(item as Map<String, dynamic>),
    ];
  }

  Future<void> _requestRefund(CustomerPayment payment) async {
    final services = AppScope.of(context);
    final reason = await _askReason();
    if (reason == null) return;
    try {
      await services.api.request(
        'POST',
        '/api/payments/${payment.id}/refund-request',
        token: services.auth.customer!.token,
        body: {'reason': reason},
      );
      await _resource.refresh();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Refund request sent. We will review it and update you.')),
      );
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(caught is ApiException ? caught.message : 'Could not send the request.')),
      );
    }
  }

  Future<String?> _askReason() {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Request a refund'),
        content: AppField(
          label: 'Reason (10 to 1000 characters)',
          controller: controller,
          multiline: true,
          maxLength: 1000,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final reason = controller.text.trim();
              if (reason.length < 10) return;
              Navigator.of(dialogContext).pop(reason);
            },
            child: const Text('Send'),
          ),
        ],
      ),
    ).whenComplete(controller.dispose);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.navy),
        title: const Text('Payments & refunds', style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w800)),
      ),
      body: RefreshIndicator(
        onRefresh: _resource.refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _resource.builder((context, payments) {
              if (payments == null) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (payments.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No payments yet.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted)),
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final payment in payments)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: AppCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(payment.description,
                                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.navy)),
                                ),
                                AppPill(label: titleCase(payment.status), color: AppColors.blue),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${formatMoney(payment.total)} · ${formatDate(payment.createdAt)}',
                              style: const TextStyle(color: AppColors.muted, fontSize: 12),
                            ),
                            if (payment.refundStatus != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Refund: ${titleCase(payment.refundStatus!)}',
                                style: const TextStyle(color: AppColors.muted, fontSize: 12),
                              ),
                            ],
                            if (payment.canRequestRefund) ...[
                              const SizedBox(height: 10),
                              AppButton(
                                label: 'Request refund',
                                small: true,
                                variant: AppButtonVariant.outline,
                                expanded: false,
                                onPressed: () => _requestRefund(payment),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }
}
