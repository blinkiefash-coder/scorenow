import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'config.dart';

const _nativeMessage =
    'Phone and Google sign-in are not configured on this build. Add the Firebase config files (see README).';

class FirebaseAuthService {
  int? _resendToken;

  bool get isReady {
    try {
      FirebaseAuth.instance;
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<String> sendPhoneCode(String mobile, {bool resend = false}) async {
    final digits = mobile.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) {
      throw const FirebaseFlowException(
        'Enter a valid 10-digit mobile number.',
      );
    }
    final auth = _auth();
    final completer = Completer<String>();
    try {
      await auth.verifyPhoneNumber(
        phoneNumber: '+91$digits',
        forceResendingToken: resend ? _resendToken : null,
        verificationCompleted: (_) {},
        verificationFailed: (error) {
          if (!completer.isCompleted)
            completer.completeError(FirebaseFlowException(_friendly(error)));
        },
        codeSent: (verificationId, token) {
          _resendToken = token;
          if (!completer.isCompleted) completer.complete(verificationId);
        },
        codeAutoRetrievalTimeout: (_) {},
      );
      return await completer.future;
    } on FirebaseAuthException catch (error) {
      throw FirebaseFlowException(_friendly(error));
    }
  }

  Future<String> confirmPhoneCode(String verificationId, String code) async {
    final auth = _auth();
    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: code,
      );
      final result = await auth.signInWithCredential(credential);
      final token = await result.user?.getIdToken();
      if (token == null)
        throw const FirebaseFlowException('Unable to verify the code.');
      return token;
    } on FirebaseAuthException catch (error) {
      throw FirebaseFlowException(_friendly(error));
    }
  }

  Future<String> googleIdToken() async {
    final auth = _auth();
    try {
      final google = GoogleSignIn.instance;
      await google.initialize(
        serverClientId: googleWebClientId.isEmpty ? null : googleWebClientId,
      );
      final account = await google.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null)
        throw const FirebaseFlowException('Google sign-in was cancelled.');
      final result = await auth.signInWithCredential(
        GoogleAuthProvider.credential(idToken: idToken),
      );
      final token = await result.user?.getIdToken();
      if (token == null)
        throw const FirebaseFlowException('Google sign-in was cancelled.');
      return token;
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) {
        throw const FirebaseFlowException('Google sign-in was cancelled.');
      }
      throw FirebaseFlowException(
        error.description ?? 'Google sign-in failed.',
      );
    } on FirebaseAuthException catch (error) {
      throw FirebaseFlowException(_friendly(error));
    }
  }

  FirebaseAuth _auth() {
    try {
      return FirebaseAuth.instance;
    } catch (_) {
      throw const FirebaseFlowException(_nativeMessage);
    }
  }

  String _friendly(FirebaseAuthException error) {
    switch (error.code) {
      case 'invalid-phone-number':
        return 'Enter a valid 10-digit mobile number.';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'invalid-verification-code':
        return 'Incorrect code. Please try again.';
      case 'code-expired':
      case 'session-expired':
        return 'This code has expired. Request a new one.';
      case 'network-request-failed':
        return 'Network error. Check your connection.';
      default:
        return error.message ?? 'Something went wrong. Please try again.';
    }
  }
}

class FirebaseFlowException implements Exception {
  const FirebaseFlowException(this.message);

  final String message;

  @override
  String toString() => message;
}
