import 'package:flutter/material.dart';

class VideoScene {
  const VideoScene({
    required this.icon,
    required this.headline,
    required this.caption,
    this.bigText,
  });

  final IconData icon;
  final String headline;
  final String caption;
  final String? bigText;
}

class LearnVideo {
  const LearnVideo({
    required this.title,
    required this.summary,
    required this.scenes,
    this.sceneSeconds = 5,
  });

  final String title;
  final String summary;
  final List<VideoScene> scenes;
  final int sceneSeconds;

  int get totalSeconds => scenes.length * sceneSeconds;

  String get duration {
    final seconds = totalSeconds;
    return '0:${seconds.toString().padLeft(2, '0')}';
  }
}

const learnVideos = <LearnVideo>[
  LearnVideo(
    title: 'What is a CIBIL score?',
    summary: 'How the 300–900 score works and who looks at it.',
    scenes: [
      VideoScene(
        icon: Icons.speed_rounded,
        headline: 'Your credit score',
        caption:
            'A 3-digit number that tells lenders how reliably you repay money.',
        bigText: '300–900',
      ),
      VideoScene(
        icon: Icons.account_balance_rounded,
        headline: 'Who looks at it?',
        caption:
            'Banks and lenders check it before approving loans and credit cards.',
      ),
      VideoScene(
        icon: Icons.thumb_up_alt_rounded,
        headline: 'What is a good score?',
        caption: '750 and above usually gets better approvals and lower rates.',
        bigText: '750+',
      ),
      VideoScene(
        icon: Icons.verified_user_rounded,
        headline: 'Checking is safe',
        caption: 'Looking at your own score never lowers it.',
      ),
    ],
  ),
  LearnVideo(
    title: '5 habits to improve your score',
    summary: 'Practical habits that move your score up.',
    scenes: [
      VideoScene(
        icon: Icons.event_available_rounded,
        headline: '1. Pay on time',
        caption: 'Payment history is the biggest part of your score.',
        bigText: '35%',
      ),
      VideoScene(
        icon: Icons.credit_card_rounded,
        headline: '2. Keep usage low',
        caption: 'Use less than 30% of your credit card limit.',
        bigText: '<30%',
      ),
      VideoScene(
        icon: Icons.hourglass_bottom_rounded,
        headline: '3. Keep old accounts',
        caption: 'A longer credit history builds trust with lenders.',
      ),
      VideoScene(
        icon: Icons.search_off_rounded,
        headline: '4. Avoid too many applications',
        caption: 'Each application adds a hard enquiry to your report.',
      ),
      VideoScene(
        icon: Icons.layers_rounded,
        headline: '5. Mix credit wisely',
        caption: 'A healthy mix of loans and cards helps, when you need them.',
      ),
    ],
  ),
  LearnVideo(
    title: 'Credit utilisation, explained',
    summary: 'Why keeping card usage under 30% matters.',
    scenes: [
      VideoScene(
        icon: Icons.credit_score_rounded,
        headline: 'What is utilisation?',
        caption: 'The share of your credit limit that you are using.',
      ),
      VideoScene(
        icon: Icons.calculate_rounded,
        headline: 'A simple example',
        caption: 'Limit ₹1,00,000 and spend ₹20,000 means 20% utilisation.',
        bigText: '20%',
      ),
      VideoScene(
        icon: Icons.trending_down_rounded,
        headline: 'Lower is better',
        caption: 'Under 30% shows you are not dependent on credit.',
        bigText: '<30%',
      ),
      VideoScene(
        icon: Icons.tips_and_updates_rounded,
        headline: 'Quick tip',
        caption: 'Pay your card before the statement date to show lower usage.',
      ),
    ],
  ),
  LearnVideo(
    title: 'Reading your credit report',
    summary: 'Accounts, enquiries and overdue flags decoded.',
    scenes: [
      VideoScene(
        icon: Icons.description_rounded,
        headline: 'Your report',
        caption: 'A record of every loan and card you have, and how you pay.',
      ),
      VideoScene(
        icon: Icons.account_balance_wallet_rounded,
        headline: 'Accounts',
        caption: 'Check the status, balance and any overdue amount.',
      ),
      VideoScene(
        icon: Icons.manage_search_rounded,
        headline: 'Enquiries',
        caption: 'Lists the lenders who checked your report and when.',
      ),
      VideoScene(
        icon: Icons.warning_amber_rounded,
        headline: 'Overdue flags',
        caption: 'Clear overdue amounts first. They hurt your score the most.',
      ),
    ],
  ),
  LearnVideo(
    title: 'Fix errors in your report',
    summary: 'Raise a dispute and get wrong entries corrected.',
    scenes: [
      VideoScene(
        icon: Icons.error_outline_rounded,
        headline: 'Spot the mistake',
        caption: 'Wrong balances, accounts you do not own, or paid-off loans.',
      ),
      VideoScene(
        icon: Icons.edit_document,
        headline: 'Raise a dispute',
        caption: 'File it with the credit bureau with your supporting proof.',
      ),
      VideoScene(
        icon: Icons.support_agent_rounded,
        headline: 'Lender verifies',
        caption: 'The bureau asks the lender to confirm or correct the entry.',
      ),
      VideoScene(
        icon: Icons.check_circle_rounded,
        headline: 'Report updated',
        caption: 'Usually resolved within 30 days. Your score refreshes.',
        bigText: '30 days',
      ),
    ],
  ),
];

