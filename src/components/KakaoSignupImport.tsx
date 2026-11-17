import { useEffect, useRef, useState } from "react";
import apiClient from "../lib/axios";
import {
  getAccountId,
  getAuthSessionRevision,
  saveTempAccessToken,
} from "../lib/session";
import { setSignupPrefill, type SignupPrefill } from "../lib/signupPrefill";

export default function KakaoSignupImport({
  scopes,
  onImported,
}: {
  scopes: string[];
  onImported: (value: SignupPrefill) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const requested = [
    ...new Set(
      scopes.filter((scope) =>
        ["name", "gender", "phone_number"].includes(scope),
      ),
    ),
  ];
  if (!requested.length) return null;
  const load = () => {
    if (lock.current || !window.Kakao?.isInitialized()) return;
    const accountId = getAccountId();
    const revision = getAuthSessionRevision();
    lock.current = true;
    setBusy(true);
    setError("");
    const valid = () =>
      alive.current &&
      getAccountId() === accountId &&
      getAuthSessionRevision() === revision;
    window.Kakao.Auth.login({
      scope: requested.join(","),
      success: async (auth) => {
        try {
          const response = await apiClient.post(
            "/auth/social/kakao",
            undefined,
            { headers: { Authorization: `Bearer ${auth.access_token}` } },
          );
          if (!valid()) return;
          const data = response.data.data as {
            accountId: number;
            status: string;
            accessToken: string;
            signupPrefill?: SignupPrefill;
          };
          if (
            String(data.accountId) !== accountId ||
            data.status !== "PENDING_PROFILE"
          )
            throw Error("account");
          saveTempAccessToken(data.accessToken);
          setSignupPrefill(data.accountId, data.signupPrefill);
          onImported(data.signupPrefill ?? {});
        } catch {
          if (valid())
            setError("카카오 정보를 받지 못했어요. 직접 입력해 주세요.");
        } finally {
          lock.current = false;
          if (alive.current) setBusy(false);
        }
      },
      fail: () => {
        lock.current = false;
        if (alive.current) {
          setBusy(false);
          setError("추가 동의를 완료하지 않았어요. 직접 입력해 주세요.");
        }
      },
    });
  };
  return (
    <div>
      <button
        type="button"
        onClick={load}
        disabled={busy}
        className="min-h-10 text-xs font-semibold text-[#162660] underline"
      >
        {busy ? "불러오는 중…" : "카카오 정보 불러오기"}
      </button>
      {error && (
        <p role="status" className="text-xs leading-5 text-slate-500">
          {error}
        </p>
      )}
    </div>
  );
}
