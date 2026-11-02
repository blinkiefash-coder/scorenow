import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/resource.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/admin/admin_alert.dart';
import 'package:scorenow_mobile/features/admin/admin_api.dart';
import 'package:scorenow_mobile/features/admin/admin_customer_card.dart';
import 'package:scorenow_mobile/models/support.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';
import 'package:scorenow_mobile/widgets/app_field.dart';
import 'package:scorenow_mobile/widgets/app_scaffold.dart';
import 'package:scorenow_mobile/widgets/brand_spinner.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

class AdminCustomersScreen extends StatefulWidget {
  const AdminCustomersScreen({super.key});

  @override
  State<AdminCustomersScreen> createState() => _AdminCustomersScreenState();
}

class _AdminCustomersScreenState extends State<AdminCustomersScreen> {
  final _search = TextEditingController();
  late final ApiResource<AdminCustomerPage> _resource;
  Timer? _debounce;
  bool _started = false;
  String _query = '';
  int _page = 1;
  String? _updatingId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final services = AppScope.of(context);
    _resource = ApiResource(
      fetch: () async => AdminCustomerPage.fromJson(
        await adminRequest(
          services,
          'GET',
          '/api/admin/customers?q=${Uri.encodeComponent(_query)}&page=$_page',
        ),
      ),
    )..reload();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
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

  void _goToPage(int page) {
    _page = page;
    _resource.reload();
  }

  Future<void> _toggleStatus(AdminCustomer customer) async {
    final services = AppScope.of(context);
    final blocking = customer.status != 'blocked';
    final next = blocking ? 'blocked' : 'active';
    final confirmed = await confirmAdminAction(
      context,
      title: blocking ? 'Block customer' : 'Unblock customer',
      message: blocking
          ? '${customer.fullName} will no longer be able to sign in'
          : '${customer.fullName} will be able to sign in again',
      confirmLabel: blocking ? 'Block' : 'Unblock',
      destructive: blocking,
    );
    if (!confirmed || !mounted) return;
    setState(() => _updatingId = customer.id);
    try {
      await adminRequest(
        services,
        'PATCH',
        '/api/admin/customers/${customer.id}/status',
        body: {'status': next},
      );
      _applyStatus(customer.id, next);
    } catch (caught) {
      if (mounted) {
        await showAdminAlert(
          context,
          title: 'Customer',
          message: caught is ApiException
              ? caught.message
              : 'Unable to update customer.',
        );
      }
    } finally {
      if (mounted) setState(() => _updatingId = null);
    }
  }

  void _applyStatus(String id, String status) {
    final current = _resource.data;
    if (current == null) return;
    _resource.setData(
      AdminCustomerPage(
        customers: [
          for (final item in current.customers)
            item.id == id ? _withStatus(item, status) : item,
        ],
        page: current.page,
        pageSize: current.pageSize,
        total: current.total,
      ),
    );
  }

  AdminCustomer _withStatus(AdminCustomer item, String status) => AdminCustomer(
    id: item.id,
    fullName: item.fullName,
    mobile: item.mobile,
    email: item.email,
    status: status,
    createdAt: item.createdAt,
    panLast4: item.panLast4,
    kycStatus: item.kycStatus,
    totalPayments: item.totalPayments,
    paidPayments: item.paidPayments,
    latestReportStatus: item.latestReportStatus,
    lastLogin: item.lastLogin,
    journeyStage: item.journeyStage,
  );

  @override
  Widget build(BuildContext context) {
    final role = AppScope.of(context).auth.admin?.role ?? '';
    final canManage = role == 'owner' || role == 'manager';
    return ListenableBuilder(
      listenable: _resource,
      builder: (context, _) {
        final data = _resource.data;
        return AppScreen(
          onRefresh: _resource.refresh,
          header: ScreenHeader(
            title: 'Customers',
            subtitle: '${data?.total ?? 0} total',
          ),
          children: [
            AppField(
              controller: _search,
              hint: 'Search name, mobile, email or PAN',
              textInputAction: TextInputAction.search,
              onChanged: _onSearchChanged,
            ),
            const SizedBox(height: 4),
            if (_resource.error.isNotEmpty)
              ErrorBanner(message: _resource.error, onRetry: _resource.reload),
            if (data == null && _resource.loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: BrandSpinner(size: 40)),
              )
            else if (data != null) ...[
              if (data.customers.isEmpty)
                const EmptyState(title: 'No customers found')
              else
                for (final customer in data.customers)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: AdminCustomerCard(
                      customer: customer,
                      canManage: canManage,
                      updating: _updatingId == customer.id,
                      onToggleStatus: () => _toggleStatus(customer),
                    ),
                  ),
              _pager(data),
            ],
          ],
        );
      },
    );
  }

  Widget _pager(AdminCustomerPage data) {
    final pages = math.max(1, (data.total / data.pageSize).ceil());
    if (pages <= 1) return const SizedBox.shrink();
    final busy = _resource.loading;
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          AppButton(
            label: 'Previous',
            variant: AppButtonVariant.outline,
            small: true,
            expanded: false,
            onPressed: data.page > 1 && !busy
                ? () => _goToPage(data.page - 1)
                : null,
          ),
          Expanded(
            child: Text(
              'Page ${data.page} of $pages',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          AppButton(
            label: 'Next',
            variant: AppButtonVariant.outline,
            small: true,
            expanded: false,
            onPressed: data.page < pages && !busy
                ? () => _goToPage(data.page + 1)
                : null,
          ),
        ],
      ),
    );
  }
}
