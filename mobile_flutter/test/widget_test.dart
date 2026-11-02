import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:scorenow_mobile/core/theme.dart';
import 'package:scorenow_mobile/widgets/animated_splash.dart';

void main() {
  testWidgets('animated splash hands off once the minimum time has passed', (tester) async {
    var done = false;
    await tester.pumpWidget(MaterialApp(
      theme: buildAppTheme(),
      home: AnimatedSplash(ready: true, onDone: () => done = true),
    ));
    await tester.pump(const Duration(milliseconds: 2400));
    await tester.pump(const Duration(milliseconds: 500));
    expect(done, isTrue);
    await tester.pumpWidget(const SizedBox());
  });
}
