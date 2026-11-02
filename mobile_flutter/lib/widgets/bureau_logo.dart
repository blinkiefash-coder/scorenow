import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:scorenow_mobile/models/report.dart';

const bureauLogoAssets = <BureauId, String>{
  BureauId.cibil: 'assets/brand/logo-cibil.png',
  BureauId.equifax: 'assets/brand/logo-equifax.svg',
  BureauId.experian: 'assets/brand/logo-experian-new.svg',
  BureauId.crif: 'assets/brand/logo-crif.png',
};

class BureauLogo extends StatelessWidget {
  const BureauLogo({
    super.key,
    required this.bureau,
    this.fit = BoxFit.contain,
  });

  final BureauId bureau;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final path = bureauLogoAssets[bureau]!;
    if (path.endsWith('.svg')) {
      return SvgPicture.asset(path, fit: fit);
    }
    return Image.asset(path, fit: fit);
  }
}
