import 'package:flutter/material.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/models/report.dart';
import 'package:scorenow_mobile/widgets/animations.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/bureau_card.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

const _bureaus = [
  BureauId.cibil,
  BureauId.equifax,
  BureauId.experian,
  BureauId.crif,
];

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = DashboardScope.of(context).dashboard;
    final dashboard = state.data;
    if (state.loading && dashboard == null) {
      return const FullScreenLoader(label: 'Loading your reports…');
    }
    return AppScreen(
      onRefresh: state.refresh,
      header: const ScreenHeader(
        title: 'Reports',
        subtitle: 'Tap a completed report for full details',
      ),
      children: [
        if (state.error.isNotEmpty)
          ErrorBanner(message: state.error, onRetry: state.reload),
        for (final (index, bureau) in _bureaus.indexed)
          ScaleInAnimation(
            delay: Duration(milliseconds: index * 100),
            child: BureauCard(
              bureau: bureau,
              report: _reportFor(dashboard?.reports, bureau),
            ),
          ),
      ],
    );
  }
}

BureauReport? _reportFor(List<BureauReport>? reports, BureauId bureau) {
  if (reports == null) return null;
  for (final report in reports) {
    if (report.bureau == bureau) return report;
  }
  return null;
}
