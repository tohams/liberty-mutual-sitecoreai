const MILESTONES = [25, 50, 75, 100] as const;

export type ScrollMilestone = (typeof MILESTONES)[number];

/** One tracker per page view; measurement starts only after analytics consent. */
export function createScrollMilestoneTracker() {
  const measured = new Set<ScrollMilestone>();

  return (position: {
    scrollTop: number;
    documentHeight: number;
    viewportHeight: number;
  }): ScrollMilestone[] => {
    const { scrollTop, documentHeight, viewportHeight } = position;
    if (
      ![scrollTop, documentHeight, viewportHeight].every(Number.isFinite) ||
      viewportHeight <= 0 ||
      documentHeight <= viewportHeight ||
      scrollTop < 0
    )
      return [];

    const scrollableHeight = documentHeight - viewportHeight;
    const percent = Math.min(100, (scrollTop / scrollableHeight) * 100);
    const reached = MILESTONES.filter(
      (milestone) => percent >= milestone && !measured.has(milestone),
    );
    for (const milestone of reached) measured.add(milestone);
    return reached;
  };
}
