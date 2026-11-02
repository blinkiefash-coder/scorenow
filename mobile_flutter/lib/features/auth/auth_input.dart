import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

class AuthInput extends StatelessWidget {
  const AuthInput({
    super.key,
    required this.label,
    required this.controller,
    this.icon,
    this.prefix,
    this.trailing,
    this.hint,
    this.keyboardType,
    this.obscure = false,
    this.autofill,
    this.capitalization = TextCapitalization.none,
    this.onChanged,
  });

  final String label;
  final TextEditingController controller;
  final IconData? icon;
  final String? prefix;
  final Widget? trailing;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscure;
  final Iterable<String>? autofill;
  final TextCapitalization capitalization;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: AppColors.navy,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            constraints: const BoxConstraints(minHeight: 46),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.line),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                if (prefix != null)
                  Container(
                    height: 42,
                    margin: const EdgeInsets.only(left: 2),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: AppColors.sky,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        Text(
                          prefix!,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.keyboard_arrow_down,
                          size: 14,
                          color: AppColors.muted,
                        ),
                      ],
                    ),
                  ),
                if (icon != null) ...[
                  const SizedBox(width: 14),
                  Icon(icon, size: 17, color: AppColors.blue),
                ],
                Expanded(
                  child: TextField(
                    controller: controller,
                    obscureText: obscure,
                    keyboardType: keyboardType,
                    autofillHints: autofill,
                    textCapitalization: capitalization,
                    onChanged: onChanged,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.navy,
                    ),
                    decoration: InputDecoration(
                      hintText: hint,
                      hintStyle: const TextStyle(color: AppColors.placeholder),
                      border: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 13,
                      ),
                    ),
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
        ],
      ),
    );
  }
}
