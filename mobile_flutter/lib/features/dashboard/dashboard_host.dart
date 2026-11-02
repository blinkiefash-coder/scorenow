import 'package:flutter/widgets.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/dashboard.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';

// Recreates the dashboard controller whenever the customer token changes, so sign-out drops cached data.
class DashboardHost extends StatefulWidget {
  const DashboardHost({super.key, required this.services, required this.child});

  final AppServices services;
  final Widget child;

  @override
  State<DashboardHost> createState() => _DashboardHostState();
}

class _DashboardHostState extends State<DashboardHost> {
  DashboardController? _controller;
  String? _token;

  @override
  void initState() {
    super.initState();
    _apply(widget.services.auth.customer?.token);
    widget.services.auth.addListener(_onAuthChanged);
  }

  @override
  void dispose() {
    widget.services.auth.removeListener(_onAuthChanged);
    _controller?.dispose();
    super.dispose();
  }

  void _onAuthChanged() {
    if (_apply(widget.services.auth.customer?.token)) setState(() {});
  }

  // Returns true when the controller was replaced.
  bool _apply(String? token) {
    if (token == _token) return false;
    _controller?.dispose();
    _token = token;
    _controller = token == null
        ? null
        : DashboardController(api: widget.services.api, token: token);
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) return widget.child;
    return DashboardScope(controller: controller, child: widget.child);
  }
}
