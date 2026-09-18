"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Code2, LockKeyhole } from "lucide-react";
export function WorkshopLogin({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/workshops/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.get("username"),
          password: data.get("password"),
          returnTo,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          response.status === 401
            ? "That username or password is incorrect. Please try again."
            : response.status === 429
              ? "Too many attempts. Please wait a few minutes and try again."
              : "Sign-in is temporarily unavailable. Please try again.",
        );
        setBusy(false);
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    } catch {
      setError("We could not connect. Check your connection and try again.");
      setBusy(false);
    }
  }
  return (
    <main className="workshop-app workshop-login">
      <section className="workshop-login-story">
        <div className="workshop-login-wordmark">
          Liberty Mutual <span>×</span> SitecoreAI
        </div>
        <span className="workshop-eyebrow">THE WORKSHOP GUIDE</span>
        <h1>
          Explore.
          <br />
          Build.
          <br />
          <em>Make it yours.</em>
        </h1>
        <p>
          A clear path through the agent experience and the platform behind it.
          Follow each walkthrough at your own pace.
        </p>
        <div className="workshop-login-tracks">
          <span>
            <BookOpen size={20} />
            Marketing
          </span>
          <span>
            <Code2 size={20} />
            Development & architecture
          </span>
        </div>
        <span className="workshop-login-footnote">
          Prepared for Liberty Mutual · September 2026
        </span>
      </section>
      <section className="workshop-login-form">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/liberty-mutual-horizontal.svg"
            alt="Liberty Mutual Insurance"
            width="190"
            height="62"
          />
          <div className="workshop-lock">
            <LockKeyhole size={20} />
          </div>
          <h2>Welcome to the workshop</h2>
          <p>Sign in with your assigned workshop username and password.</p>
          <form onSubmit={submit}>
            <label htmlFor="workshop-username">Workshop username</label>
            <input
              id="workshop-username"
              name="username"
              autoComplete="username"
              placeholder="For example, daniel.02"
              required
              maxLength={80}
              autoCapitalize="none"
              spellCheck={false}
            />
            <label htmlFor="workshop-password">Password</label>
            <input
              id="workshop-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
            {error && (
              <p className="workshop-form-error" role="alert">
                {error}
              </p>
            )}
            <button className="workshop-primary" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Open workshop guide"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="workshop-login-help">
            Use any persona in your assigned reviewer pack. Your guide sign-in
            is separate from your Agent Portal sign-in.
          </p>
        </div>
      </section>
    </main>
  );
}
