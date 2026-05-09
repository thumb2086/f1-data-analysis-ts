import { BotService } from './services.js';
import { BotCommandRunner } from './commands.js';
import { DEFAULT_BOT_OUTPUT_DIR, DEFAULT_COMPARE_BENCHMARK_CSV, DEFAULT_COMPARE_USER_CSV } from './types.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DEMO_COMMANDS = ['standings', 'strategy', 'compare', 'weather', 'telemetry', 'laps'];

function writeDemoOutput(outputDir: string, name: string, text: string, markdown: string, jsonText: string): Record<string, string> {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  const textPath = join(outputDir, `${name}.txt`);
  const mdPath = join(outputDir, `${name}.md`);
  const jsonPath = join(outputDir, `${name}.json`);
  writeFileSync(textPath, text, 'utf-8');
  writeFileSync(mdPath, markdown, 'utf-8');
  writeFileSync(jsonPath, jsonText, 'utf-8');
  return { text: textPath, markdown: mdPath, json: jsonPath };
}

function main() {
  const args = process.argv.slice(2);
  const outputDir = args.includes('--output-dir') ? args[args.indexOf('--output-dir') + 1] : DEFAULT_BOT_OUTPUT_DIR;
  const driver = args.includes('--driver') ? args[args.indexOf('--driver') + 1] : 'VER';
  const cmdArgs = args.filter(a => !a.startsWith('--'));
  const commands = cmdArgs.length > 0 ? cmdArgs : DEMO_COMMANDS;

  const service = new BotService(driver, DEFAULT_COMPARE_USER_CSV, DEFAULT_COMPARE_BENCHMARK_CSV, outputDir);
  const runner = new BotCommandRunner(service);

  for (const cmd of commands) {
    try {
      const kwargs: Record<string, any> = { driver };
      if (cmd === 'compare') {
        kwargs.user_csv = args[args.indexOf('--user-csv') + 1] || DEFAULT_COMPARE_USER_CSV;
        kwargs.benchmark_csv = args[args.indexOf('--benchmark-csv') + 1] || DEFAULT_COMPARE_BENCHMARK_CSV;
        kwargs.output_dir = join(outputDir, 'compare');
      }
      const rendered = runner.render(cmd, kwargs);
      const paths = writeDemoOutput(outputDir, cmd, rendered.text, rendered.markdown, rendered.json);
      console.log(`✅ ${cmd}: text=${paths.text}, md=${paths.markdown}, json=${paths.json}`);
    } catch (err: any) {
      console.error(`❌ ${cmd}: ${err.message}`);
    }
  }
}

main();
