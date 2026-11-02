import 'dart:typed_data';

import 'package:http_parser/http_parser.dart';

const assessmentReportMaxBytes = 10 * 1024 * 1024;
const assessmentReportExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

// Assessment a guest filled in before logging in, kept until the dashboard can send it.
class AssessmentDraft {
  const AssessmentDraft({required this.fields, this.report});

  final Map<String, String> fields;
  final AssessmentReport? report;
}

class AssessmentReport {
  const AssessmentReport({
    required this.filename,
    required this.bytes,
    required this.contentType,
  });

  final String filename;
  final Uint8List bytes;
  final MediaType contentType;
}

// Returns null for extensions outside [assessmentReportExtensions].
MediaType? reportContentType(String extension) {
  switch (extension.toLowerCase()) {
    case 'pdf':
      return MediaType('application', 'pdf');
    case 'jpg':
    case 'jpeg':
      return MediaType('image', 'jpeg');
    case 'png':
      return MediaType('image', 'png');
  }
  return null;
}
