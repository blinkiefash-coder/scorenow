import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Login Welcome Popup for Flutter Mobile
/// Shows after successful login, tracks via SharedPreferences to avoid repeat displays
class LoginWelcomePopup extends StatefulWidget {
  final String userName;
  final VoidCallback onClose;
  final VoidCallback? onGetStarted;

  const LoginWelcomePopup({
    Key? key,
    required this.userName,
    required this.onClose,
    this.onGetStarted,
  }) : super(key: key);

  static Future<bool> shouldShow() async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'login_welcome_shown_${DateTime.now().year}-${DateTime.now().month}-${DateTime.now().day}';
    final shown = prefs.getBool(key) ?? false;
    
    if (!shown) {
      await prefs.setBool(key, true);
      return true;
    }
    return false;
  }

  @override
  State<LoginWelcomePopup> createState() => _LoginWelcomePopupState();
}

class _LoginWelcomePopupState extends State<LoginWelcomePopup> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOutCubic),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleClose() {
    _animationController.reverse().then((_) => widget.onClose());
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.all(24),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 40,
                  offset: const Offset(0, 16),
                ),
              ],
            ),
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Welcome icon
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: const Color(0xFF356BBB).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: const Icon(
                        Icons.check_circle,
                        color: Color(0xFF356BBB),
                        size: 32,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Welcome message
                    Text(
                      'Welcome back, ${widget.userName}!',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF10234E),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Description
                    Text(
                      'Your account is ready and secure. You can now access your credit profile, reports, and personalized recommendations.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[600],
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Features list
                    ...[
                      ('📊', 'View Your Credit Profile', 'Track your credit score and see what\'s helping or holding you back'),
                      ('📄', 'Access Your Reports', 'Download your detailed credit reports from all major bureaus'),
                      ('💡', 'Get Personalized Guidance', 'Follow expert tips tailored to improve your credit health'),
                    ].map((feature) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF6F9FD),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                feature.$1,
                                style: const TextStyle(fontSize: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      feature.$2,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF10234E),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      feature.$3,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey[600],
                                        height: 1.4,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),

                    const SizedBox(height: 24),

                    // CTA Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          _handleClose();
                          widget.onGetStarted?.call();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF356BBB),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Text(
                          'Get started',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
