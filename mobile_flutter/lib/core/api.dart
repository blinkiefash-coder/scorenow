import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

class ApiException implements Exception {
  const ApiException(this.message, this.status);

  final String message;
  final int status;

  @override
  String toString() => message;
}

typedef UnauthorizedHandler = void Function(String token);

class ApiClient {
  ApiClient({http.Client? client, this.onUnauthorized})
    : _client = client ?? http.Client();

  final http.Client _client;
  final UnauthorizedHandler? onUnauthorized;

  Future<Map<String, dynamic>> request(
    String method,
    String path, {
    String? token,
    Object? body,
  }) async {
    final response = await _send(method, path, token: token, body: body);
    final decoded = _decode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == 401 && token != null)
        onUnauthorized?.call(token);
      final message = decoded['message'];
      throw ApiException(
        message is String && message.isNotEmpty
            ? message
            : 'Something went wrong. Please try again.',
        response.statusCode,
      );
    }
    return decoded;
  }

  Future<List<int>> download(String path, {required String token}) async {
    final response = await _send('GET', path, token: token);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == 401) onUnauthorized?.call(token);
      throw ApiException(
        'Something went wrong. Please try again.',
        response.statusCode,
      );
    }
    return response.bodyBytes;
  }

  Future<Map<String, dynamic>> postForm(
    String path, {
    required String token,
    required Map<String, String> fields,
    http.MultipartFile? file,
  }) async {
    final request = http.MultipartRequest('POST', Uri.parse('$apiBaseUrl$path'))
      ..headers['Authorization'] = 'Bearer $token'
      ..fields.addAll(fields);
    if (file != null) request.files.add(file);
    final http.Response response;
    try {
      response = await http.Response.fromStream(await _client.send(request));
    } catch (_) {
      throw const ApiException(
        'Unable to reach Scorenow. Check your internet connection.',
        0,
      );
    }
    final decoded = _decode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == 401) onUnauthorized?.call(token);
      final message = decoded['message'];
      throw ApiException(
        message is String && message.isNotEmpty
            ? message
            : 'Something went wrong. Please try again.',
        response.statusCode,
      );
    }
    return decoded;
  }

  Future<http.Response> _send(
    String method,
    String path, {
    String? token,
    Object? body,
  }) async {
    final headers = <String, String>{
      if (body != null) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('$apiBaseUrl$path');
    final encoded = body == null ? null : jsonEncode(body);
    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (encoded != null) request.body = encoded;
      final streamed = await _client.send(request);
      return http.Response.fromStream(streamed);
    } catch (_) {
      throw const ApiException(
        'Unable to reach Scorenow. Check your internet connection.',
        0,
      );
    }
  }

  Map<String, dynamic> _decode(String body) {
    try {
      final value = jsonDecode(body);
      return value is Map<String, dynamic> ? value : <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }
}