class QuizQuestion {
  const QuizQuestion({
    required this.question,
    required this.options,
    required this.answer,
    required this.explanation,
  });

  final String question;
  final List<String> options;
  final int answer;
  final String explanation;
}

const quizQuestions = <QuizQuestion>[
  QuizQuestion(
    question: 'What is the range of a CIBIL score?',
    options: ['100 – 500', '300 – 900', '0 – 100', '500 – 1000'],
    answer: 1,
    explanation: 'CIBIL scores run from 300 to 900. 750+ is considered good.',
  ),
  QuizQuestion(
    question: 'Which habit helps your score the most?',
    options: [
      'Paying EMIs and bills on time',
      'Applying for many loans at once',
      'Closing all old cards',
      'Maxing out your credit card',
    ],
    answer: 0,
    explanation:
        'Payment history is the biggest factor, so on-time payments matter most.',
  ),
  QuizQuestion(
    question: 'What credit utilisation is generally considered healthy?',
    options: ['Above 90%', 'Around 70%', 'Below 30%', 'Exactly 100%'],
    answer: 2,
    explanation:
        'Using less than 30% of your limit shows you are not over-reliant on credit.',
  ),
  QuizQuestion(
    question: 'What is a "hard enquiry"?',
    options: [
      'Checking your own score',
      'A lender checking your report after you apply for credit',
      'A bank statement request',
      'A KYC update',
    ],
    answer: 1,
    explanation:
        'Lenders trigger hard enquiries when you apply. Many in a short time can lower your score.',
  ),
  QuizQuestion(
    question: 'Does checking your own credit score lower it?',
    options: [
      'Yes, every time',
      'Only on weekends',
      'No, it is a soft enquiry',
      'Only if the score is low',
    ],
    answer: 2,
    explanation: 'Self-checks are soft enquiries and do not affect your score.',
  ),
  QuizQuestion(
    question: 'Why can a long credit history help?',
    options: [
      'It shows a longer track record of repayment',
      'It removes old defaults',
      'It lowers interest rates by law',
      'It has no effect',
    ],
    answer: 0,
    explanation:
        'A longer history gives lenders more evidence of how reliably you repay.',
  ),
  QuizQuestion(
    question: 'What should you do if you spot a wrong entry on your report?',
    options: [
      'Ignore it',
      'Close the account',
      'Raise a dispute with the bureau',
      'Apply for a new loan',
    ],
    answer: 2,
    explanation:
        'Disputing with the bureau and lender gets incorrect entries investigated and fixed.',
  ),
];
