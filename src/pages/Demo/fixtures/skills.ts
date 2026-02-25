/**
 * Agent Skill Fixtures for Conversation Tests
 *
 * Self-contained skill definitions modeled after real Agent Skills from
 * the Anthropic/community ecosystem.  These are bundled as test fixtures
 * so the conversation test suite can exercise the full skill pipeline
 * (activate → run_skill_script → validate) without fetching from GitHub
 * or SkillsMP at runtime.
 *
 * Each fixture follows the InstalledSkill shape expected by the skill
 * store, including SKILL.md content, Python scripts, and references.
 *
 * @module pages/Demo/fixtures/skills
 */

import type { InstalledSkill } from '@/types'

// ============================================================================
// Skill: data-analysis
// ============================================================================

/**
 * A data analysis skill inspired by Anthropic's reference skills.
 * Contains a Python script that uses the standard-library `statistics`
 * module so it works in Pyodide without extra packages.
 */
export const dataAnalysisSkill: InstalledSkill = {
  id: 'fixture-data-analysis',
  name: 'data-analysis',
  description:
    'Analyze datasets using Python. Compute descriptive statistics, detect outliers, and summarize data. Use when analyzing numbers, CSVs, or exploring data patterns.',
  author: 'devs-fixtures',
  license: 'MIT',
  metadata: { version: '1.0' },

  skillMdContent: `# Data Analysis

## When to use
Use this skill when the user asks to analyze numeric data, compute statistics,
detect outliers, or generate descriptive summaries of datasets.

## How to analyze
1. If the data is supplied inline, pass it via the \`arguments\` parameter.
2. Run the analysis script: \`scripts/analyze.py\`
3. The script accepts a JSON-encoded \`data\` argument (list of numbers).
4. It prints a summary including count, mean, median, stdev, min, max, and outliers.

## Scripts
- \`scripts/analyze.py\` — Descriptive statistics (stdlib only, no numpy needed)

## Output format
The script prints a human-readable summary to stdout.
`,

  scripts: [
    {
      path: 'scripts/analyze.py',
      language: 'python',
      requiredPackages: [],
      content: `"""Descriptive statistics analysis script.

Accepts a JSON list of numbers via the \`data\` global variable
(injected by the sandbox context).  Falls back to sys.argv if
the global is not set.
"""

import json
import math
import statistics
import sys

# ── Resolve input data ─────────────────────────────────────────
try:
    # Prefer context-injected global
    numbers = list(data)  # type: ignore[name-defined]
except NameError:
    # Fallback: read from --data CLI flag
    if "--data" in sys.argv:
        idx = sys.argv.index("--data") + 1
        numbers = json.loads(sys.argv[idx])
    else:
        numbers = []

if not numbers:
    print("Error: no data provided")
    sys.exit(1)

# ── Compute statistics ─────────────────────────────────────────
n = len(numbers)
mean = statistics.mean(numbers)
median = statistics.median(numbers)
stdev = statistics.pstdev(numbers) if n > 1 else 0.0
minimum = min(numbers)
maximum = max(numbers)

# Outliers: values beyond 2 standard deviations from the mean
outliers = [x for x in numbers if abs(x - mean) > 2 * stdev] if stdev > 0 else []

# ── Output ─────────────────────────────────────────────────────
print(f"Count:    {n}")
print(f"Mean:     {mean:.4f}")
print(f"Median:   {median}")
print(f"Stdev:    {stdev:.4f}")
print(f"Min:      {minimum}")
print(f"Max:      {maximum}")
if outliers:
    print(f"Outliers: {outliers}")
else:
    print("Outliers: none")
`,
    },
  ],

  references: [
    {
      path: 'references/REFERENCE.md',
      content:
        '# Data Analysis Reference\n\nDescriptive statistics provide a summary of the central tendency, dispersion, and shape of a dataset.',
      mimeType: 'text/markdown',
    },
  ],
  assets: [],

  githubUrl: 'https://github.com/devs-fixtures/skills/tree/main/data-analysis',
  stars: 100,
  installedAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  enabled: true,
  assignedAgentIds: [],
  autoActivate: false,
}

// ============================================================================
// Skill: text-transform
// ============================================================================

/**
 * A text transformation skill with multiple lightweight Python scripts.
 * All scripts use only the standard library.
 */
