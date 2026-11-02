import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

// Conversation view shared by the customer ticket screen and the admin ticket screen.
class TicketThread extends StatefulWidget {
  const TicketThread({
    super.key,
    required this.ticket,
    required this.viewer,
    required this.onSend,
    this.header,
  });

  final SupportTicket ticket;
  final String viewer;
  final Future<void> Function(String message) onSend;
  final Widget? header;

  @override
  State<TicketThread> createState() => _TicketThreadState();
}

class _TicketThreadState extends State<TicketThread> {
  final _controller = TextEditingController();
  bool _sending = false;
  String _error = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _error = '';
    });
    try {
      await widget.onSend(text);
      _controller.clear();
    } catch (error) {
      setState(
        () => _error = error is Exception
            ? error.toString().replaceFirst('Exception: ', '')
            : 'Unable to send your reply.',
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticket = widget.ticket;
    final closed = ticket.status == 'closed';
    final comments = [
      TicketComment(
        id: 'original',
        authorType: 'customer',
        authorName: ticket.requesterName,
        message: ticket.message,
        createdAt: ticket.createdAt,
      ),
      ...ticket.comments,
    ];
    final canSend = _controller.text.trim().isNotEmpty && !_sending;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              if (widget.header != null) widget.header!,
              for (final comment in comments)
                _Bubble(
                  comment: comment,
                  mine: comment.authorType == widget.viewer,
                ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ErrorBanner(message: _error),
              if (closed)
                const Padding(
                  padding: EdgeInsets.all(14),
                  child: Text(
                    'This ticket is closed.',
                    style: TextStyle(color: AppColors.muted, fontSize: 13),
                  ),
                )
              else
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          onChanged: (_) => setState(() {}),
                          minLines: 1,
                          maxLines: 4,
                          maxLength: 4000,
                          buildCounter:
                              (
                                _, {
                                required currentLength,
                                required isFocused,
                                maxLength,
                              }) => null,
                          style: const TextStyle(
                            fontSize: 15,
                            color: AppColors.navy,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Write a reply…',
                            hintStyle: const TextStyle(
                              color: Color(0xFF9AA5BD),
                            ),
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              borderSide: const BorderSide(
                                color: AppColors.line,
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              borderSide: const BorderSide(
                                color: AppColors.line,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Opacity(
                        opacity: canSend ? 1 : 0.5,
                        child: Material(
                          color: AppColors.blue,
                          shape: const CircleBorder(),
                          child: InkWell(
                            customBorder: const CircleBorder(),
                            onTap: canSend ? _send : null,
                            child: const SizedBox(
                              width: 44,
                              height: 44,
                              child: Icon(
                                Icons.send_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.comment, required this.mine});

  final TicketComment comment;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final subtle = mine ? const Color(0xFFCFE0FF) : AppColors.muted;
    final author = comment.authorType == 'admin'
        ? '${comment.authorName} · Scorenow'
        : comment.authorName;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.86,
        ),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: mine ? AppColors.blue : Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                author,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: mine ? subtle : AppColors.muted,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                comment.message,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.4,
                  color: mine ? Colors.white : AppColors.navy,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                formatDateTime(comment.createdAt),
                style: TextStyle(fontSize: 10, color: subtle),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
