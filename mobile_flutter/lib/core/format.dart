import 'package:intl/intl.dart';

final _rupees = NumberFormat.currency(
  locale: 'en_IN',
  symbol: '₹',
  decimalDigits: 0,
);
final _dayMonthYear = DateFormat('dd MMM yyyy', 'en_IN');
final _monthShortYear = DateFormat('MMM yy', 'en_IN');
final _dateTime = DateFormat.yMMMd('en_IN').add_jm();

String formatMoney(Object? value) {
  if (value == null || value == '') return '—';
  final number = value is num ? value : num.tryParse(value.toString());
  if (number == null) return '—';
  return _rupees.format(number);
}

String formatDate(String? value) {
  if (value == null || value.isEmpty) return '—';
  final parsed = DateTime.tryParse(
    value.substring(0, value.length >= 10 ? 10 : value.length),
  );
  return parsed == null ? '—' : _dayMonthYear.format(parsed);
}

String formatDateTime(String? value) {
  if (value == null || value.isEmpty) return '—';
  final parsed = DateTime.tryParse(value);
  return parsed == null ? '—' : _dateTime.format(parsed.toLocal());
}

String formatMonth(String value) {
  final parsed = DateTime.tryParse('$value-01');
  return parsed == null ? value : _monthShortYear.format(parsed);
}

String titleCase(String value) {
  return value
      .replaceAll(RegExp(r'[_-]'), ' ')
      .replaceAllMapped(
        RegExp(r'\b\w'),
        (match) => match.group(0)!.toUpperCase(),
      );
}