export const textTransformSkill: InstalledSkill = {
  id: 'fixture-text-transform',
  name: 'text-transform',
  description:
    'Transform and analyze text: word frequency, reading level, summarization helpers, case conversion, and character statistics. Use for any text processing task.',
  author: 'devs-fixtures',
  license: 'MIT',
  metadata: { version: '1.0' },

  skillMdContent: `# Text Transform

## When to use
Use this skill when the user wants to transform text, count word frequencies,
or analyze text metrics.

## Scripts
- \`scripts/word_frequency.py\` — Count word frequencies in a text. Pass text via the \`text\` argument.
- \`scripts/text_stats.py\` — Compute character, word, and sentence counts. Pass text via the \`text\` argument.

## Usage
1. Activate this skill when the user's task involves text analysis.
2. Call \`run_skill_script\` with the appropriate script path and arguments.
3. Arguments should be passed as: \`{ "text": "the text to analyze" }\`
`,

  scripts: [
    {
      path: 'scripts/word_frequency.py',
      language: 'python',
      requiredPackages: [],
      content: `"""Word frequency counter.

Reads the \`text\` global variable and prints the top 10 most frequent words.
"""

import re
from collections import Counter

try:
    input_text = str(text)  # type: ignore[name-defined]
except NameError:
    input_text = ""

if not input_text.strip():
    print("Error: no text provided")
else:
    words = re.findall(r"[a-zA-Z]+", input_text.lower())
    freq = Counter(words)
    print(f"Total words: {len(words)}")
    print(f"Unique words: {len(freq)}")
    print("\\nTop 10 words:")
    for word, count in freq.most_common(10):
        print(f"  {word}: {count}")
`,
    },
    {
      path: 'scripts/text_stats.py',
      language: 'python',
      requiredPackages: [],
      content: `"""Text statistics calculator.

Reads the \`text\` global variable and computes basic metrics.
"""

import re

try:
    input_text = str(text)  # type: ignore[name-defined]
except NameError:
    input_text = ""

if not input_text.strip():
    print("Error: no text provided")
else:
    char_count = len(input_text)
    word_count = len(input_text.split())
    sentence_count = len(re.findall(r"[.!?]+", input_text)) or 1
    avg_word_length = sum(len(w) for w in input_text.split()) / max(word_count, 1)
    vowels = sum(1 for c in input_text.lower() if c in "aeiou")
    consonants = sum(1 for c in input_text.lower() if c.isalpha() and c not in "aeiou")

    print(f"Characters: {char_count}")
    print(f"Words:      {word_count}")
    print(f"Sentences:  {sentence_count}")
    print(f"Avg word length: {avg_word_length:.1f}")
    print(f"Vowels:     {vowels}")
    print(f"Consonants: {consonants}")
`,
    },
  ],

  references: [],
  assets: [],

  githubUrl: 'https://github.com/devs-fixtures/skills/tree/main/text-transform',
  stars: 42,
  installedAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  enabled: true,
  assignedAgentIds: [],
  autoActivate: false,
}

// ============================================================================
// Skill: math-toolkit
// ============================================================================

/**
 * A math toolkit skill with scripts for matrix operations and prime
 * number calculation.  Uses numpy (available as a Pyodide built-in).
 */
export const mathToolkitSkill: InstalledSkill = {
  id: 'fixture-math-toolkit',
  name: 'math-toolkit',
  description:
    'Advanced math with Python and NumPy: matrix operations, prime generation, linear algebra, and numerical methods. Use for math-heavy computation tasks.',
  author: 'devs-fixtures',
  license: 'MIT',
  metadata: { version: '1.0' },

  skillMdContent: `# Math Toolkit

## When to use
Use this skill when the user requests matrix operations, prime number
generation, linear algebra, or other compute-intensive math.

## Scripts
- \`scripts/matrix_ops.py\` — Create and analyze matrices with NumPy.
  Arguments: \`size\` (int, default 3), \`operation\` ("determinant" | "inverse" | "eigenvalues" | "all")
- \`scripts/primes.py\` — Generate prime numbers up to a limit.
  Arguments: \`limit\` (int, default 100)

## Examples
### Matrix determinant
\`\`\`
run_skill_script(skill_name="math-toolkit", script_path="scripts/matrix_ops.py", arguments={"size": 4, "operation": "determinant"})
\`\`\`

### Primes up to 200
\`\`\`
run_skill_script(skill_name="math-toolkit", script_path="scripts/primes.py", arguments={"limit": 200})
\`\`\`
`,

  scripts: [
    {
      path: 'scripts/matrix_ops.py',
      language: 'python',
      requiredPackages: ['numpy'],
      content: `"""Matrix operations with NumPy.

Globals injected by sandbox context:
  size      — matrix dimension (default 3)
  operation — "determinant", "inverse", "eigenvalues", or "all" (default "all")
"""

import numpy as np

# ── Resolve inputs ─────────────────────────────────────────────
try:
    n = int(size)  # type: ignore[name-defined]
except (NameError, TypeError, ValueError):
    n = 3

try:
    op = str(operation).lower()  # type: ignore[name-defined]
except NameError:
    op = "all"

# ── Build identity matrix ─────────────────────────────────────
matrix = np.eye(n)
print(f"Identity matrix ({n}x{n}):")
print(matrix)

# ── Operations ─────────────────────────────────────────────────
if op in ("determinant", "all"):
    det = np.linalg.det(matrix)
    print(f"\\nDeterminant: {det}")

if op in ("inverse", "all"):
    inv = np.linalg.inv(matrix)
    print(f"\\nInverse:")
    print(inv)

if op in ("eigenvalues", "all"):
    eigenvalues = np.linalg.eigvals(matrix)
    print(f"\\nEigenvalues: {eigenvalues}")
`,
    },
    {
      path: 'scripts/primes.py',
      language: 'python',
      requiredPackages: [],
      content: `"""Prime number generator using Sieve of Eratosthenes.

Globals:
  limit — upper bound (default 100)
"""

import math

try:
    upper = int(limit)  # type: ignore[name-defined]
except (NameError, TypeError, ValueError):
    upper = 100

if upper < 2:
    print("No primes below 2")
else:
    sieve = [True] * (upper + 1)
    sieve[0] = sieve[1] = False
    for i in range(2, int(math.sqrt(upper)) + 1):
        if sieve[i]:
            for j in range(i * i, upper + 1, i):
                sieve[j] = False

    primes = [i for i, is_prime in enumerate(sieve) if is_prime]
    print(f"Primes up to {upper}: ({len(primes)} found)")
    print(primes)
`,
    },
  ],

  references: [
    {
      path: 'references/LINEAR_ALGEBRA.md',
      content:
        '# Linear Algebra Reference\n\nA square identity matrix has determinant = 1 and is its own inverse.',
      mimeType: 'text/markdown',
    },
  ],
  assets: [],

  githubUrl: 'https://github.com/devs-fixtures/skills/tree/main/math-toolkit',
  stars: 75,
  installedAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  enabled: true,
  assignedAgentIds: [],
  autoActivate: false,
}

