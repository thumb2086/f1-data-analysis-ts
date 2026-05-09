import { getRaceInfo } from '../data_loader.js';
import { getFinalStandings, getPositionChangeSummary, getTeamStandings } from '../race_analysis.js';
import { getFastestLaps } from '../lap_analysis.js';
import { getTyreStrategy } from '../tyre_analysis.js';
import { getWeatherSummary } from '../weather_analysis.js';

// ---- Prediction types ----
export interface DriverPredictionFeatures {
  driver: string;
  full_name: string;
  team_name: string;
  grid_position: number;
  finish_position: number;
  avg_lap_sec: number;
  best_lap_sec: number;
  lap_cv_pct: number;
  pace_metric_sec: number;
  tyre_deg_sec_per_lap: number;
  start_finish_gain: number;
  stint_count: number;
  max_stint_laps: number;
  hard_stint_share: number;
  position_net: number;
  team_grid_mean: number;
  laps_completed: number;
  points: number;
  status: string;
}

export interface PredictionOutput {
  driver: string;
  full_name: string;
  team_name: string;
  grid_position: number;
  finish_score: number;
  predicted_finish_rank: number;
  predicted_result_class: 'Top 3' | 'Top 10' | 'DNF';
  predicted_gain: number;
  predicted_gain_band: string;
  predicted_strategy: string;
  strategy_confidence: number;
  result_confidence: number;
  predicted_result_explanation: string;
  predicted_strategy_explanation: string;
}

// ---- Report types ----
export interface RaceReport {
  report_title: string;
  summary: Record<string, any>;
  race_info: Record<string, any>;
  standings: Record<string, any>[];
  position_changes: Record<string, any>[];
  fastest_laps: Record<string, any>[];
  tyre_strategy: Record<string, any>[];
  weather_summary: Record<string, any>;
  telemetry_summary: Record<string, any> | null;
}

// ---- Rating types ----
export interface DriverRatingFeatures {
  driver: string;
  full_name: string;
  team_name: string;
  grid_position: number;
  finish_position: number;
  avg_lap_sec: number;
  best_lap_sec: number;
  lap_cv_pct: number;
  pace_metric_sec: number;
  start_finish_gain: number;
  position_net: number;
  tyre_deg_sec_per_lap: number;
  laps_completed: number;
  points: number;
  status: string;
}

export interface DriverRating extends DriverRatingFeatures {
  pace_score: number;
  consistency_score: number;
  start_finish_gain_score: number;
  tyre_management_score: number;
  position_gain_loss_score: number;
  overall_score: number;
  rating_rank: number;
}

// ---- Bot types ----
export interface BotResponse {
  command: string;
  title: string;
  summary: string[];
  metrics: Record<string, any>;
  tables: Record<string, Record<string, any>[]>;
  details?: Record<string, any>;
}

export const DEFAULT_BOT_OUTPUT_DIR = 'outputs/bot';
export const DEFAULT_COMPARE_USER_CSV = 'outputs/coaching/synthetic_user.csv';
export const DEFAULT_COMPARE_BENCHMARK_CSV = 'raw/telemetry_VER.csv';

export interface CommandSpec {
  name: string;
  help: string;
  examples: string[];
}

export const COMMAND_SPECS: CommandSpec[] = [
  { name: 'standings', help: 'Show final race standings', examples: ['standings'] },
  { name: 'strategy', help: 'Show tyre strategy overview', examples: ['strategy'] },
  { name: 'compare', help: 'Compare user telemetry to VER benchmark', examples: ['compare --user my_telemetry.csv'] },
  { name: 'weather', help: 'Show weather summary', examples: ['weather'] },
  { name: 'telemetry', help: 'Show telemetry analysis for a driver', examples: ['telemetry --driver VER'] },
  { name: 'laps', help: 'Show lap times for a driver', examples: ['laps --driver VER'] },
];