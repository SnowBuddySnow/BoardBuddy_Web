const supported = new Set(["name", "gender", "phone_number"]);
/** Only scopes approved and enabled for this Kakao app should be configured. */
export function kakaoSignupScopes(
  configured: string = import.meta.env.VITE_KAKAO_SIGNUP_SCOPES || "",
): string | undefined {
  const scopes = [
    ...new Set(
      configured
        .split(",")
        .map((value) => value.trim())
        .filter((value) => supported.has(value)),
    ),
  ];
  return scopes.length ? scopes.join(",") : undefined;
}
