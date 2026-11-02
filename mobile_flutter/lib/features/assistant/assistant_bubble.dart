import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';

class ChatBubble extends StatelessWidget {
  const ChatBubble({super.key, required this.fromBot, required this.text});

  final bool fromBot;
  final String text;

  @override
  Widget build(BuildContext context) {
    final avatar = Image.asset(
      'assets/brand/mark.png',
      width: 28,
      height: 28,
      fit: BoxFit.contain,
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: fromBot
            ? MainAxisAlignment.start
            : MainAxisAlignment.end,
        children: [
          if (fromBot) ...[avatar, const SizedBox(width: 8)],
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.sizeOf(context).width * 0.8,
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                  horizontal: 14,
                ),
                decoration: BoxDecoration(
                  color: fromBot ? AppColors.card : AppColors.blue,
                  border: fromBot ? Border.all(color: AppColors.line) : null,
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(AppRadius.md),
                    topRight: const Radius.circular(AppRadius.md),
                    bottomLeft: Radius.circular(fromBot ? 4 : AppRadius.md),
                    bottomRight: Radius.circular(fromBot ? AppRadius.md : 4),
                  ),
                ),
                child: Text(
                  text,
                  style: TextStyle(
                    fontSize: 14,
                    height: 20 / 14,
                    color: fromBot ? AppColors.navy : Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ChatChoice extends StatelessWidget {
  const ChatChoice({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
        decoration: BoxDecoration(
          color: AppColors.sky,
          border: Border.all(color: AppColors.blue),
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: AppColors.blue,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
