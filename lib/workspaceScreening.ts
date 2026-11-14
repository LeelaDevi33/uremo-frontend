export type ScreeningAttempt = {
  screeningId: string;
  completedAt: string;
  score?: number | null;
  passed?: boolean | null;
  submissionStatus?: string;
};

export function hasActiveScreening(application: { workerStatus: string; roleArchived?: boolean }) {
  return !application.roleArchived && ["screening_unlocked", "screening_available", "training_viewed", "test_submitted", "failed"].includes(application.workerStatus);
}

export function screeningOutcome(attempt: ScreeningAttempt) {
  if (attempt.submissionStatus === "approved") return "Passed";
  if (attempt.submissionStatus === "pending_review") return "Awaiting review";
  if (attempt.submissionStatus === "rejected") return "Failed";
  if (attempt.passed === true) return "Passed";
  if (attempt.passed === false) return "Failed";
  return "Awaiting review";
}

export function screeningProgress<T extends { _id: string; active?: boolean }>(application: {
  screening?: T;
  requiredScreenings?: T[];
  screeningsCompleted?: ScreeningAttempt[];
  workerStatus: string;
  roleArchived?: boolean;
}) {
  const required = application.requiredScreenings?.length
    ? application.requiredScreenings
    : application.screening ? [application.screening] : [];
  const attempts = application.screeningsCompleted || [];
  const passed = new Set(attempts.filter(a => screeningOutcome(a) === "Passed").map(a => a.screeningId));
  const pending = new Set(attempts.filter(a => screeningOutcome(a) === "Awaiting review").map(a => a.screeningId));
  const unlocked = !application.roleArchived && ["screening_available", "screening_unlocked", "training_viewed"].includes(application.workerStatus);
  const canTake = (test: T) => unlocked && test.active !== false && !passed.has(test._id) && !pending.has(test._id);
  return { required, passed, pending, canTake, next: required.find(canTake) };
}
