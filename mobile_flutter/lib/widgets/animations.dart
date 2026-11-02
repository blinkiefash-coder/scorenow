import 'package:flutter/material.dart';

/// Reusable animation curves and durations matching the web design system.
class AppAnimations {
  // Standard animation durations (in milliseconds)
  static const Duration short = Duration(milliseconds: 220);
  static const Duration standard = Duration(milliseconds: 350);
  static const Duration medium = Duration(milliseconds: 550);
  static const Duration long = Duration(milliseconds: 800);

  // Hover effects
  static const Curve easeOut = Curves.easeOut;
  static const Curve easeInOut = Curves.easeInOutCubic;
}

/// Fade and scale entrance animation (matching "chat-in" from web).
class ScaleInAnimation extends StatefulWidget {
  const ScaleInAnimation({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = AppAnimations.standard,
  });

  final Widget child;
  final Duration delay;
  final Duration duration;

  @override
  State<ScaleInAnimation> createState() => _ScaleInAnimationState();
}

class _ScaleInAnimationState extends State<ScaleInAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Opacity(
        opacity: _controller.value,
        child: Transform.scale(
          scale: 0.98 + 0.02 * _controller.value,
          child: Transform.translate(
            offset: Offset(0, 12 * (1 - _controller.value)),
            child: child,
          ),
        ),
      ),
      child: widget.child,
    );
  }
}

/// Slide up entrance animation with fade (matching "hero-item-in" from web).
class SlideUpAnimation extends StatefulWidget {
  const SlideUpAnimation({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.distance = 20.0,
    this.duration = AppAnimations.standard,
  });

  final Widget child;
  final Duration delay;
  final double distance;
  final Duration duration;

  @override
  State<SlideUpAnimation> createState() => _SlideUpAnimationState();
}

class _SlideUpAnimationState extends State<SlideUpAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Opacity(
        opacity: _controller.value,
        child: Transform.translate(
          offset: Offset(0, widget.distance * (1 - _controller.value)),
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

/// Slide in from the right (matching "situation-in" from web).
class SlideInFromRightAnimation extends StatefulWidget {
  const SlideInFromRightAnimation({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.distance = 15.0,
    this.duration = AppAnimations.standard,
  });

  final Widget child;
  final Duration delay;
  final double distance;
  final Duration duration;

  @override
  State<SlideInFromRightAnimation> createState() =>
      _SlideInFromRightAnimationState();
}

class _SlideInFromRightAnimationState extends State<SlideInFromRightAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Opacity(
        opacity: _controller.value,
        child: Transform.translate(
          offset: Offset(widget.distance * (1 - _controller.value), 0),
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

/// Floating/bobbing animation (matching "avatar-float" and "soft-float" from web).
class FloatAnimation extends StatefulWidget {
  const FloatAnimation({
    super.key,
    required this.child,
    this.distance = 7.0,
    this.duration = const Duration(milliseconds: 3000),
  });

  final Widget child;
  final double distance;
  final Duration duration;

  @override
  State<FloatAnimation> createState() => _FloatAnimationState();
}

class _FloatAnimationState extends State<FloatAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final value = _controller.value;
        // Smooth up and down motion
        final yOffset = widget.distance * (2 * (value - 0.5).abs() - 1);
        return Transform.translate(
          offset: Offset(0, -yOffset),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

/// Pulse/ring animation (matching "avatar-pulse" from web).
class PulseAnimation extends StatefulWidget {
  const PulseAnimation({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 2200),
  });

  final Widget child;
  final Duration duration;

  @override
  State<PulseAnimation> createState() => _PulseAnimationState();
}

class _PulseAnimationState extends State<PulseAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration)
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final value = _controller.value;
        final scale = 0.92 + 0.28 * value;
        final opacity = (value < 0.75)
            ? 0.65 + 0.35 * (value / 0.75)
            : 0.65 * (1 - (value - 0.75) / 0.25);
        return Opacity(
          opacity: opacity,
          child: Transform.scale(scale: scale, child: child),
        );
      },
      child: widget.child,
    );
  }
}

