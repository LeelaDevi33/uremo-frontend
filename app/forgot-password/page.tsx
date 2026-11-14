"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

export default function ForgotPassword() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // PATCH_54: Validate email format
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const submit = async () => {
    if (loading) return;
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/auth/forgot-password", "POST", {
        email: email.trim().toLowerCase(),
      });

      setSubmitted(true);
      toast("Check your email for reset instructions", "success");
    } catch (err: any) {
      const code = err.payload?.code;

      if (code === "RATE_LIMITED") {
        toast("Too many attempts. Please try again later.", "error");
      } else {
        setError("The reset request could not be submitted. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-full max-w-sm border border-slate-700 rounded-lg p-6 bg-slate-800 text-center">
          <div className="mb-4 text-4xl">Email</div>
          <h1 className="text-xl font-semibold mb-2 text-white">
            Check Your Email
          </h1>
          <p className="text-slate-400 mb-4">
            If an account exists with{" "}
            <span className="text-white">{email}</span>, you will receive a
            password reset link shortly.
          </p>
          <p className="text-slate-500 text-sm mb-4">
            Don't see it? Check your spam folder.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form noValidate onSubmit={event => { event.preventDefault(); void submit(); }} className="w-full max-w-sm border border-slate-700 rounded-lg p-6 bg-slate-800">
        <h1 className="text-xl font-semibold mb-2 text-white">
          Forgot Password
        </h1>
        <p className="text-slate-400 text-sm mb-4">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>

        <div className="mb-4">
          <label htmlFor="recovery-email" className="mb-1 block text-sm">Email address</label>
          <input
            id="recovery-email"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "recovery-error" : undefined}
            className={`w-full border p-2 rounded bg-slate-700 text-white placeholder-slate-400 ${
              error ? "border-red-500" : "border-slate-600"
            }`}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            disabled={loading}
            autoComplete="email"
          />
          {error && <p role="alert" id="recovery-error" className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <p className="text-sm mt-3 text-slate-400">
          Remember your password?{" "}
          <a href="/login" className="text-indigo-400 hover:underline">
            Login
          </a>
        </p>
      </form>
    </div>
  );
}
