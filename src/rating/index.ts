import { getDriverRatingFeatures, DriverRating } from './features.js';
import { scoreRatingFeatures } from './scoring.js';

export { getDriverRatingFeatures, scoreRatingFeatures };
export type { DriverRating } from './features.js';

/** 建立完整評分排行榜 */
export function buildRatingLeaderboard(accurateOnly: boolean = true): DriverRating[] {
  const features = getDriverRatingFeatures(accurateOnly);
  return scoreRatingFeatures(features);
}

/** 查詢單一車手評分 */
export function getDriverRating(driver: string, accurateOnly: boolean = true): DriverRating | null {
  const leaderboard = buildRatingLeaderboard(accurateOnly);
  return leaderboard.find(r => r.driver === driver) || null;
}