import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { oauthLogin } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { useToastContext } from "../context/ToastContextGlobal";

/**
 * Handles the OAuth redirect callback.
 * Route: /auth/:provider/callback?code=...
 *
 * After the user consents on Google/GitHub, they are redirected here with a
 * `code` query parameter. This page sends it to the backend and logs the user in.
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

    if (provider !== "google" && provider !== "github") {
      setError("Invalid OAuth provider");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const user = await oauthLogin(provider, code);
        if (!cancelled) {
          authLogin(user as any);
          showSuccess(`Signed in with ${provider === "google" ? "Google" : "GitHub"}`);
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
