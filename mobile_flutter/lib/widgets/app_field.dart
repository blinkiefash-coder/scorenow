import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme.dart';

class AppField extends StatelessWidget {
  const AppField({
    super.key,
    this.label,
    this.controller,
    this.hint,
    this.error,
    this.multiline = false,
    this.keyboardType,
    this.obscure = false,
    this.maxLength,
    this.onChanged,
    this.textInputAction,
    this.onSubmitted,
    this.autofocus = false,
    this.inputFormatters,
    this.webStyle = false,
  });

  final String? label;
  final TextEditingController? controller;
  final String? hint;
  final String? error;
  final bool multiline;
  final TextInputType? keyboardType;
  final bool obscure;
  final int? maxLength;
  final ValueChanged<String>? onChanged;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final bool autofocus;
  final List<TextInputFormatter>? inputFormatters;
  // Matches the web landing assessment form inputs.
  final bool webStyle;

  @override
  Widget build(BuildContext context) {
    final border = OutlineInputBorder(
      borderRadius: BorderRadius.circular(webStyle ? 6 : AppRadius.md),
      borderSide: BorderSide(
        color: webStyle ? const Color(0xFFD5E0EB) : AppColors.line,
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label != null) ...[
            Text(
              label!,
              style: webStyle
                  ? const TextStyle(
                      color: Color(0xFF081446),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    )
                  : const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
            ),
            SizedBox(height: webStyle ? 7 : 6),
          ],
          TextField(
            controller: controller,
            obscureText: obscure,
            autofocus: autofocus,
            maxLines: multiline ? 5 : 1,
            minLines: multiline ? 5 : 1,
            maxLength: maxLength,
            keyboardType: multiline ? TextInputType.multiline : keyboardType,
            textInputAction: textInputAction,
            onChanged: onChanged,
            onSubmitted: onSubmitted,
            inputFormatters: inputFormatters,
            style: TextStyle(
              fontSize: webStyle ? 13 : 16,
              fontWeight: webStyle ? FontWeight.w500 : null,
              color: webStyle ? const Color(0xFF081446) : AppColors.navy,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: AppColors.placeholder),
              filled: true,
              fillColor: webStyle ? Colors.white : AppColors.fieldFill,
              isDense: false,
              counterText: '',
              constraints: BoxConstraints(
                minHeight: multiline ? 110 : (webStyle ? 46 : 50),
              ),
              contentPadding: EdgeInsets.symmetric(
                horizontal: webStyle ? 13 : 14,
                vertical: webStyle ? 12 : 14,
              ),
              border: border,
              enabledBorder: border,
              focusedBorder: border.copyWith(
                borderSide: BorderSide(
                  color: webStyle ? const Color(0xFF0A3D9C) : AppColors.blue,
                ),
              ),
              errorText: null,
            ),
          ),
          if (error != null) ...[
            const SizedBox(height: 6),
            Text(
              error!,
              style: const TextStyle(color: AppColors.red, fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }
}
