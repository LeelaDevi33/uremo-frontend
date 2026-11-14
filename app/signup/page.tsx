"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, apiRequest, setAuthSession } from "@/lib/api";
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

// PATCH_54: Password strength checker
const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (p: string) => p.length >= 8,
  },
  {
    id: "upper",
    label: "Uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "Lowercase letter",
    test: (p: string) => /[a-z]/.test(p),
  },
  { id: "number", label: "Number", test: (p: string) => /\d/.test(p) },
  {
    id: "special",
    label: "Special character (!@#$%^&*)",
    test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  },
];

// PATCH_23: Inner component that uses useSearchParams
function SignupForm() {
  const searchParams = useSearchParams();
  const next = authReturnPath(searchParams.get("next"));
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // PATCH_54: Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // PATCH_54: Field-level errors
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const referralCode = searchParams.get("ref")?.trim().toUpperCase() || "";

  // PATCH_54: Password strength validation
  const passwordStrength = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));
  const isPasswordStrong = passwordStrength.every((r) => r.passed);

  // PATCH_54: Validate email format
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const validateFields = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isPasswordStrong) {
      newErrors.password = "Password does not meet requirements";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    setErrors({});

    if (!validateFields()) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("/api/auth/signup", "POST", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        // PATCH_23: Include referral code
        referralCode: referralCode || undefined,
      });

      setAuthSession({
        token: res.token,
        user: res.user || { role: "user", email },
      });
      toast("Account created successfully!", "success");
      window.location.replace(next || "/dashboard");
    } catch (err) {
      // PATCH_54: Better error handling
      const message = err instanceof Error && err.message ? err.message : "Signup failed";
      const payload = err instanceof ApiError ? err.payload : null;
      const code = payload && typeof payload === "object" && "code" in payload ? payload.code : undefined;

      if (code === "EMAIL_EXISTS") {
        setErrors({ email: "An account with this email already exists" });
      } else if (code === "PHONE_EXISTS") {
        toast("An account with this phone number already exists", "error");
      } else if (code === "WEAK_PASSWORD") {
        setErrors({ password: "Password does not meet requirements" });
      } else if (code === "INVALID_EMAIL") {
        setErrors({ email: "Please enter a valid email address" });
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
    <form noValidate onSubmit={event => { event.preventDefault(); if (!loading) void submit(); }} className="w-full max-w-sm border border-slate-700 rounded-lg p-6 bg-slate-800">
      <h1 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
        <span role="img" aria-label="signup">
          🚀
        </span>{" "}
        Create account
      </h1>

      {/* PATCH_23: Show referral indicator */}
      {referralCode && (
        <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <p className="text-sm text-purple-200">
            Referral code:{" "}
            <span className="font-mono font-bold">{referralCode}</span>
          </p>
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="signup-name" className="block text-sm font-medium mb-1 text-slate-300">
          Full Name
        </label>
        <input
          type="text"
          id="signup-name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "signup-name-error" : undefined}
          placeholder="Full Name"
          className={`w-full border p-2 rounded bg-slate-700 text-white placeholder-slate-400 ${
            errors.name ? "border-red-500" : "border-slate-600"
          }`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name)
              setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          disabled={loading}
          autoComplete="name"
        />
        {errors.name && (
          <p id="signup-name-error" role="alert" className="text-red-400 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor="signup-email" className="block text-sm font-medium mb-1 text-slate-300">
          Email
        </label>
        <input
          className={`w-full border p-2 rounded bg-slate-700 text-white placeholder-slate-400 ${
            errors.email ? "border-red-500" : "border-slate-600"
          }`}
          type="email"
          id="signup-email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "signup-email-error" : undefined}
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
          <p id="signup-email-error" role="alert" className="text-red-400 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      {/* PATCH_54: Password with visibility toggle */}
      <div className="mb-3">
        <label htmlFor="signup-password" className="block text-sm font-medium mb-1 text-slate-300">
          Password
        </label>
        <div className="relative">
          <input
            className={`w-full border p-2 pr-10 rounded bg-slate-700 text-white placeholder-slate-400 ${
              errors.password ? "border-red-500" : "border-slate-600"
            }`}
            type={showPassword ? "text" : "password"}
            id="signup-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "signup-password-error" : "signup-password-rules"}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password)
                setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            disabled={loading}
            autoComplete="new-password"
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
          <p id="signup-password-error" role="alert" className="text-red-400 text-xs mt-1">{errors.password}</p>
        )}

        {/* PATCH_54: Password strength indicator */}
        {password ? (
          <div id="signup-password-rules" className="mt-2 space-y-1">
            {passwordStrength.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2 text-xs">
                <span
                  className={rule.passed ? "text-green-400" : "text-slate-500"}
                >
                  {rule.passed ? "✓" : "○"}
                </span>
                <span
                  className={rule.passed ? "text-green-400" : "text-slate-400"}
                >
                  {rule.label}
                </span>
              </div>
            ))}
          </div>
        ) : <p id="signup-password-rules" className="mt-1 text-xs text-slate-300">Use at least 8 characters with uppercase and lowercase letters, a number and a special character.</p>}
      </div>

      {/* PATCH_54: Confirm password with visibility toggle */}
      <div className="mb-4">
        <label htmlFor="signup-confirmPassword" className="block text-sm font-medium mb-1 text-slate-300">
          Confirm Password
        </label>
        <div className="relative">
          <input
            className={`w-full border p-2 pr-10 rounded bg-slate-700 text-white placeholder-slate-400 ${
              errors.confirmPassword ? "border-red-500" : "border-slate-600"
            }`}
            type={showConfirmPassword ? "text" : "password"}
            id="signup-confirmPassword"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "signup-confirmPassword-error" : undefined}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
          >
            {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p id="signup-confirmPassword-error" role="alert" className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating..." : "Sign up"}
      </button>

      <p className="text-sm mt-3 text-slate-400">
        Already have an account?{" "}
        <a href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-indigo-300 underline underline-offset-2 hover:text-indigo-200">
          Login
        </a>
      </p>
    </form>
  );
}

// PATCH_23: Wrapper with Suspense for useSearchParams
export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
