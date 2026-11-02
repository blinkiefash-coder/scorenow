import 'package:http/http.dart' as http;
import 'package:scorenow_mobile/core/api.dart';
import 'package:scorenow_mobile/core/app_services.dart';

const _savedMessage =
    'Your assessment was saved successfully. We will contact you shortly.';

// Sends the assessment a guest filled in before logging in. Returns the message to show.
// The draft is restored on failure so the next visit to the dashboard can retry it.
Future<String> sendPendingAssessment(AppServices services) async {
  final draft = services.pendingAssessment;
  final token = services.auth.customer?.token;
  if (draft == null || token == null) return '';
  services.pendingAssessment = null;
  final report = draft.report;
  try {
    final response = await services.api.postForm(
      '/api/assessments',
      token: token,
      fields: {...draft.fields, 'assessmentType': 'individual'},
      file: report == null
          ? null
          : http.MultipartFile.fromBytes(
              'report',
              report.bytes,
              filename: report.filename,
              contentType: report.contentType,
            ),
    );
    final message = response['message'];
    return message is String && message.isNotEmpty ? message : _savedMessage;
  } on ApiException catch (error) {
    services.pendingAssessment = draft;
    return error.message;
  } catch (_) {
    services.pendingAssessment = draft;
    return 'Unable to send your assessment. We will try again next time you open the app.';
  }
}
