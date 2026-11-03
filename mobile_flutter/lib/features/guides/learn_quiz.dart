import 'package:flutter/material.dart';
import 'package:scorenow_mobile/core/content/learn_content.dart';
import 'package:scorenow_mobile/core/theme.dart';

class LearnQuiz extends StatefulWidget {
  const LearnQuiz({super.key});

  @override
  State<LearnQuiz> createState() => _LearnQuizState();
}

class _LearnQuizState extends State<LearnQuiz> {
  bool _started = false;
  int _index = 0;
  int _score = 0;
  int? _picked;

  void _start() => setState(() {
    _started = true;
    _index = 0;
    _score = 0;
    _picked = null;
  });

  void _pick(int option) {
    if (_picked != null) return;
    setState(() {
      _picked = option;
      if (option == quizQuestions[_index].answer) _score++;
    });
  }

  void _next() => setState(() {
    _index++;
    _picked = null;
  });

  @override
  Widget build(BuildContext context) {
    if (!_started) return _Intro(onStart: _start);
    if (_index >= quizQuestions.length) {
      return _Result(score: _score, onRetry: _start);
    }
    final question = quizQuestions[_index];
    final answered = _picked != null;
    final last = _index == quizQuestions.length - 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text(
              'Question ${_index + 1} of ${quizQuestions.length}',
              style: const TextStyle(
                color: AppColors.muted,
                fontWeight: FontWeight.w600,
              ),
            ),
            const Spacer(),
            Text(
              'Score $_score',
              style: const TextStyle(
                color: AppColors.blue,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: (_index + (answered ? 1 : 0)) / quizQuestions.length,
            minHeight: 8,
            backgroundColor: AppColors.cardBorder,
            color: AppColors.blue,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            boxShadow: AppShadow.card,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                question.question,
                style: const TextStyle(
                  color: AppColors.navy,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 14),
              for (final (i, option) in question.options.indexed)
                _Option(
                  label: option,
                  state: !answered
                      ? _OptionState.idle
                      : i == question.answer
                      ? _OptionState.correct
                      : i == _picked
                      ? _OptionState.wrong
                      : _OptionState.idle,
                  onTap: () => _pick(i),
                ),
              if (answered) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.sky,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.lightbulb_outline_rounded,
                        size: 18,
                        color: AppColors.blue,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          question.explanation,
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 50,
          child: FilledButton(
            style: FilledButton.styleFrom(shape: const StadiumBorder()),
            onPressed: answered ? _next : null,
            child: Text(last ? 'See result' : 'Next question'),
          ),
        ),
      ],
    );
  }
}

enum _OptionState { idle, correct, wrong }

class _Option extends StatelessWidget {
  const _Option({
    required this.label,
    required this.state,
    required this.onTap,
  });

  final String label;
  final _OptionState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = switch (state) {
      _OptionState.correct => AppColors.green,
      _OptionState.wrong => AppColors.red,
      _OptionState.idle => AppColors.cardBorder,
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: state == _OptionState.idle
                ? Colors.white
                : color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(color: color, width: 1.5),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (state == _OptionState.correct)
                const Icon(Icons.check_circle, color: AppColors.green),
              if (state == _OptionState.wrong)
                const Icon(Icons.cancel, color: AppColors.red),
            ],
          ),
        ),
      ),
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro({required this.onStart});

  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0B3C9C), Color(0xFF1B5FD6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.quiz_rounded, color: Colors.white, size: 40),
          const SizedBox(height: 12),
          const Text(
            'Credit knowledge test',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${quizQuestions.length} quick questions. See how much you know about credit scores and get tips after every answer.',
            style: const TextStyle(color: Colors.white70, height: 1.4),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.navy,
                shape: const StadiumBorder(),
              ),
              onPressed: onStart,
              child: const Text('Start test'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Result extends StatelessWidget {
  const _Result({required this.score, required this.onRetry});

  final int score;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final total = quizQuestions.length;
    final ratio = score / total;
    final (title, text, color) = ratio >= 0.8
        ? (
            'Credit pro!',
            'You know your credit basics really well.',
            AppColors.green,
          )
        : ratio >= 0.5
        ? (
            'Good start',
            'A few more guides and videos and you will be set.',
            AppColors.gold,
          )
        : (
            'Keep learning',
            'Check the guides and videos, then try again.',
            AppColors.red,
          );
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        boxShadow: AppShadow.card,
      ),
      child: Column(
        children: [
          Container(
            width: 110,
            height: 110,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.12),
              border: Border.all(color: color, width: 4),
            ),
            child: Text(
              '$score/$total',
              style: TextStyle(
                color: color,
                fontSize: 28,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              color: AppColors.navy,
              fontSize: 22,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: FilledButton(
              style: FilledButton.styleFrom(shape: const StadiumBorder()),
              onPressed: onRetry,
              child: const Text('Try again'),
            ),
          ),
        ],
      ),
    );
  }
}
