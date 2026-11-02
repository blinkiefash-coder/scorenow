import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/completed_reports.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/features/home/bureau_pills.dart';
import 'package:scorenow_mobile/features/home/complete_profile_banner.dart';
import 'package:scorenow_mobile/features/home/home_header.dart';
import 'package:scorenow_mobile/features/home/home_tabs.dart';
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
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 6),
                  SlideUpAnimation(
                    delay: const Duration(milliseconds: 100),
                    child: Text(
                      'Hey $firstName 👋',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.navy,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  SlideUpAnimation(
                    delay: const Duration(milliseconds: 150),
                    child: Text(
                      reportDate == null
                          ? 'Get your first report to see your score'
                          : 'Your Credit Score for ${formatReportDate(reportDate)}',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  SlideUpAnimation(
                    delay: const Duration(milliseconds: 200),
                    child: BureauPills(
                      completed: completed,
                      selected: best?.bureau,
                      onSelect: (bureau) => setState(() => _selected = bureau),
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
                  const SizedBox(height: 14),
                  ScaleInAnimation(
                    delay: const Duration(milliseconds: 300),
                    child: AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (score != null && score < 750)
                            _NeedsAttentionBanner(
                              onTap: () => context.push('/guides'),
                            ),
                          if (score != null && score < 750)
                            const SizedBox(height: 8),
                          Center(
                            child: ScoreGauge(
                              score: score,
                              band: best?.scoreBand,
                              size: 200,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (best != null)
                            FilledButton.icon(
                              style: FilledButton.styleFrom(
                                minimumSize: const Size.fromHeight(48),
                              ),
                              onPressed: () =>
                                  context.push('/report/${best.requestId}'),
                              icon: const Icon(Icons.download_rounded, size: 18),
                              label: const Text(
                                'Download Report',
                                style: TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  StaggeredListAnimation(
                    baseDelay: const Duration(milliseconds: 350),
                    delayBetween: const Duration(milliseconds: 50),
                    animationType: AnimationType.slideUp,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _QuickTile(
                              icon: Icons.description_outlined,
                              label: 'Report Summary',
                              onTap: () => context.push('/reports'),
                            ),
                          ),
                          Container(width: 1, height: 22, color: AppColors.line),
                          Expanded(
                            child: _QuickTile(
                              icon: Icons.trending_up_rounded,
                              label: 'Score Predictor',
                              comingSoon: true,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
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
            const Icon(
              Icons.error_outline_rounded,
              color: AppColors.red,
              size: 20,
            ),
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

class _NeedsAttentionBanner extends StatelessWidget {
  const _NeedsAttentionBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: AppColors.red.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(999),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_rounded, color: AppColors.red, size: 18),
            SizedBox(width: 8),
            Text(
              'Your Score Needs Attention',
              style: TextStyle(
                color: AppColors.red,
                fontSize: 13,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(width: 6),
            Icon(Icons.arrow_forward_rounded, color: AppColors.red, size: 16),
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
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.cardBorder),
          boxShadow: AppShadow.card,
        ),
        child: Row(
          children: [
            SvgPicture.asset(
              'assets/brand/neha-avatar.svg',
              width: 44,
              height: 44,
            ),
            const SizedBox(width: 12),
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
                    'Get personal guidance on your credit score',
                    style: TextStyle(color: AppColors.muted, fontSize: 11),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.blue),
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
            colors: [AppColors.blue, AppColors.blueDark],
          ),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: const Row(
          children: [
            Icon(Icons.menu_book_outlined, color: Colors.white, size: 26),
            SizedBox(width: 12),
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
            Icon(Icons.arrow_forward_rounded, color: Colors.white),
          ],
        ),
      ),
    );
  }
}

class _QuickTile extends StatelessWidget {
  const _QuickTile({
    required this.icon,
    required this.label,
    this.onTap,
    this.comingSoon = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool comingSoon;

  @override
  Widget build(BuildContext context) {
    final muted = comingSoon;
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: comingSoon ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Row(
          children: [
            Icon(
              icon,
              color: muted ? AppColors.placeholder : AppColors.blue,
              size: 22,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: muted ? AppColors.muted : AppColors.navy,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (comingSoon)
                    const Text(
                      'Coming soon',
                      style: TextStyle(
                        color: AppColors.placeholder,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
