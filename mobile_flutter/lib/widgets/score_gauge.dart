import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/theme.dart';

const _gaugeSize = 240.0;
const _gaugeStroke = 20.0;
const _gaugeRadius = 110.0;
const _gaugeCenter = Offset(120, 120);

class ScoreGauge extends StatefulWidget {
  const ScoreGauge({
    super.key,
    required this.score,
    this.band,
    this.dark = false,
    this.size = _gaugeSize,
  });

  final int? score;
  final String? band;
  final bool dark;
  final double size;

  @override
  State<ScoreGauge> createState() => _ScoreGaugeState();
}

class _ScoreGaugeState extends State<ScoreGauge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  @override
  void initState() {
    super.initState();
    _controller.forward(from: 0);
  }

  @override
  void didUpdateWidget(covariant ScoreGauge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.score != widget.score) _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final score = widget.score;
    final fraction = score == null
        ? 0.0
        : ((score.clamp(300, 900) - 300) / 600);
    final scoreText = score?.toString() ?? '—';
    final band = score == null
        ? 'No score yet'
        : (widget.band ?? _scoreBand(score.clamp(300, 900).toInt()));
    final dark = widget.dark;
    final scale = widget.size / _gaugeSize;

    return SizedBox(
      width: widget.size,
      height: 140 * scale + 80,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final eased = Curves.easeOutCubic.transform(_controller.value);
          return Stack(
            clipBehavior: Clip.none,
            children: [
              CustomPaint(
                size: Size(widget.size, widget.size / 2 + 10 * scale),
                painter: _GaugePainter(
                  progress: fraction * eased,
                  showNeedle: score != null,
                  dark: dark,
                  scale: scale,
                ),
              ),
              Positioned(
                top: 140 * scale,
                left: 0,
                right: 0,
                child: Column(
                  children: [
                    Text(
                      scoreText,
                      style: TextStyle(
                        color: dark ? Colors.white : AppColors.navy,
                        fontSize: 46 * scale,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (dark)
                      Text(
                        band,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                        ),
                      )
                    else if (band.isNotEmpty)
                      _BandPill(
                        label: band,
                        color: score != null && score >= 700
                            ? AppColors.green
                            : AppColors.gold,
                      ),
                  ],
                ),
              ),
              Positioned(
                left: 6,
                top: _gaugeCenter.dy * scale + 6,
                child: Text(
                  '300',
                  style: TextStyle(
                    color: dark ? Colors.white54 : AppColors.muted,
                    fontSize: 11,
                  ),
                ),
              ),
              Positioned(
                right: 6,
                top: _gaugeCenter.dy * scale + 6,
                child: Text(
                  '900',
                  style: TextStyle(
                    color: dark ? Colors.white54 : AppColors.muted,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

String _scoreBand(int score) {
  if (score < 580) return 'Poor';
  if (score < 670) return 'Fair';
  if (score < 740) return 'Good';
  if (score < 800) return 'Very good';
  return 'Excellent';
}

class _BandPill extends StatelessWidget {
  const _BandPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: Color.lerp(color, Colors.black, 0.3),
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  _GaugePainter({
    required this.progress,
    required this.showNeedle,
    required this.dark,
    required this.scale,
  });

  final double progress;
  final bool showNeedle;
  final bool dark;
  final double scale;

  static const _bands = [
    (0.0, 279 / 600, Color(0xFFE5484D)),
    (280 / 600, 369 / 600, Color(0xFFF08A3C)),
    (370 / 600, 439 / 600, Color(0xFFF4B523)),
    (440 / 600, 499 / 600, Color(0xFF8CCF32)),
    (500 / 600, 1.0, Color(0xFF14BC78)),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final center = _gaugeCenter * scale;
    final rect = Rect.fromCircle(center: center, radius: _gaugeRadius * scale);
    for (final (start, end, color) in _bands) {
      final startAngle = math.pi + math.pi * (start + 0.006);
      final sweepAngle = math.pi * (end - start - 0.012);
      canvas.drawArc(
        rect,
        startAngle,
        sweepAngle,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = _gaugeStroke * scale
          ..strokeCap = StrokeCap.butt
          ..color = color,
      );
    }

    if (showNeedle) {
      final angle = math.pi + math.pi * progress;
      final tip = Offset(
        center.dx + (_gaugeRadius - 12) * scale * math.cos(angle),
        center.dy + (_gaugeRadius - 12) * scale * math.sin(angle),
      );
      final side = Offset(
        7 * scale * math.sin(angle),
        -7 * scale * math.cos(angle),
      );
      final needle = Path()
        ..moveTo(center.dx + side.dx, center.dy + side.dy)
        ..lineTo(tip.dx, tip.dy)
        ..lineTo(center.dx - side.dx, center.dy - side.dy)
        ..close();
      canvas.drawPath(needle, Paint()..color = const Color(0xFF303238));
      canvas.drawCircle(
        center,
        15 * scale,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.fill,
      );
      canvas.drawCircle(
        center,
        15 * scale,
        Paint()
          ..color = const Color(0xFF303238)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 5 * scale,
      );
      canvas.drawCircle(
        center,
        9 * scale,
        Paint()..color = const Color(0xFF303238),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) =>
      old.progress != progress ||
      old.showNeedle != showNeedle ||
      old.dark != dark ||
      old.scale != scale;
}
