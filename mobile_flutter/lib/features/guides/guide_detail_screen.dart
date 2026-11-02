import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/content/credit_guides.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

const _bodyColor = Color(0xFF2B3556);

class GuideDetailScreen extends StatelessWidget {
  const GuideDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context) {
    final guide = _findGuide(slug);
    if (guide == null) {
      return const ModalPage(
        title: 'Guide',
        children: [
          EmptyState(
            title: 'Guide not found',
            text: 'That guide may have moved.',
          ),
        ],
      );
    }
    return ModalPage(
      title: 'Credit guide',
      children: [
        Text(
          guide.title,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            height: 28 / 22,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          guide.readTime,
          style: const TextStyle(fontSize: 12, color: AppColors.muted),
        ),
        const SizedBox(height: 10),
        Text(
          guide.description,
          style: const TextStyle(fontSize: 14, color: AppColors.muted),
        ),
        const SizedBox(height: 16),
        for (final section in guide.sections)
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  section.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
                for (final paragraph in section.paragraphs)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(paragraph, style: _bodyStyle),
                  ),
                for (final point in section.points)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.check_circle,
                          size: 18,
                          color: AppColors.green,
                        ),
                        const SizedBox(width: 8),
                        Expanded(child: Text(point, style: _bodyStyle)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        const SectionTitle('More guides'),
        for (final item in creditGuides)
          if (item.slug != guide.slug)
            AppCard(
              onTap: () => context.replace('/guides/${item.slug}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.navy,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.readTime,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

const _bodyStyle = TextStyle(fontSize: 14, height: 21 / 14, color: _bodyColor);

CreditGuide? _findGuide(String slug) {
  for (final guide in creditGuides) {
    if (guide.slug == slug) return guide;
  }
  return null;
}
