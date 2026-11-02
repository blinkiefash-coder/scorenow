import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

class _TabItem {
  const _TabItem(this.label, this.icon, this.activeIcon);

  final String label;
  final IconData icon;
  final IconData activeIcon;
}

const _items = [
  _TabItem('Home', Icons.home_outlined, Icons.home_rounded),
  _TabItem('Payments', Icons.payments_outlined, Icons.payments_rounded),
  _TabItem('Products', Icons.grid_view_outlined, Icons.grid_view_rounded),
  _TabItem('Learn', Icons.menu_book_outlined, Icons.menu_book_rounded),
  _TabItem('Profile', Icons.person_outline_rounded, Icons.person_rounded),
];

const _idleTint = Color(0xFF8D98A9);

class CustomerTabBar extends StatelessWidget {
  const CustomerTabBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;
    return Container(
      height: 64 + bottomInset,
      padding: EdgeInsets.only(
        top: 7,
        bottom: bottomInset < 8 ? 8 : bottomInset,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: AppColors.line)),
        boxShadow: [
          BoxShadow(
            color: const Color(0x1417315F),
            blurRadius: 20,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: Row(
        children: [
          for (var i = 0; i < _items.length; i++)
            Expanded(
              child: _TabButton(
                item: _items[i],
                focused: i == currentIndex,
                onTap: () => onTap(i),
              ),
            ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.item,
    required this.focused,
    required this.onTap,
  });

  final _TabItem item;
  final bool focused;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = focused ? AppColors.blue : _idleTint;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 40,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: focused ? const Color(0xFFEAF1FF) : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(
              focused ? item.activeIcon : item.icon,
              size: 24,
              color: tint,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            item.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: tint,
            ),
          ),
        ],
      ),
    );
  }
}
