import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/landing/landing_style.dart';
import 'package:scorenow_mobile/features/landing/plans_data.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/score_gauge.dart';

// Section widgets for the guest home page. Content mirrors the web HomePage in frontend/src/App.tsx.

const landingPhone = '+91 91141 41011';
const _landingEmail = 'info@scorenow.in';

Future<void> openWhatsApp(String message) => launchUrl(
  Uri.https('wa.me', '/919114141011', {'text': message}),
  mode: LaunchMode.externalApplication,
);

Future<void> _openUri(Uri uri) =>
    launchUrl(uri, mode: LaunchMode.externalApplication);

class LandingSection extends StatelessWidget {
  const LandingSection({
    super.key,
    required this.child,
    this.background = Colors.transparent,
  });

  final Widget child;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: background,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 75),
      child: child,
    );
  }
}

class LandingKicker extends StatelessWidget {
  const LandingKicker(
    this.text, {
    super.key,
    this.color = LP.blue,
    this.compact = false,
  });

  final String text;
  final Color color;
  // Compact kickers sit inside rows, so they cannot take the full width or draw the leading line.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final label = Text(
      text.toUpperCase(),
      style: TextStyle(
        color: color,
        fontSize: 12,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.72,
      ),
    );
    if (compact) return label;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(width: 28, height: 2, color: color),
        const SizedBox(width: 10),
        Flexible(child: label),
      ],
    );
  }
}

class LandingTitle extends StatelessWidget {
  const LandingTitle({
    super.key,
    required this.before,
    this.highlight,
    this.after = '',
    this.size = 32,
    this.color = LP.navy,
    this.highlightColor = LP.blue,
  });

  final String before;
  final String? highlight;
  final String after;
  final double size;
  final Color color;
  final Color highlightColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Text.rich(
        TextSpan(
          style: sora(
            size: size,
            weight: FontWeight.w700,
            color: color,
            height: 1.2,
          ),
          children: [
            TextSpan(text: before),
            if (highlight != null)
              TextSpan(
                text: highlight,
                style: TextStyle(color: highlightColor),
              ),
            TextSpan(text: after),
          ],
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body(this.text, {this.color = LP.muted});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(color: color, fontSize: 14, height: 1.55),
    );
  }
}

class LandingCard extends StatelessWidget {
  const LandingCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.borderColor,
    this.color = AppColors.card,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? borderColor;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: borderColor ?? LP.line,
          width: borderColor == null ? 1 : 2,
        ),
        boxShadow: softShadow(0.06),
      ),
      child: child,
    );
  }
}

