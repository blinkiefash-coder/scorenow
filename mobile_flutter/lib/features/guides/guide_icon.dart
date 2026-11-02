import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/content/credit_guides.dart';

IconData guideIconData(GuideIcon icon) {
  switch (icon) {
    case GuideIcon.trendingUp:
      return Icons.trending_up;
    case GuideIcon.speedometer:
      return Icons.speed;
    case GuideIcon.search:
      return Icons.search;
  }
}
