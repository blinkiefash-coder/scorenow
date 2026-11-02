import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/features/landing/landing_page.dart';

void main() {
  testWidgets('shot', (tester) async {
    await tester.runAsync(() async {
      final man = FontLoader('Manrope');
      for (final w in ['ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold']) {
        man.addFont(Future.value(ByteData.sublistView(File('assets/fonts/Manrope-$w.ttf').readAsBytesSync())));
      }
      await man.load();
      final mi = FontLoader('MaterialIcons')
        ..addFont(Future.value(ByteData.sublistView(File('/opt/homebrew/share/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf').readAsBytesSync())));
      await mi.load();
      tester.view.physicalSize = const Size(390 * 2, 21000 * 2);
      tester.view.devicePixelRatio = 2;
      final key = GlobalKey();
      await tester.pumpWidget(
        RepaintBoundary(
          key: key,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: buildAppTheme(),
            home: const GuestHomeScreen(),
          ),
        ),
      );
      await tester.pump(const Duration(seconds: 2));
      await tester.pump(const Duration(seconds: 2));
      final boundary =
          key.currentContext!.findRenderObject() as RenderRepaintBoundary;
      final image = await boundary.toImage(pixelRatio: 2);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      File('/tmp/flutter_full.png').writeAsBytesSync(data!.buffer.asUint8List());
    });
  });
}