// ============================================================================
// Skill: csv-processor
// ============================================================================

/**
 * A CSV processing skill that uses only the standard library.
 * Demonstrates file-based input patterns typical of real skills.
 */
export const csvProcessorSkill: InstalledSkill = {
  id: 'fixture-csv-processor',
  name: 'csv-processor',
  description:
    'Process and summarize CSV data using Python. Compute column statistics, filter rows, and generate reports. Use when working with CSV or tabular data.',
  author: 'devs-fixtures',
  license: 'Apache-2.0',
  metadata: { version: '1.0' },

  skillMdContent: `# CSV Processor

## When to use
Use this skill when the user wants to process CSV data — compute column
statistics, filter rows, aggregate values, or generate summary reports.

## Scripts
- \`scripts/summarize_csv.py\` — Summarize numeric columns of a CSV.
  Arguments: \`csv_data\` (string, CSV content with header row)

## Input format
Pass the raw CSV content (including headers) as the \`csv_data\` argument.

## Example
\`\`\`
run_skill_script(
  skill_name="csv-processor",
  script_path="scripts/summarize_csv.py",
  arguments={"csv_data": "name,age,score\\nAlice,30,95\\nBob,25,87\\nCarol,35,92"}
)
\`\`\`
`,

  scripts: [
    {
      path: 'scripts/summarize_csv.py',
      language: 'python',
      requiredPackages: [],
      content: `"""CSV column summarizer.

Reads a CSV string from the \`csv_data\` global variable, detects numeric
columns, and prints descriptive statistics for each.
"""

import csv
import io
import statistics

try:
    raw = str(csv_data)  # type: ignore[name-defined]
except NameError:
    raw = ""

if not raw.strip():
    print("Error: no csv_data provided")
else:
    reader = csv.DictReader(io.StringIO(raw))
    rows = list(reader)
    headers = reader.fieldnames or []

    print(f"Rows: {len(rows)}")
    print(f"Columns: {headers}")

    for col in headers:
        values = []
        for row in rows:
            try:
                values.append(float(row[col]))
            except (ValueError, TypeError):
                pass

        if values:
            print(f"\\n--- {col} (numeric, {len(values)} values) ---")
            print(f"  Mean:   {statistics.mean(values):.2f}")
            print(f"  Median: {statistics.median(values)}")
            print(f"  Min:    {min(values)}")
            print(f"  Max:    {max(values)}")
            if len(values) > 1:
                print(f"  Stdev:  {statistics.pstdev(values):.2f}")
`,
    },
  ],

  references: [],
  assets: [],

  githubUrl: 'https://github.com/devs-fixtures/skills/tree/main/csv-processor',
  stars: 60,
  installedAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  enabled: true,
  assignedAgentIds: [],
  autoActivate: false,
}

// ============================================================================
// Exported Fixture Collection
// ============================================================================

/**
 * All fixture skills available for conversation tests.
 * Install these into the skill store before running skill tests.
 */
export const FIXTURE_SKILLS: InstalledSkill[] = [
  dataAnalysisSkill,
  textTransformSkill,
  mathToolkitSkill,
  csvProcessorSkill,
]
