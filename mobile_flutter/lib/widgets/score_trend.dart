import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/format.dart';
import '../core/theme.dart';
import '../core/trend.dart';

const _trendHeight = 92.0;
const _padX = 8.0;
const _padTop = 10.0;
const _padBottom = 8.0;

class ScoreTrend extends StatelessWidget {
  const ScoreTrend({super.key, required this.points});

  final List<TrendPoint> points;

  @override
  Widget build(BuildContext context) {
    final hasEstimate = points.any((point) => point.estimated);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LayoutBuilder(
          builder: (context, constraints) => CustomPaint(
            size: Size(constraints.maxWidth, _trendHeight),
            painter: _TrendPainter(points: points),
          ),
        ),
        if (points.isNotEmpty) ...[
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(formatDate(points.first.date), style: _axisStyle),
              Text(formatDate(points.last.date), style: _axisStyle),
            ],
          ),
        ],
        if (hasEstimate) ...[
          const SizedBox(height: 6),
          const Text(
            'Dashed points are estimated from your payment history. The solid point is your latest report.',
            style: TextStyle(color: AppColors.muted, fontSize: 11),
          ),
        ],
      ],
    );
  }
}

const _axisStyle = TextStyle(
  color: AppColors.muted,
  fontSize: 9,
  fontWeight: FontWeight.w600,
);

class _TrendPainter extends CustomPainter {
  _TrendPainter({required this.points});

  final List<TrendPoint> points;

  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final innerWidth = width - _padX * 2;
    final innerHeight = size.height - _padTop - _padBottom;

    final gridPaint = Paint()
      ..color = AppColors.line
      ..strokeWidth = 1;
    for (final t in [0.0, 0.5, 1.0]) {
      final y = _padTop + innerHeight * t;
      _drawDashed(
        canvas,
        Offset(_padX, y),
        Offset(width - _padX, y),
        gridPaint,
        const [3, 4],
      );
    }

    if (points.isEmpty) return;

    final values = points.map((p) => p.score).toList();
    final minValue = values.reduce(math.min);
    final maxValue = values.reduce(math.max);
    var low = minValue - 20.0;
    var high = maxValue + 20.0;
    if (high - low < 60) {
      final mid = (minValue + maxValue) / 2;
      low = mid - 30;
      high = mid + 30;
    }
    low = low.clamp(300, 900).toDouble();
    high = high.clamp(300, 900).toDouble();
    if (high <= low) high = low + 1;

    Offset toPoint(int index, int score) {
      final x = points.length == 1
          ? width / 2
          : _padX + innerWidth * index / (points.length - 1);
      final y = _padTop + innerHeight * (1 - (score - low) / (high - low));
      return Offset(x, y);
    }

    final linePaint = Paint()
      ..color = AppColors.blue
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    for (var i = 1; i < points.length; i++) {
      final from = toPoint(i - 1, points[i - 1].score);
      final to = toPoint(i, points[i].score);
      final dashed = points[i].estimated || points[i - 1].estimated;
      final paint = dashed
          ? (Paint.from(linePaint)
              ..color = AppColors.blue.withValues(alpha: 0.55))
          : linePaint;
      if (dashed) {
        _drawDashed(canvas, from, to, paint, const [4, 4]);
      } else {
        canvas.drawLine(from, to, paint);
      }
    }

    for (var i = 0; i < points.length; i++) {
      final point = points[i];
      final center = toPoint(i, point.score);
      if (point.estimated) {
        canvas.drawCircle(center, 3, Paint()..color = Colors.white);
        canvas.drawCircle(
          center,
          3,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2
            ..color = AppColors.blue,
        );
      } else {
        canvas.drawCircle(center, 4.5, Paint()..color = AppColors.blue);
      }
    }
  }

  void _drawDashed(
    Canvas canvas,
    Offset from,
    Offset to,
    Paint paint,
    List<double> pattern,
  ) {
    final total = (to - from).distance;
    if (total == 0) return;
    final direction = (to - from) / total;
    var distance = 0.0;
    var on = true;
    var index = 0;
    while (distance < total) {
      final length = math.min(
        pattern[index % pattern.length],
        total - distance,
      );
      if (on) {
        canvas.drawLine(
          from + direction * distance,
          from + direction * (distance + length),
          paint,
        );
      }
      distance += length;
      on = !on;
      index++;
    }
  }

  @override
  bool shouldRepaint(covariant _TrendPainter old) => old.points != points;
}
