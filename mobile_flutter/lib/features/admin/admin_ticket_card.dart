import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';

Color adminTicketTone(String status) => switch (status) {
  'resolved' || 'closed' => AppColors.green,
  'in_progress' => AppColors.gold,
  _ => AppColors.blue,
};

class AdminTicketCard extends StatelessWidget {
  const AdminTicketCard({super.key, required this.ticket, required this.onTap});

  final SupportTicket ticket;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final replies = ticket.comments.length;
    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  ticket.subject,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              AppPill(
                label: titleCase(ticket.status),
                color: adminTicketTone(ticket.status),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${ticket.requesterName} · +91 ${ticket.requesterMobile}',
            style: const TextStyle(color: AppColors.muted, fontSize: 13),
          ),
          const SizedBox(height: 6),
          Text(
            ticket.message,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.navy,
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$replies repl${replies == 1 ? 'y' : 'ies'} · ${formatDateTime(ticket.updatedAt)}',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
