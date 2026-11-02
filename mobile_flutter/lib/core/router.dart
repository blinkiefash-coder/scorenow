import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/features/admin/admin_account_screen.dart';
import 'package:scorenow_mobile/features/admin/admin_analytics_screen.dart';
import 'package:scorenow_mobile/features/admin/admin_customers_screen.dart';
import 'package:scorenow_mobile/features/admin/admin_login_screen.dart';
import 'package:scorenow_mobile/features/admin/admin_overview_screen.dart';
import 'package:scorenow_mobile/features/admin/admin_shell.dart';
import 'package:scorenow_mobile/features/admin/admin_ticket_screen.dart';
import 'package:scorenow_mobile/features/admin/admin_tickets_screen.dart';
import 'package:scorenow_mobile/features/assistant/assistant_screen.dart';
import 'package:scorenow_mobile/features/auth/login_screen.dart';
import 'package:scorenow_mobile/features/credit_cards/credit_cards_screen.dart';
import 'package:scorenow_mobile/features/fixed_deposits/fixed_deposits_screen.dart';
import 'package:scorenow_mobile/features/guides/guide_detail_screen.dart';
import 'package:scorenow_mobile/features/guides/guides_screen.dart';
import 'package:scorenow_mobile/features/home/home_screen.dart';
import 'package:scorenow_mobile/features/landing/landing_page.dart';
import 'package:scorenow_mobile/features/products/products_screen.dart';
import 'package:scorenow_mobile/features/payments/payments_screen.dart';
import 'package:scorenow_mobile/features/profile/profile_screen.dart';
import 'package:scorenow_mobile/features/profile/profile_setup_screen.dart';
import 'package:scorenow_mobile/features/reports/report_detail_screen.dart';
import 'package:scorenow_mobile/features/reports/reports_screen.dart';
import 'package:scorenow_mobile/features/shell/customer_shell.dart';
import 'package:scorenow_mobile/features/support/new_ticket_screen.dart';
import 'package:scorenow_mobile/features/support/support_screen.dart';
import 'package:scorenow_mobile/features/support/ticket_screen.dart';

const _customerTabs = {
  '/home',
  '/payments',
  '/products',
  '/guides',
  '/profile',
};

// Mirrors the Expo guards: tabs need a customer session, and the admin panel needs an admin session.
String? _redirect(AppServices services, GoRouterState state) {
  final auth = services.auth;
  if (!auth.ready) return null;
  final path = state.uri.path;

  if (path == '/' && auth.customer != null) return '/home';
  if (_customerTabs.contains(path) && auth.customer == null) return '/';

  if (path.startsWith('/admin') && path != '/admin/login') {
    final admin = auth.admin;
    if (admin == null) return '/admin/login';
    final canSeeOverview = admin.role == 'owner' || admin.role == 'manager';
    if (path == '/admin' && !canSeeOverview) {
      return admin.role == 'analyst' ? '/admin/analytics' : '/admin/tickets';
    }
  }
  return null;
}

GoRouter createRouter(AppServices services) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: services.auth,
    redirect: (context, state) => _redirect(services, state),
    routes: [
      GoRoute(path: '/', builder: (context, state) => const GuestHomeScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            CustomerShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/payments',
                builder: (context, state) => const PaymentsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/products',
                builder: (context, state) => const ProductsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/guides',
                builder: (context, state) => const GuidesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportsScreen(),
      ),
      GoRoute(
        path: '/support',
        builder: (context, state) => const SupportScreen(),
      ),
      GoRoute(
        path: '/report/:id',
        builder: (context, state) =>
            ReportDetailScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/new-ticket',
        builder: (context, state) => const NewTicketScreen(),
      ),
      GoRoute(
        path: '/ticket/:id',
        builder: (context, state) =>
            TicketScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/profile-setup',
        builder: (context, state) => const ProfileSetupScreen(),
      ),
      GoRoute(
        path: '/fixed-deposits',
        builder: (context, state) => const FixedDepositsScreen(),
      ),
      GoRoute(
        path: '/credit-cards',
        builder: (context, state) => const CreditCardsScreen(),
      ),
      GoRoute(
        path: '/guides/:slug',
        builder: (context, state) =>
            GuideDetailScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/assistant',
        builder: (context, state) => const AssistantScreen(),
      ),
      GoRoute(
        path: '/admin/login',
        builder: (context, state) => const AdminLoginScreen(),
      ),
      GoRoute(
        path: '/admin/ticket/:id',
        builder: (context, state) =>
            AdminTicketScreen(id: state.pathParameters['id']!),
      ),
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(
            path: '/admin',
            builder: (context, state) => const AdminOverviewScreen(),
          ),
          GoRoute(
            path: '/admin/customers',
            builder: (context, state) => const AdminCustomersScreen(),
          ),
          GoRoute(
            path: '/admin/tickets',
            builder: (context, state) => const AdminTicketsScreen(),
          ),
          GoRoute(
            path: '/admin/analytics',
            builder: (context, state) => const AdminAnalyticsScreen(),
          ),
          GoRoute(
            path: '/admin/account',
            builder: (context, state) => const AdminAccountScreen(),
          ),
        ],
      ),
    ],
  );
}
