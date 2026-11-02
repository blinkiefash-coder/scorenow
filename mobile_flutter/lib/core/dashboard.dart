import 'package:flutter/foundation.dart';

import '../models/report.dart';
import 'api.dart';
import 'resource.dart';

class DashboardNotice {
  const DashboardNotice({required this.title, required this.message});

  final String title;
  final String message;
}

// Owns the signed-in customer's dashboard and report-purchase flow.
class DashboardController extends ChangeNotifier {
  DashboardController({required ApiClient api, required String token})
    : _api = api,
      _token = token {
    dashboard = ApiResource<DashboardStatus>(
      fetch: () async => DashboardStatus.fromJson(
        await _api.request('GET', '/api/dashboard', token: _token),
      ),
    );
    options = ApiResource<ReportOptions>(
      fetch: () async => ReportOptions.fromJson(
        await _api.request('GET', '/api/reports/options', token: _token),
      ),
    );
    dashboard.addListener(notifyListeners);
    options.addListener(notifyListeners);
    dashboard.reload();
    options.reload();
  }

  final ApiClient _api;
  final String _token;

  late final ApiResource<DashboardStatus> dashboard;
  late final ApiResource<ReportOptions> options;

  BureauId? busyBureau;

  // Returns a notice when the UI should show an alert.
  Future<DashboardNotice?> getReport(BureauId bureau) async {
    final opts = options.data;
    if (opts == null) return null;
    if (opts.demoMode) {
      return _run(
        bureau,
        () async => DashboardStatus.fromJson(
          await _api.request(
            'POST',
            '/api/reports/demo',
            token: _token,
            body: {'bureau': bureau.name},
          ),
        ),
      );
    }
    if (opts.paymentsMode != 'simulated') {
      return const DashboardNotice(
        title: 'Payment required',
        message:
            'In-app payments are coming soon. Please buy this report on the Scorenow website and it will appear here.',
      );
    }
    return _run(bureau, () async {
      final order = await _api.request(
        'POST',
        '/api/reports/order',
        token: _token,
        body: {'bureau': bureau.name},
      );
      return DashboardStatus.fromJson(
        await _api.request(
          'POST',
          '/api/reports/verify',
          token: _token,
          body: {'orderId': order['orderId']},
        ),
      );
    });
  }

  Future<DashboardNotice?> retryReport(String requestId, BureauId bureau) =>
      _run(
        bureau,
        () async => DashboardStatus.fromJson(
          await _api.request(
            'POST',
            '/api/reports/$requestId/retry',
            token: _token,
          ),
        ),
      );

  Future<DashboardNotice?> _run(
    BureauId bureau,
    Future<DashboardStatus> Function() task,
  ) async {
    busyBureau = bureau;
    notifyListeners();
    try {
      dashboard.setData(await task());
      return null;
    } on ApiException catch (error) {
      return DashboardNotice(title: 'Report', message: error.message);
    } catch (_) {
      return const DashboardNotice(
        title: 'Report',
        message: 'Unable to fetch the report.',
      );
    } finally {
      busyBureau = null;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    dashboard.dispose();
    options.dispose();
    super.dispose();
  }
}