class _IconBadge extends StatelessWidget {
  const _IconBadge({required this.icon, required this.color, this.size = 40});

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: size * 0.5),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.text,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _IconBadge(icon: icon, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: LP.navy,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                _Body(text),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Free initial assessment and credit situations

class LandingPathways extends StatefulWidget {
  const LandingPathways({super.key, required this.onStartAssessment});

  final VoidCallback onStartAssessment;

  @override
  State<LandingPathways> createState() => _LandingPathwaysState();
}

class _Situation {
  const _Situation({
    required this.icon,
    required this.label,
    required this.title,
    required this.description,
    required this.actions,
    required this.cta,
  });

  final IconData icon;
  final String label;
  final String title;
  final String description;
  final List<String> actions;
  final String cta;
}

const _situations = [
  _Situation(
    icon: Icons.description_outlined,
    label: 'I found issues in my report',
    title: 'Credit Report Issues',
    description:
        'Incorrect accounts, payment remarks, duplicate entries, or unfamiliar enquiries need a structured review.',
    actions: [
      'Compare entries across your latest reports',
      'Collect statements and closure documents',
      'Raise accurate disputes with each bureau',
    ],
    cta: 'Review my report',
  ),
  _Situation(
    icon: Icons.trending_up,
    label: 'My score needs improvement',
    title: 'Low or Stagnant Score',
    description:
        'Late payments, high utilisation, or repeated enquiries may be holding your credit profile back.',
    actions: [
      'Prioritise overdue and high-impact accounts',
      'Build an achievable utilisation plan',
      'Track improvement factors month by month',
    ],
    cta: 'Build my score plan',
  ),
  _Situation(
    icon: Icons.verified_user_outlined,
    label: 'I want to protect a good score',
    title: 'Healthy Credit Profile',
    description:
        'A strong score still benefits from monitoring, clean reports, and careful planning before major applications.',
    actions: [
      'Monitor changes and new enquiries',
      'Keep utilisation and payment habits healthy',
      'Prepare confidently for future borrowing',
    ],
    cta: 'Protect my score',
  ),
];

class _LandingPathwaysState extends State<LandingPathways> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    final situation = _situations[_selected];
    const steps = [
      ('Tell us your goal', 'Share the concern you want to solve.'),
      ('Confirm your details', 'Provide only the information needed.'),
      ('Review your profile', 'Understand accounts, remarks, and enquiries.'),
      ('Identify priorities', 'See what may have the greatest impact.'),
      ('Get an action roadmap', 'Move forward with practical next steps.'),
    ];
    return Column(
      children: [
        LandingSection(
          background: Colors.white,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
            decoration: BoxDecoration(
              color: LP.blue,
              borderRadius: BorderRadius.circular(8),
              boxShadow: [
                BoxShadow(
                  color: LP.blue.withValues(alpha: 0.18),
                  blurRadius: 55,
                  offset: const Offset(0, 24),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const LandingKicker(
                  'Free Initial Assessment',
                  color: Color(0xFFB8DCFF),
                ),
                const SizedBox(height: 14),
                const LandingTitle(
                  before: 'Understand Your Credit Profile ',
                  highlight: 'In Five Clear Steps',
                  size: 29,
                  color: Colors.white,
                  highlightColor: Color(0xFFFFD65B),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Start with a guided conversation. We review the information you choose to share and help you understand which action deserves attention first.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFFD7EAFF),
                    fontSize: 13,
                    height: 1.65,
                  ),
                ),
                const SizedBox(height: 20),
                const Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 10,
                  runSpacing: 8,
                  children: [
                    _AssessmentBadge(
                      icon: Icons.verified_user_outlined,
                      label: 'Secure conversation',
                    ),
                    _AssessmentBadge(
                      icon: Icons.schedule,
                      label: 'Quick first review',
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _LightCta(
                  icon: Icons.task_outlined,
                  label: 'Start Free Assessment',
                  onPressed: widget.onStartAssessment,
                ),
                const SizedBox(height: 35),
                for (var i = 0; i < steps.length; i++)
                  Padding(
                    padding: EdgeInsets.only(
                      bottom: i == steps.length - 1 ? 0 : 11,
                    ),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 82),
                      padding: const EdgeInsets.all(13),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.09),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.2),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 31,
                            height: 31,
                            alignment: Alignment.center,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${i + 1}',
                              style: const TextStyle(
                                color: LP.blueDark,
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  steps[i].$1,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  steps[i].$2,
                                  style: const TextStyle(
                                    color: Color(0xFFD4E8FF),
                                    fontSize: 9,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        LandingSection(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const LandingKicker('Where Do You Stand?'),
              const SizedBox(height: 8),
              const LandingTitle(
                before: 'Choose Your ',
                highlight: 'Credit Situation',
              ),
              const SizedBox(height: 8),
              const _Body(
                'Select the closest match to see a practical route forward.',
              ),
              const SizedBox(height: 16),
              for (var i = 0; i < _situations.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _SituationTab(
                    situation: _situations[i],
                    selected: _selected == i,
                    onTap: () => setState(() => _selected = i),
                  ),
                ),
              const SizedBox(height: 6),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 26,
                ),
                decoration: BoxDecoration(
                  color: LP.blue,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.16),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        situation.icon,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 19),
                    const Text(
                      'YOUR RECOMMENDED PATH',
                      style: TextStyle(
                        color: Color(0xFFB9DBFF),
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      situation.title,
                      style: sora(
                        size: 28,
                        weight: FontWeight.w700,
                        color: Colors.white,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 9),
                    Text(
                      situation.description,
                      style: const TextStyle(
                        color: Color(0xFFDCECFF),
                        fontSize: 13,
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 18),
                    for (final action in situation.actions)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 9),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check,
                              size: 16,
                              color: Color(0xFF65E4AA),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                action,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 15),
                    _LightCta(
                      label: situation.cta,
                      onPressed: () => openWhatsApp(
                        'Hello Scorenow, I need help with: ${situation.title}. Please guide me on the next steps.',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SituationTab extends StatelessWidget {
  const _SituationTab({
    required this.situation,
    required this.selected,
    required this.onTap,
  });

  final _Situation situation;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(7),
      child: Container(
        constraints: const BoxConstraints(minHeight: 92),
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(7),
          border: Border.all(
            color: selected ? LP.blue : const Color(0xFFDCE8F3),
          ),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x1C0859B4),
                    blurRadius: 28,
                    offset: Offset(0, 12),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: const BoxDecoration(
                color: Color(0xFFE5F3FF),
                shape: BoxShape.circle,
              ),
              child: Icon(situation.icon, color: LP.blue, size: 21),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    situation.label,
                    style: const TextStyle(color: LP.muted, fontSize: 9),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    situation.title,
                    style: const TextStyle(
                      color: LP.navy,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward,
              color: selected ? LP.blue : const Color(0xFF8FA5BD),
              size: 16,
            ),
          ],
        ),
      ),
    );
  }
}

class _AssessmentBadge extends StatelessWidget {
  const _AssessmentBadge({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF75E6B3)),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFFEAF5FF),
            fontSize: 10,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// Web `.button-light`: white button with dark-blue text on blue panels.
class _LightCta extends StatelessWidget {
  const _LightCta({required this.label, required this.onPressed, this.icon});

  final String label;
  final VoidCallback onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(7),
      child: InkWell(
        borderRadius: BorderRadius.circular(7),
        onTap: onPressed,
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFC5E2FF)),
            borderRadius: BorderRadius.circular(7),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: LP.blueDark),
                const SizedBox(width: 11),
              ],
              Text(
                label,
                style: const TextStyle(
                  color: LP.blueDark,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 11),
              const Icon(Icons.arrow_forward, size: 18, color: LP.blueDark),
            ],
          ),
        ),
      ),
    );
  }
}

// Insights

