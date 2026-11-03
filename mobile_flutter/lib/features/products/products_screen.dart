import 'package:flutter/material.dart';
import 'package:scorenow_mobile/features/credit_cards/credit_cards_screen.dart';
import 'package:scorenow_mobile/features/fixed_deposits/fixed_deposits_screen.dart';
import 'package:scorenow_mobile/features/products/loans_section.dart';
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
          ProductTab.loans => const LoansSection(),
          ProductTab.cards => const CreditCardsScreen(embedded: true),
          ProductTab.deposits => const FixedDepositsScreen(embedded: true),
        },
      ],
    );
  }
}
