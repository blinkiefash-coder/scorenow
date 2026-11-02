import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/content/fixed_deposit_plans.dart';
import 'package:scorenow_mobile/core/dashboard.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/notice_dialog.dart';
import 'package:scorenow_mobile/widgets/segmented_chips.dart';
import 'package:scorenow_mobile/widgets/select_field.dart';

const _avatarColors = [
  AppColors.blue,
  AppColors.green,
  AppColors.violet,
  AppColors.gold,
];

class FixedDepositsScreen extends StatefulWidget {
  const FixedDepositsScreen({super.key});

  @override
  State<FixedDepositsScreen> createState() => _FixedDepositsScreenState();
}

class _FixedDepositsScreenState extends State<FixedDepositsScreen> {
  int _tenure = 12;
  bool _descending = true;

  List<FdPlan> get _visiblePlans {
    final plans = fdPlans
        .where((plan) => _tenure >= plan.minMonths && _tenure <= plan.maxMonths)
        .toList();
    plans.sort(
      (a, b) =>
          _descending ? b.rate.compareTo(a.rate) : a.rate.compareTo(b.rate),
    );
    return plans;
  }

  String get _tenureLabel {
    for (final tenure in fdTenures) {
      if (tenure.months == _tenure) return tenure.label;
    }
    return '';
  }

  void _selectTenureLabel(String label) {
    var months = 12;
    for (final tenure in fdTenures) {
      if (tenure.label == label) months = tenure.months;
    }
    setState(() => _tenure = months);
  }

  @override
  Widget build(BuildContext context) {
    final visible = _visiblePlans;
    final topRate = fdPlans
        .map((plan) => plan.rate)
        .reduce((a, b) => a > b ? a : b);
    final minInvest = fdPlans
        .map((plan) => plan.min)
        .reduce((a, b) => a < b ? a : b);
    return ModalPage(
      title: 'Fixed deposits',
      children: [
        Row(
          children: [
            Expanded(
              child: StatTile(
                label: 'Top rate',
                value: '${topRate.toStringAsFixed(2)}%',
                tone: AppColors.green,
              ),
            ),
            Expanded(
              child: StatTile(
                label: 'Partner banks',
                value: '${fdPlans.length}',
              ),
            ),
            Expanded(
              child: StatTile(
                label: 'Min. invest',
                value: formatMoney(minInvest),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        SelectField(
          label: 'Tenure',
          value: _tenureLabel,
          options: [for (final tenure in fdTenures) tenure.label],
          onChanged: _selectTenureLabel,
        ),
        const SizedBox(height: 12),
        SegmentedChips<bool>(
          options: const [
            (value: true, label: 'Highest rate first'),
            (value: false, label: 'Lowest rate first'),
          ],
          selected: _descending,
          onChanged: (value) => setState(() => _descending = value),
        ),
        const SizedBox(height: 12),
        if (visible.isEmpty)
          const EmptyState(title: 'No banks offer this tenure')
        else
          for (var index = 0; index < visible.length; index++)
            _PlanCard(
              plan: visible[index],
              color: _avatarColors[index % _avatarColors.length],
            ),
        const Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text(
            'Interest rates are indicative and may change. Please confirm the latest rate and terms with the bank before investing.',
            style: TextStyle(fontSize: 11, color: AppColors.muted),
          ),
        ),
      ],
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan, required this.color});

  final FdPlan plan;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: color,
                child: Text(
                  plan.bank.substring(0, 1),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  plan.bank,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${plan.rate.toStringAsFixed(2)}%',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: AppColors.green,
                    ),
                  ),
                  const Text('p.a.', style: _metaStyle),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Min ${formatMoney(plan.min)} · Max ${plan.max}',
            style: _metaStyle,
          ),
          Text('Tenure ${plan.tenure}', style: _metaStyle),
          Text('Payout ${plan.payout}', style: _metaStyle),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: AppButton(
              label: 'Invest now',
              small: true,
              expanded: false,
              variant: AppButtonVariant.outline,
              onPressed: () => showNotice(
                context,
                DashboardNotice(
                  title: 'Coming soon',
                  message:
                      'Online FD booking with ${plan.bank} is coming soon. Please contact the bank directly to invest.',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

const _metaStyle = TextStyle(fontSize: 12, color: AppColors.muted);
