import { BotService } from './services.js';
import { BotResponse, COMMAND_SPECS } from './types.js';
import { formatNumber } from '../utils.js';

type Handler = (service: BotService, kwargs: Record<string, any>) => BotResponse;

function renderText(response: BotResponse): string {
  const lines = [
    `=== ${response.title} ===`,
    '',
    ...response.summary,
  ];
  if (response.tables) {
    for (const [name, rows] of Object.entries(response.tables)) {
      if (rows.length > 0) {
        lines.push('', `-- ${name} --`);
        const headers = Object.keys(rows[0]);
        for (const row of rows.slice(0, 10)) {
          lines.push('  ' + headers.map(h => `${h}: ${formatNumber((row as any)[h])}`).join(', '));
        }
      }
    }
  }
  return lines.join('\n');
}

function renderMarkdown(response: BotResponse): string {
  const lines = [`# ${response.title}`, ''];
  for (const s of response.summary) lines.push(s);
  if (response.tables) {
    for (const [name, rows] of Object.entries(response.tables)) {
      if (rows.length > 0) {
        lines.push('', `## ${name}`);
        const headers = Object.keys(rows[0]);
        const headerLine = '| ' + headers.join(' | ') + ' |';
        const sepLine = '| ' + headers.map(() => '---').join(' | ') + ' |';
        lines.push(headerLine, sepLine);
        for (const row of rows.slice(0, 15)) {
          lines.push('| ' + headers.map(h => String((row as any)[h] ?? '')).join(' | ') + ' |');
        }
      }
    }
  }
  return lines.join('\n');
}

function responseToJson(response: BotResponse): string {
  return JSON.stringify(response, null, 2);
}

export class BotCommandRunner {
  service: BotService;
  private handlers: Record<string, Handler> = {
    standings: (svc) => svc.getStandingsResponse(),
    strategy: (svc) => svc.getStrategyResponse(),
    compare: (svc, kw) => svc.getCompareResponse(kw.user_csv as string, kw.benchmark_csv as string, kw.output_dir as string),
    weather: (svc) => svc.getWeatherResponse(),
    telemetry: (svc, kw) => svc.getTelemetryResponse(kw.driver as string),
    laps: (svc, kw) => svc.getLapsResponse(kw.driver as string),
  };

  constructor(service: BotService) {
    this.service = service;
  }

  get availableCommands(): string[] {
    return COMMAND_SPECS.map(s => s.name);
  }

  run(command: string, kwargs: Record<string, any> = {}): BotResponse {
    if (!this.handlers[command]) throw new Error(`Unknown bot command: ${command}`);
    return this.handlers[command](this.service, kwargs);
  }

  render(command: string, kwargs: Record<string, any> = {}) {
    const response = this.run(command, kwargs);
    return {
      response,
      text: renderText(response),
      markdown: renderMarkdown(response),
      json: responseToJson(response),
    };
  }
}
