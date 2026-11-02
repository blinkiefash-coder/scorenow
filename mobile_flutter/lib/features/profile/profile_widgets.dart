import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/auth_user.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';

String initialsOf(String? name) {
  if (name == null) return '?';
  return name
      .split(' ')
      .where((part) => part.isNotEmpty)
      .take(2)
      .map((part) => part[0])
      .join()
      .toUpperCase();
}

class ProfileHero extends StatelessWidget {
  const ProfileHero({super.key, required this.user});

  final AuthUser? user;

  @override
  Widget build(BuildContext context) {
    final email = user?.email ?? '';
    return AppCard(
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              color: AppColors.blue,
              shape: BoxShape.circle,
            ),
            child: Text(
              initialsOf(user?.fullName),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user?.fullName ?? '',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '+91 ${user?.mobile ?? ''}',
                  style: const TextStyle(fontSize: 13, color: AppColors.muted),
                ),
                if (email.isNotEmpty)
                  Text(
                    email,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.muted,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ProfileMenuItem extends StatelessWidget {
  const ProfileMenuItem({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.tone = AppColors.navy,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 15),
        child: Row(
          children: [
            Icon(icon, size: 20, color: tone),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: tone,
                ),
              ),
            ),
            const Icon(Icons.chevron_right, size: 18, color: Color(0xFFB2BBD0)),
          ],
        ),
      ),
    );
  }
}
