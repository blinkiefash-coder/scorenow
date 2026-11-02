import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/app_button.dart';

enum _Method { upi, card, netbanking }

enum _Stage { select, processing, approved }

// Mirrors the web SimulatedCheckout: the backend auto-approves while the gateway is being activated.
// Resolves to true once the payment is approved, false if the user closes the sheet.
Future<bool> showSimulatedCheckout(
  BuildContext context, {
  required String bureauName,
  required int amount,
}) async {
  final approved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) =>
        _SimulatedCheckoutSheet(bureauName: bureauName, amount: amount),
  );
  return approved ?? false;
}

class _SimulatedCheckoutSheet extends StatefulWidget {
  const _SimulatedCheckoutSheet({
    required this.bureauName,
    required this.amount,
  });

  final String bureauName;
  final int amount;

  @override
  State<_SimulatedCheckoutSheet> createState() =>
      _SimulatedCheckoutSheetState();
}

class _SimulatedCheckoutSheetState extends State<_SimulatedCheckoutSheet> {
  _Method _method = _Method.upi;
  _Stage _stage = _Stage.select;

  Future<void> _pay() async {
    setState(() => _stage = _Stage.processing);
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() => _stage = _Stage.approved);
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final busy = _stage != _Stage.select;
    return PopScope(
      canPop: !busy,
      child: Container(
        padding: EdgeInsets.fromLTRB(
          20,
          16,
          20,
          20 + MediaQuery.paddingOf(context).bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _header(busy),
              const SizedBox(height: 16),
              if (_stage == _Stage.select) ..._selectContent(),
              if (_stage == _Stage.processing)
                _status(
                  const CircularProgressIndicator(),
                  'Processing payment…',
                  null,
                ),
              if (_stage == _Stage.approved)
                _status(
                  const Icon(
                    Icons.check_circle,
                    size: 40,
                    color: AppColors.green,
                  ),
                  'Payment approved',
                  'Fetching your report…',
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(bool busy) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.blue,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Text(
            'S',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 18,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Scorenow',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                  color: AppColors.navy,
                ),
              ),
              Text(
                '${widget.bureauName} credit report',
                style: const TextStyle(fontSize: 12, color: AppColors.muted),
              ),
            ],
          ),
        ),
        Text(
          '₹${widget.amount}',
          style: const TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 16,
            color: AppColors.navy,
          ),
        ),
        if (!busy)
          IconButton(
            onPressed: () => Navigator.of(context).pop(false),
            icon: const Icon(Icons.close, color: AppColors.muted),
            tooltip: 'Close',
          ),
      ],
    );
  }

  List<Widget> _selectContent() {
    const options = [
      (_Method.upi, 'UPI', 'Google Pay, PhonePe, Paytm & more'),
      (_Method.card, 'Card', 'Visa, Mastercard, RuPay'),
      (_Method.netbanking, 'Netbanking', 'All major banks'),
    ];
    return [
      for (final (method, label, hint) in options)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => setState(() => _method = method),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _method == method
                      ? AppColors.buttonBlue
                      : AppColors.line,
                  width: _method == method ? 1.5 : 1,
                ),
                color: _method == method
                    ? const Color(0xFFF1F6FF)
                    : Colors.white,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            color: AppColors.navy,
                          ),
                        ),
                        Text(
                          hint,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_method == method)
                    const Icon(
                      Icons.check_circle,
                      size: 20,
                      color: AppColors.buttonBlue,
                    ),
                ],
              ),
            ),
          ),
        ),
      const SizedBox(height: 8),
      AppButton(label: 'Pay ₹${widget.amount}', onPressed: _pay),
      const SizedBox(height: 12),
      const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.shield_outlined, size: 14, color: AppColors.green),
          SizedBox(width: 6),
          Flexible(
            child: Text(
              'Payments are auto-approved while our payment gateway is being activated. You will not be charged.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppColors.muted),
            ),
          ),
        ],
      ),
    ];
  }

  Widget _status(Widget icon, String title, String? subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          icon,
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 15,
              color: AppColors.navy,
            ),
          ),
          if (subtitle != null)
            Text(
              subtitle,
              style: const TextStyle(fontSize: 12, color: AppColors.muted),
            ),
        ],
      ),
    );
  }
}
