import 'dart:async';

import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/admin/admin_alert.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/models/admin_crm.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class AdminCrmScreen extends StatefulWidget {
  const AdminCrmScreen({super.key});

  @override
  State<AdminCrmScreen> createState() => _AdminCrmScreenState();
}

class _AdminCrmScreenState extends State<AdminCrmScreen> {
  final _searchController = TextEditingController();
  late final ApiResource<AdminCrmPage> _resource;
  Timer? _debounce;
  bool _started = false;
  String _query = '';
  CrmStage? _stageFilter;
  String _tagFilter = '';
  int _page = 1;
  String? _selectedCustomerId;
  CrmTimeline? _selectedTimeline;
  bool _loading = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(
      fetch: () async {
        final services = AppScope.of(context);
        final pipeline = await fetchCrmPipeline(services);
        final (customers, total) = await fetchCrmCustomers(
          services,
          page: _page,
          query: _query,
          stage: _stageFilter?.value ?? '',
          tag: _tagFilter,
        );
        final tasks = await fetchCrmTasks(services);
        return AdminCrmPage(
          pipeline: pipeline,
          customers: customers,
          total: total,
          tasks: tasks,
        );
      },
    )..reload();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _resource.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (!mounted) return;
      _query = value;
      _page = 1;
      _resource.reload();
    });
  }

  Future<void> _selectCustomer(String customerId) async {
    setState(() {
      _selectedCustomerId = customerId;
      _loading = true;
    });
    try {
      final services = AppScope.of(context);
      final timeline = await fetchCrmCustomerTimeline(services, customerId);
      if (mounted) {
        setState(() {
          _selectedTimeline = timeline;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load customer: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      onRefresh: () => _resource.reload(),
      header: const ScreenHeader(
        title: 'CRM Management',
        subtitle: 'Customer pipeline and activities',
      ),
      children: [
        _resource.builder(
          (context, page) => _CrmContent(
            page: page,
            query: _query,
            stageFilter: _stageFilter,
            tagFilter: _tagFilter,
            onSearchChanged: _onSearchChanged,
            onStageFilterChanged: (stage) {
              setState(() {
                _stageFilter = stage;
                _page = 1;
                _resource.reload();
              });
            },
            onTagFilterChanged: (tag) {
              setState(() {
                _tagFilter = tag;
                _page = 1;
                _resource.reload();
              });
            },
            selectedCustomerId: _selectedCustomerId,
            selectedTimeline: _selectedTimeline,
            onSelectCustomer: _selectCustomer,
            onTimelineActionRefresh: () => _resource.reload(),
          ),
        ),
      ],
    );
  }
}

class AdminCrmPage {
  AdminCrmPage({
    required this.pipeline,
    required this.customers,
    required this.total,
    required this.tasks,
  });

  final Map<CrmStage, int> pipeline;
  final List<CrmCustomer> customers;
  final int total;
  final List<CrmTask> tasks;
}

class _CrmContent extends StatelessWidget {
  const _CrmContent({
    required this.page,
    required this.query,
    required this.stageFilter,
    required this.tagFilter,
    required this.onSearchChanged,
    required this.onStageFilterChanged,
    required this.onTagFilterChanged,
    required this.selectedCustomerId,
    required this.selectedTimeline,
    required this.onSelectCustomer,
    required this.onTimelineActionRefresh,
  });

  final AdminCrmPage? page;
  final String query;
  final CrmStage? stageFilter;
  final String tagFilter;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<CrmStage?> onStageFilterChanged;
  final ValueChanged<String> onTagFilterChanged;
  final String? selectedCustomerId;
  final CrmTimeline? selectedTimeline;
  final Function(String) onSelectCustomer;
  final VoidCallback onTimelineActionRefresh;

  @override
  Widget build(BuildContext context) {
    if (page == null) {
      return const FullScreenLoader(label: 'Loading CRM data…');
    }

    return SingleChildScrollView(
      child: Column(
        children: [
          // Pipeline Summary
          Padding(
            padding: const EdgeInsets.all(16),
            child: GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 2.5,
              children: [
                for (final stage in CrmStage.values)
                  _PipelineCard(
                    stage: stage,
                    count: page!.pipeline[stage] ?? 0,
                    isSelected: stageFilter == stage,
                    onTap: () {
                      onStageFilterChanged(
                        stageFilter == stage ? null : stage,
                      );
                    },
                  ),
              ],
            ),
          ),
          
          // Search and Filters
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                AppField(
                  controller: TextEditingController(text: query),
                  onChanged: onSearchChanged,
                  hint: 'Search customers…',
                ),
                const SizedBox(height: 12),
                if (tagFilter.isNotEmpty)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Chip(
                      label: Text('Tag: $tagFilter'),
                      onDeleted: () => onTagFilterChanged(''),
                    ),
                  ),
              ],
            ),
          ),

          // Open Tasks
          if (page!.tasks.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Open Tasks (${page!.tasks.where((t) => t.status == 'open').length})',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 12),
                      ...page!.tasks
                          .where((t) => t.status == 'open')
                          .take(5)
                          .map(
                            (task) => _TaskTile(task: task),
                          ),
                    ],
                  ),
                ),
              ),
            ),

          // Customers List
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Customers (${page!.customers.length} of ${page!.total})',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 12),
                if (page!.customers.isEmpty)
                  const Center(child: Text('No customers found'))
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: page!.customers.length,
                    itemBuilder: (context, index) {
                      final customer = page!.customers[index];
                      final isSelected = selectedCustomerId == customer.id;
                      return _CustomerTile(
                        customer: customer,
                        isSelected: isSelected,
                        onTap: () => onSelectCustomer(customer.id),
                      );
                    },
                  ),
              ],
            ),
          ),

          // Customer Timeline
          if (selectedTimeline != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: _CustomerTimeline(
                timeline: selectedTimeline!,
                customerId: selectedCustomerId!,
                onRefresh: onTimelineActionRefresh,
              ),
            ),
        ],
      ),
    );
  }
}

