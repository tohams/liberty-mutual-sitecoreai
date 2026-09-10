"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { PortalIcon } from "@/components/ui/portal-icon";
import { establishPortalIdentity } from "@/lib/portal-analytics";

export function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          body.error?.message || "Please check your username and password.",
        );
      }
      const bootstrap = await fetch("/api/portal/bootstrap", {
        cache: "no-store",
      });
      if (bootstrap.ok) {
        const profile = await bootstrap.json();
        await establishPortalIdentity(profile.udlIdentity);
      }
      // The known identity must reach the server before the first personalized page request.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/workspace");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "We could not connect. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/login" className="login-brand">
          <Image
            src="/brand/liberty-mutual-horizontal.svg"
            width="186"
            height="52"
            alt="Liberty Mutual"
            priority
          />
        </Link>
        <div className="login-story-content">
          <span className="eyebrow">FOR INDEPENDENT AGENTS</span>
          <h1>
            Great partnerships.
            <br />
            <span>Greater possibilities.</span>
          </h1>
          <p>
            Your expertise. Our commitment. Everything you need to protect your
            clients and grow your agency, together.
          </p>
          <div className="login-pill">
            <span className="online-dot" /> A partner for what&apos;s next
          </div>
        </div>
        <div className="login-art" aria-hidden="true">
          <div className="login-art-line" />
          <span className="art-label">BUILT AROUND YOUR AMBITION</span>
          <div className="art-building art-building-one" />
          <div className="art-building art-building-two" />
          <div className="art-building art-building-three" />
          <div className="art-sun" />
          <div className="art-shield">
            <PortalIcon name="shield" width="70" height="70" />
          </div>
        </div>
        <p className="login-copyright">
          © {new Date().getFullYear()} Liberty Mutual Insurance
        </p>
      </section>
      <section className="login-form-side">
        <div className="login-top-note">
          <PortalIcon name="lock" width="15" /> Secure agent access
        </div>
        <div className="login-form-container">
          <div className="login-welcome-icon">
            <PortalIcon name="briefcase" width="27" height="27" />
          </div>
          <p className="eyebrow">LIBERTY MUTUAL AGENT PORTAL</p>
          <h2>Welcome back.</h2>
          <p className="login-description">
            Let&apos;s move your business forward.
          </p>
          <form onSubmit={login} className="portal-form login-form">
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                placeholder="Enter your username"
                required
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <PortalIcon name="eye" />
                </button>
              </span>
            </label>
            {error && (
              <p className="form-error" role="alert">
                <PortalIcon name="info" />
                {error}
              </p>
            )}
            <button
              type="submit"
              className="button button-primary login-submit"
              disabled={busy}
            >
              {busy ? "Signing you in…" : "Sign in"}
              <PortalIcon name="arrow" />
            </button>
          </form>
          <div className="login-help">
            <PortalIcon name="headset" />
            <div>
              <strong>Need help getting started?</strong>
              <p>
                Contact your agency administrator for access to your workspace.
              </p>
            </div>
          </div>
        </div>
        <div className="login-bottom-links">
          <a
            href="https://www.libertymutual.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Privacy policy
          </a>
          <span>Protecting your clients starts with you.</span>
        </div>
      </section>
    </main>
  );
}

export default LoginScreen;
