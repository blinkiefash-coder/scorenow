import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

/// A horizontal row of text tabs with an underline under the selected one.
class UnderlineTabs<T> extends StatelessWidget {
  const UnderlineTabs({
    super.key,
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  final List<({T value, String label})> options;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.line)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final option in options)
              InkWell(
                onTap: () => onChanged(option.value),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(4, 10, 4, 10),
                  margin: const EdgeInsets.only(right: 18),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(
                        width: 2.5,
                        color: option.value == selected
                            ? AppColors.blue
                            : Colors.transparent,
                      ),
                    ),
                  ),
                  child: Text(
                    option.label,
                    style: TextStyle(
                      color: option.value == selected
                          ? AppColors.blue
                          : AppColors.muted,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
