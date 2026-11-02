import 'package:flutter/material.dart';

abstract final class AppColors {
  static const navy = Color(0xFF10213F);
  static const blue = Color(0xFF1746A2);
  static const blueDark = Color(0xFF0B2F72);
  static const buttonBlue = Color(0xFF0A3D9C);
  static const buttonBlueDark = Color(0xFF062A75);
  static const sky = Color(0xFFEEF5FF);
  static const muted = Color(0xFF69768D);
  static const line = Color(0xFFE3EAF4);
  static const gold = Color(0xFFF4B523);
  static const green = Color(0xFF14BC78);
  static const red = Color(0xFFE5484D);
  static const violet = Color(0xFF7859E8);
  static const bg = Color(0xFFF4F7FC);
  static const card = Color(0xFFFFFFFF);
  static const placeholder = Color(0xFF9AA5BD);
  static const cardBorder = Color(0xFFE9EEF6);
  static const fieldFill = Color(0xFFF8FBFF);
  static const errorFill = Color(0xFFFDECEC);
}

abstract final class AppRadius {
  static const sm = 10.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const pill = 999.0;
}

abstract final class AppShadow {
  static const _color = Color(0xFF17315F);

  static final List<BoxShadow> card = [
    BoxShadow(
      color: _color.withValues(alpha: 0.06),
      blurRadius: 18,
      offset: const Offset(0, 5),
    ),
  ];
}

Color scoreColor(int? score) {
  if (score == null || score == 0) return AppColors.muted;
  if (score >= 750) return AppColors.green;
  if (score >= 650) return AppColors.gold;
  return AppColors.red;
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.blue,
      primary: AppColors.blue,
      surface: AppColors.bg,
    ),
    scaffoldBackgroundColor: AppColors.bg,
    fontFamily: 'Manrope',
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: AppColors.navy,
      elevation: 0,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: _webButtonStyle(filled: true),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: _webButtonStyle(filled: false),
    ),
  );
}

// Mirrors the web `.button`, `.button-primary` and `.button-outline` rules.
ButtonStyle _webButtonStyle({required bool filled}) {
  return ButtonStyle(
    minimumSize: const WidgetStatePropertyAll(Size(0, 48)),
    padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 24)),
    shape: WidgetStatePropertyAll(
      RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
    ),
    textStyle: const WidgetStatePropertyAll(
      TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
    ),
    elevation: const WidgetStatePropertyAll(0),
    backgroundColor: WidgetStatePropertyAll(
      filled ? AppColors.buttonBlue : Colors.white,
    ),
    foregroundColor: WidgetStatePropertyAll(
      filled ? Colors.white : AppColors.buttonBlueDark,
    ),
    side: filled
        ? null
        : const WidgetStatePropertyAll(
            BorderSide(color: AppColors.buttonBlueDark),
          ),
  );
}
