import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../core/theme.dart';

const _ringColors = [
  Color(0x00087AF5),
  Color(0xFF087AF5),
  Color(0xFF0A3D9C),
  Color(0xFFF5B400),
];

// Brand loader: the logo stays still while a gradient ring sweeps around it and a soft halo pulses.
class BrandSpinner extends StatefulWidget {
  const BrandSpinner({super.key, this.size = 36});

  final double size;

  @override
  State<BrandSpinner> createState() => _BrandSpinnerState();
}

class _BrandSpinnerState extends State<BrandSpinner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    // Too small for the logo to read, so buttons get just the sweeping arc.
    if (size < 28) {
      return SizedBox.square(
        dimension: size,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) => CustomPaint(
            painter: _RingPainter(
              progress: _controller.value,
              stroke: math.max(2, size / 8),
            ),
          ),
        ),
      );
    }

    final stroke = math.max(3.0, size / 14);
    return SizedBox.square(
      dimension: size,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final t = _controller.value;
          final pulse = (math.sin(t * 2 * math.pi) + 1) / 2;
          return Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: size * (0.86 + pulse * 0.14),
                height: size * (0.86 + pulse * 0.14),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.blue.withValues(
                    alpha: 0.10 * (1 - pulse) + 0.03,
                  ),
                ),
              ),
              CustomPaint(
                size: Size.square(size),
                painter: _RingPainter(progress: t, stroke: stroke),
              ),
              Transform.scale(scale: 0.97 + pulse * 0.03, child: child),
            ],
          );
        },
        child: Container(
          width: size * 0.68,
          height: size * 0.68,
          padding: EdgeInsets.all(size * 0.1),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.blue.withValues(alpha: 0.18),
                blurRadius: size * 0.22,
                offset: Offset(0, size * 0.05),
              ),
            ],
          ),
          child: Image.asset('assets/brand/mark.png', fit: BoxFit.contain),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.progress, required this.stroke});

  final double progress;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final arcRect = rect.deflate(stroke / 2);
    canvas.drawArc(
      arcRect,
      0,
      math.pi * 2,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = AppColors.blue.withValues(alpha: 0.08),
    );

    final start = progress * math.pi * 2;
    // The arc grows and shrinks while it spins, like Material's indicator.
    final sweep =
        math.pi * (0.55 + 0.75 * (math.sin(progress * 2 * math.pi) + 1) / 2);
    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.rotate(start);
    canvas.translate(-size.width / 2, -size.height / 2);
    canvas.drawArc(
      arcRect,
      -sweep,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..shader = SweepGradient(
          startAngle: 0,
          endAngle: math.pi * 2,
          colors: _ringColors,
          stops: const [0.0, 0.55, 0.8, 1.0],
          transform: GradientRotation(-sweep),
        ).createShader(rect),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.stroke != stroke;
}

class _LoadingDots extends StatefulWidget {
  const _LoadingDots();

  @override
  State<_LoadingDots> createState() => _LoadingDotsState();
}

class _LoadingDotsState extends State<_LoadingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  static const _colors = [AppColors.blue, Color(0xFF0A3D9C), Color(0xFFF5B400)];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < 3; i++)
            Builder(
              builder: (context) {
                final phase = (_controller.value - i * 0.18) % 1;
                final lift = math.max(0.0, math.sin(phase * math.pi * 2));
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: 7,
                  height: 7,
                  transform: Matrix4.translationValues(0, -5 * lift, 0),
                  decoration: BoxDecoration(
                    color: _colors[i].withValues(alpha: 0.45 + 0.55 * lift),
                    shape: BoxShape.circle,
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class FullScreenLoader extends StatelessWidget {
  const FullScreenLoader({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const BrandSpinner(size: 96),
              const SizedBox(height: 22),
              if (label != null) ...[
                Text(
                  label!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
              ],
              const _LoadingDots(),
            ],
          ),
        ),
      ),
    );
  }
}
