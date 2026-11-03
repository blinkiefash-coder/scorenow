import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:scorenow_mobile/core/content/learn_content.dart';
import 'package:scorenow_mobile/core/theme.dart';

class VideoPlayerPage extends StatefulWidget {
  const VideoPlayerPage({super.key, required this.video, required this.colors});

  final LearnVideo video;
  final List<Color> colors;

  @override
  State<VideoPlayerPage> createState() => _VideoPlayerPageState();
}

class _VideoPlayerPageState extends State<VideoPlayerPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  final FlutterTts _tts = FlutterTts();
  int _spokenScene = -1;
  bool _muted = false;

  Future<void> _setupVoice() async {
    await _tts.setLanguage('en-IN');
    await _tts.setSpeechRate(0.45);
    await _tts.setPitch(1.0);
    _speakScene();
  }

  void _speakScene() {
    if (_muted || !_controller.isAnimating) return;
    final scene = widget.video.scenes[_sceneIndex];
    _spokenScene = _sceneIndex;
    _tts.stop();
    _tts.speak('${scene.headline}. ${scene.caption}');
  }

  void _toggleMute() {
    setState(() => _muted = !_muted);
    if (_muted) {
      _tts.stop();
    } else {
      _speakScene();
    }
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: Duration(seconds: widget.video.totalSeconds),
    )..forward();
    _controller.addListener(() {
      if (_sceneIndex != _spokenScene && _controller.isAnimating) {
        _speakScene();
      }
      setState(() {});
    });
    _setupVoice();
  }

  @override
  void dispose() {
    _tts.stop();
    _controller.dispose();
    super.dispose();
  }

  int get _sceneIndex {
    final count = widget.video.scenes.length;
    return (_controller.value * count).floor().clamp(0, count - 1);
  }

  bool get _finished => _controller.isCompleted;

  void _togglePlay() {
    if (_finished) {
      _spokenScene = -1;
      _controller.forward(from: 0);
    } else if (_controller.isAnimating) {
      _controller.stop();
      _tts.stop();
    } else {
      _controller.forward();
      _spokenScene = -1;
      _speakScene();
    }
    setState(() {});
  }

  void _seekScene(int index) {
    final count = widget.video.scenes.length;
    _controller.value = index.clamp(0, count - 1) / count;
    if (!_controller.isAnimating) _controller.forward();
    _spokenScene = -1;
    _speakScene();
  }

  @override
  Widget build(BuildContext context) {
    final video = widget.video;
    final scene = video.scenes[_sceneIndex];
    final count = video.scenes.length;
    final playing = _controller.isAnimating;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        title: Text(
          video.title,
          style: const TextStyle(
            color: AppColors.navy,
            fontWeight: FontWeight.w800,
            fontSize: 17,
          ),
        ),
        backgroundColor: AppColors.bg,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.navy),
        actions: [
          IconButton(
            tooltip: _muted ? 'Unmute voice' : 'Mute voice',
            onPressed: _toggleMute,
            icon: Icon(
              _muted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: AspectRatio(
              aspectRatio: 16 / 11,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: widget.colors,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                    ),
                  ),
                  Positioned(
                    right: -50,
                    top: -50,
                    child: Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                  ),
                  Positioned(
                    left: -40,
                    bottom: -60,
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.08),
                      ),
                    ),
                  ),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 450),
                    transitionBuilder: (child, animation) => FadeTransition(
                      opacity: animation,
                      child: ScaleTransition(
                        scale: Tween(begin: 0.92, end: 1.0).animate(animation),
                        child: child,
                      ),
                    ),
                    child: _SceneView(key: ValueKey(_sceneIndex), scene: scene),
                  ),
                  Positioned(
                    left: 12,
                    right: 12,
                    top: 12,
                    child: Row(
                      children: [
                        for (var i = 0; i < count; i++)
                          Expanded(
                            child: Container(
                              height: 4,
                              margin: const EdgeInsets.symmetric(horizontal: 2),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: (_controller.value * count - i)
                                    .clamp(0.0, 1.0),
                                child: DecoratedBox(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                iconSize: 30,
                color: AppColors.navy,
                onPressed: () => _seekScene(_sceneIndex - 1),
                icon: const Icon(Icons.skip_previous_rounded),
              ),
              const SizedBox(width: 8),
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.buttonBlue,
                  shape: BoxShape.circle,
                  boxShadow: AppShadow.card,
                ),
                child: IconButton(
                  iconSize: 34,
                  color: Colors.white,
                  onPressed: _togglePlay,
                  icon: Icon(
                    _finished
                        ? Icons.replay_rounded
                        : playing
                        ? Icons.pause_rounded
                        : Icons.play_arrow_rounded,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                iconSize: 30,
                color: AppColors.navy,
                onPressed: _sceneIndex >= count - 1
                    ? null
                    : () => _seekScene(_sceneIndex + 1),
                icon: const Icon(Icons.skip_next_rounded),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Scene ${_sceneIndex + 1} of $count · ${video.duration}',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              boxShadow: AppShadow.card,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'In this video',
                  style: TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 10),
                for (final (i, item) in video.scenes.indexed)
                  InkWell(
                    onTap: () => _seekScene(i),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: i == _sceneIndex
                                  ? AppColors.buttonBlue
                                  : AppColors.sky,
                              shape: BoxShape.circle,
                            ),
                            child: Text(
                              '${i + 1}',
                              style: TextStyle(
                                color: i == _sceneIndex
                                    ? Colors.white
                                    : AppColors.blue,
                                fontWeight: FontWeight.w800,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              item.headline,
                              style: TextStyle(
                                color: AppColors.navy,
                                fontWeight: i == _sceneIndex
                                    ? FontWeight.w800
                                    : FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SceneView extends StatelessWidget {
  const _SceneView({super.key, required this.scene});

  final VideoScene scene;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(22, 28, 22, 18),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(scene.icon, color: Colors.white, size: 34),
          ),
          const SizedBox(height: 12),
          if (scene.bigText != null)
            Text(
              scene.bigText!,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 38,
                fontWeight: FontWeight.w800,
              ),
            ),
          Text(
            scene.headline,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 19,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            scene.caption,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
