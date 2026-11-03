import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/report.dart';

const _bureauLabels = {
  BureauId.cibil: 'CIBIL',
  BureauId.experian: 'EXPERIAN',
  BureauId.equifax: 'EQUIFAX',
  BureauId.crif: 'CRIF',
};

// Pill row to switch between bureaus. Bureaus without a completed report are disabled.
class BureauPills extends StatelessWidget {
  const BureauPills({
    super.key,
    required this.completed,
    required this.selected,
    required this.onSelect,
  });

  final List<BureauReport> completed;
  final BureauId? selected;
  final ValueChanged<BureauId> onSelect;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _bureauLabels.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final bureau = _bureauLabels.keys.elementAt(index);
          final available = completed.any((report) => report.bureau == bureau);
          final active = selected == bureau;
          final foreground = active
              ? Colors.white
              : (available ? AppColors.navy : AppColors.placeholder);
          return InkWell(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            onTap: available ? () => onSelect(bureau) : null,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: active ? AppColors.buttonBlue : Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.pill),
                border: Border.all(
                  color: active ? AppColors.buttonBlue : AppColors.line,
                ),
              ),
              child: Text(
                _bureauLabels[bureau]!,
                style: TextStyle(
                  color: foreground,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.4,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
