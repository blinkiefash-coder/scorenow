import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/content/credit_card_offers.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';

class CardOfferTile extends StatelessWidget {
  const CardOfferTile({
    super.key,
    required this.card,
    required this.onCheckEligibility,
  });

  final CardOffer card;
  final VoidCallback onCheckEligibility;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _CardVisual(card: card),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  card.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  card.blurb,
                  style: const TextStyle(fontSize: 13, color: AppColors.muted),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    AppPill(label: card.perk, color: AppColors.green),
                    for (final tag in card.tags)
                      AppPill(label: tag, color: AppColors.blue),
                  ],
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: AppButton(
                    label: 'Check eligibility',
                    small: true,
                    expanded: false,
                    onPressed: onCheckEligibility,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CardVisual extends StatelessWidget {
  const _CardVisual({required this.card});

  final CardOffer card;

  @override
  Widget build(BuildContext context) {
    final background = Color(card.colors[0]);
    final accent = Color(card.colors[1]);
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: background,
        border: Border(bottom: BorderSide(color: accent, width: 3)),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -40,
            top: -40,
            child: Opacity(
              opacity: 0.55,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            top: 14,
            child: Text(
              card.bank,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ),
          const Center(
            child: Icon(
              Icons.credit_card_outlined,
              size: 28,
              color: Color(0xCCFFFFFF),
            ),
          ),
          Positioned(
            right: 16,
            bottom: 12,
            child: Text(
              card.network,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
