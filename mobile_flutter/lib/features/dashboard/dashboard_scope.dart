import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/dashboard.dart';

class DashboardScope extends InheritedNotifier<DashboardController> {
  const DashboardScope({
    super.key,
    required DashboardController controller,
    required super.child,
  }) : super(notifier: controller);

  static DashboardController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<DashboardScope>();
    assert(scope != null, 'DashboardScope not found in context');
    return scope!.notifier!;
  }
}
