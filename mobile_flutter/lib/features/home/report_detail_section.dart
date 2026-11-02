import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

// Loads the full report for [requestId] and hands it to [builder] once available.
class ReportDetailSection extends StatefulWidget {
  const ReportDetailSection({
    super.key,
    required this.requestId,
    required this.builder,
  });

  final String requestId;
  final Widget Function(BuildContext context, ReportDetail detail) builder;

  @override
  State<ReportDetailSection> createState() => _ReportDetailSectionState();
}

class _ReportDetailSectionState extends State<ReportDetailSection> {
  ApiResource<ReportDetail>? _resource;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_resource != null) return;
    final services = AppScope.of(context);
    final token = services.auth.customer!.token;
    final resource = ApiResource<ReportDetail>(
      fetch: () async => ReportDetail.fromJson(
        await services.api.request(
          'GET',
          '/api/reports/${widget.requestId}',
          token: token,
        ),
      ),
    );
    _resource = resource;
    resource.reload();
  }

  @override
  void dispose() {
    _resource?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final resource = _resource!;
    return ListenableBuilder(
      listenable: resource,
      builder: (context, _) {
        final detail = resource.data;
        if (detail != null) return widget.builder(context, detail);
        if (resource.loading) {
          return const Padding(
            padding: EdgeInsets.all(32),
            child: Center(
              child: CircularProgressIndicator(color: AppColors.blue),
            ),
          );
        }
        return ErrorBanner(
          message: resource.error.isEmpty
              ? 'Unable to load this report.'
              : resource.error,
          onRetry: resource.reload,
        );
      },
    );
  }
}
