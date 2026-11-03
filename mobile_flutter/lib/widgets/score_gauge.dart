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
    this.compact = false,
  });

  final int? score;
  final String? band;
  final bool dark;
  final double size;
  final bool compact;

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
    if (widget.compact) return _buildCompact(score, scoreText, band, fraction);

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
                      _BandPill(label: band, color: scoreColor(score)),
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

  Widget _buildCompact(
    int? score,
    String scoreText,
    String band,
    double fraction,
  ) {
    final scale = widget.size / _gaugeSize;
    final cy = _gaugeCenter.dy * scale;
    const labelStyle = TextStyle(color: AppColors.muted, fontSize: 11);
    return SizedBox(
      width: widget.size,
      height: cy + 58,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final eased = Curves.easeOutCubic.transform(_controller.value);
          return Stack(
            clipBehavior: Clip.none,
            children: [
              CustomPaint(
                size: Size(widget.size, cy + 4),
                painter: _GaugePainter(
                  progress: fraction * eased,
                  showNeedle: score != null,
                  dark: false,
                  scale: scale,
                  compact: true,
                ),
              ),
              Positioned(
                top: cy - 46,
                left: 0,
                right: 0,
                child: Text(
                  scoreText,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 36,
                    height: 1.1,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Positioned(
                left: 2,
                top: cy + 4,
                child: const Text('300', style: labelStyle),
              ),
              Positioned(
                right: 2,
                top: cy + 4,
                child: const Text('900', style: labelStyle),
              ),
              Positioned(
                top: cy + 24,
                left: 0,
                right: 0,
                child: Center(
                  child: _BandPill(label: band, color: scoreColor(score)),
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
    this.compact = false,
  });

  final double progress;
  final bool showNeedle;
  final bool dark;
  final double scale;
  final bool compact;

  static const _bands = [
    (0.0, 279 / 600, Color(0xFF00C83F)),
    (280 / 600, 369 / 600, Color(0xFF95C83D)),
    (370 / 600, 439 / 600, Color(0xFFFFCF32)),
    (440 / 600, 499 / 600, Color(0xFFFF6A00)),
    (500 / 600, 1.0, Color(0xFFF10D17)),
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
          ..strokeWidth = (compact ? 16 : _gaugeStroke) * scale
          ..strokeCap = StrokeCap.butt
          ..color = color,
      );
    }

    if (compact) {
      if (showNeedle) {
        final angle = math.pi + math.pi * progress;
        final dot = Offset(
          center.dx + _gaugeRadius * scale * math.cos(angle),
          center.dy + _gaugeRadius * scale * math.sin(angle),
        );
        canvas.drawCircle(dot, 10 * scale + 1, Paint()..color = Colors.white);
        canvas.drawCircle(
          dot,
          8 * scale + 1,
          Paint()
            ..color = const Color(0xFF303238)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 3,
        );
      }
      return;
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
      old.compact != compact ||
      old.scale != scale;
}