/// Icon pop animation (matching "icon-pop" from web).
class IconPopAnimation extends StatefulWidget {
  const IconPopAnimation({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 600),
  });

  final Widget child;
  final Duration delay;
  final Duration duration;

  @override
  State<IconPopAnimation> createState() => _IconPopAnimationState();
}

class _IconPopAnimationState extends State<IconPopAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final value = _controller.value;
        // Scale from 0.65 to 1.16 and back to 1
        final scale = value < 0.65
            ? 0.65 + 0.51 * (value / 0.65)
            : 1.16 - 0.16 * ((value - 0.65) / 0.35);
        final saturation = 0.5 + 0.5 * value;
        return Transform.scale(
          scale: scale,
          child: ColorFiltered(
            colorFilter: ColorFilter.matrix(
              _saturationMatrix(saturation),
            ),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }

  List<double> _saturationMatrix(double saturation) {
    return [
      0.299 + 0.701 * saturation,
      0.587 - 0.587 * saturation,
      0.114 - 0.114 * saturation,
      0,
      0,
      0.299 - 0.299 * saturation,
      0.587 + 0.413 * saturation,
      0.114 - 0.114 * saturation,
      0,
      0,
      0.299 - 0.299 * saturation,
      0.587 - 0.587 * saturation,
      0.114 + 0.886 * saturation,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
    ];
  }
}

/// Metric value rise animation (matching "metric-rise" from web).
class MetricRiseAnimation extends StatefulWidget {
  const MetricRiseAnimation({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = const Duration(milliseconds: 800),
  });

  final Widget child;
  final Duration delay;
  final Duration duration;

  @override
  State<MetricRiseAnimation> createState() => _MetricRiseAnimationState();
}

class _MetricRiseAnimationState extends State<MetricRiseAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final value = _controller.value;
        final opacity = value < 0.55 ? value / 0.55 : 1.0;
        return Opacity(
          opacity: opacity,
          child: Transform.translate(
            offset: Offset(0, 24 * (1 - value)),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// Staggered list animation - wraps children with increasing delays.
class StaggeredListAnimation extends StatelessWidget {
  const StaggeredListAnimation({
    super.key,
    required this.children,
    this.baseDelay = Duration.zero,
    this.delayBetween = const Duration(milliseconds: 80),
    this.animationType = AnimationType.slideUp,
  });

  final List<Widget> children;
  final Duration baseDelay;
  final Duration delayBetween;
  final AnimationType animationType;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (int i = 0; i < children.length; i++)
          _wrapChild(children[i], i),
      ],
    );
  }

  Widget _wrapChild(Widget child, int index) {
    final delay = baseDelay + delayBetween * index;
    switch (animationType) {
      case AnimationType.slideUp:
        return SlideUpAnimation(delay: delay, child: child);
      case AnimationType.slideInRight:
        return SlideInFromRightAnimation(delay: delay, child: child);
      case AnimationType.scaleIn:
        return ScaleInAnimation(delay: delay, child: child);
    }
  }
}

enum AnimationType { slideUp, slideInRight, scaleIn }

/// Button press feedback animation.
class ButtonPressAnimation extends StatefulWidget {
  const ButtonPressAnimation({
    super.key,
    required this.child,
    required this.onPressed,
  });

  final Widget child;
  final VoidCallback onPressed;

  @override
  State<ButtonPressAnimation> createState() => _ButtonPressAnimationState();
}

class _ButtonPressAnimationState extends State<ButtonPressAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onPress() {
    _controller.forward().then((_) {
      _controller.reverse();
    });
    widget.onPressed();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _onPress,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final value = _controller.value;
          return Transform.scale(
            scale: 1 - 0.04 * value,
            child: Opacity(
              opacity: 0.7 + 0.3 * (1 - value),
              child: child,
            ),
          );
        },
        child: widget.child,
      ),
    );
  }
}
