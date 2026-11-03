import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/content/credit_guides.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/guides/guide_icon.dart';
import 'package:scorenow_mobile/widgets/animations.dart';
import 'package:scorenow_mobile/features/guides/learn_quiz.dart';
import 'package:scorenow_mobile/features/guides/learn_videos.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/underline_tabs.dart';

const _chevronColor = Color(0xFFB2BBD0);

enum _LearnTab { guides, videos, quiz }

const _learnOptions = [
  (value: _LearnTab.guides, label: 'Guides'),
  (value: _LearnTab.videos, label: 'Videos'),
  (value: _LearnTab.quiz, label: 'Test'),
];

const _accents = [AppColors.blue, AppColors.green, AppColors.violet];

class GuidesScreen extends StatefulWidget {
  const GuidesScreen({super.key});

  @override
  State<GuidesScreen> createState() => _GuidesScreenState();
}

class _GuidesScreenState extends State<GuidesScreen> {
  _LearnTab _tab = _LearnTab.guides;

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      header: const ScreenHeader(
        title: 'Learn',
        subtitle: 'Guides, videos and a quick test',
      ),
      children: [
        UnderlineTabs<_LearnTab>(
          options: _learnOptions,
          selected: _tab,
          onChanged: (tab) => setState(() => _tab = tab),
        ),
        const SizedBox(height: 14),
        switch (_tab) {
          _LearnTab.guides => const _GuideList(),
          _LearnTab.videos => const LearnVideos(),
          _LearnTab.quiz => const LearnQuiz(),
        },
      ],
    );
  }
}

class _GuideList extends StatelessWidget {
  const _GuideList();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (index, guide) in creditGuides.indexed)
          SlideUpAnimation(
            delay: Duration(milliseconds: index * 80),
            child: _GuideCard(
              guide: guide,
              color: _accents[index % _accents.length],
            ),
          ),
      ],
    );
  }
}

class _GuideCard extends StatelessWidget {
  const _GuideCard({required this.guide, required this.color});

  final CreditGuide guide;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/guides/${guide.slug}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(guideIconData(guide.icon), color: color),
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
                    const SizedBox(height: 4),
                    Text(
                      guide.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    AppPill(label: guide.readTime, color: color),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, size: 20, color: _chevronColor),
            ],
          ),
        ),
      ),
    );
  }
}
