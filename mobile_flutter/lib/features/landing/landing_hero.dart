import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'package:scorenow_mobile/features/landing/landing_style.dart';

// Hero, impact stats, bureau and bank strips. Mirrors the web hero-section and ImpactStats.

class LandingHero extends StatelessWidget {
  const LandingHero({
    super.key,
    required this.onExpert,
    required this.onHowItWorks,
    required this.onEstimator,
  });

  final VoidCallback onExpert;
  final VoidCallback onHowItWorks;
  final VoidCallback onEstimator;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: LP.page,
      padding: const EdgeInsets.fromLTRB(14, 45, 14, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F4FF),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.verified_user_outlined,
                    size: 16,
                    color: LP.blueDark,
                  ),
                  SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      "India's Credit Score Improvement Platform",
                      style: TextStyle(
                        color: LP.blueDark,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text.rich(
            TextSpan(
              style: sora(size: 42, weight: FontWeight.w800, height: 1.03),
              children: const [
                TextSpan(text: 'Your Better '),
                TextSpan(
                  text: 'Credit Score',
                  style: TextStyle(color: LP.blue),
                ),
                TextSpan(text: ' Starts Here.'),
              ],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          const Text(
            'Check, understand and improve your credit with expert guidance. Take control of your financial future.',
            textAlign: TextAlign.center,
            style: TextStyle(color: LP.muted, fontSize: 15, height: 1.55),
          ),
          const SizedBox(height: 24),
          const _BenefitGrid(),
          const SizedBox(height: 20),
          _OutlineCta(onPressed: onExpert),
          const SizedBox(height: 14),
          _TextLink('View How It Works', onHowItWorks),
          const SizedBox(height: 12),
          _TextLink('Estimate My Score', onEstimator),
          const SizedBox(height: 16),
          const Row(
            children: [
              Icon(Icons.shield, size: 17, color: Color(0xFF14BC78)),
              SizedBox(width: 7),
              Text(
                'Your data is 100% safe & confidential',
                style: TextStyle(color: LP.muted, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 40),
          const _HeroVisual(),
        ],
      ),
    );
  }
}

class _BenefitGrid extends StatelessWidget {
  const _BenefitGrid();

  @override
  Widget build(BuildContext context) {
    const items = [
      (
        Icons.lock_outline,
        Color(0xFFDFF6EA),
        Color(0xFF14A368),
        'Secure &\nPrivate',
      ),
      (Icons.bolt, Color(0xFFFFF1C9), Color(0xFFF4A300), 'Fast &\nSimple'),
      (
        Icons.fact_check_outlined,
        Color(0xFFECE8FF),
        Color(0xFF6A4CC9),
        'Detailed\nReport',
      ),
      (Icons.groups_outlined, Color(0xFFE4F1FF), LP.blue, 'Expert\nGuidance'),
    ];
    Widget cell((IconData, Color, Color, String) item) {
      final (icon, bg, fg, label) = item;
      return Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: Icon(icon, size: 20, color: fg),
          ),
          const SizedBox(width: 7),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: LP.navy,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                height: 1.3,
              ),
            ),
          ),
        ],
      );
    }

    return Column(
      children: [
        for (var i = 0; i < items.length; i += 2) ...[
          Row(
            children: [
              Expanded(child: cell(items[i])),
              const SizedBox(width: 10),
              Expanded(child: cell(items[i + 1])),
            ],
          ),
          if (i == 0) const SizedBox(height: 18),
        ],
      ],
    );
  }
}

class _OutlineCta extends StatelessWidget {
  const _OutlineCta({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(7),
      child: InkWell(
        borderRadius: BorderRadius.circular(7),
        onTap: onPressed,
        child: Container(
          height: 46,
          decoration: BoxDecoration(
            border: Border.all(color: LP.blueDark),
            borderRadius: BorderRadius.circular(7),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.headset_mic_outlined, size: 18, color: LP.blueDark),
              SizedBox(width: 11),
              Text(
                'Talk to an Expert',
                style: TextStyle(
                  color: LP.blueDark,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              SizedBox(width: 11),
              Icon(Icons.arrow_forward, size: 18, color: LP.blueDark),
            ],
          ),
        ),
      ),
    );
  }
}

class _TextLink extends StatelessWidget {
  const _TextLink(this.label, this.onPressed);

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: InkWell(
        onTap: onPressed,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: const TextStyle(
                color: LP.blueDark,
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                decoration: TextDecoration.underline,
                decorationColor: LP.blueDark,
                decorationThickness: 1.5,
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward, size: 18, color: LP.blueDark),
          ],
        ),
      ),
    );
  }
}

// Phone mockup with floating cards, as in the web hero-visual.
class _HeroVisual extends StatelessWidget {
  const _HeroVisual();

  @override
  Widget build(BuildContext context) {
    // Below the design width the whole mockup scales down instead of overlapping.
    return LayoutBuilder(
      builder: (context, box) {
        const designWidth = 340.0;
        final narrow = box.maxWidth < designWidth;
        final visual = SizedBox(
          width: narrow ? designWidth : box.maxWidth,
          height: 580,
          child: _stack(),
        );
        return narrow
            ? FittedBox(fit: BoxFit.scaleDown, child: visual)
            : visual;
      },
    );
  }

