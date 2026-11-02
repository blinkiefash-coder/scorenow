import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';

class _AdminTab {
  const _AdminTab({
    required this.path,
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.roles,
  });

  final String path;
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final Set<String> roles;
}

const _tabs = [
  _AdminTab(
    path: '/admin',
    label: 'Overview',
    icon: Icons.grid_view_outlined,
    activeIcon: Icons.grid_view_rounded,
    roles: {'owner', 'manager'},
  ),
  _AdminTab(
    path: '/admin/customers',
    label: 'Customers',
    icon: Icons.people_outline,
    activeIcon: Icons.people,
    roles: {'owner', 'manager', 'support', 'analyst'},
  ),
  _AdminTab(
    path: '/admin/tickets',
    label: 'Tickets',
    icon: Icons.chat_bubble_outline,
    activeIcon: Icons.chat_bubble,
    roles: {'owner', 'manager', 'support'},
  ),
  _AdminTab(
    path: '/admin/analytics',
    label: 'Analytics',
    icon: Icons.bar_chart_outlined,
    activeIcon: Icons.bar_chart,
    roles: {'owner', 'manager', 'analyst'},
  ),
  _AdminTab(
    path: '/admin/account',
    label: 'Account',
    icon: Icons.account_circle_outlined,
    activeIcon: Icons.account_circle,
    roles: {'owner', 'manager', 'support', 'analyst'},
  ),
];

class AdminShell extends StatelessWidget {
  const AdminShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).auth;
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        final role = auth.admin?.role;
        if (role == null) return const FullScreenLoader();
        final visible = _tabs.where((tab) => tab.roles.contains(role)).toList();
        final current = GoRouterState.of(context).uri.path;
        return Scaffold(
          body: child,
          bottomNavigationBar: _AdminTabBar(
            tabs: visible,
            currentPath: current,
            onTap: (path) => context.go(path),
          ),
        );
      },
    );
  }
}

class _AdminTabBar extends StatelessWidget {
  const _AdminTabBar({
    required this.tabs,
    required this.currentPath,
    required this.onTap,
  });

  final List<_AdminTab> tabs;
  final String currentPath;
  final ValueChanged<String> onTap;

  bool _isActive(_AdminTab tab) {
    if (tab.path == '/admin')
      return currentPath == '/admin' || currentPath == '/admin/';
    return currentPath.startsWith(tab.path);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.card,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 58,
          child: Row(
            children: [
              for (final tab in tabs)
                Expanded(
                  child: _AdminTabItem(
                    tab: tab,
                    active: _isActive(tab),
                    onTap: () => onTap(tab.path),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdminTabItem extends StatelessWidget {
  const _AdminTabItem({
    required this.tab,
    required this.active,
    required this.onTap,
  });

  final _AdminTab tab;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.blue : const Color(0xFF8D98B3);
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(active ? tab.activeIcon : tab.icon, size: 24, color: color),
          const SizedBox(height: 2),
          Text(
            tab.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
