import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/models/admin_ops.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_card.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_pill.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

// Sections are shown by role. The server enforces the same rules on every endpoint.
class AdminOpsScreen extends StatefulWidget {
  const AdminOpsScreen({super.key});

  @override
  State<AdminOpsScreen> createState() => _AdminOpsScreenState();
}

class _OpsData {
  const _OpsData({this.revenue, this.refunds, this.replies});

  final RevenueReport? revenue;
  final List<RefundRequest>? refunds;
  final List<CannedReply>? replies;
}

class _AdminOpsScreenState extends State<AdminOpsScreen> {
  late final ApiResource<_OpsData> _resource;
  bool _started = false;
  late final String _role;

  bool get _canSeeRevenue => ['owner', 'manager', 'analyst'].contains(_role);
  bool get _canManageRefunds => _role == 'owner' || _role == 'manager';
  bool get _canManageReplies => ['owner', 'manager', 'support'].contains(_role);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _role = services.auth.admin?.role ?? '';
    _resource = ApiResource(fetch: () => _fetchAll(services))..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  Future<_OpsData> _fetchAll(AppServices services) async {
    return _OpsData(
      revenue: _canSeeRevenue ? await fetchRevenue(services) : null,
      refunds: _canManageRefunds ? await fetchRefunds(services) : null,
      replies: _canManageReplies ? await fetchCannedReplies(services) : null,
    );
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
      await _resource.refresh();
    } catch (caught) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(caught is ApiException ? caught.message : 'Something went wrong.')),
      );
    }
  }

  Future<void> _decideRefund(RefundRequest refund, String decision) async {
    final needsNote = decision == 'rejected';
    final note = await _askText(
      title: _decisionTitle(decision),
      label: needsNote ? 'Reason (shown to the customer)' : 'Note (optional)',
      initial: '',
      multiline: true,
    );
    if (note == null) return;
    if (needsNote && note.trim().isEmpty) return;
    await _run(() => decideRefund(AppScope.of(context), refund.id, decision: decision, note: note.trim()));
  }

  Future<void> _editReply([CannedReply? reply]) async {
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (dialogContext) => _ReplyDialog(reply: reply),
    );
    if (result == null) return;
    await _run(() => saveCannedReply(
          AppScope.of(context),
          id: reply?.id,
          title: result['title']!,
          body: result['body']!,
        ));
  }

  Future<void> _deleteReply(CannedReply reply) async {
    await _run(() => deleteCannedReply(AppScope.of(context), reply.id));
  }

  Future<String?> _askText({
    required String title,
    required String label,
    required String initial,
    bool multiline = false,
  }) {
    final controller = TextEditingController(text: initial);
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: AppField(label: label, controller: controller, multiline: multiline),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(controller.text),
            child: const Text('Confirm'),
          ),
        ],
      ),
    ).whenComplete(controller.dispose);
  }

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      onRefresh: () => _resource.refresh(),
      header: const ScreenHeader(
        title: 'Operations',
        subtitle: 'Revenue, refund reviews and canned replies',
      ),
      children: [
        _resource.builder((context, data) {
          if (data == null) {
            return const FullScreenLoader(label: 'Loading operations…');
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (data.revenue != null) ..._revenueSection(data.revenue!),
              if (data.refunds != null) ..._refundSection(data.refunds!),
              if (data.replies != null) ..._replySection(data.replies!),
            ],
          );
        }),
      ],
    );
  }

  List<Widget> _revenueSection(RevenueReport report) {
    return [
      const SectionTitle('Revenue (last 30 days)'),
      const SizedBox(height: 8),
      Row(
        children: [
          Expanded(child: StatTile(label: 'Revenue', value: formatMoney(report.totalRevenue), tone: AppColors.green)),
          const SizedBox(width: 12),
          Expanded(child: StatTile(label: 'Paid orders', value: '${report.paidPayments}')),
        ],
      ),
      const SizedBox(height: 12),
      Row(
        children: [
          Expanded(
            child: StatTile(
              label: 'Commission pending',
              value: formatMoney(report.pendingCommissionPaise / 100),
              tone: AppColors.gold,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: StatTile(
              label: 'Commission paid',
              value: formatMoney(report.paidCommissionPaise / 100),
              tone: AppColors.green,
            ),
          ),
        ],
      ),
      const SizedBox(height: 20),
    ];
  }

  List<Widget> _refundSection(List<RefundRequest> refunds) {
    return [
      const SectionTitle('Refund requests'),
      const SizedBox(height: 8),
      if (refunds.isEmpty)
        const EmptyState(title: 'No refund requests', text: 'Customer refund requests will appear here.'),
      for (final refund in refunds)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(refund.customerName, style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    AppPill(label: titleCase(refund.status), color: _refundColor(refund.status)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${formatMoney(refund.amount)} · ${refund.reportBureau ?? 'Payment'} · ${formatDate(refund.createdAt)}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                const SizedBox(height: 8),
                Text(refund.reason),
                if (refund.decisionNote != null && refund.decisionNote!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('Note: ${refund.decisionNote}', style: const TextStyle(fontSize: 12, color: AppColors.muted)),
                ],
                if (refund.status == 'pending' || refund.status == 'approved') ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (refund.status == 'pending') ...[
                        Expanded(
                          child: AppButton(
                            label: 'Approve',
                            small: true,
                            onPressed: () => _decideRefund(refund, 'approved'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: AppButton(
                            label: 'Reject',
                            small: true,
                            variant: AppButtonVariant.danger,
                            onPressed: () => _decideRefund(refund, 'rejected'),
                          ),
                        ),
                      ] else
                        Expanded(
                          child: AppButton(
                            label: 'Mark processed',
                            small: true,
                            onPressed: () => _decideRefund(refund, 'processed'),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      const SizedBox(height: 20),
    ];
  }

  List<Widget> _replySection(List<CannedReply> replies) {
    return [
      Row(
        children: [
          const Expanded(child: SectionTitle('Canned replies')),
          TextButton.icon(
            onPressed: () => _editReply(),
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Add'),
          ),
        ],
      ),
      const SizedBox(height: 8),
      if (replies.isEmpty)
        const EmptyState(title: 'No canned replies', text: 'Save common answers to reuse in ticket replies.'),
      for (final reply in replies)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: AppCard(
            onTap: () => _editReply(reply),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(reply.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(
                        reply.body,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: AppColors.muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Delete',
                  icon: const Icon(Icons.delete_outline, color: AppColors.red),
                  onPressed: () => _deleteReply(reply),
                ),
              ],
            ),
          ),
        ),
    ];
  }

  String _decisionTitle(String decision) => switch (decision) {
        'approved' => 'Approve refund',
        'rejected' => 'Reject refund',
        _ => 'Mark refund processed',
      };

  Color _refundColor(String status) => switch (status) {
        'approved' => AppColors.blue,
        'processed' => AppColors.green,
        'rejected' => AppColors.red,
        _ => AppColors.gold,
      };
}

class _ReplyDialog extends StatefulWidget {
  const _ReplyDialog({this.reply});

  final CannedReply? reply;

  @override
  State<_ReplyDialog> createState() => _ReplyDialogState();
}

class _ReplyDialogState extends State<_ReplyDialog> {
  late final TextEditingController _title = TextEditingController(text: widget.reply?.title ?? '');
  late final TextEditingController _body = TextEditingController(text: widget.reply?.body ?? '');
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  void _save() {
    final title = _title.text.trim();
    final body = _body.text.trim();
    if (title.length < 2 || body.length < 2) {
      setState(() => _error = 'Enter a title and a reply.');
      return;
    }
    Navigator.of(context).pop({'title': title, 'body': body});
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.reply == null ? 'New canned reply' : 'Edit canned reply'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppField(label: 'Title', controller: _title, maxLength: 120),
            const SizedBox(height: 12),
            AppField(label: 'Reply', controller: _body, multiline: true, maxLength: 2000),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: AppColors.red)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        TextButton(onPressed: _save, child: const Text('Save')),
      ],
    );
  }
}
