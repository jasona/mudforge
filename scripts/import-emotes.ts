/**
 * Import emotes from LPC soul.o save file to JSON format.
 *
 * Usage: npx tsx scripts/import-emotes.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// LPC rule type numbers to our rule strings
const RULE_MAP: Record<string, string> = {
  '1': '',      // No target
  '3': 'LIV',   // Living target
  '4': 'STR',   // String argument
  '5': 'LIV LIV', // Two targets
  '7': 'LIV STR', // Target + string
  '6': 'LIV LIV STR', // Two targets + string
};

interface EmoteDefinition {
  [rule: string]: string;
}

interface ImportedEmotes {
  [verb: string]: EmoteDefinition;
}

function parseEmotes(content: string): ImportedEmotes {
  const emotes: ImportedEmotes = {};

  // Find the emotes section
  const emotesMatch = content.match(/emotes\s*\(\[(.+)\]\)/s);
  if (!emotesMatch) {
    console.error('Could not find emotes section');
    return emotes;
  }

  const emotesContent = emotesMatch[1]!;

  // Parse each emote entry
  // Format: "verbname":([<1>="":"template",<3>="LIV":"template",...]),
  const emoteRegex = /"([^"]+)":\(\[([^\]]*)\]\)/g;
  let match;

  while ((match = emoteRegex.exec(emotesContent)) !== null) {
    const verb = match[1]!.toLowerCase();
    const rulesContent = match[2]!;

    // Skip empty emotes
    if (!rulesContent.trim()) continue;

    const rules: EmoteDefinition = {};

    // Parse rules within this emote
    // Format: <1>="":"template", or <3>="LIV":"template", or just <1>:"template",
    // Also handles: <1>:<8>="template", (where 8 is a reference)

    // Use a more robust approach - find all quoted strings and their contexts
    // First, handle the simple format: <num>:"template"
    const simpleRuleRegex = /<(\d+)>:"((?:[^"\\]|\\.)*)"/g;
    let ruleMatch;
    while ((ruleMatch = simpleRuleRegex.exec(rulesContent)) !== null) {
      const ruleNum = ruleMatch[1]!;
      const template = ruleMatch[2]!
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');

      // Skip references (start with ->)
      if (template.startsWith('->')) continue;

      const ruleType = RULE_MAP[ruleNum] ?? '';
      if (template.trim()) {
        rules[ruleType] = template;
      }
    }

    // Handle format: <num>="":"template" or <num>="LIV":"template"
    const typedRuleRegex = /<(\d+)>="([^"]*)":\s*"((?:[^"\\]|\\.)*)"/g;
    while ((ruleMatch = typedRuleRegex.exec(rulesContent)) !== null) {
      const ruleType = ruleMatch[2]!;  // "", "LIV", "STR", etc.
      const template = ruleMatch[3]!
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');

      // Skip references
      if (template.startsWith('->')) continue;

      if (template.trim()) {
        rules[ruleType] = template;
      }
    }

    // Only add if we have at least one valid rule
    if (Object.keys(rules).length > 0) {
      emotes[verb] = rules;
    }
  }

  return emotes;
}

function cleanTemplate(template: string): string {
  // Fix common issues in templates
  let cleaned = template;

  // Replace $n0, $n1 with $N, $T (actor/target)
  cleaned = cleaned.replace(/\$n0/g, '$N');
  cleaned = cleaned.replace(/\$n1/g, '$T');
  cleaned = cleaned.replace(/\$n0p/g, '$P');
  cleaned = cleaned.replace(/\$n1p/g, "$Q");
  cleaned = cleaned.replace(/\$n0o/g, '$N');
  cleaned = cleaned.replace(/\$n1o/g, '$T');
  cleaned = cleaned.replace(/\$N0/g, '$N');
  cleaned = cleaned.replace(/\$N1/g, '$T');
  cleaned = cleaned.replace(/\$N0p/g, '$P');
  cleaned = cleaned.replace(/\$N1p/g, "$T's");
  cleaned = cleaned.replace(/\$p0/g, '$P');
  cleaned = cleaned.replace(/\$p1/g, "$Q");
  cleaned = cleaned.replace(/\$P0/g, '$P');
  cleaned = cleaned.replace(/\$P1/g, "$Q");
  cleaned = cleaned.replace(/\$t1/g, '$T');
  cleaned = cleaned.replace(/\$T1/g, '$T');
  cleaned = cleaned.replace(/\$v0/g, '$v');
  cleaned = cleaned.replace(/\$v1/g, '$v');
  cleaned = cleaned.replace(/\$V0/g, '$V');
  cleaned = cleaned.replace(/\$V1/g, '$V');

  // Replace $ns with $N (actor plural form - just use name)
  cleaned = cleaned.replace(/\$ns/g, '$N');
  cleaned = cleaned.replace(/\$ts/g, '$T');

  // Fix $Tp and similar possessive forms
  cleaned = cleaned.replace(/\$Tp/g, "$T's");
  cleaned = cleaned.replace(/\$tp/g, "$t's");
  cleaned = cleaned.replace(/\$Np/g, "$P");

  return cleaned;
}

function main() {
  const soulPath = join(process.cwd(), 'soul.o');
  const outputPath = join(process.cwd(), 'mudlib/data/emotes-imported.json');

  console.log('Reading soul.o...');
  const content = readFileSync(soulPath, 'utf-8');

  console.log('Parsing emotes...');
  const rawEmotes = parseEmotes(content);

  console.log(`Found ${Object.keys(rawEmotes).length} raw emotes`);

  // Clean up templates and filter valid ones
  const cleanedEmotes: ImportedEmotes = {};
  let skipped = 0;

  for (const [verb, rules] of Object.entries(rawEmotes)) {
    // Skip verbs with special characters (keep only alphanumeric)
    if (!/^[a-z0-9]+$/.test(verb)) {
      skipped++;
      continue;
    }

    const cleanedRules: EmoteDefinition = {};
    for (const [rule, template] of Object.entries(rules)) {
      const cleaned = cleanTemplate(template);
      // Only include if it has $N or $n (actor reference)
      if (cleaned.includes('$N') || cleaned.includes('$n')) {
        cleanedRules[rule] = cleaned;
      }
    }

    if (Object.keys(cleanedRules).length > 0) {
      cleanedEmotes[verb] = cleanedRules;
    } else {
      skipped++;
    }
  }

  console.log(`Cleaned ${Object.keys(cleanedEmotes).length} emotes (skipped ${skipped})`);

  // Write output
  writeFileSync(outputPath, JSON.stringify(cleanedEmotes, null, 2));
  console.log(`Wrote emotes to ${outputPath}`);

  // Print some stats
  let totalRules = 0;
  for (const rules of Object.values(cleanedEmotes)) {
    totalRules += Object.keys(rules).length;
  }
  console.log(`Total rules: ${totalRules}`);

  // Show sample
  console.log('\nSample emotes:');
  const sampleVerbs = ['smile', 'nod', 'wave', 'hug', 'laugh'];
  for (const verb of sampleVerbs) {
    if (cleanedEmotes[verb]) {
      console.log(`  ${verb}:`, cleanedEmotes[verb]);
    }
  }
}

main();
