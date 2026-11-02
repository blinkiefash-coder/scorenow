import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/content/credit_card_offers.dart';
import 'package:scorenow_mobile/core/dashboard.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/credit_cards/card_offer_tile.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/notice_dialog.dart';
import 'package:scorenow_mobile/widgets/segmented_chips.dart';

class CreditCardsScreen extends StatefulWidget {
  const CreditCardsScreen({super.key});

  @override
  State<CreditCardsScreen> createState() => _CreditCardsScreenState();
}

class _CreditCardsScreenState extends State<CreditCardsScreen> {
  CardCategory _category = CardCategory.all;

  List<CardOffer> get _visibleCards => [
    for (final card in cardOffers)
      if (_category == CardCategory.all || card.categories.contains(_category))
        card,
  ];

  @override
  Widget build(BuildContext context) {
    final cards = _visibleCards;
    return ModalPage(
      title: 'Credit cards',
      children: [
        SegmentedChips<CardCategory>(
          options: [
            for (final entry in cardCategoryLabels.entries)
              (value: entry.key, label: entry.value),
          ],
          selected: _category,
          onChanged: (value) => setState(() => _category = value),
        ),
        const SizedBox(height: 14),
        if (cards.isEmpty)
          const EmptyState(title: 'No cards in this category')
        else
          for (final card in cards)
            CardOfferTile(
              card: card,
              onCheckEligibility: () => showNotice(
                context,
                DashboardNotice(
                  title: 'Coming soon',
                  message:
                      'Applications for ${card.name} will open here soon. Fees, rewards and eligibility are set by the issuer.',
                ),
              ),
            ),
        const Padding(
          padding: EdgeInsets.only(top: 4),
          child: Text(
            'Card details are indicative. Fees, rewards and eligibility are decided by each issuer.',
            style: TextStyle(fontSize: 11, color: AppColors.muted),
          ),
        ),
      ],
    );
  }
}
