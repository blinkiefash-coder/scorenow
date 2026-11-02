import 'package:flutter/material.dart';

import '../core/theme.dart';
import 'brand_spinner.dart';

enum AppButtonVariant { primary, gold, danger, outline, ghost }

class AppButton extends StatefulWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.small = false,
    this.loading = false,
    this.expanded = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool small;
  final bool loading;
  final bool expanded;

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pressController;

  @override
  void initState() {
    super.initState();
    _pressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
  }

  @override
  void dispose() {
    _pressController.dispose();
    super.dispose();
  }

  void _onTap() {
    _pressController.forward().then((_) {
      _pressController.reverse();
    });
    widget.onPressed?.call();
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.loading;
    final style = _style(widget.variant);
    final button = Opacity(
      opacity: widget.onPressed == null ? 0.55 : 1,
      child: AnimatedBuilder(
        animation: _pressController,
        builder: (context, child) {
          final scale = 1 - 0.03 * _pressController.value;
          return Transform.scale(
            scale: scale,
            child: child,
          );
        },
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: style.background,
            borderRadius: BorderRadius.circular(7),
            border: style.border == null
                ? null
                : Border.all(color: style.border!),
            boxShadow: widget.variant == AppButtonVariant.primary
                ? [
                    BoxShadow(
                      color: AppColors.buttonBlue.withValues(alpha: 0.2),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ]
                : null,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(7),
              onTap: enabled ? _onTap : null,
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: widget.small ? 40 : 48),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 10,
                  ),
                  child: Row(
                    mainAxisSize: widget.expanded ? MainAxisSize.max : MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (widget.loading) ...[
                        BrandSpinner(size: widget.small ? 16 : 20),
                        const SizedBox(width: 10),
                      ],
                      Flexible(
                        child: Text(
                          widget.label,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: style.foreground,
                            fontSize: widget.small ? 14 : 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    return widget.expanded ? SizedBox(width: double.infinity, child: button) : button;
  }

  _ButtonStyle _style(AppButtonVariant variant) {
    switch (variant) {
      case AppButtonVariant.primary:
        return const _ButtonStyle(
          background: AppColors.buttonBlue,
          foreground: Colors.white,
        );
      case AppButtonVariant.gold:
        return const _ButtonStyle(
          background: AppColors.gold,
          foreground: AppColors.navy,
        );
      case AppButtonVariant.danger:
        return const _ButtonStyle(
          background: AppColors.red,
          foreground: Colors.white,
        );
      case AppButtonVariant.outline:
        return const _ButtonStyle(
          background: Colors.white,
          foreground: AppColors.buttonBlueDark,
          border: AppColors.buttonBlueDark,
        );
      case AppButtonVariant.ghost:
        return const _ButtonStyle(
          background: Colors.transparent,
          foreground: AppColors.blue,
        );
    }
  }
}

class _ButtonStyle {
  const _ButtonStyle({
    required this.background,
    required this.foreground,
    this.border,
  });

  final Color background;
  final Color foreground;
  final Color? border;
}
