import 'package:json_annotation/json_annotation.dart';

part 'health_assessment.g.dart';

@JsonSerializable()
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
      _$HealthAssessmentRequestFromJson(json);

  Map<String, dynamic> toJson() => _$HealthAssessmentRequestToJson(this);
}

@JsonSerializable()
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

  factory Testimonial.fromJson(Map<String, dynamic> json) =>
      _$TestimonialFromJson(json);

  Map<String, dynamic> toJson() => _$TestimonialToJson(this);
}

@JsonSerializable()
class ServicePlan {
  final String name;
  final String audience;
  final String duration;
  final String originalPrice;
  final String offerPrice;
  final bool featured;
  final List<String> features;

  ServicePlan({
    required this.name,
    required this.audience,
    required this.duration,
    required this.originalPrice,
    required this.offerPrice,
    this.featured = false,
    required this.features,
  });

  factory ServicePlan.fromJson(Map<String, dynamic> json) =>
      _$ServicePlanFromJson(json);

  Map<String, dynamic> toJson() => _$ServicePlanToJson(this);
}
