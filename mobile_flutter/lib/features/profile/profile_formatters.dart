import 'package:flutter/services.dart';

// Mirrors the Expo DOB mask: digits only, capped at 8, with "/" after the day and month.
class DobInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final capped = digits.length > 8 ? digits.substring(0, 8) : digits;
    final buffer = StringBuffer();
    for (var index = 0; index < capped.length; index++) {
      if (index == 2 || index == 4) buffer.write('/');
      buffer.write(capped[index]);
    }
    final text = buffer.toString();
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

class UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = newValue.text.toUpperCase();
    return newValue.copyWith(text: text, selection: newValue.selection);
  }
}

// Converts DD/MM/YYYY to the YYYY-MM-DD the API expects. Returns '' when incomplete.
String dobToIsoDate(String value) {
  final parts = value.split('/');
  if (parts.length != 3) return '';
  final day = parts[0];
  final month = parts[1];
  final year = parts[2];
  if (day.isEmpty || month.isEmpty || year.length != 4) return '';
  return '$year-$month-$day';
}
