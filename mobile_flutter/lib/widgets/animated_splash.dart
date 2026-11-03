import 'dart:async';

import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

const _minVisible = Duration(milliseconds: 2400);
const _exitDuration = Duration(milliseconds: 450);
const _ringCycle = Duration(milliseconds: 2000);

// Launch overlay: stays until the minimum display time has passed and auth is restored.
class AnimatedSplash extends StatefulWidget {
  const AnimatedSplash({super.key, required this.ready, required this.onDone});

  final bool ready;
  final VoidCallback onDone;

  @override
  State<AnimatedSplash> createState() => _AnimatedSplashState();
}

class _AnimatedSplashState extends State<AnimatedSplash>
    with TickerProviderStateMixin {
  late final AnimationController _logo = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 800),
  );
  late final AnimationController _tagline = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 450),
  );
  late final AnimationController _bar = AnimationController(
    vsync: this,
    duration: _minVisible - const Duration(milliseconds: 200),
  );
  late final AnimationController _exit = AnimationController(
    vsync: this,
    duration: _exitDuration,
    value: 1,
  );
  late final AnimationController _ringA = _ringController(delay: Duration.zero);
  late final AnimationController _ringB = _ringController(
    delay: const Duration(milliseconds: 700),
  );

  Timer? _minTimer;
  bool _minElapsed = false;
  bool _exiting = false;

  AnimationController _ringController({required Duration delay}) {
    final total = _ringCycle + delay;
    final controller = AnimationController(vsync: this, duration: total);
    controller.repeat();
    return controller;
  }

  @override
  void initState() {
    super.initState();
    _logo.forward().whenComplete(() {
      if (mounted) _tagline.forward();
    });
    _bar.forward();
    _minTimer = Timer(_minVisible, () {
      _minElapsed = true;
      _leave();
    });
    if (widget.ready) _leave();
  }

  @override
  void didUpdateWidget(covariant AnimatedSplash oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.ready && !oldWidget.ready) _leave();
  }

  void _leave() {
    if (_exiting || !_minElapsed || !widget.ready) return;
    _exiting = true;
    _exit.reverse().whenComplete(() {
      if (mounted) widget.onDone();
    });
  }

  @override
  void dispose() {
    _minTimer?.cancel();
    _logo.dispose();
    _tagline.dispose();
    _bar.dispose();
    _exit.dispose();
    _ringA.dispose();
    _ringB.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: CurvedAnimation(parent: _exit, curve: Curves.easeOutQuad),
      child: ColoredBox(
        color: Colors.white,
        child: Stack(
          children: [
            Positioned(
              top: -90,
              right: -90,
              child: _blob(260, const Color(0x120A3D9C)),
            ),
            Positioned(
              bottom: -110,
              left: -80,
              child: _blob(280, const Color(0x24F4B523)),
            ),
            Center(child: _content()),
            Positioned(bottom: 64, left: 0, right: 0, child: _progressBar()),
          ],
        ),
      ),
    );
  }

  Widget _blob(double size, Color color) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
    );
  }

  Widget _content() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            child: SizedBox(
              width: 300,
              height: 260,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  _ring(_ringA, Duration.zero),
                  _ring(_ringB, const Duration(milliseconds: 700)),
                  AnimatedBuilder(
                    animation: _logo,
                    builder: (context, child) {
                      final t = _logo.value;
                      return Opacity(
                        opacity: t.clamp(0.0, 1.0),
                        child: Transform.translate(
                          offset: Offset(0, 24 * (1 - t)),
                          child: Transform.scale(
                            scale: 0.4 + 0.6 * t,
                            child: child,
                          ),
                        ),
                      );
                    },
                    child: Image.asset(
                      'assets/brand/logo-full.jpg',
                      width: 290,
                      height: 102,
                      fit: BoxFit.contain,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          FadeTransition(
            opacity: _tagline,
            child: AnimatedBuilder(
              animation: _tagline,
              builder: (context, child) => Transform.translate(
                offset: Offset(0, 16 * (1 - _tagline.value)),
                child: child,
              ),
              child: const Text(
                'Know your credit score. Improve it with confidence.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.muted,
                  height: 20 / 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Each ring is a 2000ms pulse preceded by a start delay, matching the Expo loop.
  Widget _ring(AnimationController controller, Duration delay) {
    const size = 260.0;
    final delayFraction =
        delay.inMilliseconds / (_ringCycle + delay).inMilliseconds;
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: controller,
        builder: (context, _) {
          final raw = controller.value;
          final p = raw < delayFraction
              ? 0.0
              : (raw - delayFraction) / (1 - delayFraction);
          final eased = Curves.easeOutQuad.transform(p);
          final opacity = eased < 0.15
              ? eased / 0.15 * 0.5
              : 0.5 * (1 - (eased - 0.15) / 0.85);
          return Transform.scale(
            scale: 0.55 + 1.05 * eased,
            child: Opacity(
              opacity: opacity.clamp(0.0, 1.0),
              child: Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.gold, width: 2),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _progressBar() {
    return Center(
      child: Container(
        width: 120,
        height: 4,
        decoration: BoxDecoration(
          color: AppColors.line,
          borderRadius: BorderRadius.circular(2),
        ),
        clipBehavior: Clip.antiAlias,
        child: AnimatedBuilder(
          animation: _bar,
          builder: (context, _) => Align(
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: Curves.easeInOutCubic.transform(_bar.value),
              child: const ColoredBox(
                color: AppColors.gold,
                child: SizedBox(height: 4),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
