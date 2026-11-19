import { useEffect, useRef, useState } from "react";
import {
  confirmSignupSchoolEmail,
  getSignupSchoolEmail,
  requestSignupSchoolEmail,
} from "../services/schoolEmailVerification";
import { getApiErrorMessage, getApiErrorStatus } from "../lib/apiError";
import { getAccountId } from "../lib/session";

export interface VerifiedSignupEmail {
  challengeId: string;
  schoolId: number;
  email: string;
  expiresAt: number;
}

export default function SignupSchoolEmailVerification({
  schoolId,
  email,
  supported,
  disabled,
  onVerified,
  proof,
}: {
  schoolId: number;
  email: string;
  supported: boolean;
  disabled?: boolean;
  proof?: VerifiedSignupEmail | null;
  onVerified: (proof: VerifiedSignupEmail | null) => void;
}) {
  const [challenge, setChallenge] = useState<string>();
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const identity = `${getAccountId()}:${schoolId}:${email.trim().toLowerCase()}`;
  const current = useRef(identity);
  current.current = identity;
  const notify = useRef(onVerified);
  notify.current = onVerified;
  const lock = useRef(false);
  useEffect(() => {
    setError("");
    if (
      proof &&
      proof.schoolId === schoolId &&
      proof.email === email.trim().toLowerCase() &&
      proof.expiresAt > Date.now()
    ) {
      setChallenge(proof.challengeId);
      setExpiresAt(proof.expiresAt);
      setVerified(true);
      return;
    }
    setChallenge(undefined);
    setCode("");
    setVerified(false);
    setRetryAt(0);
    setExpiresAt(0);
    notify.current(null);
  }, [identity, proof, schoolId, email]);
  useEffect(() => {
    if (!retryAt && !expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [retryAt, expiresAt]);
  useEffect(() => {
    if (expiresAt && now >= expiresAt) {
      setVerified(false);
      notify.current(null);
      setChallenge(undefined);
      setExpiresAt(0);
      setError("인증 시간이 지났습니다. 다시 인증해 주세요.");
    }
  }, [expiresAt, now]);
  const accept = (id: string) => {
    setVerified(true);
    notify.current({
      challengeId: id,
      schoolId,
      email: email.trim().toLowerCase(),
      expiresAt,
    });
    setError("");
  };
  useEffect(() => {
    if (!challenge || verified) return;
    let cancelled = false;
    const key = identity;
    const refresh = () => {
      void getSignupSchoolEmail(challenge)
        .then((result) => {
          if (!cancelled && key === current.current && result.verified) {
            setVerified(true);
            notify.current({
              challengeId: result.challengeId,
              schoolId,
              email: email.trim().toLowerCase(),
              expiresAt,
            });
            setError("");
          }
        })
        .catch(() => undefined);
    };
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, [challenge, verified, identity, schoolId, email, expiresAt]);
  const send = async () => {
    if (disabled || lock.current || Date.now() < retryAt) return;
    const key = identity;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await requestSignupSchoolEmail(schoolId, email.trim());
      if (key !== current.current) return;
      setChallenge(result.challengeId);
      setCode("");
      setNow(Date.now());
      setRetryAt(Date.now() + result.retryAfterSeconds * 1000);
      setExpiresAt(Date.now() + result.expiresInSeconds * 1000);
    } catch (cause) {
      if (key === current.current)
        setError(
          getApiErrorStatus(cause) === 503
            ? "지금은 이메일 인증을 사용할 수 없어요. 이메일을 지우고 가입할 수 있어요."
            : getApiErrorMessage(cause) || "인증 메일을 보내지 못했습니다.",
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const confirm = async () => {
    if (disabled || lock.current || !challenge || code.length !== 6) return;
    const key = identity;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await confirmSignupSchoolEmail(challenge, code);
      if (key === current.current && result.verified)
        accept(result.challengeId);
    } catch (cause) {
      if (key === current.current)
        setError(getApiErrorMessage(cause) || "인증번호를 확인해 주세요.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (!email.trim()) return null;
  return (
    <section aria-label="가입 전 학교 이메일 인증" className="mt-2 space-y-2">
      {!supported ? (
        <p className="text-xs text-slate-500">
          이 학교는 아직 이메일 인증을 지원하지 않아요.
        </p>
      ) : verified ? (
        <p role="status" className="text-xs font-semibold text-emerald-700">
          학교 이메일 인증 완료
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => void send()}
            disabled={
              disabled ||
              busy ||
              now < retryAt ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            }
            className="min-h-10 text-xs font-semibold text-[#162660] underline disabled:opacity-50"
          >
            {busy
              ? "확인 중…"
              : now < retryAt
                ? `${Math.ceil((retryAt - now) / 1000)}초 후 재전송`
                : challenge
                  ? "인증 메일 다시 보내기"
                  : "학교 이메일 인증"}
          </button>
          {challenge && (
            <div>
              <label
                htmlFor="signup-school-code"
                className="text-xs text-slate-600"
              >
                이메일 인증번호
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="signup-school-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={busy || disabled}
                  placeholder="6자리 인증번호"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-base"
                />
                <button
                  type="button"
                  onClick={() => void confirm()}
                  disabled={busy || disabled || code.length !== 6}
                  className="h-11 rounded-xl bg-[#162660] px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  이메일 확인
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-xs leading-5 text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