class _PipelineCard extends StatelessWidget {
  const _PipelineCard({
    required this.stage,
    required this.count,
    required this.isSelected,
    required this.onTap,
  });

  final CrmStage stage;
  final int count;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = {
      CrmStage.new_: Colors.blue,
      CrmStage.contacted: Colors.orange,
      CrmStage.interested: Colors.purple,
      CrmStage.paid: Colors.green,
      CrmStage.closed: Colors.grey,
    };

    return Padding(
      padding: const EdgeInsets.all(4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              color: isSelected
                  ? colors[stage]?.withOpacity(0.1)
                  : Colors.grey[100],
              border: Border.all(
                color: isSelected
                    ? colors[stage] ?? Colors.blue
                    : Colors.grey[300] ?? Colors.grey,
                width: isSelected ? 2 : 1,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$count',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: colors[stage],
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  stage.name.replaceAll('_', ' ').toUpperCase(),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task});

  final CrmTask task;

  @override
  Widget build(BuildContext context) {
    final isDue = task.isOverdue;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isDue ? Colors.red[50] : Colors.transparent,
        border: Border(
          left: BorderSide(
            color: isDue ? Colors.red : Colors.green,
            width: 3,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            task.title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
          if (task.dueAt != null)
            Text(
              'Due: ${formatDateTime(task.dueAt!)}',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: isDue ? Colors.red : Colors.grey,
              ),
            ),
        ],
      ),
    );
  }
}

class _CustomerTile extends StatelessWidget {
  const _CustomerTile({
    required this.customer,
    required this.isSelected,
    required this.onTap,
  });

  final CrmCustomer customer;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: isSelected ? Colors.blue[50] : null,
      child: ListTile(
        onTap: onTap,
        title: Text(customer.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (customer.email != null) Text(customer.email!),
            if (customer.mobile != null) Text(customer.mobile!),
            Wrap(
              spacing: 4,
              children: [
                for (final tag in customer.tags)
                  Chip(
                    label: Text(tag),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              customer.stage.name.replaceAll('_', ' '),
              style: Theme.of(context).textTheme.labelSmall,
            ),
            if (customer.openTasks > 0)
              Badge(
                label: Text('${customer.openTasks}'),
                backgroundColor: Colors.orange,
              ),
          ],
        ),
      ),
    );
  }
}

class _CustomerTimeline extends StatefulWidget {
  const _CustomerTimeline({
    required this.timeline,
    required this.customerId,
    required this.onRefresh,
  });

  final CrmTimeline timeline;
  final String customerId;
  final VoidCallback onRefresh;

  @override
  State<_CustomerTimeline> createState() => _CustomerTimelineState();
}

class _CustomerTimelineState extends State<_CustomerTimeline> {
  late TextEditingController _activityController;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _activityController = TextEditingController();
  }

  @override
  void dispose() {
    _activityController.dispose();
    super.dispose();
  }

  Future<void> _addActivity(ActivityKind kind) async {
    if (_activityController.text.isEmpty) return;
    
    setState(() => _busy = true);
    try {
      final services = AppScope.of(context);
      await addCrmActivity(
        services,
        widget.customerId,
        kind: kind,
        body: _activityController.text,
      );
      _activityController.clear();
      widget.onRefresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Activity added')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Customer Timeline',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const Divider(),

            // Activities
            if (widget.timeline.activities.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Activities',
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                    const SizedBox(height: 8),
                    ...widget.timeline.activities.take(10).map(
                      (activity) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Chip(
                              label: Text(activity.kind.value),
                              visualDensity: VisualDensity.compact,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(activity.body),
                                  Text(
                                    formatDateTime(activity.createdAt),
                                    style:
                                        Theme.of(context).textTheme.labelSmall,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Add Activity Form
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Add Activity',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  const SizedBox(height: 8),
                  AppField(
                    controller: _activityController,
                    hint: 'Add a note…',
                    multiline: true,
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final kind in ActivityKind.values)
                        AppButton(
                          label: kind.value.toUpperCase(),
                          variant: AppButtonVariant.outline,
                          small: true,
                          onPressed: _busy ? null : () => _addActivity(kind),
                        ),
                    ],
                  ),
                ],
              ),
            ),

            // Payments
            if (widget.timeline.payments.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Payments',
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                    const SizedBox(height: 8),
                    ...widget.timeline.payments.map(
                      (payment) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(payment.planName),
                        subtitle: Text(formatMoney(payment.amount)),
                        trailing: Chip(
                          label: Text(payment.status),
                          backgroundColor: payment.status == 'paid'
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Reports
            if (widget.timeline.reports.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Reports',
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                    const SizedBox(height: 8),
                    ...widget.timeline.reports.map(
                      (report) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(report.bureau),
                        subtitle: Text(formatDateTime(report.requestedAt)),
                        trailing: Chip(
                          label: Text(report.status),
                          backgroundColor: report.status == 'completed'
                              ? Colors.green
                              : Colors.orange,
                        ),
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
