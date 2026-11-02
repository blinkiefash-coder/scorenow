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
    final tone = scoreColor(score);
    final fraction = score == null
        ? 0.0
        : ((score.clamp(300, 900) - 300) / 600);
    final scoreText = score?.toString() ?? '—';
    final band = score == null ? 'No score yet' : (widget.band ?? '');
    final dark = widget.dark;
    final scale = widget.size / _gaugeSize;

    return SizedBox(
      width: widget.size,
      height: 70 * scale + 92,
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
                  dark: dark,
                  markerColor: dark ? AppColors.gold : tone,
                  scale: scale,
                ),
              ),
              Positioned(
                top: 70 * scale,
                left: 0,
                right: 0,
                child: Column(
                  children: [
                    Text(
                      scoreText,
                      style: TextStyle(
                        color: dark ? Colors.white : AppColors.navy,
                        fontSize: 46,
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
    required this.dark,
    required this.markerColor,
    required this.scale,
  });

  final double progress;
  final bool dark;
  final Color markerColor;
  final double scale;

  static const _gradient = [
    Color(0xFFE5484D),
    Color(0xFFF08A3C),
    Color(0xFFF4B523),
    Color(0xFF14BC78),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final center = _gaugeCenter * scale;
    final rect = Rect.fromCircle(center: center, radius: _gaugeRadius * scale);
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = _gaugeStroke * scale
      ..strokeCap = StrokeCap.round
      ..color = dark ? Colors.white.withValues(alpha: 0.16) : AppColors.line;
    canvas.drawArc(rect, math.pi, math.pi, false, track);

    if (progress > 0) {
      final sweep = math.pi * progress;
      final arc = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = _gaugeStroke * scale
        ..strokeCap = StrokeCap.round
        ..shader = const SweepGradient(
          startAngle: math.pi,
          endAngle: 2 * math.pi,
          colors: _gradient,
          transform: GradientRotation(0),
        ).createShader(rect);
      canvas.drawArc(rect, math.pi, sweep, false, arc);

      final angle = math.pi + sweep;
      final marker = Offset(
        center.dx + _gaugeRadius * scale * math.cos(angle),
        center.dy + _gaugeRadius * scale * math.sin(angle),
      );
      canvas.drawCircle(marker, 9 * scale, Paint()..color = Colors.white);
      canvas.drawCircle(
        marker,
        9 * scale,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 4 * scale
          ..color = markerColor,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GaugePainter old) =>
      old.progress != progress ||
      old.dark != dark ||
      old.markerColor != markerColor ||
      old.scale != scale;
}
