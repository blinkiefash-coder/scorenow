import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_scope.dart';
import 'package:scorenow_mobile/features/profile/plan_card.dart';
import 'package:scorenow_mobile/features/profile/profile_widgets.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _confirmSignOut(BuildContext context) async {
    final services = AppScope.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign out'),
        content: const Text('Do you want to sign out of Scorenow?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.red),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await services.customerAuth.signOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AppScope.of(context).auth.customer?.user;
    final profile = DashboardScope.of(context).dashboard.data?.profile;
    final panLast4 = profile?.panLast4;
    final kycStatus = profile?.kycStatus ?? '';

    return AppScreen(
      header: const ScreenHeader(title: 'Profile'),
      children: [
        ProfileHero(user: user),
        const PlanCard(),
        AppCard(
          child: Column(
            children: [
              InfoRow(
                label: 'PAN',
                value: panLast4 != null && panLast4.isNotEmpty
                    ? 'XXXXXX$panLast4'
                    : 'Not added',
              ),
              InfoRow(
                label: 'Date of birth',
                value: formatDate(profile?.dateOfBirth),
              ),
              InfoRow(label: 'City', value: profile?.city ?? '—'),
              InfoRow(
                label: 'KYC status',
                value: kycStatus.isEmpty ? 'Pending' : kycStatus,
              ),
            ],
          ),
        ),
        AppCard(
          child: Column(
            children: [
              ProfileMenuItem(
                icon: Icons.badge_outlined,
                label: profile != null
                    ? 'Update profile details'
                    : 'Complete your profile',
                onTap: () => context.push('/profile-setup'),
              ),
              ProfileMenuItem(
                icon: Icons.menu_book_outlined,
                label: 'Credit guides',
                onTap: () => context.push('/guides'),
              ),
              ProfileMenuItem(
                icon: Icons.forum_outlined,
                label: 'Ask Neha (credit assistant)',
                onTap: () => context.push('/assistant'),
              ),
              ProfileMenuItem(
                icon: Icons.question_answer_outlined,
                label: 'Help & support',
                onTap: () => context.push('/support'),
              ),
              ProfileMenuItem(
                icon: Icons.logout,
                label: 'Sign out',
                tone: AppColors.red,
                onTap: () => _confirmSignOut(context),
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text(
            '© 2026 Scorenow',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ),
      ],
    );
  }
}
