import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

class HomeBanner extends StatelessWidget {
  const HomeBanner({super.key, required this.name, required this.subtitle});

  final String name;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 76,
      clipBehavior: Clip.hardEdge,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.blueDark, AppColors.blue],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: 16,
            bottom: 0,
            child: CustomPaint(
              size: const Size(84, 62),
              painter: _BarsPainter(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 100),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hey $name 👋',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BarsPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const heights = [0.3, 0.45, 0.6, 0.78, 1.0];
    final barWidth = size.width / 9;
    final fill = Paint()..color = Colors.white.withValues(alpha: 0.28);
    final top = <Offset>[];
    for (var i = 0; i < heights.length; i++) {
      final h = size.height * heights[i] * 0.85;
      final x = i * barWidth * 1.8;
      canvas.drawRRect(
        RRect.fromRectAndCorners(
          Rect.fromLTWH(x, size.height - h, barWidth, h),
          topLeft: const Radius.circular(3),
          topRight: const Radius.circular(3),
        ),
        fill,
      );
      top.add(Offset(x + barWidth / 2, size.height - h - 8));
    }
    final line = Paint()
      ..color = AppColors.gold
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final path = Path()..moveTo(top.first.dx, top.first.dy);
    for (final point in top.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    canvas.drawPath(path, line);
    canvas.drawCircle(top.last, 4, Paint()..color = AppColors.gold);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
