import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/content/learn_content.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/guides/video_player_page.dart';

const _gradients = [
  [Color(0xFF0B3C9C), Color(0xFF2F7BFF)],
  [Color(0xFF0E7A4F), Color(0xFF3CC98A)],
  [Color(0xFF6B2FB3), Color(0xFFA66BFF)],
  [Color(0xFFC2410C), Color(0xFFFF8A3D)],
  [Color(0xFF0F5C73), Color(0xFF3CB8D6)],
];

class LearnVideos extends StatelessWidget {
  const LearnVideos({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (index, video) in learnVideos.indexed)
          _VideoCard(
            video: video,
            colors: _gradients[index % _gradients.length],
          ),
      ],
    );
  }
}

class _VideoCard extends StatelessWidget {
  const _VideoCard({required this.video, required this.colors});

  final LearnVideo video;
  final List<Color> colors;

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
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => VideoPlayerPage(video: video, colors: colors),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 140,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: colors,
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -30,
                    top: -30,
                    child: Container(
                      width: 140,
                      height: 140,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                  ),
                  Center(
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.play_arrow_rounded,
                        size: 36,
                        color: colors.first,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 12,
                    bottom: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        video.duration,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    video.title,
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    video.summary,
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
