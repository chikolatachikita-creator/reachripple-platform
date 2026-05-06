import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { oauthLogin, OAuthProvider } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useToastContext } from "../context/ToastContextGlobal";

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
  facebook: "Facebook",
  apple: "Apple",
};

/**
 * Handles the OAuth redirect callback.
 * Route: /auth/:provider/callback?code=...
 *
 * After the user consents on Google / GitHub / Facebook / Apple, they are
 * redirected here with a `code` query parameter (Apple may also POST it as a
 * form field; we read it from the search params either way). We send it to
 * the backend and log the user in.
 */
const OAuthCallbackPage: React.FC = () => {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { showSuccess, showError } = useToastContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code || !provider) {
      setError("Missing authorization code");
      return;
    }

    if (!(provider in PROVIDER_LABEL)) {
      setError("Invalid OAuth provider");
      return;
    }

    let cancelled = false;

    // Apple posts an optional `user` JSON blob on first sign-in only.
    const userParam = searchParams.get("user");
    let appleExtra: { user?: any } | undefined;
    if (provider === "apple" && userParam) {
      try { appleExtra = { user: JSON.parse(userParam) }; } catch { /* ignore */ }
    }

    (async () => {
      try {
        const user = await oauthLogin(provider as OAuthProvider, code, appleExtra);
        if (!cancelled) {
          authLogin(user as any);
          showSuccess(`Signed in with ${PROVIDER_LABEL[provider as OAuthProvider]}`);
          navigate("/dashboard", { replace: true });
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.response?.data?.message || "OAuth login failed";
          setError(msg);
          showError(msg);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-md text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Authentication Failed</div>
          <p className="text-zinc-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="px-6 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
        <p className="text-zinc-600">Signing you in…</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
