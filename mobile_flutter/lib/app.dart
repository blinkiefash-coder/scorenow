import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:scorenow_mobile/core/app_services.dart';
import 'package:scorenow_mobile/core/router.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/dashboard/dashboard_host.dart';
import 'package:scorenow_mobile/widgets/animated_splash.dart';

class ScoreNowApp extends StatefulWidget {
  const ScoreNowApp({super.key, required this.services});

  final AppServices services;

  @override
  State<ScoreNowApp> createState() => _ScoreNowAppState();
}

class _ScoreNowAppState extends State<ScoreNowApp> {
  late final GoRouter _router = createRouter(widget.services);
  bool _splashDone = false;

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = widget.services.auth;
    return AppScope(
      services: widget.services,
      child: DashboardHost(
        services: widget.services,
        child: MaterialApp.router(
          title: 'ScoreNow',
          debugShowCheckedModeBanner: false,
          theme: buildAppTheme(),
          routerConfig: _router,
          builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
            value: SystemUiOverlayStyle.dark,
            child: Stack(
              children: [
                child ?? const SizedBox.shrink(),
                if (!_splashDone)
                  ListenableBuilder(
                    listenable: auth,
                    builder: (context, _) => AnimatedSplash(
                      ready: auth.ready,
                      onDone: () => setState(() => _splashDone = true),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
