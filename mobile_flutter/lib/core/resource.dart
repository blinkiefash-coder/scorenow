import 'package:flutter/widgets.dart';
import 'package:scorenow_mobile/widgets/feedback_widgets.dart';

// Loads one API resource and tracks the initial, refresh, and error states.
class ApiResource<T> extends ChangeNotifier {
  ApiResource({required Future<T> Function() fetch}) : _fetch = fetch;

  final Future<T> Function() _fetch;
  int _requestId = 0;

  T? data;
  String error = '';
  bool loading = true;
  bool refreshing = false;

  Future<void> reload() => _load(refresh: false);

  Future<void> refresh() => _load(refresh: true);

  // Rebuilds on every state change: shows the error banner when nothing is loaded yet,
  // otherwise passes the current data (null while loading) to [child].
  Widget builder(Widget Function(BuildContext context, T? data) child) {
    return ListenableBuilder(
      listenable: this,
      builder: (context, _) {
        if (data == null && error.isNotEmpty) {
          return ErrorBanner(message: error, onRetry: () => reload());
        }
        return child(context, data);
      },
    );
  }

  void setData(T value) {
    data = value;
    error = '';
    notifyListeners();
  }

  Future<void> _load({required bool refresh}) async {
    final current = ++_requestId;
    loading = !refresh;
    refreshing = refresh;
    notifyListeners();
    try {
      final result = await _fetch();
      if (current != _requestId) return;
      data = result;
      error = '';
    } catch (caught) {
      if (current != _requestId) return;
      error = caught is Exception ? _messageOf(caught) : 'Unable to load.';
    } finally {
      if (current == _requestId) {
        loading = false;
        refreshing = false;
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    _requestId++;
    super.dispose();
  }
}

String _messageOf(Exception error) {
  final text = error.toString();
  const prefix = 'Exception: ';
  return text.startsWith(prefix) ? text.substring(prefix.length) : text;
}
