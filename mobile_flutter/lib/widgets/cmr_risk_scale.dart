import 'package:flutter/material.dart';

class CmrRiskScale extends StatelessWidget {
  const CmrRiskScale({super.key, this.rank = 3});

  final int rank;

  @override
  Widget build(BuildContext context) {
    final selectedRank = rank.clamp(1, 10);
    final risk = selectedRank <= 3
        ? 'Low risk'
        : selectedRank <= 7
        ? 'Medium risk'
        : 'High risk';

    return Semantics(
      label: 'Illustrative CMR rank $selectedRank of 10, $risk',
      child: ExcludeSemantics(
        child: Column(
          children: [
            SizedBox(
              height: 38,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Positioned(
                    left: 0,
                    right: 0,
                    top: 8,
                    bottom: 8,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(99),
                        gradient: const LinearGradient(
                          colors: [
                            Color(0xFF08784E),
                            Color(0xFF28B779),
                            Color(0xFFD2C927),
                            Color(0xFFF28A2E),
                            Color(0xFFA9102D),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      for (var value = 1; value <= 10; value++)
                        Expanded(
                          child: Center(
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: value == selectedRank
                                    ? Colors.white
                                    : const Color(0x33233338),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: value == selectedRank ? 3 : 2,
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x26000000),
                                    blurRadius: 4,
                                    offset: Offset(0, 2),
                                  ),
                                ],
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '$value',
                                style: TextStyle(
                                  color: value == selectedRank
                                      ? const Color(0xFF075C3D)
                                      : Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            const Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    'Low Risk',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
                Expanded(
                  flex: 4,
                  child: Text(
                    'Medium Risk',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
                Expanded(
                  flex: 3,
                  child: Text(
                    'High Risk',
                    textAlign: TextAlign.end,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Illustrative CMR scale · Lower ranks indicate lower risk',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 9, color: Color(0xFF6D7B89)),
            ),
          ],
        ),
      ),
    );
  }
}
