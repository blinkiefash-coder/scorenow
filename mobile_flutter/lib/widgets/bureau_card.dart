import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/features/dashboard/simulated_checkout.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/bureau_logo.dart';
import 'package:scorenow_mobile/widgets/notice_dialog.dart';

class BureauCard extends StatelessWidget {
  const BureauCard({super.key, required this.bureau, this.report});

  final BureauId bureau;
  final BureauReport? report;

  Future<void> _getReport(BuildContext context) async {
    final controller = DashboardScope.of(context);
    final options = controller.options.data;
    if (options != null &&
        !options.demoMode &&
        options.paymentsMode == 'simulated') {
      final approved = await showSimulatedCheckout(
        context,
        bureauName: bureau.displayName,
        amount: options.price,
      );
      if (!approved || !context.mounted) return;
    }
    final notice = await controller.getReport(bureau);
    if (notice != null && context.mounted) await showNotice(context, notice);
  }

  Future<void> _retry(BuildContext context) async {
    final current = report;
    if (current == null) return;
    final notice = await DashboardScope.of(
      context,
    ).retryReport(current.requestId, bureau);
    if (notice != null && context.mounted) await showNotice(context, notice);
  }

  @override
  Widget build(BuildContext context) {
    final controller = DashboardScope.of(context);
    final busy = controller.busyBureau == bureau;
    final available =
        controller.options.data?.bureaus
            .where((item) => item.id == bureau)
            .firstOrNull
            ?.available ??
        true;
    final options = controller.options.data;
    final current = report;
    final completed = current?.status == 'completed';
    final statusColor = completed
        ? AppColors.green
        : current?.status == 'failed'
        ? AppColors.red
        : AppColors.gold;
    final score = current?.creditScore;

    return AppCard(
      onTap: completed
          ? () => context.push('/report/${current!.requestId}')
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 62,
                height: 44,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.line),
                ),
                child: BureauLogo(bureau: bureau),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bureau.displayName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy,
                      ),
                    ),
                    if (completed)
                      Text(
                        'Updated ${formatDate(current!.reportDate ?? current.requestedAt)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.muted,
                        ),
                      ),
                  ],
                ),
              ),
              if (current != null)
                AppPill(label: current.status, color: statusColor),
            ],
          ),
          if (completed) ...[
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    score?.toString() ?? '—',
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      color: scoreColor(score),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      current!.scoreBand ?? '',
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Text(
                    'View report ›',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.blue,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  minHeight: 6,
                  value: (((score ?? 300) - 300) / 600)
                      .clamp(0.04, 1.0)
                      .toDouble(),
                  backgroundColor: AppColors.sky,
                  color: scoreColor(score),
                ),
              ),
            ),
          ],
          if (current?.status == 'failed') ...[
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              child: Text(
                current!.failureReason?.isNotEmpty == true
                    ? current.failureReason!
                    : 'We could not fetch this report.',
                style: const TextStyle(fontSize: 13, color: AppColors.muted),
              ),
            ),
            AppButton(
              label: 'Retry',
              small: true,
              loading: busy,
              onPressed: () => _retry(context),
            ),
          ],
          if (current?.status == 'processing')
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text(
                'Your report is being prepared. Pull down to refresh.',
                style: TextStyle(fontSize: 13, color: AppColors.muted),
              ),
            ),
          if (current == null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: AppButton(
                label: available
                    ? (options?.demoMode == true
                          ? 'Get free report'
                          : 'Get report${options != null ? ' · ₹${options.price}' : ''}')
                    : 'Coming soon',
                small: true,
                variant: AppButtonVariant.gold,
                loading: busy,
                onPressed: available ? () => _getReport(context) : null,
              ),
            ),
        ],
      ),
    );
  }
}
