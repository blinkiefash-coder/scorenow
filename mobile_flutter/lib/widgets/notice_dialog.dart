import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/dashboard.dart';

Future<void> showNotice(BuildContext context, DashboardNotice notice) {
  return showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(notice.title),
      content: Text(notice.message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(dialogContext).pop(),
          child: const Text('OK'),
        ),
      ],
    ),
  );
}