  Widget _stack() {
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.topCenter,
      children: [
        Positioned(
          top: 6,
          child: Transform.rotate(
            angle: 4 * math.pi / 180,
            child: const _Phone(),
          ),
        ),
        Positioned(
          left: 0,
          top: 70,
          child: Transform.rotate(
            angle: -4 * math.pi / 180,
            child: const _FloatingCard(
              icon: Icons.bar_chart,
              bold: '+42 points',
              light: 'in 6 months',
            ),
          ),
        ),
        Positioned(
          right: 0,
          top: 135,
          child: Transform.rotate(
            angle: 7 * math.pi / 180,
            child: const _FloatingCard(
              icon: Icons.currency_rupee,
              bold: 'Better loan',
              light: 'approval chances',
              circled: true,
            ),
          ),
        ),
        const Positioned(right: 0, bottom: 32, child: _LoanCard()),
      ],
    );
  }
}

class _FloatingCard extends StatelessWidget {
  const _FloatingCard({
    required this.icon,
    required this.bold,
    required this.light,
    this.circled = false,
  });

  final IconData icon;
  final String bold;
  final String light;
  final bool circled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: LP.shadow.withValues(alpha: 0.16),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: circled
                ? BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: LP.blue, width: 1.6),
                  )
                : null,
            child: Icon(icon, size: circled ? 15 : 24, color: LP.blue),
          ),
          const SizedBox(width: 9),
          Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                bold,
                style: const TextStyle(
                  color: LP.navy,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                light,
                style: const TextStyle(color: LP.navy, fontSize: 9.5),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LoanCard extends StatelessWidget {
  const _LoanCard();

  @override
  Widget build(BuildContext context) {
    Widget row(IconData icon, String text) => Padding(
      padding: const EdgeInsets.only(top: 11),
      child: Row(
        children: [
          Icon(icon, size: 16, color: LP.blue),
          const SizedBox(width: 9),
          Text(text, style: const TextStyle(color: LP.navy, fontSize: 11.5)),
        ],
      ),
    );
    return Container(
      width: 150,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        boxShadow: softShadow(0.16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Multiple Loan Options',
            style: TextStyle(
              color: LP.navy,
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          row(Icons.home_outlined, 'Home Loan'),
          row(Icons.credit_card, 'Credit Card'),
          row(Icons.currency_rupee, 'Personal Loan'),
        ],
      ),
    );
  }
}

class _Phone extends StatelessWidget {
  const _Phone();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 260,
      height: 520,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFF),
        border: Border.all(color: const Color(0xFF172238), width: 6),
        borderRadius: BorderRadius.circular(42),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF032754).withValues(alpha: 0.25),
            blurRadius: 55,
            offset: const Offset(0, 30),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.topCenter,
        children: [
          Positioned.fill(
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 30, 14, 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
              ),
              child: const _PhoneScreen(),
            ),
          ),
          Positioned(
            top: -4,
            child: Container(
              width: 100,
              height: 24,
              decoration: BoxDecoration(
                color: const Color(0xFF172238),
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PhoneScreen extends StatelessWidget {
  const _PhoneScreen();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(Icons.verified_user_outlined, size: 14, color: LP.blue),
            Text(
              'Scorenow',
              style: TextStyle(
                color: LP.navy,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
            Icon(Icons.menu, size: 14, color: LP.blue),
          ],
        ),
        const SizedBox(height: 14),
        const Text(
          'Your Credit Score',
          style: TextStyle(
            color: LP.navy,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 10),
        const LandingGauge(
          score: 831,
          band: 'Excellent',
          radius: 78,
          thickness: 34,
          scoreSize: 46,
          labelSize: 8,
        ),
        const Text(
          'Last updated: 10 Apr, 2024',
          style: TextStyle(color: LP.muted, fontSize: 6.5),
        ),
        const SizedBox(height: 8),
        Container(
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: LP.blue,
            borderRadius: BorderRadius.circular(4),
          ),
          child: const Text(
            'Improve Your Score',
            style: TextStyle(
              color: Colors.white,
              fontSize: 9,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(height: 8),
        const _PhoneRow(
          icon: Icons.check,
          bg: Color(0xFFDDF8EB),
          fg: Color(0xFF0E9E63),
          title: 'Payment History',
          sub: '100% on-time payments',
          badge: 'Excellent',
        ),
        const _PhoneRow(
          icon: Icons.bar_chart,
          bg: Color(0xFFFFF1C9),
          fg: Color(0xFFF4A300),
          title: 'Credit Usage',
          sub: '42% of credit limit',
          badge: 'Good',
        ),
        const _PhoneRow(
          icon: Icons.schedule,
          bg: Color(0xFFE4F1FF),
          fg: LP.blue,
          title: 'Credit Age',
          sub: '6 years 4 months',
          badge: 'Good',
        ),
        const _PhoneRow(
          icon: Icons.account_balance_wallet_outlined,
          bg: Color(0xFFDDF8EB),
          fg: Color(0xFF0E9E63),
          title: 'Account Mix',
          sub: '8 active accounts',
          badge: 'Good',
          last: true,
        ),
      ],
    );
  }
}

class _PhoneRow extends StatelessWidget {
  const _PhoneRow({
    required this.icon,
    required this.bg,
    required this.fg,
    required this.title,
    required this.sub,
    required this.badge,
    this.last = false,
  });

  final IconData icon;
  final Color bg;
  final Color fg;
  final String title;
  final String sub;
  final String badge;
  final bool last;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        border: last
            ? null
            : const Border(bottom: BorderSide(color: Color(0xFFEDF1F7))),
      ),
      child: Row(
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: Icon(icon, size: 12, color: fg),
          ),
          const SizedBox(width: 7),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: LP.navy,
                    fontSize: 8,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(sub, style: const TextStyle(color: LP.muted, fontSize: 6)),
              ],
            ),
          ),
          Text(
            badge,
            style: const TextStyle(
              color: Color(0xFF34A959),
              fontSize: 7.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}
