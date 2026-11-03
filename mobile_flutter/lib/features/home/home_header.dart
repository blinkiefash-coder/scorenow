import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/theme.dart';

class HomeHeader extends StatelessWidget {
  const HomeHeader({
    super.key,
    required this.initials,
    required this.topInset,
    this.alerts = 0,
  });

  final String initials;
  final double topInset;
  final int alerts;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, topInset + 10, 16, 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Image.asset(
            'assets/brand/logo-transparent.png',
            width: 90,
            height: 36,
            fit: BoxFit.contain,
          ),
          Row(
            children: [
              Semantics(
                button: true,
                label: alerts > 0
                    ? 'Notifications, $alerts need attention'
                    : 'Notifications',
                child: Material(
                  color: AppColors.card,
                  shape: const CircleBorder(
                    side: BorderSide(color: AppColors.cardBorder),
                  ),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () => context.push('/notifications'),
                    child: SizedBox(
                      width: 40,
                      height: 40,
                      child: Stack(
                        clipBehavior: Clip.none,
                        alignment: Alignment.center,
                        children: [
                          const Icon(
                            Icons.notifications_outlined,
                            size: 20,
                            color: AppColors.navy,
                          ),
                          if (alerts > 0)
                            Positioned(
                              top: 2,
                              right: 0,
                              child: Container(
                                constraints: const BoxConstraints(minWidth: 17),
                                height: 17,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 4,
                                ),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: AppColors.red,
                                  borderRadius: BorderRadius.circular(9),
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 1.5,
                                  ),
                                ),
                                child: Text(
                                  alerts > 9 ? '9+' : '$alerts',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Semantics(
                button: true,
                label: 'Profile',
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () => context.go('/profile'),
                  child: Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: AppColors.blue,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
