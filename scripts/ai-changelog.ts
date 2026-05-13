'use strict';

import fs from 'fs';
import path from 'path';

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function summarizeChangelog() {
  if (!GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not set.');
    process.exit(1);
  }

  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error(`Error: ${CHANGELOG_PATH} not found.`);
    process.exit(1);
  }

  const content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  const lines = content.split('\n');

  let firstVersionIndex = -1;
  let secondVersionIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A version header starts with ## or ### and contains a date in (YYYY-MM-DD) format
    if ((line.startsWith('## ') || line.startsWith('### ')) && /\(\d{4}-\d{2}-\d{2}\)/.test(line)) {
      if (firstVersionIndex === -1) {
        firstVersionIndex = i;
      } else {
        secondVersionIndex = i;
        break;
      }
    }
  }

  if (firstVersionIndex === -1) {
    console.error('Error: Could not find any version headers in CHANGELOG.md.');
    process.exit(1);
  }

  // If there's no second version, take everything until the end
  const end = secondVersionIndex !== -1 ? secondVersionIndex : lines.length;
  const rawReleaseNotes = lines.slice(firstVersionIndex + 1, end).join('\n').trim();

  if (!rawReleaseNotes) {
    console.log('No release notes found to summarize.');
    return;
  }

  console.log(`Summarizing release notes with Gemini (${GEMINI_MODEL})...`);

  const prompt = `
You are a technical writer for a developer tool called "Weekly Planner".
Rewrite the following technical release notes into a clean, user-friendly "What's New" section.

Constraints:
1. Focus on user-facing benefits and visible changes.
2. Group by "Features" and "Bug Fixes" if applicable.
3. Remove commit hashes, links, and technical jargon (e.g., "invariant", "state issue", "render").
4. Omit internal chores, refactors, or test-only changes.
5. Use a friendly, professional tone.
6. Return ONLY the rewritten markdown content.

Input Release Notes:
${rawReleaseNotes}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data: any = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Unknown Gemini API error');
    }

    const rewrittenContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rewrittenContent) {
      throw new Error('Received empty response from Gemini.');
    }

    // Splice the rewritten content back in
    const newContent = [
      ...lines.slice(0, firstVersionIndex + 1),
      '',
      rewrittenContent,
      '',
      ...lines.slice(end),
    ].join('\n');

    fs.writeFileSync(CHANGELOG_PATH, newContent, 'utf-8');
    console.log('Successfully updated CHANGELOG.md with AI-summarized notes.');
  } catch (error: any) {
    console.error('Error calling Gemini API:', error.message);
    process.exit(1);
  }
}

summarizeChangelog();
