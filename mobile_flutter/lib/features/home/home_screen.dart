import 'package:flutter/material.dart';
import 'package:scorenow_mobile/features/notifications/notifications_screen.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/completed_reports.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/features/home/bureau_pills.dart';
import 'package:scorenow_mobile/features/home/complete_profile_banner.dart';
import 'package:scorenow_mobile/features/home/home_banner.dart';
import 'package:scorenow_mobile/features/home/home_header.dart';
import 'package:scorenow_mobile/features/home/home_tabs.dart';
import 'package:scorenow_mobile/features/home/score_predictor.dart';
import 'package:scorenow_mobile/features/landing/assessment_api.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/animations.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/score_gauge.dart';
import 'package:scorenow_mobile/widgets/underline_tabs.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  BureauId? _selected;
  HomeTab _tab = HomeTab.overview;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _sendPendingAssessment(),
    );
  }

  Future<void> _sendPendingAssessment() async {
    if (!mounted) return;
    final services = AppScope.of(context);
    if (services.pendingAssessment == null) return;
    final messenger = ScaffoldMessenger.of(context);
    final message = await sendPendingAssessment(services);
    if (message.isNotEmpty && mounted) {
      messenger.showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = DashboardScope.of(context);
    final state = controller.dashboard;
    final dashboard = state.data;
    if (state.loading && dashboard == null) {
      return const FullScreenLoader(label: 'Loading your credit workspace…');
    }

    final completed = completedReports(
      dashboard?.reports ?? const <BureauReport>[],
    );
    final best =
        _selectedReport(completed) ??
        (completed.isEmpty ? null : completed.first);

    final user = AppScope.of(context).auth.customer?.user;
    final fullName = user?.fullName ?? '';
    final parts = fullName.split(' ').where((part) => part.isNotEmpty).toList();
    final firstName = parts.isEmpty ? 'there' : parts.first;
    final initials = parts.take(2).map((part) => part[0].toUpperCase()).join();

    final overdue = best?.overdueAccounts;
    final score = best?.creditScore;
    final reportDate = best == null
        ? null
        : (best.reportDate ?? best.requestedAt);

    final padding = MediaQuery.paddingOf(context);
    return ColoredBox(
      color: AppColors.bg,
      child: RefreshIndicator(
        color: AppColors.blue,
        onRefresh: controller.dashboard.refresh,
        child: ListView(
          padding: EdgeInsets.only(bottom: padding.bottom + 28),
          children: [
            HomeHeader(
              initials: initials.isEmpty ? 'S' : initials,
              topInset: padding.top,
              alerts: buildNotifications(
                dashboard,
              ).where((item) => item.important).length,
            ),
            SlideUpAnimation(
              delay: const Duration(milliseconds: 100),
              child: HomeBanner(
                name: firstName,
                subtitle: reportDate == null
                    ? 'Get your first report to see your score'
                    : 'Your Credit Health Report • ${formatReportDate(reportDate)}',
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 14),
                  SlideUpAnimation(
                    delay: const Duration(milliseconds: 200),
                    child: BureauPills(
                      completed: completed,
                      selected: best?.bureau,
                      onSelect: (bureau) => setState(() => _selected = bureau),
                    ),
                  ),
                  const SizedBox(height: 14),
                  ScaleInAnimation(
                    delay: const Duration(milliseconds: 300),
                    child: AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          LayoutBuilder(
                            builder: (context, box) => Row(
                              children: [
                                ScoreGauge(
                                  score: score,
                                  band: best?.scoreBand,
                                  size: (box.maxWidth * 0.5).clamp(
                                    120.0,
                                    160.0,
                                  ),
                                  compact: true,
                                ),
                                Container(
                                  width: 1,
                                  height: 78,
                                  margin: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                  color: AppColors.line,
                                ),
                                Expanded(
                                  child: _ScoreSummary(
                                    score: score,
                                    onTap: () => context.push('/guides'),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (best != null) ...[
                            const SizedBox(height: 4),
                            _DownloadButton(
                              onTap: () =>
                                  context.push('/report/${best.requestId}'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: _QuickCard(
                            icon: Icons.description_outlined,
                            label: 'Report Summary',
                            onTap: () => context.push('/reports'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _QuickCard(
                            icon: Icons.trending_up_rounded,
                            label: 'Score Predictor',
                            badge: best?.creditScore == null
                                ? null
                                : 'Personalised',
                            onTap: best?.creditScore == null
                                ? null
                                : () => showScorePredictor(context, best!),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (overdue != null && overdue > 0) ...[
                    const SizedBox(height: 14),
                    SlideUpAnimation(
                      delay: const Duration(milliseconds: 250),
                      child: _AlertTile(
                        text:
                            '$overdue overdue ${overdue == 1 ? 'account needs' : 'accounts need'} attention',
                        onTap: () => context.push('/reports'),
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  StaggeredListAnimation(
                    baseDelay: const Duration(milliseconds: 350),
                    delayBetween: const Duration(milliseconds: 50),
                    animationType: AnimationType.slideUp,
                    children: [
                      const SizedBox(height: 4),
                      UnderlineTabs<HomeTab>(
                        options: homeTabOptions,
                        selected: _tab,
                        onChanged: (tab) => setState(() => _tab = tab),
                      ),
                      const SizedBox(height: 14),
                      HomeTabContent(tab: _tab, best: best),
                      const SizedBox(height: 14),
                      _AskNehaCard(onTap: () => context.push('/assistant')),
                      const SizedBox(height: 12),
                      _ImproveCard(onTap: () => context.push('/guides')),
                    ],
                  ),
                  if (state.error.isNotEmpty)
                    ErrorBanner(
                      message: state.error,
                      onRetry: controller.dashboard.reload,
                    ),
                  if (dashboard != null && dashboard.profile == null)
                    const CompleteProfileBanner(),
                  if (dashboard == null && !state.loading)
                    const EmptyState(
                      title: 'Nothing to show yet',
                      text: 'Pull down to refresh.',
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  BureauReport? _selectedReport(List<BureauReport> completed) {
    final selected = _selected;
    if (selected == null) return null;
    for (final report in completed) {
      if (report.bureau == selected) return report;
    }
    return null;
  }
}

String formatReportDate(String value) {
  final date = DateTime.tryParse(value);
  if (date == null) return value;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${date.day} ${months[date.month - 1]} ${date.year}';
}

class _AlertTile extends StatelessWidget {
  const _AlertTile({required this.text, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.errorFill,
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_rounded, color: AppColors.red, size: 22),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: AppColors.red,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.red),
          ],
        ),
      ),
    );
  }
}

class _AskNehaCard extends StatelessWidget {
  const _AskNehaCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [Colors.white, Color(0xFFEAF3FF)],
          ),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: const Color(0xFFD6E6FA)),
          boxShadow: AppShadow.card,
        ),
        child: Row(
          children: [
            SizedBox(
              width: 60,
              height: 60,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [AppColors.buttonBlue, Color(0xFF7CC4FF)],
                      ),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: ClipOval(
                        child: SvgPicture.asset(
                          'assets/brand/neha-avatar.svg',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 2,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: AppColors.green,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'Ask Neha',
                        style: TextStyle(
                          color: AppColors.navy,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(width: 6),
                      AppPill(label: 'AI', color: AppColors.violet),
                    ],
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Get personalised insights, tips and answers about your credit score.',
                    style: TextStyle(color: AppColors.muted, fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: AppColors.blue,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward_rounded,
                color: Colors.white,
                size: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ImproveCard extends StatelessWidget {
  const _ImproveCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.buttonBlueDark, AppColors.blue],
          ),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: const Icon(
                Icons.menu_book_outlined,
                color: Colors.white,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Improve your score',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Short, practical guides on credit health',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward_rounded,
                color: AppColors.blueDark,
                size: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ScoreSummary extends StatelessWidget {
  const _ScoreSummary({required this.score, required this.onTap});

  final int? score;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final value = score;
    final label = value == null ? null : scoreBandLabel(value);
    final color = value == null ? AppColors.muted : scoreColor(value);
    final hint = value == null
        ? 'Get your first report to see your score'
        : value >= 750
        ? 'Great work! Keep paying on time to stay on track'
        : 'Take a few steps to improve it to 750+';
    return Row(
      children: [
        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Your Credit Score',
                style: TextStyle(
                  color: AppColors.navy,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (label != null)
                Text.rich(
                  TextSpan(
                    text: 'is ',
                    children: [
                      TextSpan(
                        text: label,
                        style: TextStyle(color: color),
                      ),
                    ],
                  ),
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              const SizedBox(height: 8),
              Text(
                hint,
                style: const TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Container(
            width: 30,
            height: 30,
            decoration: const BoxDecoration(
              color: AppColors.blue,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.chevron_right_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      ],
    );
  }
}

class _DownloadButton extends StatelessWidget {
  const _DownloadButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Ink(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.buttonBlue, AppColors.buttonBlueDark],
          ),
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          onTap: onTap,
          child: const SizedBox(
            height: 44,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.download_rounded, size: 18, color: Colors.white),
                SizedBox(width: 8),
                Text(
                  'Download Report',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickCard extends StatelessWidget {
  const _QuickCard({
    required this.icon,
    required this.label,
    this.onTap,
    this.badge,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.cardBorder),
          boxShadow: AppShadow.card,
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.blue, size: 22),
            const SizedBox(width: 6),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (badge != null) ...[
                    const SizedBox(height: 3),
                    AppPill(label: badge!, color: AppColors.violet),
                  ],
                ],
              ),
            ),
            if (onTap != null)
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.muted,
                size: 18,
              ),
          ],
        ),
      ),
    );
  }
}
