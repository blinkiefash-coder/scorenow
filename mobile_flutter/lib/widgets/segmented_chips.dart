import 'package:flutter/material.dart';

import '../core/theme.dart';

class SegmentedChips<T> extends StatelessWidget {
  const SegmentedChips({
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
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final option in options)
            Padding(
              padding: const EdgeInsets.only(right: 8, bottom: 14),
              child: ChoiceChip(
                label: Text(option.label),
                selected: option.value == selected,
                onSelected: (_) => onChanged(option.value),
                showCheckmark: false,
                shape: const StadiumBorder(
                  side: BorderSide(color: AppColors.line),
                ),
                selectedColor: AppColors.blue,
                backgroundColor: Colors.white,
                labelStyle: TextStyle(
                  color: option.value == selected
                      ? Colors.white
                      : AppColors.navy,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              ),
            ),
        ],
      ),
    );
  }
}
