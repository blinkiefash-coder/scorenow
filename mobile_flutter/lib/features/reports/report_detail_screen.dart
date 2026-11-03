import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/dashboard.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/features/reports/report_account_card.dart';
import 'package:scorenow_mobile/features/reports/report_detail_sections.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';
import 'package:scorenow_mobile/widgets/notice_dialog.dart';
import 'package:scorenow_mobile/widgets/segmented_chips.dart';
import 'package:share_plus/share_plus.dart';

enum AccountFilter { all, attention, active, closed }

const _filterOptions = [
  (value: AccountFilter.all, label: 'All'),
  (value: AccountFilter.attention, label: 'Needs attention'),
  (value: AccountFilter.active, label: 'Active'),
  (value: AccountFilter.closed, label: 'Closed'),
];

class ReportDetailScreen extends StatefulWidget {
  const ReportDetailScreen({super.key, required this.id});

  final String id;

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  ApiResource<ReportDetail>? _report;
  AccountFilter _filter = AccountFilter.all;
  bool _downloading = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_report != null) return;
    final services = AppScope.of(context);
    final token = services.auth.customer!.token;
    final resource = ApiResource<ReportDetail>(
      fetch: () async => ReportDetail.fromJson(
        await services.api.request(
          'GET',
          '/api/reports/${widget.id}',
          token: token,
        ),
      ),
    );
    _report = resource;
    resource.reload();
  }

  @override
  void dispose() {
    _report?.dispose();
    super.dispose();
  }

  List<ReportAccount> _visibleAccounts(List<ReportAccount> accounts) {
    switch (_filter) {
      case AccountFilter.all:
        return accounts;
      case AccountFilter.attention:
        return accounts.where(needsAttention).toList();
      case AccountFilter.active:
        return accounts.where((account) => account.status == 'active').toList();
      case AccountFilter.closed:
        return accounts.where((account) => account.status == 'closed').toList();
    }
  }

  Future<void> _downloadPdf(ReportDetail report) async {
    if (_downloading) return;
    setState(() => _downloading = true);
    final services = AppScope.of(context);
    final token = services.auth.customer!.token;
    try {
      final bytes = await services.api.download(
        '/api/reports/${widget.id}/pdf',
        token: token,
      );
      final dir = await getTemporaryDirectory();
      final isPdf =
          bytes.length > 4 &&
          String.fromCharCodes(bytes.take(5)) == '%PDF-';
      final extension = isPdf ? 'pdf' : 'html';
      final file = File(
        '${dir.path}/scorenow-${report.bureau.name}-report.$extension',
      );
      await file.writeAsBytes(bytes, flush: true);
      await SharePlus.instance.share(
        ShareParams(
          files: [
            XFile(
              file.path,
              mimeType: isPdf ? 'application/pdf' : 'text/html',
            ),
          ],
        ),
      );
    } catch (_) {
      if (mounted) {
        await showNotice(
          context,
          const DashboardNotice(
            title: 'Download failed',
            message:
                'We could not download the PDF right now. Please try again.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final resource = _report;
    if (resource == null)
      return const FullScreenLoader(label: 'Loading full report…');
    return ListenableBuilder(
      listenable: resource,
      builder: (context, _) {
        final report = resource.data;
        if (resource.loading && report == null) {
          return const FullScreenLoader(label: 'Loading full report…');
        }
        if (report == null) {
          return ModalPage(
            title: 'Report',
            children: [
              ErrorBanner(
                message: resource.error.isNotEmpty
                    ? resource.error
                    : 'Report not found.',
                onRetry: resource.reload,
              ),
            ],
          );
        }
        final accounts = _visibleAccounts(report.accounts);
        return ModalPage(
          title: report.bureau.displayName,
          children: [
            ReportScoreCard(report: report),
            ReportSummarySection(summary: report.summary),
            if (report.pdfAvailable)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    shape: const StadiumBorder(),
                  ),
                  onPressed: _downloading ? null : () => _downloadPdf(report),
                  icon: _downloading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.download_outlined, size: 18),
                  label: const Text('Download report'),
                ),
              ),
            if (report.scoreFactors != null && report.scoreFactors!.isNotEmpty)
              ScoreFactorsSection(factors: report.scoreFactors!),
            ReportSectionHeader(
              icon: Icons.account_balance_wallet_rounded,
              title: 'Accounts',
              subtitle: '${accounts.length} shown',
            ),
            SegmentedChips<AccountFilter>(
              options: _filterOptions,
              selected: _filter,
              onChanged: (value) => setState(() => _filter = value),
            ),
            const SizedBox(height: 12),
            for (final account in accounts) AccountCard(account: account),
            if (report.enquiries.isNotEmpty)
              RecentEnquiriesSection(enquiries: report.enquiries),
            PersonalDetailsSection(personal: report.personal),
          ],
        );
      },
    );
  }
}
