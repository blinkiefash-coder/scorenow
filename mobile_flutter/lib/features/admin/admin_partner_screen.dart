import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/format.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/features/admin/admin_alert.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/models/admin_crm.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class AdminPartnerScreen extends StatefulWidget {
  const AdminPartnerScreen({super.key});

  @override
  State<AdminPartnerScreen> createState() => _AdminPartnerScreenState();
}

class _AdminPartnerScreenState extends State<AdminPartnerScreen> {
  late final ApiResource<PartnerPageData> _resource;
  bool _started = false;
  String? _selectedPartnerEmail;
  List<PortalCustomer>? _selectedPartnerCustomers;
  bool _loadingCustomers = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(
      fetch: () async {
        final partners = await fetchPartnerAccounts(services);
        final commissions = await fetchCommissions(services);
        return PartnerPageData(
          partners: partners,
          commissions: commissions,
        );
      },
    )..reload();
  }

  @override
  void dispose() {
    _resource.dispose();
    super.dispose();
  }

  Future<void> _selectPartner(String email, String role) async {
    setState(() {
      _selectedPartnerEmail = email;
      _loadingCustomers = true;
    });
    try {
      final services = AppScope.of(context);
      final customers = await fetchPartnerCustomers(
        services,
        email,
        role: role,
      );
      if (mounted) {
        setState(() {
          _selectedPartnerCustomers = customers;
          _loadingCustomers = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingCustomers = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppScreen(
      onRefresh: () => _resource.reload(),
      header: const ScreenHeader(
        title: 'Partner Management',
        subtitle: 'Partners, agents, and commissions',
      ),
      children: [
        AppButton(
          label: 'Live partner monitor',
          variant: AppButtonVariant.outline,
          onPressed: () => context.push('/admin/monitor'),
        ),
        const SizedBox(height: 12),
        _resource.builder(
          (context, data) {
            if (data == null) {
              return const FullScreenLoader(label: 'Loading partners…');
            }
            return SingleChildScrollView(
              child: Column(
                children: [
                  // Commission Summary
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Commission Overview',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Total Commissions: ${formatMoney(data.commissions.fold<num>(0, (sum, c) => sum + c.amountPaise) / 100)}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            Text(
                              'Pending: ${formatMoney(data.commissions.where((c) => c.status == 'pending').fold<num>(0, (sum, c) => sum + c.amountPaise) / 100)}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: Colors.orange),
                            ),
                            Text(
                              'Paid: ${formatMoney(data.commissions.where((c) => c.status == 'paid').fold<num>(0, (sum, c) => sum + c.amountPaise) / 100)}',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: Colors.green),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Partners List
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Partners & Agents (${data.partners.length})',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 12),
                        if (data.partners.isEmpty)
                          const Center(child: Text('No partners found'))
                        else
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: data.partners.length,
                            itemBuilder: (context, index) {
                              final partner = data.partners[index];
                              final isSelected =
                                  _selectedPartnerEmail == partner.email;
                              return _PartnerTile(
                                partner: partner,
                                isSelected: isSelected,
                                onTap: () => _selectPartner(
                                  partner.email,
                                  partner.role,
                                ),
                              );
                            },
                          ),
                      ],
                    ),
                  ),

                  // Selected Partner Details
                  if (_selectedPartnerCustomers != null && !_loadingCustomers)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: _PartnerDetailsCard(
                        customers: _selectedPartnerCustomers!,
                      ),
                    )
                  else if (_loadingCustomers)
                    const Padding(
                      padding: EdgeInsets.all(16),
                      child: BrandSpinner(),
                    ),

                  // Commissions Table
                  if (data.commissions.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Commission History',
                                style:
                                    Theme.of(context).textTheme.titleSmall,
                              ),
                              const SizedBox(height: 12),
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: DataTable(
                                  columns: const [
                                    DataColumn(label: Text('Date')),
                                    DataColumn(label: Text('Amount')),
                                    DataColumn(label: Text('Status')),
                                  ],
                                  rows: data.commissions.take(10).map((comm) {
                                    return DataRow(
                                      cells: [
                                        DataCell(
                                          Text(
                                            formatDateTime(comm.createdAt),
                                          ),
                                        ),
                                        DataCell(
                                          Text(
                                            formatMoney(comm.amountPaise / 100),
                                          ),
                                        ),
                                        DataCell(
                                          Chip(
                                            label: Text(comm.status),
                                            backgroundColor:
                                                comm.status == 'paid'
                                                    ? Colors.green
                                                    : Colors.orange,
                                          ),
                                        ),
                                      ],
                                    );
                                  }).toList(),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}

class PartnerPageData {
  PartnerPageData({
    required this.partners,
    required this.commissions,
  });

  final List<PartnerAccount> partners;
  final List<OwnerCommission> commissions;
}

class _PartnerTile extends StatelessWidget {
  const _PartnerTile({
    required this.partner,
    required this.isSelected,
    required this.onTap,
  });

  final PartnerAccount partner;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: isSelected ? Colors.blue[50] : null,
      child: ListTile(
        onTap: onTap,
        title: Text(partner.fullName),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(partner.email),
            Text('Role: ${partner.role}'),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Chip(
              label: Text(partner.status),
              backgroundColor: partner.status == 'active'
                  ? Colors.green
                  : Colors.grey,
            ),
            Text(
              formatMoney(partner.pendingPaise / 100),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: Colors.orange,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PartnerDetailsCard extends StatelessWidget {
  const _PartnerDetailsCard({required this.customers});

  final List<PortalCustomer> customers;

  @override
  Widget build(BuildContext context) {
    final completed =
        customers.where((c) => c.latestReportStatus == 'completed').length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Referred Customers',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 2,
              children: [
                _StatCard(
                  label: 'Customers',
                  value: '${customers.length}',
                ),
                _StatCard(
                  label: 'Completed',
                  value: '$completed',
                  valueColor: Colors.green,
                ),
                _StatCard(
                  label: 'Paid',
                  value: '${customers.where((c) => c.paid).length}',
                  valueColor: Colors.blue,
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (customers.isEmpty)
              const Center(child: Text('No customers referred'))
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columns: const [
                    DataColumn(label: Text('Customer')),
                    DataColumn(label: Text('Status')),
                  ],
                  rows: customers.take(5).map((c) {
                    return DataRow(
                      cells: [
                        DataCell(Text(c.fullName)),
                        DataCell(
                          Chip(
                            label: Text(c.latestReportStatus ?? 'Pending'),
                            backgroundColor:
                                c.latestReportStatus == 'completed'
                                    ? Colors.green
                                    : Colors.orange,
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    this.valueColor,
  });

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: valueColor,
              ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}
