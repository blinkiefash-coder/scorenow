import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme.dart';

class AppScreen extends StatelessWidget {
  const AppScreen({
    super.key,
    required this.children,
    this.onRefresh,
    this.header,
    this.bottomBar,
  });

  final List<Widget> children;
  final Future<void> Function()? onRefresh;
  final Widget? header;
  final Widget? bottomBar;

  @override
  Widget build(BuildContext context) {
    final list = ListView(
      physics: onRefresh == null ? null : const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(
        18,
        8,
        18,
        24 + MediaQuery.paddingOf(context).bottom,
      ),
      children: [?header, ...children],
    );
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        bottom: false,
        child: onRefresh == null
            ? list
            : RefreshIndicator(
                color: AppColors.blue,
                onRefresh: onRefresh!,
                child: list,
              ),
      ),
      bottomNavigationBar: bottomBar,
    );
  }
}

class ScreenHeader extends StatelessWidget {
  const ScreenHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (canPop)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(
                  Icons.chevron_left,
                  size: 28,
                  color: AppColors.navy,
                ),
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 13,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class ModalHeader extends StatelessWidget implements PreferredSizeWidget {
  const ModalHeader({super.key, required this.title});

  final String title;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.line)),
      ),
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: kToolbarHeight,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  icon: const Icon(
                    Icons.chevron_left,
                    size: 28,
                    color: AppColors.navy,
                  ),
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.navy,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ModalPage extends StatelessWidget {
  const ModalPage({super.key, required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: ModalHeader(title: title),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
        children: children,
      ),
    );
  }
}

void hapticSelection() => HapticFeedback.selectionClick();
