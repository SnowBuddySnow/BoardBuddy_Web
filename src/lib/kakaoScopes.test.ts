import { expect, it } from "vitest";
import { kakaoSignupScopes } from "./kakaoScopes";
it("requests only explicitly configured signup scopes without duplicates", () => {
  expect(
    kakaoSignupScopes(
      " name, gender, phone_number, friends, name, account_email ",
    ),
  ).toBe("name,gender,phone_number");
  expect(kakaoSignupScopes("")).toBeUndefined();
  expect(kakaoSignupScopes("friends")).toBeUndefined();
});
