"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token");
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  // PATCH_54: Password strength validation
  const passwordStrength = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));
  const isPasswordStrong = passwordStrength.every((r) => r.passed);

  const validateFields = (): boolean => {
    const newErrors: typeof errors = {};

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
    if (loading) return;
    setErrors({});

    if (!token) {
      toast("Invalid or missing reset token", "error");
      return;
    }

    if (!validateFields()) {
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/auth/reset-password", "POST", {
        token,
        password,
      });

      setSuccess(true);
      toast("Password reset successfully!", "success");
    } catch (err: any) {
      const message = err.message || "Failed to reset password";
      const code = err.payload?.code;

      if (code === "INVALID_TOKEN") {
        setExpired(true);
        toast(
          "This reset link is invalid or has expired. Please request a new one.",
          "error",
        );
      } else if (code === "WEAK_PASSWORD") {
        setErrors({ password: "Password does not meet requirements" });
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

  if (!token || expired) {
    return (
      <div className="w-full max-w-sm border border-slate-700 rounded-lg p-6 bg-slate-800 text-center">
        <div className="mb-4 text-4xl">!</div>
        <h1 className="text-xl font-semibold mb-2 text-white">Invalid Link</h1>
        <p className="text-slate-400 mb-4">
          This password reset link is invalid or has expired.
        </p>
        <button
          onClick={() => router.push("/forgot-password")}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition-colors"
        >
          Request New Link
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-sm border border-slate-700 rounded-lg p-6 bg-slate-800 text-center">
        <div className="mb-4 text-4xl">OK</div>
        <h1 className="text-xl font-semibold mb-2 text-white">
          Password Reset!
        </h1>
        <p className="text-slate-400 mb-4">
          Your password has been reset successfully. You can now log in with
          your new password.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={event => { event.preventDefault(); void submit(); }} className="w-full max-w-sm border border-slate-700 rounded-lg p-6 bg-slate-800">
      <h1 className="text-xl font-semibold mb-2 text-white">Reset Password</h1>
      <p className="text-slate-400 text-sm mb-4">
        Enter your new password below.
      </p>

      {/* PATCH_54: Password with visibility toggle */}
      <div className="mb-3">
        <label htmlFor="new-password" className="block text-sm font-medium mb-1 text-slate-300">
          New Password
        </label>
        <div className="relative">
          <input
            className={`w-full border p-2 pr-10 rounded bg-slate-700 text-white placeholder-slate-400 ${
              errors.password ? "border-red-500" : "border-slate-600"
            }`}
            type={showPassword ? "text" : "password"}
            id="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "new-password-error" : undefined}
            placeholder="New Password"
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
          <p role="alert" id="new-password-error" className="text-red-400 text-xs mt-1">{errors.password}</p>
        )}

        {/* PATCH_54: Password strength indicator */}
        {password && (
          <div className="mt-2 space-y-1">
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
        )}
      </div>

      {/* PATCH_54: Confirm password with visibility toggle */}
      <div className="mb-4">
        <label htmlFor="confirm-password" className="block text-sm font-medium mb-1 text-slate-300">
          Confirm Password
        </label>
        <div className="relative">
          <input
            className={`w-full border p-2 pr-10 rounded bg-slate-700 text-white placeholder-slate-400 ${
              errors.confirmPassword ? "border-red-500" : "border-slate-600"
            }`}
            type={showConfirmPassword ? "text" : "password"}
            id="confirm-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
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
            aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
          >
            {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p role="alert" id="confirm-password-error" className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Resetting..." : "Reset Password"}
      </button>

      <p className="text-sm mt-3 text-slate-400">
        Remember your password?{" "}
        <a href="/login" className="text-indigo-400 hover:underline">
          Login
        </a>
      </p>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
