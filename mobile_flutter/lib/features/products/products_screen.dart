import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/underline_tabs.dart';

enum ProductTab { loans, cards, deposits }

const _productOptions = [
  (value: ProductTab.loans, label: 'Loans'),
  (value: ProductTab.cards, label: 'Cards'),
  (value: ProductTab.deposits, label: 'Deposits'),
];

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  ProductTab _tab = ProductTab.loans;

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      header: const ScreenHeader(
        title: 'Products',
        subtitle: 'Loans and cards matched to your profile',
      ),
      children: [
        UnderlineTabs<ProductTab>(
          options: _productOptions,
          selected: _tab,
          onChanged: (tab) => setState(() => _tab = tab),
        ),
        const SizedBox(height: 14),
        switch (_tab) {
          ProductTab.loans => const _LoanList(),
          ProductTab.cards => _ProductTile(
            icon: Icons.credit_card_rounded,
            title: 'Credit cards',
            text: 'Compare cards that suit your score and spending.',
            onTap: () => context.push('/credit-cards'),
          ),
          ProductTab.deposits => _ProductTile(
            icon: Icons.savings_outlined,
            title: 'Fixed deposits',
            text: 'Park savings in bank fixed deposits with competitive rates.',
            onTap: () => context.push('/fixed-deposits'),
          ),
        },
      ],
    );
  }
}

class _LoanList extends StatelessWidget {
  const _LoanList();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: const [
        _ProductTile(
          icon: Icons.person_outline_rounded,
          title: 'Personal loan',
          text: 'Quick unsecured funds.',
          comingSoon: true,
        ),
        _ProductTile(
          icon: Icons.home_outlined,
          title: 'Home loan',
          text: 'Finance your next home.',
          comingSoon: true,
        ),
        _ProductTile(
          icon: Icons.business_center_outlined,
          title: 'Business loan',
          text: 'Working capital for your business.',
          comingSoon: true,
        ),
        AppCard(
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Check your loan eligibility',
                  style: TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              AppPill(label: 'Coming soon', color: AppColors.muted),
            ],
          ),
        ),
      ],
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({
    required this.icon,
    required this.title,
    required this.text,
    this.onTap,
    this.comingSoon = false,
  });

  final IconData icon;
  final String title;
  final String text;
  final VoidCallback? onTap;
  final bool comingSoon;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: comingSoon ? null : onTap,
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.sky,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Icon(icon, color: AppColors.blue),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  text,
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          if (comingSoon)
            const AppPill(label: 'Coming soon', color: AppColors.muted)
          else
            const Icon(Icons.chevron_right_rounded, color: AppColors.muted),
        ],
      ),
    );
  }
}
