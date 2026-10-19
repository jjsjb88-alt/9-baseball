#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedRepo = 'jjsjb88-alt/9-baseball';
const args = process.argv.slice(2);
if (args.length > 1 || args.some(a => !['--check', '--run', '--dry-run'].includes(a))) {
  console.error('Usage: node scripts/claude-loop.mjs [--check | --dry-run | --run]');
  process.exit(2);
}
const mode = args[0] || '--check';
const blocked = [];
const report = (message) => console.log(message);
const command = (name, argv) => spawnSync(name, argv, {
  cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true
});
const gitValue = (argv) => {
  const r = command('git', argv);
  return r.status === 0 ? r.stdout.trim() : '';
};
const branch = gitValue(['branch', '--show-current']);
const origin = gitValue(['config', '--get', 'remote.origin.url']);
const match = origin.match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+\/[^/]+?)(?:\.git)?\/?$/);
const repo = match?.[1] || '';
report('Repository: ' + (repo || 'unrecognized') + '; branch: ' + (branch || 'detached / unavailable'));
if (repo !== expectedRepo) blocked.push('origin must be ' + expectedRepo);
if (!branch || ['main', 'master'].includes(branch)) {
  report('Run requires an attached work branch; --check does not change branches.');
  if (mode !== '--check') blocked.push('select a work branch before running');
}

const variables = [
  'CLAUDE_CODE_DISABLE_ADVISOR_TOOL', 'DISABLE_TELEMETRY',
  'CLAUDE_CODE_EFFORT_LEVEL', 'CLAUDE_CODE_SUBAGENT_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL_FORCE', 'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_MODEL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY'
];
const effectiveEnv = { ...process.env };
const configs = [
  join(homedir(), '.claude', 'settings.json'),
  join(root, '.claude', 'settings.json'),
  join(root, '.claude', 'settings.local.json')
];
for (const file of configs) {
  if (!existsSync(file)) continue;
  try {
    const settings = JSON.parse(readFileSync(file, 'utf8'));
    const names = variables.filter(name => Object.hasOwn(settings.env || {}, name));
    report(file + ': relevant env keys = ' + (names.join(', ') || 'none'));
    for (const name of names) effectiveEnv[name] = settings.env[name];
  } catch {
    report(file + ': unreadable or invalid JSON (contents not printed)');
    blocked.push('fix settings JSON outside this diagnostic');
  }
}
const present = variables.filter(name => Object.hasOwn(process.env, name));
report('Process env keys present: ' + (present.join(', ') || 'none') + ' (values not printed)');
const enabled = value => value !== undefined && !['', '0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
for (const name of ['CLAUDE_CODE_DISABLE_ADVISOR_TOOL', 'DISABLE_TELEMETRY', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY']) {
  if (enabled(effectiveEnv[name])) blocked.push(name + ' conflicts with the advisor profile');
}
const effort = effectiveEnv.CLAUDE_CODE_EFFORT_LEVEL;
if (effort !== undefined && !['', 'auto'].includes(String(effort).toLowerCase())) {
  blocked.push('CLAUDE_CODE_EFFORT_LEVEL overrides subagent effort');
}
if (enabled(effectiveEnv.CLAUDE_CODE_SUBAGENT_MODEL_FORCE)) {
  blocked.push('CLAUDE_CODE_SUBAGENT_MODEL_FORCE overrides role models');
}
for (const name of ['ANTHROPIC_DEFAULT_OPUS_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL']) {
  if (effectiveEnv[name] !== undefined) report(name + ' pins an alias; verify actual model in /tasks (not changed).');
}
for (const rc of ['.bashrc', '.bash_profile', '.zshrc', '.profile']) {
  const path = join(homedir(), rc);
  if (!existsSync(path)) continue;
  try {
    const contents = readFileSync(path, 'utf8');
    const names = variables.filter(name => contents.includes(name));
    if (names.length) report(path + ': mentions ' + names.join(', ') + ' (report only; may be inactive)');
  } catch { report(path + ': unreadable (report only)'); }
}
for (const directory of [join(homedir(), '.claude', 'agents'), join(root, '.claude', 'agents')]) {
  if (!existsSync(directory)) continue;
  for (const file of readdirSync(directory).filter(f => f.endsWith('.md')).sort()) {
    const path = join(directory, file);
    try {
      const text = readFileSync(path, 'utf8');
      const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] || '';
      const model = front.match(/^model:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim() || 'inherit';
      const effort = front.match(/^effort:\s*(\S+)/m)?.[1] || 'inherit';
      // Only safe model labels are printed, never arbitrary file content.
      const safeModel = /^(inherit|opus|sonnet|haiku|fable|claude-[a-z0-9.-]+)$/.test(model) ? model : 'custom';
      report(path + ': model=' + safeModel + ', effort=' + (/^(low|medium|high|xhigh|max|inherit)$/.test(effort) ? effort : 'custom'));
      if (!['sonnet', 'inherit'].includes(model)) report('Existing model pin retained: ' + path);
    } catch { report(path + ': unreadable (report only)'); }
  }
}

const version = command('claude', ['--version']);
const parsed = (version.stdout || '').match(/(\d+)\.(\d+)\.(\d+)/);
if (version.status !== 0 || !parsed) {
  blocked.push('Claude Code CLI unavailable or version unreadable');
} else {
  const parts = parsed.slice(1).map(Number);
  const supported = parts[0] > 2 || (parts[0] === 2 && (parts[1] > 1 || (parts[1] === 1 && parts[2] >= 257)));
  report('Claude Code version: ' + parts.join('.'));
  if (!supported) blocked.push('Claude Code >= 2.1.257 required for this profile');
}
report('Profile: opus/high + sonnet/medium roles + opus advisor; no env or home settings were changed.');
report('Managed policies, account access and billing consent still require runtime verification.');
if (blocked.length) {
  blocked.forEach(message => console.error('BLOCKED: ' + message));
  process.exit(1);
}
const invocation = ['--model', 'opus', '--effort', 'high', '--advisor', 'opus'];
report('Launch: claude ' + invocation.join(' ') + ' <one-round prompt>');
if (mode !== '--run') process.exit(0);

const promptPath = join(root, 'loop', 'CLAUDE-PROMPT.md');
if (!existsSync(promptPath)) {
  console.error('BLOCKED: missing one-round prompt');
  process.exit(1);
}
const result = spawnSync('claude', [...invocation, readFileSync(promptPath, 'utf8')], {
  cwd: root, stdio: 'inherit', shell: false
});
if (result.error) console.error('Claude launch failed; no automatic retry or fallback.');
process.exit(result.status ?? 1);
