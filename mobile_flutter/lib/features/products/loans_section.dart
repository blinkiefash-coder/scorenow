import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/content/loan_offers.dart';
import 'package:scorenow_mobile/core/dashboard.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/notice_dialog.dart';
import 'package:scorenow_mobile/widgets/segmented_chips.dart';

const _typeColors = {
  LoanType.personal: AppColors.blue,
  LoanType.home: AppColors.green,
  LoanType.business: AppColors.gold,
};

const _typeIcons = {
  LoanType.personal: Icons.person_outline_rounded,
  LoanType.home: Icons.home_outlined,
  LoanType.business: Icons.business_center_outlined,
};

class LoansSection extends StatefulWidget {
  const LoansSection({super.key});

  @override
  State<LoansSection> createState() => _LoansSectionState();
}

class _LoansSectionState extends State<LoansSection> {
  LoanType _type = LoanType.all;

  @override
  Widget build(BuildContext context) {
    final offers = [
      for (final offer in loanOffers)
        if (_type == LoanType.all || offer.type == _type) offer,
    ];
    final bestRate = offers
        .map((offer) => offer.rate)
        .reduce((a, b) => a < b ? a : b);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SegmentedChips<LoanType>(
          options: [
            for (final entry in loanTypeLabels.entries)
              (value: entry.key, label: entry.value),
          ],
          selected: _type,
          onChanged: (value) => setState(() => _type = value),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _Stat(
                label: 'Lowest rate',
                value: '${bestRate.toStringAsFixed(2)}%',
                color: AppColors.green,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Stat(
                label: 'Lenders',
                value: '${offers.length}',
                color: AppColors.navy,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        for (final offer in offers)
          _LoanOfferTile(
            offer: offer,
            onCheck: () => showNotice(
              context,
              DashboardNotice(
                title: 'Coming soon',
                message:
                    'Applications for ${offer.lender} loans will open here soon. Rates, fees and eligibility are set by the lender.',
              ),
            ),
          ),
        const Padding(
          padding: EdgeInsets.only(top: 2),
          child: Text(
            'Loan terms are indicative. Rates, fees and eligibility are decided by each lender.',
            style: TextStyle(fontSize: 11, color: AppColors.muted),
          ),
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            label,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _LoanOfferTile extends StatelessWidget {
  const _LoanOfferTile({required this.offer, required this.onCheck});

  final LoanOffer offer;
  final VoidCallback onCheck;

  @override
  Widget build(BuildContext context) {
    final color = _typeColors[offer.type] ?? AppColors.blue;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(_typeIcons[offer.type], color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      offer.lender,
                      style: const TextStyle(
                        color: AppColors.navy,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      '${loanTypeLabels[offer.type]} loan',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${offer.rate.toStringAsFixed(2)}%',
                    style: const TextStyle(
                      color: AppColors.green,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Text(
                    'p.a. onwards',
                    style: TextStyle(color: AppColors.muted, fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _Fact(label: 'Up to', value: offer.maxAmount),
              ),
              Expanded(
                child: _Fact(label: 'Tenure', value: offer.tenure),
              ),
              Expanded(
                child: _Fact(label: 'Fee', value: offer.fee),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              AppPill(label: 'Score ${offer.minScore}+', color: AppColors.blue),
              const Spacer(),
              AppButton(
                label: 'Check eligibility',
                small: true,
                expanded: false,
                onPressed: onCheck,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.muted, fontSize: 11),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            color: AppColors.navy,
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
