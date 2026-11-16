// The API returns snake_case rows, so these models parse them by hand.
DateTime? _parseDate(Object? value) =>
    value is String ? DateTime.tryParse(value) : null;

class HealthAssessmentRequest {
  final String id;
  final String userId;
  final String fullName;
  final String mobile;
  final String? email;
  final String requestType;
  final String? description;
  final String status;
  final DateTime submittedAt;
  final DateTime? reviewedAt;
  final String? reviewedBy;
  final String? customerName;

  HealthAssessmentRequest({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.mobile,
    this.email,
    required this.requestType,
    this.description,
    required this.status,
    required this.submittedAt,
    this.reviewedAt,
    this.reviewedBy,
    this.customerName,
  });

  factory HealthAssessmentRequest.fromJson(Map<String, dynamic> json) =>
      HealthAssessmentRequest(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        fullName: json['full_name'] as String,
        mobile: json['mobile'] as String,
        email: json['email'] as String?,
        requestType: json['request_type'] as String,
        description: json['description'] as String?,
        status: json['status'] as String,
        submittedAt: _parseDate(json['submitted_at']) ?? DateTime.now(),
        reviewedAt: _parseDate(json['reviewed_at']),
        reviewedBy: json['reviewed_by'] as String?,
        customerName: json['customer_name'] as String?,
      );
}

class Testimonial {
  final String id;
  final String customerName;
  final String? customerImageUrl;
  final int rating;
  final String reviewText;
  final String? resultDescription;
  final bool published;
  final DateTime submittedAt;
  final DateTime? publishedAt;

  Testimonial({
    required this.id,
    required this.customerName,
    this.customerImageUrl,
    required this.rating,
    required this.reviewText,
    this.resultDescription,
    required this.published,
    required this.submittedAt,
    this.publishedAt,
  });

  factory Testimonial.fromJson(Map<String, dynamic> json) => Testimonial(
        id: json['id'] as String,
        customerName: json['customer_name'] as String,
        customerImageUrl: json['customer_image_url'] as String?,
        rating: (json['rating'] as num).toInt(),
        reviewText: json['review_text'] as String,
        resultDescription: json['result_description'] as String?,
        published: json['published'] as bool? ?? false,
        submittedAt: _parseDate(json['submitted_at']) ?? DateTime.now(),
        publishedAt: _parseDate(json['published_at']),
      );
}
