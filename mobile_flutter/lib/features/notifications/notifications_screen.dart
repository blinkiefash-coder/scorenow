import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/completed_reports.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/models/report.dart';

enum NoticeTone { alert, warning, info, success }

class AppNotification {
  const AppNotification({
    required this.icon,
    required this.title,
    required this.body,
    required this.tone,
    required this.action,
    required this.route,
    this.tab = false,
    this.date,
  });

  final IconData icon;
  final String title;
  final String body;
  final NoticeTone tone;
  final String action;
  final String route;
  // Shell tabs need `go`; stacked pages need `push`.
  final bool tab;
  final String? date;

  bool get important => tone == NoticeTone.alert || tone == NoticeTone.warning;
}

// Notifications are derived from the latest dashboard data so they always reflect the user's real situation.
List<AppNotification> buildNotifications(DashboardStatus? status) {
  if (status == null) {
    return const [
      AppNotification(
        icon: Icons.wifi_off_rounded,
        title: 'Could not load your updates',
        body: 'Check your internet connection, then pull down to refresh.',
        tone: NoticeTone.info,
        action: 'Go to home',
        route: '/home',
        tab: true,
      ),
      _usageTip,
    ];
  }
  final items = <AppNotification>[];

  if (status.profile == null) {
    items.add(
      const AppNotification(
        icon: Icons.badge_outlined,
        title: 'Complete your profile',
        body:
            'Add your PAN and date of birth so we can fetch your credit report.',
        tone: NoticeTone.warning,
        action: 'Complete profile',
        route: '/profile-setup',
      ),
    );
  }

  for (final report in status.reports) {
    final name = report.bureau.displayName;
    if (report.status == 'failed') {
      items.add(
        AppNotification(
          icon: Icons.error_outline_rounded,
          title: '$name report could not be fetched',
          body:
              report.failureReason ??
              'The bureau did not return your report. You can retry for free.',
          tone: NoticeTone.alert,
          action: 'Retry now',
          route: '/reports',
          date: report.requestedAt,
        ),
      );
    } else if (report.status == 'processing') {
      items.add(
        AppNotification(
          icon: Icons.hourglass_top_rounded,
          title: '$name report is being prepared',
          body: 'This usually takes a minute. Pull down on Home to refresh.',
          tone: NoticeTone.info,
          action: 'View reports',
          route: '/reports',
          date: report.requestedAt,
        ),
      );
    }
  }

  final completed = completedReports(status.reports);
  if (completed.isEmpty) {
    items.add(
      const AppNotification(
        icon: Icons.speed_rounded,
        title: 'Check your credit score',
        body:
            'Get your report from CIBIL, Equifax, Experian or CRIF in minutes.',
        tone: NoticeTone.info,
        action: 'Get report',
        route: '/reports',
      ),
    );
  }

  for (final report in completed) {
    final name = report.bureau.displayName;
    final overdue = report.overdueAccounts ?? 0;
    if (overdue > 0) {
      items.add(
        AppNotification(
          icon: Icons.warning_amber_rounded,
          title:
              '$overdue overdue ${overdue == 1 ? 'account' : 'accounts'} on $name',
          body:
              'Overdue payments hurt your score the most. Clear them to start recovering.',
          tone: NoticeTone.alert,
          action: 'Pay now',
          route: '/payments',
          tab: true,
          date: report.reportDate,
        ),
      );
    }
    final enquiries = report.enquiriesLast6Months ?? 0;
    if (enquiries >= 3) {
      items.add(
        AppNotification(
          icon: Icons.manage_search_rounded,
          title: '$enquiries loan enquiries in 6 months',
          body:
              'Many enquiries in a short time can lower your score. Space out new applications.',
          tone: NoticeTone.warning,
          action: 'View enquiries',
          route: '/report/${report.requestId}',
          date: report.reportDate,
        ),
      );
    }
    items.add(
      AppNotification(
        icon: Icons.task_alt_rounded,
        title: 'Your $name report is ready',
        body:
            'Score ${report.creditScore}${report.scoreBand == null ? '' : ' • ${report.scoreBand}'}. Tap to see the full report.',
        tone: NoticeTone.success,
        action: 'Open report',
        route: '/report/${report.requestId}',
        date: report.reportDate,
      ),
    );
  }

  items.add(_usageTip);
  return items;
}

const _usageTip = AppNotification(
  icon: Icons.lightbulb_outline_rounded,
  title: 'Tip: keep card usage under 30%',
  body: 'Low credit utilisation is one of the fastest ways to lift your score.',
  tone: NoticeTone.info,
  action: 'Learn more',
  route: '/guides',
  tab: true,
);

void openNotification(BuildContext context, AppNotification item) {
  if (item.tab) {
    context.go(item.route);
  } else {
    context.push(item.route);
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = DashboardScope.of(context);
    final items = buildNotifications(controller.dashboard.data);
    final important = items.where((item) => item.important).length;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: AppColors.navy),
        title: const Text(
          'Notifications',
          style: TextStyle(
            color: AppColors.navy,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: RefreshIndicator(
        color: AppColors.blue,
        onRefresh: controller.dashboard.refresh,
        child: ListView(
          padding: EdgeInsets.fromLTRB(
            16,
            4,
            16,
            MediaQuery.paddingOf(context).bottom + 24,
          ),
          children: [
            Text(
              important == 0
                  ? 'You are all caught up'
                  : '$important ${important == 1 ? 'item needs' : 'items need'} your attention',
              style: const TextStyle(color: AppColors.muted, fontSize: 13.5),
            ),
            const SizedBox(height: 12),
            for (final item in items) _NotificationTile(item: item),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item});

  final AppNotification item;

  Color get _color => switch (item.tone) {
    NoticeTone.alert => AppColors.red,
    NoticeTone.warning => const Color(0xFFE89A00),
    NoticeTone.success => AppColors.green,
    NoticeTone.info => AppColors.blue,
  };

  @override
  Widget build(BuildContext context) {
    final color = _color;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: () => openNotification(context, item),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: item.important
                    ? color.withValues(alpha: 0.35)
                    : AppColors.cardBorder,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item.icon, color: color, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: const TextStyle(
                          color: AppColors.navy,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item.body,
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontSize: 12.5,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 10,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            '${item.action} →',
                            style: TextStyle(
                              color: color,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (item.date != null)
                            Text(
                              formatDate(item.date),
                              style: const TextStyle(
                                color: AppColors.muted,
                                fontSize: 11.5,
                              ),
                            ),
                        ],
                      ),
                    ],
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
