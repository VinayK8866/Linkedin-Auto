import { spawn } from 'child_process';
import path from 'path';

const SCRIPTS_DIR = path.resolve(process.cwd(), '.agents/scripts/humanizer');
const HUMANIZE_PY = path.join(SCRIPTS_DIR, 'humanize.py');
const DETECT_PY = path.join(SCRIPTS_DIR, 'detect.py');
const SLOP_JSON = path.join(SCRIPTS_DIR, 'slop.json');

export interface HumanizeResult {
  text: string;
  report: string;
  changesCount: number;
}

export interface DetectScore {
  humanScore: number;
  status: 'PASS' | 'REVIEW' | 'FLAGGED';
  checks: {
    burstiness: { score: number; details: string };
    specificity: { score: number; details: string };
    slopDensity: { score: number; details: string };
    fingerprint: { score: number; details: string };
    voice: { score: number; details: string };
  };
}

export function cleanDraft(inputText: string): Promise<HumanizeResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [HUMANIZE_PY, '--json', '--lexicon', SLOP_JSON, '-']);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`humanize.py exited with code ${code}: ${stderr}`));
      }
      try {
        const data = JSON.parse(stdout);
        const rep = data.report || {};
        const lexicalChanges = (rep.lexical || []).map((l: any) => `"${l.find}" → "${l.replace}" (${l.count}x)`).join(', ');
        const invisibleCount = (rep.invisible || []).length;
        const typoCount = (rep.typographic || []).length;

        const summaryParts: string[] = [];
        if (lexicalChanges) summaryParts.push(`Replaced slop: ${lexicalChanges}`);
        if (invisibleCount > 0) summaryParts.push(`Removed ${invisibleCount} invisible Unicode marks`);
        if (typoCount > 0) summaryParts.push(`Normalized ${typoCount} typographic marks`);

        resolve({
          text: (data.text || inputText).trim(),
          report: summaryParts.join(' | ') || 'Zero AI slop detected.',
          changesCount: (rep.lexical || []).length + invisibleCount + typoCount
        });
      } catch (err) {
        // Fallback to text
        resolve({
          text: stdout || inputText,
          report: stderr,
          changesCount: 0
        });
      }
    });

    proc.stdin.write(inputText);
    proc.stdin.end();
  });
}

export function scoreDraft(inputText: string): Promise<DetectScore> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [DETECT_PY, '--json', '--lexicon', SLOP_JSON, '-']);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`detect.py exited with code ${code}: ${stderr}`));
      }
      try {
        const data = JSON.parse(stdout);
        const score = data.human_score ?? 70;
        let status: 'PASS' | 'REVIEW' | 'FLAGGED' = 'PASS';
        if (score < 40) status = 'FLAGGED';
        else if (score < 75) status = 'REVIEW';

        const checks = {
          burstiness: {
            score: data.checks?.burstiness?.score ?? 70,
            details: data.checks?.burstiness?.detail ?? ''
          },
          specificity: {
            score: data.checks?.specificity?.score ?? 70,
            details: data.checks?.specificity?.detail ?? ''
          },
          slopDensity: {
            score: data.checks?.slop_density?.score ?? 70,
            details: data.checks?.slop_density?.detail ?? ''
          },
          fingerprint: {
            score: data.checks?.fingerprint?.score ?? 70,
            details: data.checks?.fingerprint?.detail ?? ''
          },
          voice: {
            score: data.checks?.voice?.score ?? 70,
            details: data.checks?.voice?.detail ?? ''
          }
        };

        resolve({
          humanScore: Math.round(score * 10) / 10,
          status,
          checks
        });
      } catch (err) {
        resolve({
          humanScore: 70,
          status: 'REVIEW',
          checks: {
            burstiness: { score: 70, details: '' },
            specificity: { score: 70, details: '' },
            slopDensity: { score: 70, details: '' },
            fingerprint: { score: 70, details: '' },
            voice: { score: 70, details: '' }
          }
        });
      }
    });

    proc.stdin.write(inputText);
    proc.stdin.end();
  });
}
