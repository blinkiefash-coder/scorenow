import 'package:scorenow_mobile/core/app_services.dart';

/// Payment API functions for handling Razorpay orders and payments

Future<Map<String, dynamic>> requestPayment(
  AppServices services, {
  required String description,
  required int amountPaise,
  String? orderId,
}) async {
  final response = await services.api.request(
    'POST',
    '/api/payment/request',
    token: services.auth.user!.token,
    body: {
      'description': description,
      'amount_paise': amountPaise,
      if (orderId != null) 'order_id': orderId,
    },
  );
  
  return {
    'order_id': response['order_id'] as String,
    'amount_paise': (response['amount_paise'] as num?)?.toInt() ?? amountPaise,
    'currency': response['currency'] as String? ?? 'INR',
  };
}

Future<void> confirmPayment(
  AppServices services, {
  required String orderId,
  required String razorpayPaymentId,
  required String razorpayOrderId,
  required String razorpaySignature,
}) async {
  await services.api.request(
    'POST',
    '/api/payment/confirm',
    token: services.auth.user!.token,
    body: {
      'order_id': orderId,
      'razorpay_payment_id': razorpayPaymentId,
      'razorpay_order_id': razorpayOrderId,
      'razorpay_signature': razorpaySignature,
    },
  );
}

Future<void> handlePaymentWebhook(
  AppServices services, {
  required String webhookId,
  required String signature,
  required Map<String, dynamic> payload,
}) async {
  await services.api.request(
    'POST',
    '/api/payment/webhook',
    token: services.auth.user?.token,
    body: {
      'webhook_id': webhookId,
      'signature': signature,
      'payload': payload,
    },
  );
}

/// Get Razorpay configuration for initializing the payment gateway
Future<Map<String, dynamic>> getRazorpayConfig(
  AppServices services,
) async {
  final response = await services.api.request(
    'GET',
    '/api/payment/razorpay-config',
    token: services.auth.user?.token,
  );
  
  return {
    'key': response['key'] as String,
    'enabled': response['enabled'] as bool? ?? false,
  };
}
