import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Social media footer widget displaying links to social platforms
class SocialFooter extends StatelessWidget {
  const SocialFooter({
    super.key,
    this.backgroundColor,
    this.textColor,
    this.iconSize = 32,
  });

  final Color? backgroundColor;
  final Color? textColor;
  final double iconSize;

  static const _socialLinks = {
    'web': 'https://scorenow.in',
    'instagram': 'https://instagram.com/scorenow',
    'facebook': 'https://facebook.com/scorenow',
    'linkedin': 'https://linkedin.com/company/scorenow',
    'twitter': 'https://twitter.com/scorenow',
    'youtube': 'https://youtube.com/@scorenow',
  };

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    )) {
      debugPrint('Could not launch $url');
    }
  }

  String _getAssetPath(String platform) => 'assets/icons-3d/social-$platform.png';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      color: backgroundColor ?? (isDark ? Colors.grey[900] : Colors.grey[100]),
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Follow Us',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: textColor,
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 24,
            runSpacing: 16,
            alignment: WrapAlignment.center,
            children: [
              _SocialIconButton(
                platform: 'web',
                label: 'Website',
                assetPath: _getAssetPath('web'),
                onPressed: () => _launchUrl(_socialLinks['web']!),
                iconSize: iconSize,
              ),
              _SocialIconButton(
                platform: 'instagram',
                label: 'Instagram',
                assetPath: _getAssetPath('instagram'),
                onPressed: () => _launchUrl(_socialLinks['instagram']!),
                iconSize: iconSize,
              ),
              _SocialIconButton(
                platform: 'facebook',
                label: 'Facebook',
                assetPath: _getAssetPath('facebook'),
                onPressed: () => _launchUrl(_socialLinks['facebook']!),
                iconSize: iconSize,
              ),
              _SocialIconButton(
                platform: 'linkedin',
                label: 'LinkedIn',
                assetPath: _getAssetPath('linkedin'),
                onPressed: () => _launchUrl(_socialLinks['linkedin']!),
                iconSize: iconSize,
              ),
              _SocialIconButton(
                platform: 'twitter',
                label: 'X',
                assetPath: _getAssetPath('x'),
                onPressed: () => _launchUrl(_socialLinks['twitter']!),
                iconSize: iconSize,
              ),
              _SocialIconButton(
                platform: 'youtube',
                label: 'YouTube',
                assetPath: _getAssetPath('youtube'),
                onPressed: () => _launchUrl(_socialLinks['youtube']!),
                iconSize: iconSize,
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            '© 2026 ScoreNow. All rights reserved.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: textColor ?? Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _SocialIconButton extends StatelessWidget {
  const _SocialIconButton({
    required this.platform,
    required this.label,
    required this.assetPath,
    required this.onPressed,
    required this.iconSize,
  });

  final String platform;
  final String label;
  final String assetPath;
  final VoidCallback onPressed;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: Colors.transparent,
          child: Tooltip(
            message: label,
            child: InkWell(
              onTap: onPressed,
              child: Image.asset(
                assetPath,
                width: iconSize,
                height: iconSize,
                errorBuilder: (context, error, stackTrace) {
                  return Icon(
                    Icons.link,
                    size: iconSize,
                  );
                },
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
