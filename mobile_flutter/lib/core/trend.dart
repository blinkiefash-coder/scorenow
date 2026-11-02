import '../models/report.dart';

enum TrendDirection { improving, declining, stable }

class TrendPoint {
  const TrendPoint({
    required this.score,
    required this.date,
    required this.estimated,
  });

  final int score;
  final String date;
  final bool estimated;
}

class TrendResult {
  const TrendResult({required this.points, this.direction});

  final List<TrendPoint> points;
  final TrendDirection? direction;
}

const _minScore = 300;
const _maxScore = 900;
const _monthsShown = 6;

int _clamp(num value) => value.round().clamp(_minScore, _maxScore).toInt();

// Estimates earlier months by walking back from the real score. Clean months add points and
// late payments subtract more the higher the late share. The latest point is always the real score.
TrendResult estimateTrend(
  int? current,
  String currentDate,
  List<PaymentMonth> months,
) {
  if (current == null) return const TrendResult(points: []);

  final usable = months.where((item) => item.reported > 0).toList()
    ..sort((a, b) => a.month.compareTo(b.month));
  final shown = usable.length > _monthsShown
      ? usable.sublist(usable.length - _monthsShown)
      : usable;
  if (shown.length < 2) {
    return TrendResult(
      points: [TrendPoint(score: current, date: currentDate, estimated: false)],
    );
  }

  final deltas = shown.map((item) {
    final rate = item.late / item.reported;
    return item.late == 0 ? 3.0 : -(5 + 20 * rate);
  }).toList();

  final scores = List<int>.filled(shown.length, 0);
  scores[shown.length - 1] = current;
  for (var index = shown.length - 2; index >= 0; index -= 1) {
    scores[index] = _clamp(scores[index + 1] - deltas[index + 1]);
  }

  final points = [
    for (var index = 0; index < shown.length; index += 1)
      TrendPoint(
        score: scores[index],
        date: index == shown.length - 1
            ? currentDate
            : '${shown[index].month}-01',
        estimated: index != shown.length - 1,
      ),
  ];

  double rate(List<PaymentMonth> items) {
    final late = items.fold<int>(0, (sum, item) => sum + item.late);
    final reported = items.fold<int>(0, (sum, item) => sum + item.reported);
    return late / (reported < 1 ? 1 : reported);
  }

  final half = shown.length ~/ 2;
  final earlier = rate(shown.sublist(0, half));
  final recent = rate(shown.sublist(half));
  final direction = (recent - earlier).abs() < 0.02
      ? TrendDirection.stable
      : recent < earlier
      ? TrendDirection.improving
      : TrendDirection.declining;

  return TrendResult(points: points, direction: direction);
}
