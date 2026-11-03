import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/dashboard.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/simulated_checkout.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/notice_dialog.dart';

class _Plan {
  _Plan(Map<String, dynamic> json)
    : id = json['id'] as String,
      name = json['name'] as String,
      months = (json['months'] as num).toInt(),
      price = (json['price'] as num).toInt(),
      note = json['note'] as String? ?? '',
      featured = json['featured'] == true;

  final String id;
  final String name;
  final int months;
  final int price;
  final String note;
  final bool featured;
}

class _Purchase {
  _Purchase(Map<String, dynamic> json)
    : planName = json['planName'] as String,
      startsAt = DateTime.tryParse(json['startsAt'] as String? ?? ''),
      expiresAt = DateTime.tryParse(json['expiresAt'] as String? ?? ''),
      status = json['status'] as String? ?? 'expired';

  final String planName;
  final DateTime? startsAt;
  final DateTime? expiresAt;
  final String status;
}

class PlanCard extends StatefulWidget {
  const PlanCard({super.key});

  @override
  State<PlanCard> createState() => _PlanCardState();
}

class _PlanCardState extends State<PlanCard> {
  List<_Plan> _plans = [];
  List<_Purchase> _history = [];
  _Purchase? _current;
  DateTime? _validUntil;
  bool _simulated = false;
  bool _loading = true;
  bool _failed = false;
  String? _busyPlan;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading && _plans.isEmpty && !_failed) _load();
  }

  void _apply(Map<String, dynamic> json) {
    final current = json['current'];
    _plans = [
      for (final plan in (json['plans'] as List? ?? []))
        _Plan(plan as Map<String, dynamic>),
    ];
    _history = [
      for (final item in (json['history'] as List? ?? []))
        _Purchase(item as Map<String, dynamic>),
    ];
    _current = current is Map<String, dynamic> ? _Purchase(current) : null;
    _validUntil = DateTime.tryParse(json['validUntil'] as String? ?? '');
    if (json['paymentsMode'] != null) {
      _simulated = json['paymentsMode'] == 'simulated';
    }
  }

  Future<void> _load() async {
    final services = AppScope.of(context);
    try {
      final json = await services.api.request(
        'GET',
        '/api/subscription',
        token: services.auth.customer!.token,
      );
      if (!mounted) return;
      setState(() {
        _apply(json);
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _failed = true;
        });
      }
    }
  }

  Future<void> _subscribe(_Plan plan) async {
    if (!_simulated) {
      await showNotice(
        context,
        const DashboardNotice(
          title: 'Subscribe on the website',
          message:
              'In-app payments are coming soon. Please subscribe on the Scorenow website and your plan will appear here.',
        ),
      );
      return;
    }
    final approved = await showSimulatedCheckout(
      context,
      bureauName: '${plan.name} plan',
      amount: plan.price,
    );
    if (!approved || !mounted) return;
    final services = AppScope.of(context);
    final token = services.auth.customer!.token;
    setState(() => _busyPlan = plan.id);
    try {
      final order = await services.api.request(
        'POST',
        '/api/subscription/order',
        token: token,
        body: {'planId': plan.id},
      );
      final result = await services.api.request(
        'POST',
        '/api/subscription/verify',
        token: token,
        body: {'orderId': order['orderId']},
      );
      if (mounted) setState(() => _apply(result));
    } on ApiException catch (error) {
      if (mounted) {
        await showNotice(
          context,
          DashboardNotice(title: 'Plan', message: error.message),
        );
      }
    } finally {
      if (mounted) setState(() => _busyPlan = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _failed || _plans.isEmpty) return const SizedBox.shrink();
    final current = _current;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your plan',
            style: TextStyle(
              color: AppColors.navy,
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.md),
              gradient: LinearGradient(
                colors: current != null
                    ? const [Color(0xFF0A3D9C), Color(0xFF1A63D6)]
                    : const [Color(0xFF5B6B8C), Color(0xFF8493B0)],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  current != null ? 'ACTIVE' : 'NO ACTIVE PLAN',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  current != null
                      ? '${current.planName} plan'
                      : 'Choose a plan below',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (current != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Valid until ${formatDate((_validUntil ?? current.expiresAt)?.toIso8601String())}',
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          for (final plan in _plans)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(
                  color: plan.featured ? AppColors.blue : AppColors.sky,
                  width: plan.featured ? 1.6 : 1,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.name,
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          '₹${plan.price} · ${plan.note}',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  AppButton(
                    label: current != null ? 'Extend' : 'Subscribe',
                    small: true,
                    loading: _busyPlan == plan.id,
                    onPressed: _busyPlan != null
                        ? null
                        : () => _subscribe(plan),
                  ),
                ],
              ),
            ),
          if (_history.length > 1 || (_history.isNotEmpty && current == null))
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                'Plan history: ${_history.map((p) => p.planName).join(', ')}',
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}
