import 'package:flutter/material.dart';

import 'package:scorenow_mobile/features/landing/landing_style.dart';
import 'package:scorenow_mobile/widgets/animations.dart';

// Impact stats card, credit bureau logos and the scrolling bank strip (web ImpactStats).

const _bureauLogos = [
  'assets/brand/logo-cibil.png',
  'assets/brand/logo-experian-new.svg',
  'assets/brand/logo-equifax.svg',
  'assets/brand/logo-crif.png',
];

const _banks = [
  ('State Bank of India', 'assets/banks/bank-sbi.svg'),
  ('HDFC Bank', 'assets/banks/bank-hdfc.svg'),
  ('ICICI Bank', 'assets/banks/bank-icici.svg'),
  ('Axis Bank', 'assets/banks/bank-axis.svg'),
  ('Kotak Mahindra Bank', 'assets/banks/bank-kotak.svg'),
  ('Bank of Baroda', 'assets/banks/bank-bob.png'),
  ('Punjab National Bank', 'assets/banks/bank-pnb.svg'),
  ('Canara Bank', 'assets/banks/bank-canara.svg'),
  ('Union Bank of India', 'assets/banks/bank-union.svg'),
  ('IDFC FIRST Bank', 'assets/banks/bank-idfc.svg'),
];

class LandingStats extends StatelessWidget {
  const LandingStats({super.key});

  @override
  Widget build(BuildContext context) {
    const stats = [
      (
        Icons.groups_outlined,
        Color(0xFFFFE6F0),
        Color(0xFFE0457B),
        '100,000+',
        'Customers Helped',
      ),
      (
        Icons.handshake_outlined,
        Color(0xFFDFF6EA),
        Color(0xFF14A368),
        '₹2,500+ Cr',
        'Loans Assisted',
      ),
      (Icons.bar_chart, Color(0xFFE4F1FF), LP.blue, '99%', 'See Improvement'),
      (
        Icons.apartment,
        Color(0xFFECE8FF),
        Color(0xFF6A4CC9),
        '40+',
        'Bank & Lender Partners',
      ),
    ];
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          Transform.translate(
            offset: const Offset(0, -10),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 14),
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFEEF4FA)),
                boxShadow: softShadow(),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < stats.length; i++)
                    Container(
                      height: 73,
                      padding: const EdgeInsets.only(left: 34),
                      decoration: BoxDecoration(
                        border: i == stats.length - 1
                            ? null
                            : const Border(bottom: BorderSide(color: LP.line)),
                      ),
                      child: MetricRiseAnimation(
                        delay: Duration(milliseconds: i * 100),
                        child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: stats[i].$2,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              stats[i].$1,
                              size: 22,
                              color: stats[i].$3,
                            ),
                          ),
                          const SizedBox(width: 13),
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                stats[i].$4,
                                style: sora(
                                  size: 20,
                                  weight: FontWeight.w700,
                                  color: LP.statBlue,
                                  height: 1.3,
                                ),
                              ),
                              Text(
                                stats[i].$5,
                                style: const TextStyle(
                                  color: LP.muted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Container(
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFEDF3F9))),
            ),
            child: Column(
              children: [const _BureauNetwork(), const _BankBand()],
            ),
          ),
        ],
      ),
    );
  }
}

class _BureauNetwork extends StatelessWidget {
  const _BureauNetwork();

  @override
  Widget build(BuildContext context) {
    Widget logo(String path, {required bool leftBorder}) => Container(
      height: 52,
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        border: leftBorder
            ? const Border(left: BorderSide(color: LP.line))
            : null,
      ),
      child: SizedBox(height: 38, width: 112, child: LandingAsset(path)),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 20, 14, 18),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(
                  color: Color(0xFFE5F2FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.verified_user_outlined,
                  size: 19,
                  color: LP.blue,
                ),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Credit Bureau Network',
                    style: TextStyle(
                      color: LP.navy,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'Reports and insights across major Indian bureaus',
                    style: TextStyle(color: LP.muted, fontSize: 9),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          for (var row = 0; row < 2; row++)
            Row(
              children: [
                for (var col = 0; col < 2; col++)
                  Expanded(
                    child: SlideInFromRightAnimation(
                      delay: Duration(milliseconds: (row * 2 + col) * 100),
                      child: logo(
                        _bureauLogos[row * 2 + col],
                        leftBorder: col == 1,
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _BankBand extends StatefulWidget {
  const _BankBand();

  @override
  State<_BankBand> createState() => _BankBandState();
}

class _BankBandState extends State<_BankBand>
    with SingleTickerProviderStateMixin {
  static const _tileWidth = 185.0;
  static const _gap = 14.0;
  static const _loop = (_tileWidth + _gap) * 10;

  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 32),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget _tile(String name, String logo) => Container(
    width: _tileWidth,
    height: 43,
    margin: const EdgeInsets.only(right: _gap),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(6),
      border: Border.all(color: const Color(0xFFDBE7F2)),
      boxShadow: [
        BoxShadow(
          color: const Color(0xFF144374).withValues(alpha: 0.05),
          blurRadius: 13,
          offset: const Offset(0, 4),
        ),
      ],
    ),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(width: 26, height: 26, child: LandingAsset(logo)),
        const SizedBox(width: 9),
        Flexible(
          child: Text(
            name,
            overflow: TextOverflow.ellipsis,
            style: sora(
              size: 11,
              weight: FontWeight.w600,
              color: const Color(0xFF263959),
            ),
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(0, 12, 0, 14),
      decoration: const BoxDecoration(
        color: Color(0xFFF7FBFF),
        border: Border.symmetric(
          horizontal: BorderSide(color: Color(0xFFE4EDF6)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                Icon(Icons.apartment, size: 18, color: LP.blue),
                SizedBox(width: 9),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Indian Banking Network',
                      style: TextStyle(
                        color: LP.navy,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Commonly used banks and lenders',
                      style: TextStyle(color: LP.muted, fontSize: 9),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 9),
          ShaderMask(
            shaderCallback: (rect) => const LinearGradient(
              colors: [
                Colors.transparent,
                Colors.black,
                Colors.black,
                Colors.transparent,
              ],
              stops: [0, 0.07, 0.93, 1],
            ).createShader(rect),
            blendMode: BlendMode.dstIn,
            child: SizedBox(
              height: 46,
              child: ClipRect(
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) => OverflowBox(
                    alignment: Alignment.centerLeft,
                    minWidth: 0,
                    maxWidth: double.infinity,
                    child: Transform.translate(
                      offset: Offset(-_controller.value * _loop, 0),
                      child: child,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (var i = 0; i < 2; i++)
                        for (final (name, logo) in _banks) _tile(name, logo),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
