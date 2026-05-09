import { generatePredictionArtifacts } from './generator.js';

const args = process.argv.slice(2);
const outDirIdx = args.indexOf('--output-dir');
const outputDir = outDirIdx !== -1 ? args[outDirIdx + 1] : undefined;

const result = generatePredictionArtifacts(outputDir);
console.log(result);