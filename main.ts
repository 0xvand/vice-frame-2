// Vice Frame 2 — the program that hands the entry in.
//
// The studio itself is the static web app under app/: plain files a desktop
// browser runs offline, with no build step. This program's whole job is the
// handover. It copies app/ and screenshots/ from beside itself into the
// output directory and writes dossier.json there — the summary of the app
// that the judge reads — using the kit's vendored dossier library
// (vendor/makefun-app.ts, included unchanged, as the bounty requires: the
// gate rebuilds the dossier with the same library and compares the two
// byte for byte).
//
// Run it the way the grader does, from the repository root:
//   node main.ts
// Outside the grader's container, MAKEFUN_OUTPUT_DIR names the output
// directory instead of /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Trying the studio itself is serve.ts's job: `node serve.ts` puts app/ on
// http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own limits, from the bounty's reference gate.json. Of these,
// only text_max_bytes shapes the dossier's bytes; the rest make this
// program refuse an entry the scorer would refuse anyway — too many
// screenshots or one too heavy, too many files under app/, an app too big
// in all, or a single path under app/ too long.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

const screenshotsFrom = join(repoRoot, 'screenshots');
if (existsSync(screenshotsFrom)) {
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  cpSync(screenshotsFrom, join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, GATE));

// A one-line receipt for whoever ran this by hand: what was handed in.
// (The grader ignores stdout; the dossier above is the deliverable.)
const countFiles = (dir) => (existsSync(dir)
  ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).length
  : 0);
const appFiles = countFiles(join(outputDir, 'app'));
const shotFiles = existsSync(join(outputDir, 'screenshots'))
  ? readdirSync(join(outputDir, 'screenshots')).filter((name) => /\.(png|jpe?g)$/i.test(name)).length
  : 0;
console.log(`vice-frame-2: handed in ${appFiles} app files and ${shotFiles} screenshots; dossier.json written to ${outputDir}`);
