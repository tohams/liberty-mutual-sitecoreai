export const DEMO_OPENING_MINUTES = 1;
export const DEMO_CLOSING_MINUTES = 1;
export const DEMO_TOTAL_MINUTES = 45;

/** Elapsed presentation time; preparation and reset do not consume the live slot. */
export function customerDemoSchedule(
  chapters: ReadonlyArray<{
    steps: ReadonlyArray<{ id: string; durationMinutes: number }>;
  }>,
) {
  let elapsed = DEMO_OPENING_MINUTES;
  return chapters.flatMap((chapter) =>
    chapter.steps.map((step) => {
      const start = elapsed;
      elapsed += step.durationMinutes;
      return { id: step.id, start, end: elapsed };
    }),
  );
}

export function elapsedTime(minute: number) {
  return `${String(minute).padStart(2, "0")}:00`;
}
