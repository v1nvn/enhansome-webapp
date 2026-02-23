/**
 * Quality scoring utilities
 * Calculates composite quality scores for repository ranking
 */

/**
 * Calculate composite quality score for ranking search results
 *
 * quality_score = (
 *     log(stars) × 1.0 +
 *     freshness_factor × 0.5 +
 *     activity_factor × 0.3
 * )
 *
 * Where:
 *   freshness_factor = days_since_commit / 365 (clamped 0-1, reversed so newer is better)
 *   activity_factor = min(commits_in_last_90_days / 100, 1) (estimated from last_commit recency)
 */
export function calculateQualityScore(item: {
  last_commit: null | string
  stars: number
}): number {
  const stars = item.stars || 0
  const lastCommit = item.last_commit

  // Logarithmic stars score (diminishing returns for very high counts)
  const starsScore = Math.log10(Math.max(stars, 1))

  // Freshness factor based on last commit date
  let freshnessScore = 0
  if (lastCommit) {
    const commitDate = new Date(lastCommit)
    const daysSinceCommit = Math.max(
      0,
      (Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24),
    )
    // Convert to 0-1 scale, where 1 = very recent (0 days), 0 = very old (365+ days)
    freshnessScore = Math.max(0, 1 - daysSinceCommit / 365)
  }

  // Activity factor (estimated from freshness - more recent commits = more active)
  const activityScore = freshnessScore * 0.8

  // Composite score
  return starsScore * 1.0 + freshnessScore * 0.5 + activityScore * 0.3
}
