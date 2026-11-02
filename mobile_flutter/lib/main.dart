import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:scorenow_mobile/app.dart';
import 'package:scorenow_mobile/core/app_services.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('en_IN');
  // Firebase config files are not in the repo; without them phone and Google sign-in fail at call time.
  try {
    await Firebase.initializeApp();
  } catch (error) {
    debugPrint('Firebase not configured: $error');
  }
  final services = AppServices.create();
  runApp(ScoreNowApp(services: services));
  unawaited(services.auth.restore());
}