class LandingInsights extends StatelessWidget {
  const LandingInsights({super.key});

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('Your Credit Insights'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'We Analyse Your ',
            highlight: 'Credit Report',
          ),
          const SizedBox(height: 20),
          const _FeatureRow(
            icon: Icons.description_outlined,
            color: LP.blue,
            title: 'Understand your credit score',
            text: "See what's helping or affecting your score.",
          ),
          const _FeatureRow(
            icon: Icons.bar_chart,
            color: AppColors.green,
            title: 'Know what to improve',
            text: 'Get clear insights on the key factors.',
          ),
          const _FeatureRow(
            icon: Icons.lightbulb_outline,
            color: AppColors.violet,
            title: 'Learn how to increase your score',
            text: 'Get practical tips and expert guidance.',
          ),
          const _FeatureRow(
            icon: Icons.star_outline,
            color: AppColors.gold,
            title: 'Discover the benefits',
            text: 'A stronger score can unlock better financial opportunities.',
          ),
          const SizedBox(height: 8),
          LandingCard(
            child: Column(
              children: [
                const Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Your Credit Score',
                        style: TextStyle(
                          color: LP.navy,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Text(
                      'Updated: 10 Apr, 2024',
                      style: TextStyle(color: LP.muted, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const ScoreGauge(score: 728, size: 200),
                const SizedBox(height: 8),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.9,
                  children: const [
                    _FactorTile(
                      icon: Icons.credit_card,
                      value: '100%',
                      label: 'Payment History',
                    ),
                    _FactorTile(
                      icon: Icons.bar_chart,
                      value: '62%',
                      label: 'Credit Utilisation',
                    ),
                    _FactorTile(
                      icon: Icons.calendar_today_outlined,
                      value: '4 yrs',
                      label: 'Credit Age',
                    ),
                    _FactorTile(
                      icon: Icons.fact_check_outlined,
                      value: '3',
                      label: 'Recent Enquiries',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FactorTile extends StatelessWidget {
  const _FactorTile({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.fieldFill,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: LP.blue),
              const SizedBox(width: 6),
              Text(
                value,
                style: const TextStyle(
                  color: LP.navy,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          Text(label, style: const TextStyle(color: LP.muted, fontSize: 11)),
        ],
      ),
    );
  }
}

// Credit journey (narrated guide without audio)

class _Scene {
  const _Scene({
    required this.icon,
    required this.label,
    required this.title,
    required this.metric,
    required this.metricLabel,
    required this.narration,
    required this.captions,
    required this.points,
  });

  final IconData icon;
  final String label;
  final String title;
  final String metric;
  final String metricLabel;
  final String narration;
  final List<String> captions;
  final List<String> points;
}

const _scenes = [
  _Scene(
    icon: Icons.bar_chart,
    label: 'Understand',
    title: 'Know what shapes your score',
    metric: '300–900',
    metricLabel: 'Credit score range',
    narration:
        'Your credit score summarises your repayment behaviour. Payment history, credit utilisation, account age, credit mix, and recent enquiries all influence the number.',
    captions: [
      'Every repayment becomes part of your credit history.',
      'Credit utilisation shows how much available credit you use.',
      'Account age, credit mix, and enquiries also influence your score.',
    ],
    points: [
      'Payment history has high impact',
      'Lower utilisation supports a healthier profile',
      'Older, well-managed accounts build trust',
    ],
  ),
  _Scene(
    icon: Icons.trending_up,
    label: 'Improve',
    title: 'Build stronger credit habits',
    metric: '<30%',
    metricLabel: 'Recommended utilisation',
    narration:
        'Pay every instalment on time, keep card balances low, and avoid multiple credit applications close together. Consistent habits matter more than quick fixes.',
    captions: [
      'Pay every EMI and card bill before its due date.',
      'Keep card balances below thirty percent of the limit.',
      'Space out applications and build consistent habits over time.',
    ],
    points: [
      'Never miss an EMI or card due date',
      'Reduce outstanding card balances',
      'Apply for new credit only when needed',
    ],
  ),
  _Scene(
    icon: Icons.currency_rupee,
    label: 'Benefit',
    title: 'Unlock better financial options',
    metric: '750+',
    metricLabel: 'Strong score target',
    narration:
        'A stronger credit profile can improve loan eligibility, increase lender confidence, and help you access more competitive interest rates and credit limits.',
    captions: [
      'A strong profile can improve your loan eligibility.',
      'Lenders may offer more competitive rates and terms.',
      'Healthy credit gives you more options for important goals.',
    ],
    points: [
      'Stronger loan approval prospects',
      'Potentially better rates and terms',
      'Greater confidence when planning goals',
    ],
  ),
  _Scene(
    icon: Icons.headset_mic_outlined,
    label: 'Resolve',
    title: 'Get a clear plan with Scorenow',
    metric: '1:1',
    metricLabel: 'Expert guidance',
    narration:
        'Scorenow analyses your report, identifies high-impact issues and possible errors, and gives you a practical action plan with expert support throughout the process.',
    captions: [
      'We analyse your reports and identify high-impact issues.',
      'Our team helps you understand errors and correction steps.',
      'You receive a practical roadmap with expert support.',
    ],
    points: [
      'Detailed multi-bureau report review',
      'Error identification and correction guidance',
      'Personalised improvement roadmap',
    ],
  ),
];

class LandingJourney extends StatefulWidget {
  const LandingJourney({super.key});

  @override
  State<LandingJourney> createState() => _LandingJourneyState();
}

class _LandingJourneyState extends State<LandingJourney> {
  int _scene = 0;

  @override
  Widget build(BuildContext context) {
    final scene = _scenes[_scene];
    final isLast = _scene == _scenes.length - 1;
    return LandingSection(
      background: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('A 60-Second Credit Guide'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'See How Better Credit ',
            highlight: 'Changes What’s Possible',
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: LP.navy,
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Scorenow Guide',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const Spacer(),
                    Text(
                      '${(_scene + 1).toString().padLeft(2, '0')} / ${_scenes.length.toString().padLeft(2, '0')}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _IconBadge(
                      icon: scene.icon,
                      color: AppColors.gold,
                      size: 44,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            scene.label.toUpperCase(),
                            style: const TextStyle(
                              color: AppColors.gold,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            scene.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  scene.metric,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  scene.metricLabel,
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 14),
                for (final caption in scene.captions)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(
                      '• $caption',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              for (var i = 0; i < _scenes.length; i++)
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _scene = i),
                    child: Container(
                      height: 6,
                      margin: const EdgeInsets.only(right: 4),
                      decoration: BoxDecoration(
                        color: i <= _scene ? LP.blue : LP.line,
                        borderRadius: BorderRadius.circular(AppRadius.pill),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Chapter ${_scene + 1} of ${_scenes.length}',
            style: const TextStyle(color: LP.muted, fontSize: 12),
          ),
          const SizedBox(height: 10),
          _Body(scene.narration),
          const SizedBox(height: 12),
          for (final point in scene.points)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check, size: 16, color: AppColors.green),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      point,
                      style: const TextStyle(
                        color: LP.navy,
                        fontSize: 14,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          AppButton(
            label: isLast ? 'Start over' : 'Next chapter',
            variant: AppButtonVariant.outline,
            onPressed: () => setState(() => _scene = isLast ? 0 : _scene + 1),
          ),
        ],
      ),
    );
  }
}

// Credit score estimator

class _Option {
  const _Option({required this.label, required this.points, required this.tip});

  final String label;
  final int points;
  final String tip;
}

class _Question {
  const _Question({
    required this.icon,
    required this.title,
    required this.factor,
    required this.context,
    required this.options,
  });

  final IconData icon;
  final String title;
  final String factor;
  final String context;
  final List<_Option> options;
}

const _questions = [
  _Question(
    icon: Icons.calendar_month_outlined,
    title: 'How have you managed payments over the last 12 months?',
    factor: 'Payment history',
    context:
        'Payment consistency is one of the strongest signals lenders look at. Choose the answer that best reflects your recent repayment pattern.',
    options: [
      _Option(
        label: 'Paid every bill on time',
        points: 100,
        tip:
            'Keep every EMI and card payment on time; payment history has a strong influence on credit health.',
      ),
      _Option(
        label: 'One late payment, over a year ago',
        points: 40,
        tip:
            'Maintain a clean recent payment record so older late payments have less influence over time.',
      ),
      _Option(
        label: 'One late payment in the last year',
        points: -35,
        tip:
            'Bring all accounts current and set reminders or autopay for upcoming due dates.',
      ),
      _Option(
        label: 'Several late or missed payments',
        points: -100,
        tip:
            'Prioritise bringing overdue accounts current and avoid missing any future due dates.',
      ),
    ],
  ),
  _Question(
    icon: Icons.bar_chart,
    title: 'About how much of your available card limit do you use?',
    factor: 'Credit utilisation',
    context:
        'Utilisation compares card balances with your total available limit. Lower reported balances are generally healthier.',
    options: [
      _Option(
        label: 'Less than 10%',
        points: 50,
        tip:
            'Your reported utilisation is low; keep balances modest before statement dates.',
      ),
      _Option(
        label: '10% to 30%',
        points: 35,
        tip:
            'This is a healthy range for many profiles; keep paying balances on time.',
      ),
      _Option(
        label: '31% to 50%',
        points: 5,
        tip:
            'Gradually reducing card balances may improve your utilisation profile.',
      ),
      _Option(
        label: 'More than 50%',
        points: -55,
        tip:
            'Focus on reducing outstanding card balances and avoid using most of your available limit.',
      ),
    ],
  ),
  _Question(
    icon: Icons.schedule,
    title: 'How long have you had your oldest active credit account?',
    factor: 'Credit age',
    context:
        'A longer history of well-managed accounts gives lenders more information about how you handle credit.',
    options: [
      _Option(
        label: '7 years or more',
        points: 35,
        tip:
            'Keep well-managed older accounts active where practical; account age can support your profile.',
      ),
      _Option(
        label: '3 to 7 years',
        points: 25,
        tip:
            'Continue building a consistent repayment history on your established accounts.',
      ),
      _Option(
        label: '1 to 3 years',
        points: 10,
        tip:
            'Time and consistent account management can strengthen your credit history.',
      ),
      _Option(
        label: 'Less than 1 year or new to credit',
        points: -10,
        tip:
            'Build history slowly with manageable credit and reliable on-time payments.',
      ),
    ],
  ),
  _Question(
    icon: Icons.account_balance_wallet_outlined,
    title: 'Which best describes the types of credit you use?',
    factor: 'Credit mix',
    context:
        'Your profile may include revolving credit, such as cards, and instalment loans. Do not take new credit just to change this mix.',
    options: [
      _Option(
        label: 'Cards and loans, all managed well',
        points: 25,
        tip:
            'Maintain your existing mix responsibly; avoid borrowing just to change your credit mix.',
      ),
      _Option(
        label: 'Credit cards only',
        points: 10,
        tip:
            'A single credit type is not automatically a problem; focus first on payment history and balances.',
      ),
      _Option(
        label: 'Loans only',
        points: 10,
        tip:
            'Keep loan repayments on schedule and avoid unnecessary new credit.',
      ),
      _Option(
        label: 'I am new to credit or not sure',
        points: 0,
        tip:
            'A current report can help confirm which accounts are contributing to your credit profile.',
      ),
    ],
  ),
  _Question(
    icon: Icons.search,
    title: 'How many credit applications have you made recently?',
    factor: 'Recent applications',
    context:
        'Recent lender enquiries can affect how your profile is viewed. Checking your own report is different from applying for credit.',
    options: [
      _Option(
        label: 'Zero or one in the last 6 months',
        points: 15,
        tip:
            'Apply only when needed and compare options before making another application.',
      ),
      _Option(
        label: 'Two or three in the last 6 months',
        points: -15,
        tip:
            'Pause non-essential applications for a while and review your report enquiries.',
      ),
      _Option(
        label: 'Four or more in the last 6 months',
        points: -35,
        tip:
            'Avoid repeated applications and allow time between necessary credit requests.',
      ),
      _Option(
        label: 'I am not sure',
        points: 0,
        tip:
            'Check the enquiries section of your latest credit report to see recent applications.',
      ),
    ],
  ),
  _Question(
    icon: Icons.description_outlined,
    title: 'Do you know of any overdue, settled, or written-off accounts?',
    factor: 'Negative account remarks',
    context:
        'Account status and repayment remarks matter. If you are unsure, your latest bureau report can help confirm what is recorded.',
    options: [
      _Option(
        label: 'No, my accounts are up to date',
        points: 25,
        tip:
            'Continue monitoring your reports for accuracy and keep current accounts up to date.',
      ),
      _Option(
        label: 'An account is currently overdue',
        points: -100,
        tip:
            'Contact the lender to understand the overdue amount and discuss a manageable resolution.',
      ),
      _Option(
        label: 'A settled or written-off account appears',
        points: -70,
        tip:
            'Review the account details and supporting documents; dispute any inaccurate reporting.',
      ),
      _Option(
        label: 'I do not know',
        points: -5,
        tip:
            'Review your latest bureau report for account status, payment remarks, and possible errors.',
      ),
    ],
  ),
];

class LandingEstimator extends StatefulWidget {
  const LandingEstimator({super.key, required this.onGetReview});

  final VoidCallback onGetReview;

  @override
  State<LandingEstimator> createState() => _LandingEstimatorState();
}

class _LandingEstimatorState extends State<LandingEstimator> {
  final List<int> _answers = [];

  int get _step => _answers.length;
  bool get _complete => _answers.length == _questions.length;

  int get _estimatedScore {
    var raw = 600;
    for (var i = 0; i < _answers.length; i++) {
      raw += _questions[i].options[_answers[i]].points;
    }
    final rounded = (raw / 10).round() * 10;
    return math.max(300, math.min(900, rounded));
  }

  String get _scoreLabel {
    final score = _estimatedScore;
    if (score >= 750) return 'Strong credit habits';
    if (score >= 680) return 'Encouraging signals';
    if (score >= 600) return 'Progress is within reach';
    return 'A fresh start is possible';
  }

  String get _encouragement {
    final score = _estimatedScore;
    if (score >= 750) {
      return 'You have a strong foundation. Keep your positive habits consistent.';
    }
    if (score >= 600) {
      return 'You have a base to build on. Small, steady steps can make a difference.';
    }
    return 'This is only a starting point. There are practical steps to help strengthen your profile.';
  }

  List<({String factor, int points, String tip})> get _focusAreas {
    final areas = [
      for (var i = 0; i < _answers.length; i++)
        (
          factor: _questions[i].factor,
          points: _questions[i].options[_answers[i]].points,
          tip: _questions[i].options[_answers[i]].tip,
        ),
    ]..sort((a, b) => a.points.compareTo(b.points));
    return areas.take(2).toList();
  }

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      background: LP.sky,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('Free Educational Tool'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'Estimate Your ',
            highlight: 'Credit Score Range',
          ),
          const SizedBox(height: 8),
          const _Body(
            'Six quick questions for a clearer starting point. No personal details needed.',
          ),
          const SizedBox(height: 18),
          LandingCard(child: _complete ? _buildResult() : _buildQuiz()),
        ],
      ),
    );
  }

  Widget _buildQuiz() {
    final question = _questions[_step];
    final progress = (_step + 1) / _questions.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const _IconBadge(icon: Icons.bar_chart, color: LP.blue),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Credit Score Snapshot',
                    style: TextStyle(
                      color: LP.navy,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    'About 1 minute · No personal information',
                    style: TextStyle(color: LP.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Text(
              'Question ${_step + 1} of ${_questions.length}',
              style: const TextStyle(
                color: LP.navy,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
            Text(
              '${(progress * 100).round()}%',
              style: const TextStyle(color: LP.muted, fontSize: 12),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 6,
            color: LP.blue,
            backgroundColor: LP.line,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            _IconBadge(icon: question.icon, color: LP.blue, size: 34),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'FACTOR ${(_step + 1).toString().padLeft(2, '0')}',
                    style: const TextStyle(
                      color: LP.muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    question.factor,
                    style: const TextStyle(
                      color: LP.navy,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          question.title,
          style: const TextStyle(
            color: LP.navy,
            fontSize: 17,
            fontWeight: FontWeight.w800,
            height: 1.3,
          ),
        ),
        const SizedBox(height: 8),
        _Body(question.context),
        const SizedBox(height: 14),
        for (var i = 0; i < question.options.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => setState(() => _answers.add(i)),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.fieldFill,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 13,
                      backgroundColor: LP.blue.withValues(alpha: 0.1),
                      child: Text(
                        String.fromCharCode(65 + i),
                        style: const TextStyle(
                          color: LP.blue,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        question.options[i].label,
                        style: const TextStyle(
                          color: LP.navy,
                          fontSize: 14,
                          height: 1.3,
                        ),
                      ),
                    ),
                    const Icon(Icons.arrow_forward, size: 16, color: LP.muted),
                  ],
                ),
              ),
            ),
          ),
        if (_step > 0)
          TextButton.icon(
            onPressed: () => setState(() => _answers.removeLast()),
            icon: const Icon(Icons.arrow_back, size: 16),
            label: const Text('Previous question'),
          ),
      ],
    );
  }

  Widget _buildResult() {
    final score = _estimatedScore;
    final low = math.max(300, score - 30);
    final high = math.min(900, score + 30);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Your indicative score range',
          style: TextStyle(color: LP.muted, fontSize: 13),
        ),
        const SizedBox(height: 4),
        Text(
          '$low–$high',
          style: const TextStyle(
            color: LP.navy,
            fontSize: 36,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          _scoreLabel,
          style: const TextStyle(color: LP.blue, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          child: LinearProgressIndicator(
            value: (score - 300) / 600,
            minHeight: 8,
            color: LP.blue,
            backgroundColor: LP.line,
          ),
        ),
        const SizedBox(height: 6),
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('300', style: TextStyle(color: LP.muted, fontSize: 11)),
            Text('600', style: TextStyle(color: LP.muted, fontSize: 11)),
            Text('750', style: TextStyle(color: LP.muted, fontSize: 11)),
            Text('900', style: TextStyle(color: LP.muted, fontSize: 11)),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Approximate estimate only',
          style: TextStyle(color: LP.muted, fontSize: 11),
        ),
        const Divider(height: 28),
        const Row(
          children: [
            Icon(Icons.check_circle, size: 16, color: AppColors.green),
            SizedBox(width: 6),
            Text(
              'Your snapshot is ready',
              style: TextStyle(
                color: AppColors.green,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        const Text(
          'Your next best steps',
          style: TextStyle(
            color: LP.navy,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.auto_awesome_outlined,
              size: 16,
              color: AppColors.gold,
            ),
            const SizedBox(width: 6),
            Expanded(child: _Body(_encouragement, color: LP.navy)),
          ],
        ),
        const SizedBox(height: 12),
        for (final area in _focusAreas)
          Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.fieldFill,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  area.factor,
                  style: const TextStyle(
                    color: LP.navy,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  area.tip,
                  style: const TextStyle(
                    color: LP.muted,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 8),
        AppButton(label: 'Get a report review', onPressed: widget.onGetReview),
        const SizedBox(height: 10),
        AppButton(
          label: 'Try again',
          variant: AppButtonVariant.outline,
          onPressed: () => setState(_answers.clear),
        ),
        const SizedBox(height: 14),
        const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.verified_user_outlined, size: 14, color: LP.muted),
            SizedBox(width: 6),
            Expanded(
              child: Text(
                'This estimate uses general educational rules, not bureau data or a lender model. It is not an official score, financial advice, or a guarantee of credit eligibility.',
                style: TextStyle(color: LP.muted, fontSize: 11, height: 1.4),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// Services and plans

class _Service {
  const _Service({
    required this.icon,
    required this.color,
    required this.title,
    required this.text,
    required this.included,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String text;
  final List<String> included;
}

const _services = [
  _Service(
    icon: Icons.description_outlined,
    color: LP.blue,
    title: 'Credit Report Review',
    text:
        'Understand every part of your report and identify what needs attention.',
    included: [
      'Credit account summary',
      'Enquiry and repayment review',
      'Error and discrepancy identification',
    ],
  ),
  _Service(
    icon: Icons.trending_up,
    color: AppColors.green,
    title: 'Score Improvement',
    text:
        'Follow a focused action plan designed around your unique credit profile.',
    included: [
      'Personal improvement roadmap',
      'Credit utilisation guidance',
      'Progress checkpoints',
    ],
  ),
  _Service(
    icon: Icons.help_outline,
    color: AppColors.gold,
    title: 'Expert Consultation',
    text:
        'Get clear answers and personal support from experienced credit experts.',
    included: [
      'One-to-one consultation',
      'Clear answers to report questions',
      'Next-step recommendations',
    ],
  ),
];

class LandingServices extends StatelessWidget {
  const LandingServices({super.key});

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      background: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('Everything In One Place'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'Build Better Credit With ',
            highlight: 'Expert Support',
          ),
          const SizedBox(height: 8),
          const _Body(
            'Simple tools, actionable insights, and human guidance at every step.',
          ),
          const SizedBox(height: 18),
          for (final service in _services) ...[
            LandingCard(
              child: Theme(
                data: Theme.of(
                  context,
                ).copyWith(dividerColor: Colors.transparent),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _IconBadge(icon: service.icon, color: service.color),
                    const SizedBox(height: 12),
                    Text(
                      service.title,
                      style: const TextStyle(
                        color: LP.navy,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    _Body(service.text),
                    ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      childrenPadding: EdgeInsets.zero,
                      title: const Text(
                        "What's included",
                        style: TextStyle(
                          color: LP.blue,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      children: [
                        for (final item in service.included)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(
                                  Icons.check,
                                  size: 16,
                                  color: AppColors.green,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    item,
                                    style: const TextStyle(
                                      color: LP.navy,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

const _planCapabilities = [
  (
    Icons.description_outlined,
    'Credit Report Analysis',
    'A structured review to identify report issues and improvement opportunities.',
  ),
  (
    Icons.help_outline,
    'Issue Resolution Guidance',
    'Clear assistance for disputes, incorrect remarks, and documentation steps.',
  ),
  (
    Icons.trending_up,
    'Personalised Credit Plan',
    'Actions tailored to your current profile, priorities, and financial goals.',
  ),
  (
    Icons.headset_mic_outlined,
    'Expert Consultation',
    'One-to-one explanations and guidance from a credit support specialist.',
  ),
  (
    Icons.bar_chart,
    'Progress Tracking',
    'Review important credit factors and monitor changes during the engagement.',
  ),
  (
    Icons.verified_user_outlined,
    'Dedicated Support',
    'Responsive help through the support channels included in your selected plan.',
  ),
];

const _subscriptionSteps = [
  (
    Icons.description_outlined,
    'Choose a plan',
    'Compare the plan options and select the support level that fits your needs.',
  ),
  (
    Icons.help_outline,
    'Confirm your scope',
    'Our team reviews your profile and confirms the final service scope and pricing.',
  ),
  (
    Icons.headset_mic_outlined,
    'Start your subscription',
    'Once confirmed, your support period begins with the agreed plan and guidance.',
  ),
];

class LandingPlans extends StatelessWidget {
  const LandingPlans({super.key, required this.subscriptionKey});

  final GlobalKey subscriptionKey;

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('35% Launch Offer'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'Choose the Support That ',
            highlight: 'Fits Your Profile',
          ),
          const SizedBox(height: 8),
          const _Body(
            'Limited-period pricing across all plans. The final service scope is confirmed after reviewing your credit profile.',
          ),
          const SizedBox(height: 18),
          for (final plan in servicePlans) ...[
            _ServicePlanCard(plan: plan),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 8),
          Container(
            key: subscriptionKey,
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: LP.sky,
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const LandingKicker('Subscription'),
                const SizedBox(height: 8),
                const LandingTitle(
                  before: 'A plan is an option. A subscription is your ',
                  highlight: 'active support engagement.',
                  size: 20,
                ),
                const SizedBox(height: 8),
                const _Body(
                  'Selecting a plan does not start a subscription. We confirm your scope, pricing, and start date with you first.',
                ),
                const SizedBox(height: 16),
                for (final plan in subscriptionPlans) ...[
                  _SubscriptionCard(plan: plan),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 6),
                for (var i = 0; i < _subscriptionSteps.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _IconBadge(
                          icon: _subscriptionSteps[i].$1,
                          color: LP.blue,
                          size: 36,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Step ${i + 1}',
                                style: const TextStyle(
                                  color: LP.muted,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                _subscriptionSteps[i].$2,
                                style: const TextStyle(
                                  color: LP.navy,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              _Body(_subscriptionSteps[i].$3),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                AppButton(
                  label: 'Start a subscription',
                  onPressed: () => openWhatsApp(
                    'Hello Scorenow, I would like to start a subscription. Please help me choose a plan and confirm the scope, pricing, and start date.',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.verified_user_outlined, size: 14, color: LP.muted),
              SizedBox(width: 6),
              Expanded(
                child: Text(
                  'No score outcome is guaranteed. Recommendations depend on your report, repayment behaviour, and bureau updates.',
                  style: TextStyle(color: LP.muted, fontSize: 12, height: 1.4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          const LandingKicker('Included Support'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'What Our Plans ',
            highlight: 'Can Include',
            size: 20,
          ),
          const SizedBox(height: 6),
          const _Body(
            'Service tenure and included support vary by selected plan.',
          ),
          const SizedBox(height: 14),
          for (final item in _planCapabilities)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: LandingCard(
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _IconBadge(icon: item.$1, color: LP.blue, size: 36),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.$2,
                            style: const TextStyle(
                              color: LP.navy,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          _Body(item.$3),
                        ],
                      ),
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

class _ServicePlanCard extends StatelessWidget {
  const _ServicePlanCard({required this.plan});

  final ServicePlan plan;

  @override
  Widget build(BuildContext context) {
    return LandingCard(
      borderColor: plan.featured ? LP.blue : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (plan.featured)
                const LandingKicker(
                  'Most Popular',
                  color: AppColors.gold,
                  compact: true,
                ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.red,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: const Text(
                  '35% OFF',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            plan.name,
            style: const TextStyle(
              color: LP.navy,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          _Body(plan.audience),
          const SizedBox(height: 12),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              Text(
                '${plan.offerPrice} + GST',
                style: const TextStyle(
                  color: LP.navy,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                plan.originalPrice,
                style: const TextStyle(
                  color: AppColors.placeholder,
                  fontSize: 13,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
            ],
          ),
          Text(
            plan.duration,
            style: const TextStyle(color: LP.muted, fontSize: 12),
          ),
          const SizedBox(height: 12),
          for (final feature in plan.features)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check, size: 16, color: AppColors.green),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      feature,
                      style: const TextStyle(
                        color: LP.navy,
                        fontSize: 14,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          AppButton(
            label: 'Choose ${plan.name}',
            onPressed: () => openWhatsApp(
              'Hello Scorenow, I am interested in the ${plan.name} plan. Please share the recommended scope and pricing for my credit profile.',
            ),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({required this.plan});

  final SubscriptionPlan plan;

  @override
  Widget build(BuildContext context) {
    return LandingCard(
      borderColor: plan.featured ? LP.blue : null,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (plan.featured) ...[
                  const LandingKicker(
                    'Most Popular',
                    color: AppColors.gold,
                    compact: true,
                  ),
                  const SizedBox(height: 4),
                ],
                Text(
                  plan.duration,
                  style: const TextStyle(color: LP.muted, fontSize: 12),
                ),
                Text(
                  plan.name,
                  style: const TextStyle(
                    color: LP.navy,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  plan.price,
                  style: const TextStyle(
                    color: LP.navy,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  plan.note,
                  style: const TextStyle(color: LP.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          AppButton(
            label: 'Subscribe',
            expanded: false,
            small: true,
            onPressed: () => openWhatsApp(
              'Hello Scorenow, I would like to subscribe to the ${plan.name} plan for ${plan.price}. Please share the next steps.',
            ),
          ),
        ],
      ),
    );
  }
}

// Business, about, partner, contact

class LandingBusiness extends StatelessWidget {
  const LandingBusiness({super.key});

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      background: LP.sky,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LandingCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Commercial CIBIL Report',
                  style: TextStyle(
                    color: LP.navy,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Text(
                  'Your Business Credit Health',
                  style: TextStyle(color: LP.muted, fontSize: 12),
                ),
                const SizedBox(height: 8),
                const Center(child: ScoreGauge(score: 728, size: 170)),
                const _StatusRow(
                  icon: Icons.credit_card,
                  label: 'Payment Behaviour',
                  value: 'Good',
                ),
                const _StatusRow(
                  icon: Icons.bar_chart,
                  label: 'Credit Exposure',
                  value: 'Moderate',
                ),
                const _StatusRow(
                  icon: Icons.verified_user_outlined,
                  label: 'Lender Confidence',
                  value: 'High',
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const LandingKicker('For Businesses'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'Commercial CIBIL Report ',
            highlight: 'Correction (CMR)',
            size: 22,
          ),
          const SizedBox(height: 10),
          const _Body(
            'We analyse your commercial CIBIL report, identify errors and help get them corrected so your business credit profile reflects your financial standing.',
          ),
          const SizedBox(height: 16),
          const _FeatureRow(
            icon: Icons.description_outlined,
            color: LP.blue,
            title: 'Identify report errors',
            text:
                'We review your commercial report for inaccuracies and discrepancies.',
          ),
          const _FeatureRow(
            icon: Icons.auto_awesome_outlined,
            color: AppColors.green,
            title: 'Correct inaccurate information',
            text:
                'We guide you through corrections with the right documentation.',
          ),
          const _FeatureRow(
            icon: Icons.bar_chart,
            color: AppColors.violet,
            title: 'Improve business credit profile',
            text: 'Build lender confidence with a clean and accurate report.',
          ),
          AppButton(
            label: 'Check Your CMR',
            onPressed: () => openWhatsApp(
              'Hello Scorenow, I would like to check my Commercial CIBIL Report (CMR) and get it corrected.',
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: LP.blue),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: LP.navy, fontSize: 14),
            ),
          ),
          Text(
            value,
            style: const TextStyle(color: LP.blue, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class LandingAbout extends StatelessWidget {
  const LandingAbout({super.key, required this.onContact});

  final VoidCallback onContact;

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      background: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('About Scorenow'),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'Credit guidance that stays ',
            highlight: 'clear and practical.',
          ),
          const SizedBox(height: 12),
          const _Body(
            'Scorenow helps individuals and businesses understand credit reports, identify areas that need attention, and take informed steps toward a healthier credit profile.',
          ),
          const SizedBox(height: 10),
          const _Body(
            "We focus on transparent guidance, data privacy, and practical actions. Credit outcomes depend on each person's report and financial behaviour, so we never promise instant or guaranteed score changes.",
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: onContact,
            child: const Text('Speak with our team'),
          ),
        ],
      ),
    );
  }
}

class LandingPartner extends StatelessWidget {
  const LandingPartner({super.key});

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      background: LP.navy,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('Grow with Scorenow', color: AppColors.gold),
          const SizedBox(height: 8),
          const LandingTitle(
            before: 'Want to become our ',
            highlight: 'partner?',
            color: Colors.white,
          ),
          const SizedBox(height: 10),
          const Text(
            'Bring credit guidance closer to people in your city. Talk with us about a franchise-style partnership and how we could work together in your area.',
            style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.55),
          ),
          const SizedBox(height: 16),
          for (final item in const [
            (
              Icons.place_outlined,
              'Make it local',
              'Build relationships and connect with customers in your community.',
            ),
            (
              Icons.groups_outlined,
              'Help more people',
              'Introduce individuals and businesses to practical credit support.',
            ),
            (
              Icons.handshake_outlined,
              'Explore partnership',
              'Discuss the opportunity, local fit, and possible next steps with our team.',
            ),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(item.$1, color: AppColors.gold),
                    const SizedBox(height: 8),
                    Text(
                      item.$2,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.$3,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          AppButton(
            label: 'Discuss a Partnership',
            variant: AppButtonVariant.gold,
            onPressed: () => openWhatsApp(
              'Hello Scorenow, I am interested in becoming a partner in my city. Please share more about the franchise-style partnership opportunity.',
            ),
          ),
        ],
      ),
    );
  }
}

class LandingContact extends StatelessWidget {
  const LandingContact({super.key});

  @override
  Widget build(BuildContext context) {
    return LandingSection(
      background: LP.sky,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const LandingKicker('Contact Us'),
          const SizedBox(height: 8),
          const LandingTitle(before: 'Talk to a Scorenow expert'),
          const SizedBox(height: 10),
          const _Body(
            'Choose the contact method that works best for you. Our team will help you understand the next steps.',
          ),
          const SizedBox(height: 16),
          _ContactOption(
            icon: Icons.chat_outlined,
            color: AppColors.green,
            label: 'Chat on WhatsApp',
            value: landingPhone,
            onTap: () => openWhatsApp(
              'Hello Score Now, I would like help with my credit score.',
            ),
          ),
          _ContactOption(
            icon: Icons.call_outlined,
            color: LP.blue,
            label: 'Call our expert',
            value: landingPhone,
            onTap: () => _openUri(Uri(scheme: 'tel', path: '+919114141011')),
          ),
          _ContactOption(
            icon: Icons.mail_outline,
            color: AppColors.violet,
            label: 'Send us an email',
            value: _landingEmail,
            onTap: () => _openUri(Uri(scheme: 'mailto', path: _landingEmail)),
          ),
        ],
      ),
    );
  }
}

class _ContactOption extends StatelessWidget {
  const _ContactOption({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: LandingCard(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              _IconBadge(icon: icon, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(color: LP.muted, fontSize: 12),
                    ),
                    Text(
                      value,
                      style: const TextStyle(
                        color: LP.navy,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward, color: LP.muted, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class LandingFooter extends StatelessWidget {
  const LandingFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: LP.navy,
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 28),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.verified_user_outlined, color: Colors.white),
              SizedBox(width: 8),
              Text(
                'ScoreNow',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            'Clear guidance for a stronger financial future.',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          SizedBox(height: 14),
          Text(
            landingPhone,
            style: TextStyle(color: Colors.white, fontSize: 13),
          ),
          Text(
            _landingEmail,
            style: TextStyle(color: Colors.white, fontSize: 13),
          ),
          SizedBox(height: 14),
          Divider(color: Colors.white24),
          SizedBox(height: 8),
          Text(
            '© 2026 Scorenow. All rights reserved.',
            style: TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
