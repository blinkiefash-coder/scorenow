import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/theme.dart';

// Palette and type used by the guest landing page. Values come from the web
// stylesheet (frontend/src/index.css) so the page matches scorenow.in.
abstract final class LP {
  static const navy = Color(0xFF081446);
  static const blue = Color(0xFF0A3D9C);
  static const blueDark = Color(0xFF062A75);
  static const sky = Color(0xFFEAF6FF);
  static const page = Color(0xFFF6FBFF);
  static const muted = Color(0xFF68728C);
  static const line = Color(0xFFDCE8F5);
  static const green = Color(0xFF14A368);
  static const statBlue = Color(0xFF1539AE);
  static const shadow = Color(0xFF193D68);
}

const headingFont = 'Sora';

TextStyle sora({
  double size = 16,
  FontWeight weight = FontWeight.w700,
  Color color = LP.navy,
  double? height,
  double letterSpacing = 0,
}) => TextStyle(
  fontFamily: headingFont,
  fontSize: size,
  fontWeight: weight,
  color: color,
  height: height,
  letterSpacing: letterSpacing,
);

List<BoxShadow> softShadow([double alpha = 0.09]) => [
  BoxShadow(
    color: LP.shadow.withValues(alpha: alpha),
    blurRadius: 30,
    offset: const Offset(0, 9),
  ),
];

class LandingAsset extends StatelessWidget {
  const LandingAsset(this.path, {super.key, this.fit = BoxFit.contain});

  final String path;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    if (path.endsWith('.svg')) return SvgPicture.asset(path, fit: fit);
    return Image.asset(path, fit: fit);
  }
}

// Semicircle gauge used in the hero phone and the insights card. The web
// draws only the upper-left quarter as a red/amber/green ring with a dot marker.
class LandingGauge extends StatelessWidget {
  const LandingGauge({
    super.key,
    required this.score,
    required this.band,
    required this.radius,
    required this.thickness,
    required this.scoreSize,
    required this.labelSize,
    this.bandSize = 11,
  });

  final int score;
  final String band;
  final double radius;
  final double thickness;
  final double scoreSize;
  final double labelSize;
  final double bandSize;

  @override
  Widget build(BuildContext context) {
    final height = radius + labelSize + 6;
    return SizedBox(
      width: radius * 2,
      height: height,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _GaugePainter(radius: radius, thickness: thickness),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            top: radius - scoreSize * 0.92,
            child: Column(
              children: [
                Text(
                  '$score',
                  style: sora(
                    size: scoreSize,
                    weight: FontWeight.w800,
                    height: 1.05,
                  ),
                ),
                Text(
                  band,
                  style: TextStyle(
                    color: const Color(0xFF34A959),
                    fontSize: bandSize,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: thickness * 0.35,
            bottom: 0,
            child: Text('300', style: _labelStyle),
          ),
          Positioned(
            right: thickness * 0.35,
            bottom: 0,
            child: Text('900', style: _labelStyle),
          ),
        ],
      ),
    );
  }

  TextStyle get _labelStyle => TextStyle(
    color: LP.navy,
    fontSize: labelSize,
    fontWeight: FontWeight.w800,
  );
}

class _GaugePainter extends CustomPainter {
  _GaugePainter({required this.radius, required this.thickness});

  final double radius;
  final double thickness;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(radius, radius);
    final rect = Rect.fromCircle(
      center: center,
      radius: radius - thickness / 2,
    );
    const segments = [
      (AppColors.scorePoor, 75.0),
      (AppColors.scoreAverage, 30.0),
      (AppColors.scoreGood, 30.0),
      (AppColors.scoreExcellent, 45.0),
    ];
    var start = math.pi;
    for (final (color, degrees) in segments) {
      final sweep = degrees * math.pi / 180;
      canvas.drawArc(
        rect,
        start,
        sweep,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = thickness
          ..color = color,
      );
      start += sweep;
    }
    final dotAngle = -math.pi / 5;
    final dotRadius = radius * 0.86;
    final dot = Offset(
      center.dx + dotRadius * math.cos(dotAngle),
      center.dy + dotRadius * math.sin(dotAngle),
    );
    final dotSize = math.max(4.0, radius * 0.07);
    canvas.drawCircle(
      dot,
      dotSize * 1.9,
      Paint()..color = AppColors.scoreExcellent.withValues(alpha: 0.18),
    );
    canvas.drawCircle(dot, dotSize + 1.5, Paint()..color = Colors.white);
    canvas.drawCircle(dot, dotSize, Paint()..color = AppColors.scoreExcellent);
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) =>
      old.radius != radius || old.thickness != thickness;
}
