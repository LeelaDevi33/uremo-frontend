"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest, setAuthSession } from "@/lib/api";
import { authReturnPath } from "@/lib/authReturnPath";
import { useToast } from "@/hooks/useToast";

// PATCH_54: Eye icons for password visibility
const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.964 7.183.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.964-7.178z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const EyeSlashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

function LoginForm() {
  const next = authReturnPath(useSearchParams().get("next"));
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // PATCH_54: Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);
  // PATCH_54: Field-level errors
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  // PATCH_54: Validate email format
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const validateFields = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    // PATCH_54: Clear previous errors
    setErrors({});

    if (!validateFields()) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("/api/auth/login", "POST", {
        email: email.trim().toLowerCase(),
        password,
      });

      setAuthSession({ token: res.token, user: res.user });
      toast("Login successful!", "success");
      window.location.replace(next || "/dashboard");
    } catch (err: any) {
      // PATCH_54: Better error handling
      const message = err.message || "Login failed";
      const code = err.payload?.code;

      // Map error codes to field-level errors
      if (code === "MISSING_FIELDS") {
        if (!email)
          setErrors((prev) => ({ ...prev, email: "Email is required" }));
        if (!password)
          setErrors((prev) => ({ ...prev, password: "Password is required" }));
      } else if (code === "USER_NOT_FOUND" || code === "BAD_PASSWORD") {
        setErrors({ password: "Invalid email or password" });
      } else if (code === "RATE_LIMITED") {
        toast("Too many attempts. Please try again later.", "error");
      } else if (message.includes("timeout") || message.includes("network")) {
        toast(
          "Connection error. Please check your internet and try again.",
          "error",
        );
      } else {
        toast(message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form noValidate onSubmit={event => { event.preventDefault(); if (!loading) void submit(); }} className="w-full max-w-sm border border-slate-700 rounded-lg p-6 bg-slate-800">
        <h1 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
          <span role="img" aria-label="login">
            🔑
          </span>{" "}
          Login
        </h1>

        <div className="mb-3">
          <label htmlFor="login-email" className="mb-1 block text-sm text-slate-200">Email</label>
          <input
            id="login-email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className={`w-full border p-2 rounded bg-slate-700 text-white placeholder-slate-400 ${
              errors.email ? "border-red-500" : "border-slate-600"
            }`}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email)
                setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={loading}
            autoComplete="email"
          />
          {errors.email && (
            <p id="login-email-error" role="alert" className="text-red-400 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        {/* PATCH_54: Password with visibility toggle */}
        <div className="mb-4">
          <label htmlFor="login-password" className="mb-1 block text-sm text-slate-200">Password</label>
          <div className="relative">
            <input
              id="login-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
              className={`w-full border p-2 pr-10 rounded bg-slate-700 text-white placeholder-slate-400 ${
                errors.password ? "border-red-500" : "border-slate-600"
              }`}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" role="alert" className="text-red-400 text-xs mt-1">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* PATCH_54: Forgot password link */}
        <p className="text-sm mt-3 text-slate-400">
          <a
            href="/forgot-password"
            className="text-indigo-400 hover:underline"
          >
            Forgot password?
          </a>
        </p>

        <p className="text-sm mt-2 text-slate-400">
          Don't have an account?{" "}
          <a href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="text-indigo-400 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<p className="p-6 text-slate-400">Loading login…</p>}>
      <LoginForm />
    </Suspense>
  );
}
