import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

Color ticketTone(String status) {
  if (status == 'resolved' || status == 'closed') return AppColors.green;
  if (status == 'in_progress') return AppColors.gold;
  return AppColors.blue;
}
