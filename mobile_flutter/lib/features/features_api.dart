import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/health_assessment.dart';

class HealthAssessmentApi {
  final String baseUrl;
  final String Function() getToken;

  HealthAssessmentApi({required this.baseUrl, required this.getToken});

  Future<HealthAssessmentRequest> submitRequest({
    required String fullName,
    required String mobile,
    required String email,
    required String requestType,
    String? description,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/health-assessment-requests'),
      headers: {
        'Authorization': 'Bearer ${getToken()}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'fullName': fullName,
        'mobile': mobile,
        'email': email,
        'requestType': requestType,
        'description': description,
      }),
    );

    if (response.statusCode == 201) {
      return HealthAssessmentRequest.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to submit health assessment request');
    }
  }

  Future<List<HealthAssessmentRequest>> fetchRequests() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/health-assessment-requests'),
      headers: {'Authorization': 'Bearer ${getToken()}'},
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((e) => HealthAssessmentRequest.fromJson(e)).toList();
    } else {
      throw Exception('Failed to fetch health assessment requests');
    }
  }

  Future<List<HealthAssessmentRequest>> fetchAdminRequests({
    String status = '',
    int limit = 50,
    int offset = 0,
  }) async {
    final uri = Uri.parse('$baseUrl/api/admin/health-assessment-requests').replace(
      queryParameters: {
        if (status.isNotEmpty) 'status': status,
        'limit': limit.toString(),
        'offset': offset.toString(),
      },
    );

    final response = await http.get(
      uri,
      headers: {'Authorization': 'Bearer ${getToken()}'},
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((e) => HealthAssessmentRequest.fromJson(e)).toList();
    } else {
      throw Exception('Failed to fetch admin health assessment requests');
    }
  }

  Future<HealthAssessmentRequest> updateStatus({
    required String requestId,
    required String status,
  }) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/admin/health-assessment-requests/$requestId/status'),
      headers: {
        'Authorization': 'Bearer ${getToken()}',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'status': status}),
    );

    if (response.statusCode == 200) {
      return HealthAssessmentRequest.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to update health assessment status');
    }
  }
}

class TestimonialApi {
  final String baseUrl;
  final String? Function() getToken;

  TestimonialApi({required this.baseUrl, required this.getToken});

  Future<List<Testimonial>> fetchTestimonials({bool publishedOnly = true}) async {
    final response = await http.get(
      Uri.parse(publishedOnly ? '$baseUrl/api/testimonials' : '$baseUrl/api/admin/testimonials?published=false'),
      headers: {
        if (getToken() != null) 'Authorization': 'Bearer ${getToken()}',
      },
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((e) => Testimonial.fromJson(e)).toList();
    } else {
      throw Exception('Failed to fetch testimonials');
    }
  }

  Future<Testimonial> submitTestimonial({
    required String customerName,
    required int rating,
    required String reviewText,
    String? customerImageUrl,
    String? resultDescription,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/testimonials'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'customerName': customerName,
        'rating': rating,
        'reviewText': reviewText,
        'customerImageUrl': customerImageUrl,
        'resultDescription': resultDescription,
      }),
    );

    if (response.statusCode == 201) {
      return Testimonial.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to submit testimonial');
    }
  }

  Future<Testimonial> publishTestimonial(String testimonialId) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/admin/testimonials/$testimonialId/publish'),
      headers: {
        'Authorization': 'Bearer ${getToken()}',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return Testimonial.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to publish testimonial');
    }
  }

  Future<void> deleteTestimonial(String testimonialId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/admin/testimonials/$testimonialId'),
      headers: {'Authorization': 'Bearer ${getToken()}'},
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete testimonial');
    }
  }
}
