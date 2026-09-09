/**
 * Knowledge drills: Linux, ports, software development, security, emerging tech.
 *
 * These are fact-based rather than parametric, so volume comes from asking each
 * fact the different ways an exam asks it - recall it, recognise it, apply it,
 * pick it out of near neighbours - not from rewording one stem. Distractors are
 * always siblings from the same table, which is what makes them hard: the wrong
 * answer for "port 22" is 23 or 21, not something absurd.
 *
 *   node scripts/generate-knowledge.mjs [count]
 */

import fs from 'node:fs';
import { PORTS, LINUX, LINUX_PATHS, HTTP_CODES, GIT, CONCEPTS } from './knowledge-tables.mjs';

const TARGET = Number(process.argv[2]) || 4200;  // an upper bound; the tables decide the real number

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(9090909);
const shuffled = (arr) => [...arr].sort(() => rand() - 0.5);

/** Three distinct siblings, so every wrong answer is a plausible near miss. */
function siblings(pool, isSelf, project, n = 3) {
  const out = [];
  for (const row of shuffled(pool)) {
    if (isSelf(row)) continue;
    const v = project(row);
    if (v == null || out.includes(v)) continue;
    out.push(v);
    if (out.length === n) break;
  }
  return out;
}

function build(skill, topic, source, stem, correct, wrongs, explanation, difficulty) {
  const seen = new Set([correct]);
  const options = [correct];
  for (const w of wrongs) {
    if (seen.has(w)) continue;
    seen.add(w); options.push(w);
    if (options.length === 4) break;
  }
  if (options.length < 4) return null;
  return { skill, topic, source, stem, options, answerIndex: 0, explanation, difficulty };
}

/* ---------------- question shapes ---------------- */

const SHAPES = [];

// ---- ports: four genuinely different questions per service ----
for (const row of PORTS) {
  const [svc, port, proto, secure] = row;
  const self = (r) => r[0] === svc;

  SHAPES.push(() =>
    build('port-number', 'Networking', 'Ports and Protocols Drill',
      `Which port does ${svc} use by default?`,
      String(port),
      siblings(PORTS, self, (r) => String(r[1])),
      `${svc} runs on port ${port}/${proto} by default. Knowing the neighbouring ports matters as much as the answer - they are what appear as distractors.`,
      'Easy')
  );

  SHAPES.push(() =>
    build('port-service', 'Networking', 'Ports and Protocols Drill',
      `A firewall log shows traffic on port ${port}. Which service is that, by default?`,
      svc,
      siblings(PORTS, self, (r) => r[0]),
      `Port ${port}/${proto} is assigned to ${svc}. Reading a port back to its service is the everyday skill in firewall and log work.`,
      'Easy')
  );

  SHAPES.push(() =>
    build('port-protocol', 'Networking', 'Ports and Protocols Drill',
      `Which transport protocol does ${svc} use on port ${port}?`,
      proto,
      ['TCP', 'UDP', 'TCP and UDP', 'ICMP'].filter((p) => p !== proto),
      `${svc} uses ${proto} on port ${port}. DNS is the one people trip on: it uses UDP for ordinary lookups and TCP for zone transfers and long replies.`,
      'Medium')
  );

  if (secure) {
    SHAPES.push(() =>
      build('port-secure', 'Cybersecurity', 'Ports and Protocols Drill',
        `${svc} on port ${port} sends data in the clear. What should replace it?`,
        secure,
        siblings(PORTS, self, (r) => (r[3] ? r[3] : null)).concat(['Keep it and rely on the firewall', 'Change the port number']),
        `${svc} offers no encryption, so credentials and payload travel readable. The accepted replacement is ${secure}. Moving it to another port hides nothing - the traffic is still plaintext.`,
        'Medium')
    );
  }
}

// ---- Linux commands ----
for (const row of LINUX) {
  const [cmd, does, flag, flagDoes] = row;
  const self = (r) => r[0] === cmd;

  SHAPES.push(() =>
    build('linux-command-purpose', 'Operating Systems', 'Linux Command Drill',
      `What does the Linux command \`${cmd}\` do?`,
      `It will ${does}`,
      siblings(LINUX, self, (r) => `It will ${r[1]}`),
      `\`${cmd}\` is used to ${does}.`,
      'Easy')
  );

  SHAPES.push(() =>
    build('linux-purpose-command', 'Operating Systems', 'Linux Command Drill',
      `You need to ${does}. Which command does that?`,
      cmd,
      siblings(LINUX, self, (r) => r[0]),
      `\`${cmd}\` is the command that will ${does}.`,
      'Easy')
  );

  if (flag) {
    SHAPES.push(() =>
      build('linux-flag', 'Operating Systems', 'Linux Command Drill',
        `In \`${cmd} ${flag}\`, what does the ${flag} option add?`,
        `It ${flagDoes}`,
        siblings(LINUX, (r) => r[0] === cmd || !r[3], (r) => `It ${r[3]}`),
        `\`${cmd} ${flag}\` ${flagDoes}.`,
        'Medium')
    );
  }
}

