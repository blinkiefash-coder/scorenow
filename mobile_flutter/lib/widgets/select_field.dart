import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

class SelectField extends StatelessWidget {
  const SelectField({
    super.key,
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    this.placeholder = 'Select',
    this.webStyle = false,
  });

  final String label;
  final String value;
  final List<String> options;
  final ValueChanged<String> onChanged;
  final String placeholder;
  // Matches the web landing assessment form selects.
  final bool webStyle;

  Future<void> _open(BuildContext context) async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: false,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.65,
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 10),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.navy,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 18),
                children: [
                  for (final option in options)
                    InkWell(
                      onTap: () => Navigator.of(sheetContext).pop(option),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: const BoxDecoration(
                          border: Border(
                            bottom: BorderSide(color: AppColors.sky),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                option,
                                style: TextStyle(
                                  fontSize: 15,
                                  color: option == value
                                      ? AppColors.blue
                                      : AppColors.navy,
                                  fontWeight: option == value
                                      ? FontWeight.w800
                                      : FontWeight.w400,
                                ),
                              ),
                            ),
                            if (option == value)
                              const Icon(
                                Icons.check,
                                size: 18,
                                color: AppColors.blue,
                              ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: webStyle
                ? const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF081446),
                  )
                : const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy,
                  ),
          ),
          SizedBox(height: webStyle ? 7 : 6),
          Material(
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(webStyle ? 6 : AppRadius.md),
              side: BorderSide(
                color: webStyle ? const Color(0xFFD5E0EB) : AppColors.line,
              ),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(webStyle ? 6 : AppRadius.md),
              onTap: () => _open(context),
              child: Container(
                constraints: BoxConstraints(minHeight: webStyle ? 46 : 50),
                padding: EdgeInsets.symmetric(horizontal: webStyle ? 13 : 14),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        value.isEmpty ? placeholder : value,
                        style: TextStyle(
                          fontSize: webStyle ? 13 : 16,
                          fontWeight: webStyle ? FontWeight.w500 : null,
                          color: value.isEmpty
                              ? const Color(0xFF9AA5BD)
                              : (webStyle
                                    ? const Color(0xFF081446)
                                    : AppColors.navy),
                        ),
                      ),
                    ),
                    const Icon(
                      Icons.keyboard_arrow_down,
                      size: 20,
                      color: AppColors.muted,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
