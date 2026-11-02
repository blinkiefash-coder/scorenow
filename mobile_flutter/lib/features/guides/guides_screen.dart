import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/content/credit_guides.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/guides/guide_icon.dart';
import 'package:scorenow_mobile/widgets/animations.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';

const _chevronColor = Color(0xFFB2BBD0);

class GuidesScreen extends StatelessWidget {
  const GuidesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ModalPage(
      title: 'Credit guides',
      children: [
        for (final (index, guide) in creditGuides.indexed)
          SlideUpAnimation(
            delay: Duration(milliseconds: index * 80),
            child: AppCard(
              onTap: () => context.push('/guides/${guide.slug}'),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: AppColors.sky,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      guideIconData(guide.icon),
                      size: 22,
                      color: AppColors.blue,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          guide.title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          guide.readTime,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 18, color: _chevronColor),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
