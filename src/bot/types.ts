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