// ---- Linux paths ----
for (const row of LINUX_PATHS) {
  const [path, holds] = row;
  const self = (r) => r[0] === path;

  SHAPES.push(() =>
    build('linux-path', 'Operating Systems', 'Linux Command Drill',
      `On a Linux system, what does ${path} contain?`,
      holds.charAt(0).toUpperCase() + holds.slice(1),
      siblings(LINUX_PATHS, self, (r) => r[1].charAt(0).toUpperCase() + r[1].slice(1)),
      `${path} holds ${holds}.`,
      'Medium')
  );

  SHAPES.push(() =>
    build('linux-path-reverse', 'Operating Systems', 'Linux Command Drill',
      `Which location holds ${holds}?`,
      path,
      siblings(LINUX_PATHS, self, (r) => r[0]),
      `That is ${path}.`,
      'Medium')
  );
}

// ---- HTTP status codes ----
for (const row of HTTP_CODES) {
  const [code, meaning, cat] = row;
  const self = (r) => r[0] === code;

  SHAPES.push(() =>
    build('http-code', 'Software Development', 'Software Development Drill',
      `What does HTTP status ${code} mean?`,
      meaning,
      siblings(HTTP_CODES, self, (r) => r[1]),
      `${code} is ${meaning}. It is a ${cat} response, which tells you which side has to change something.`,
      'Medium')
  );

  SHAPES.push(() =>
    build('http-code-reverse', 'Software Development', 'Software Development Drill',
      `An API returns "${meaning.split(' - ')[1] ?? meaning}". Which status code is that?`,
      String(code),
      siblings(HTTP_CODES, self, (r) => String(r[0])),
      `That condition is HTTP ${code} (${meaning}).`,
      'Medium')
  );
}

// ---- git ----
for (const row of GIT) {
  const [cmd, does] = row;
  const self = (r) => r[0] === cmd;

  SHAPES.push(() =>
    build('git-command', 'Software Development', 'Software Development Drill',
      `What does \`${cmd}\` do?`,
      `It will ${does}`,
      siblings(GIT, self, (r) => `It will ${r[1]}`),
      `\`${cmd}\` will ${does}.`,
      'Medium')
  );

  SHAPES.push(() =>
    build('git-reverse', 'Software Development', 'Software Development Drill',
      `You want to ${does}. Which git command do you run?`,
      cmd,
      siblings(GIT, self, (r) => r[0]),
      `\`${cmd}\` is the command for that.`,
      'Medium')
  );
}

// ---- concepts across all fields ----
for (const row of CONCEPTS) {
  const [term, def, field] = row;
  const self = (r) => r[0] === term;
  const sameField = CONCEPTS.filter((r) => r[2] === field);

  SHAPES.push(() =>
    build('concept-define', field, `${field} Drill`,
      `In ${field.toLowerCase()}, what is ${term}?`,
      def.charAt(0).toUpperCase() + def.slice(1),
      siblings(sameField, self, (r) => r[1].charAt(0).toUpperCase() + r[1].slice(1)),
      `${term} is ${def}.`,
      'Medium')
  );

  SHAPES.push(() =>
    build('concept-name', field, `${field} Drill`,
      `Which term describes ${def}?`,
      term,
      siblings(sameField, self, (r) => r[0]),
      `That is ${term}.`,
      'Medium')
  );
}

/* ---------------- generate ---------------- */

const out = [];
const seen = new Set();
const perSkill = new Map();
const perStem = new Map();

/**
 * How many times one stem may appear, with different distractors each time.
 *
 * Not one: re-asking a recall question against a different set of near misses
 * is how flashcards work, and it genuinely tests discrimination rather than
 * memory of one option list. But sixteen - which is what the first run produced
 * for "which service is on port 22" - is just the same question over and over.
 */
const MAX_PER_STEM = 3;

// Cycle the shapes so every fact is covered before any is revisited.
for (let pass = 0; out.length < TARGET && pass < 40; pass++) {
  for (const shape of shuffled(SHAPES)) {
    if (out.length >= TARGET) break;
    const q = shape();
    if (!q) continue;
    const key = q.stem + '||' + [...q.options].sort().join('|');
    if (seen.has(key)) continue;
    if ((perStem.get(q.stem) ?? 0) >= MAX_PER_STEM) continue;
    seen.add(key);
    perStem.set(q.stem, (perStem.get(q.stem) ?? 0) + 1);
    perSkill.set(q.skill, (perSkill.get(q.skill) ?? 0) + 1);
    out.push(q);
  }
}

// Spread the key across A-D so the bank carries no positional tell.
out.forEach((q, i) => {
  const target = i % 4;
  const correct = q.options[q.answerIndex];
  const rest = q.options.filter((_, j) => j !== q.answerIndex);
  const arranged = [];
  let r = 0;
  for (let slot = 0; slot < 4; slot++) arranged.push(slot === target ? correct : rest[r++]);
  q.options = arranged;
  q.answerIndex = target;
  q.id = `K${String(i + 1).padStart(5, '0')}`;
});

fs.writeFileSync('data/knowledge.json', JSON.stringify(out, null, 1));

const pos = [0, 0, 0, 0];
for (const q of out) pos[q.answerIndex]++;
const byTopic = new Map();
for (const q of out) byTopic.set(q.topic, (byTopic.get(q.topic) ?? 0) + 1);

console.log(`generated ${out.length} knowledge questions from ${SHAPES.length} distinct fact-shapes`);
console.log(`distinct stems     : ${perStem.size}  (max ${MAX_PER_STEM} variants each)`);
console.log(`unique stem+options: ${seen.size}`);
console.log(`answer position: ${pos.map((n, i) => 'ABCD'[i] + ' ' + Math.round((n / out.length) * 100) + '%').join('  ')}`);
console.log('\nby topic:');
for (const [k, v] of [...byTopic].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);
