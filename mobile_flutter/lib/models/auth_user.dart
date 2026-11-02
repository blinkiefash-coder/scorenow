class AuthUser {
  const AuthUser({
    required this.id,
    required this.mobile,
    required this.email,
    required this.fullName,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
    id: json['id'] as String,
    mobile: json['mobile'] as String? ?? '',
    email: json['email'] as String?,
    fullName: json['full_name'] as String? ?? '',
  );

  final String id;
  final String mobile;
  final String? email;
  final String fullName;

  Map<String, dynamic> toJson() => {
    'id': id,
    'mobile': mobile,
    'email': email,
    'full_name': fullName,
  };

  AuthUser copyWith({String? mobile, String? email, String? fullName}) =>
      AuthUser(
        id: id,
        mobile: mobile ?? this.mobile,
        email: email ?? this.email,
        fullName: fullName ?? this.fullName,
      );
}
