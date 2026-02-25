/**
 * Demo / Conversation Tests — Live Conversation Test Suite
 *
 * Interactive page that runs demonstrative examples of conversations
 * with the LLM, exercising both basic chat and tool-augmented skills
 * (no code, JavaScript code, Python code, with & without dependencies).
 *
 * Each test sends a user prompt, receives a streamed response, and
 * validates the result against expected criteria.
 *
 * @route /demo/conversations
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Progress,
  Snippet,
  Spinner,
  Tab,
  Tabs,
  Tooltip,
} from '@heroui/react'

import { Container, Icon, MarkdownRenderer, Section } from '@/components'
import Layout from '@/layouts/Default'
import { useI18n } from '@/i18n'
import { LLMService } from '@/lib/llm'
import type { LLMMessage } from '@/lib/llm'
import { CredentialService } from '@/lib/credential-service'
import { submitChat, ResponseUpdate } from '@/lib/chat'
import { TraceService } from '@/features/traces/trace-service'
import { getAgentByIdAsync } from '@/stores/agentStore'
import {
  installSkill,
  uninstallSkill,
  getSkillByName,
} from '@/stores/skillStore'
import type { Agent } from '@/types'
import { FIXTURE_SKILLS } from './fixtures/skills'

/**
 * Default agent ID for tool-enabled tests.
 * Must NOT be 'devs' to avoid triggering task orchestration.
 */
const TOOL_TEST_AGENT_ID = 'software-architect'

/**
 * Number of tests to execute concurrently.
 * Uses the browser's reported CPU core count for optimal throughput.
 */
const cpuCores = navigator.hardwareConcurrency || 1

// ============================================================================
// Types
// ============================================================================

interface ConversationTest {
  id: string
  title: string
  description: string
  category: TestCategory
  /** The user prompt to send */
  prompt: string
  /**
   * Optional system prompt override.
   * When set, the test uses raw LLM.streamChat (no tools).
   * When omitted, the test uses submitChat (with tools).
   */
  systemPrompt?: string
  /**
   * When true, uses submitChat (full skill pipeline with tools).
   * When false/omitted, uses raw LLM.streamChat.
   */
  useTools?: boolean
  /** Agent ID to use (defaults to 'software-architect') */
  agentId?: string
  /**
   * Optional setup function called before running the test.
   * Use to install fixture data (e.g. skills) and return a teardown function.
   */
  setup?: () => (() => void) | void
  /** Validates the LLM response */
  validate?: (response: string, statuses: string[]) => ValidationResult
}

type TestCategory =
  | 'basic'
  | 'reasoning'
  | 'skill-no-code'
  | 'skill-js'
  | 'skill-python'
  | 'skill-python-deps'
  | 'skill-agent'

type TestStatus = 'idle' | 'running' | 'passed' | 'failed'

interface ValidationResult {
  pass: boolean
  reason?: string
}

interface TraceInfo {
  id: string
  name: string
}

interface TestRunResult {
  status: TestStatus
  response?: string
  statuses?: string[]
  error?: string
  validationMessage?: string
  durationMs?: number
  traces?: TraceInfo[]
}

// ============================================================================
// Test Cases
// ============================================================================

const TEST_CASES: ConversationTest[] = [
  // ── Basic conversations ─────────────────────────────────────────
  {
    id: 'basic-greeting',
    title: 'Simple greeting',
    description: 'Responds to a basic hello message',
    category: 'basic',
    prompt:
      'Hello! Please respond with exactly: "Hello! How can I help you today?"',
    systemPrompt:
      'You are a helpful assistant. Follow user instructions exactly.',
    validate: (r) => ({
      pass:
        r.toLowerCase().includes('hello') && r.toLowerCase().includes('help'),
      reason: 'Expected a greeting response containing "hello" and "help"',
    }),
  },
  {
    id: 'basic-identity',
    title: 'Identity awareness',
    description: 'The LLM can understand and follow a persona',
    category: 'basic',
    prompt: 'What is your name?',
    systemPrompt:
      'Your name is DEVS Assistant. Always introduce yourself by name when asked.',
    validate: (r) => ({
      pass: r.includes('DEVS'),
      reason: 'Expected response to mention "DEVS"',
    }),
  },
  {
    id: 'basic-short-answer',
    title: 'Factual short answer',
    description: 'Answers a simple factual question concisely',
    category: 'basic',
    prompt:
      'What is the capital of France? Reply with ONLY the city name, nothing else.',
    systemPrompt:
      'You are a concise assistant. Answer in as few words as possible.',
    validate: (r) => ({
      pass: r.includes('Paris'),
      reason: `Expected "Paris" in response, got: "${r.slice(0, 100)}"`,
    }),
  },
  {
    id: 'basic-list',
    title: 'Structured list output',
    description: 'Produces a numbered or bulleted list',
    category: 'basic',
    prompt: 'List exactly 3 primary colors. Use a numbered list (1. 2. 3.).',
    systemPrompt:
      'You are a helpful assistant. Follow formatting instructions precisely.',
    validate: (r) => {
      const hasRed = /red/i.test(r)
      const hasBlue = /blue/i.test(r)
      const hasYellow = /yellow/i.test(r)
      const hasNumbers = /1\.|2\.|3\./.test(r)
      return {
        pass:
          hasRed && hasBlue && hasNumbers && (hasYellow || /green/i.test(r)),
        reason: 'Expected a numbered list of primary colors',
      }
    },
  },
  {
    id: 'basic-json',
    title: 'JSON output',
    description: 'Generates valid JSON when asked',
    category: 'basic',
    prompt:
      'Return a JSON object with keys "name" (value "DEVS"), "version" (value 2), "features" (array of "agents", "sandbox", "sync"). Return ONLY the JSON, no markdown code fences.',
    systemPrompt:
      'You output raw JSON when asked. No markdown, no explanation.',
    validate: (r) => {
      try {
        // Try to extract JSON from the response (may have surrounding text)
        const jsonMatch = r.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return { pass: false, reason: 'No JSON object found' }
        const parsed = JSON.parse(jsonMatch[0])
        return {
          pass:
            parsed.name === 'DEVS' &&
            parsed.version === 2 &&
            Array.isArray(parsed.features),
          reason: `Parsed JSON but structure didn't match: ${JSON.stringify(parsed).slice(0, 200)}`,
        }
      } catch (e) {
        return {
          pass: false,
          reason: `Invalid JSON: ${(e as Error).message}`,
        }
      }
    },
  },
  {
    id: 'basic-multilingual',
    title: 'Multilingual response',
    description: 'Responds in the requested language',
    category: 'basic',
    prompt:
      'Say "thank you" in French, Spanish, and Japanese. Format: "Language: translation" on each line.',
    systemPrompt: 'You are a multilingual assistant.',
    validate: (r) => {
      const hasFrench = /merci/i.test(r)
      const hasSpanish = /gracias/i.test(r)
      const hasJapanese = /ありがとう|arigatou/i.test(r)
      return {
        pass: hasFrench && hasSpanish && hasJapanese,
        reason: 'Expected "merci", "gracias", and "ありがとう"',
      }
    },
  },

  // ── Reasoning ───────────────────────────────────────────────────
  {
    id: 'reasoning-math',
    title: 'Mental arithmetic',
    description: 'Solves arithmetic without tools',
    category: 'reasoning',
    prompt:
      'What is 17 * 23? Show your work briefly, then give the final answer on its own line as "Answer: <number>".',
    systemPrompt:
      'You are a math tutor. Always show work and end with "Answer: <number>".',
    validate: (r) => ({
      pass: r.includes('391'),
      reason: `Expected 391 (17*23) in response`,
    }),
  },
  {
    id: 'reasoning-logic',
    title: 'Logic puzzle',
    description: 'Solves a simple logic problem',
    category: 'reasoning',
    prompt:
      'If all roses are flowers, and some flowers fade quickly, can we conclude that some roses fade quickly? Answer "Yes" or "No" and explain in one sentence.',
    systemPrompt: 'You are a logic tutor. Be precise.',
    validate: (r) => ({
      pass: /no/i.test(r),
      reason: 'Expected "No" — this is an invalid syllogism',
    }),
  },
  {
    id: 'reasoning-code-explain',
    title: 'Code comprehension',
    description: 'Explains what a code snippet does',
    category: 'reasoning',
    prompt: `What does this JavaScript function return for input [3, 1, 4, 1, 5]?

function f(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

Give only the numeric result.`,
    systemPrompt: 'You are a code analysis assistant. Be precise.',
    validate: (r) => ({
      pass: r.includes('2.8'),
      reason: 'Expected 2.8 (average of [3,1,4,1,5] = 14/5)',
    }),
  },
  {
    id: 'reasoning-word-problem',
    title: 'Word problem',
    description: 'Solves a simple word problem',
    category: 'reasoning',
    prompt:
      'A train leaves station A at 9:00 AM at 60 km/h. Another train leaves station B (300 km away) at 10:00 AM at 90 km/h towards station A. At what time do they meet? Give the answer as a time (e.g. "11:30 AM").',
    systemPrompt: 'You are a math tutor. Show work briefly.',
    validate: (r) => {
      // By 10 AM, train A is 60km in (at 240km from B). Combined speed = 150 km/h.
      // 240 / 150 = 1.6 hours = 1h 36min from 10:00 = 11:36 AM
      const has1136 = /11:36/i.test(r)
      return {
        pass: has1136,
        reason: 'Expected "11:36 AM"',
      }
    },
  },

  // ── Skill tests — no code ───────────────────────────────────────
  {
    id: 'skill-no-code-knowledge',
    title: 'Tool-free knowledge recall',
    description: 'Uses submitChat pipeline without triggering code tools',
    category: 'skill-no-code',
    prompt:
      'Briefly explain what a Turing machine is in 2-3 sentences. Do NOT use any tools or code execution.',
    useTools: true,
    validate: (r) => ({
      pass:
        /turing/i.test(r) &&
        (r.includes('tape') ||
          r.includes('compute') ||
          r.includes('abstract') ||
          r.includes('machine') ||
          r.includes('model')),
      reason: 'Expected explanation mentioning Turing machine concepts',
    }),
  },
  {
    id: 'skill-no-code-summarize',
    title: 'Text summarization (no tools)',
    description: 'Summarizes text without code execution',
    category: 'skill-no-code',
    prompt: `Summarize this paragraph in one sentence:

"The Internet of Things (IoT) refers to the network of physical objects—devices, vehicles, appliances, and other items—embedded with sensors, software, and connectivity, allowing them to collect and exchange data. IoT enables objects to be sensed and controlled remotely across existing network infrastructure, creating opportunities for more direct integration of the physical world into computer-based systems."`,
    useTools: true,
    validate: (r) => ({
      pass: /IoT|Internet of Things/i.test(r) && r.length < 500,
      reason: 'Expected a concise summary mentioning IoT',
    }),
  },

  // ── Skill tests — JavaScript code execution ─────────────────────
  {
    id: 'skill-js-basic',
    title: 'JS code execution — basic',
    description: 'Triggers JavaScript code execution via the execute tool',
    category: 'skill-js',
    prompt:
      'Use the execute tool to calculate the sum of numbers from 1 to 100. Return the result.',
    useTools: true,
    validate: (r) => ({
      pass: r.includes('5050'),
      reason: 'Expected 5050 (sum of 1..100)',
    }),
  },
  {
    id: 'skill-js-array',
    title: 'JS code execution — array processing',
    description: 'Uses code execution to process an array',
    category: 'skill-js',
    prompt:
      'Use the execute tool to find the 3 most common words in "the quick brown fox jumps over the lazy dog". Return the words and their counts.',
    useTools: true,
    validate: (r) => {
      const hasThe = /the.*3|3.*the/i.test(r)
      return {
        pass: hasThe,
        reason: 'Expected "the" with count 3',
      }
    },
  },
  {
    id: 'skill-js-fibonacci',
    title: 'JS code execution — algorithm',
    description: 'Computes Fibonacci sequence via code execution',
    category: 'skill-js',
    prompt:
      'Use the execute tool to compute the first 15 Fibonacci numbers and return them as an array.',
    useTools: true,
    validate: (r) => ({
      pass: r.includes('610') && (r.includes('0') || r.includes('1')),
      reason: 'Expected Fibonacci sequence including 610 (fib(15))',
    }),
  },

  // ── Skill tests — Python code execution ─────────────────────────
  {
    id: 'skill-py-basic',
    title: 'Python code execution — basic',
    description: 'Triggers Python code execution via the execute tool',
    category: 'skill-python',
    prompt:
      'Use the execute tool with Python to calculate the factorial of 20. Return the result.',
    useTools: true,
    validate: (r) => ({
      pass: r.includes('2432902008176640000'),
      reason: 'Expected 20! = 2432902008176640000',
    }),
  },
  {
    id: 'skill-py-list-comprehension',
    title: 'Python code execution — list processing',
    description: 'Uses Python for list comprehension',
    category: 'skill-python',
    prompt:
      'Use the execute tool with Python to find all prime numbers between 1 and 50. Return the list.',
    useTools: true,
    validate: (r) => {
      const has47 = r.includes('47')
      const has2 = r.includes('2')
      const has13 = r.includes('13')
      return {
        pass: has47 && has2 && has13,
        reason: 'Expected prime numbers including 2, 13, 47',
      }
    },
  },
  {
    id: 'skill-py-string',
    title: 'Python code execution — string ops',
    description: 'String manipulation with Python',
    category: 'skill-python',
    prompt:
      'Use the execute tool with Python to reverse the string "Hello DEVS Platform" and count the vowels in the original. Return both results.',
    useTools: true,
    validate: (r) => {
      const hasReversed = /mroftalP SVED olleH/i.test(r)
      const hasVowelCount = /5|five/i.test(r)
      return {
        pass: hasReversed || hasVowelCount,
        reason: 'Expected reversed string and/or vowel count of 5',
      }
    },
  },

  // ── Skill tests — Python with dependencies ──────────────────────
  {
    id: 'skill-py-deps-basic',
    title: 'Python + deps — math with numpy',
    description: 'Python code execution using the numpy package',
    category: 'skill-python-deps',
    prompt:
      'Use the execute tool with Python and numpy to create a 3x3 identity matrix and compute its determinant. Show the matrix and the determinant.',
    useTools: true,
    validate: (r) => {
      const hasDet = /1\.0|1(?!\d)/.test(r)
      const hasIdentity =
        /identity|eye/i.test(r) || /\[\[1/.test(r) || r.includes('1., 0., 0.')
      return {
        pass: hasDet && hasIdentity,
        reason: 'Expected 3x3 identity matrix with determinant = 1',
      }
    },
  },
  {
    id: 'skill-py-deps-statistics',
    title: 'Python + deps — statistics',
    description: 'Uses Python with statistics/math packages',
    category: 'skill-python-deps',
    prompt:
      'Use the execute tool with Python to compute the mean, median, and standard deviation of [4, 8, 15, 16, 23, 42]. Use the statistics module.',
    useTools: true,
    validate: (r) => {
      // Mean = 18.0, Median = 15.5
      const hasMean = r.includes('18')
      const hasMedian = r.includes('15.5')
      return {
        pass: hasMean && hasMedian,
        reason: 'Expected mean=18 and median=15.5',
      }
    },
  },
  {
    id: 'skill-py-deps-json',
    title: 'Python + deps — data transformation',
    description: 'Python code execution with JSON and collections',
    category: 'skill-python-deps',
    prompt:
      'Use the execute tool with Python and the collections module to count character frequencies in "abracadabra" and return the top 3 most common characters with their counts.',
    useTools: true,
    validate: (r) => {
      const hasA = /a.*5|5.*a/i.test(r)
      const hasB = /b.*2|2.*b/i.test(r)
      return {
        pass: hasA && hasB,
        reason: 'Expected "a": 5, "b": 2 in character frequency',
      }
    },
  },

  // ── Skill tests — Agent Skills (fixture-based) ────────────────
  {
    id: 'skill-agent-activate-data-analysis',
    title: 'Activate data-analysis skill',
    description:
      'The LLM activates the data-analysis skill and runs its script on a dataset',
    category: 'skill-agent',
    useTools: true,
    setup: ensureFixtureSkillsInstalled,
    prompt:
      'I have these numbers: [10, 20, 30, 40, 50, 100]. ' +
      'Use the data-analysis skill to analyze them. ' +
      'First activate the skill, then run its scripts/analyze.py script with the data argument set to [10, 20, 30, 40, 50, 100].',
    validate: (r) => {
      // Mean of [10,20,30,40,50,100] = 250/6 ≈ 41.6667
      const hasMean = /41\.66|41\.67/i.test(r)
      const hasMedian = /35/i.test(r) // median of sorted [10,20,30,40,50,100] = (30+40)/2 = 35
      const hasCount = /\b6\b/.test(r)
      return {
        pass: hasMean || hasMedian || hasCount,
        reason:
          'Expected statistical summary with mean ≈ 41.67, median = 35, or count = 6',
      }
    },
  },
  {
    id: 'skill-agent-text-word-freq',
    title: 'Text skill — word frequency',
    description:
      'Uses the text-transform skill to compute word frequency on a passage',
    category: 'skill-agent',
    useTools: true,
    setup: ensureFixtureSkillsInstalled,
    prompt:
      'Activate the text-transform skill, then run its word_frequency.py script ' +
      'on this text: "the cat sat on the mat and the cat sat". ' +
      'Pass the text as the "text" argument. Report what the script outputs.',
    validate: (r) => {
      // "the" appears 3 times, "cat" and "sat" appear 2 times
      const hasThe = /the.*3|3.*the/i.test(r)
      const hasCat = /cat.*2|2.*cat/i.test(r)
      return {
        pass: hasThe || hasCat,
        reason: 'Expected "the": 3) or "cat": 2 in frequency output',
      }
    },
  },
  {
    id: 'skill-agent-text-stats',
    title: 'Text skill — text statistics',
    description: 'Uses the text-transform skill to compute text metrics',
    category: 'skill-agent',
    useTools: true,
    setup: ensureFixtureSkillsInstalled,
    prompt:
      'Activate the text-transform skill and run its text_stats.py script ' +
      'with text argument: "Hello world. This is a test.". ' +
      'Report the character count, word count, and sentence count.',
    validate: (r) => {
      // "Hello world. This is a test." = 28 chars, 6 words, 2 sentences
      const hasWords = /\b6\b/.test(r)
      const hasSentences = /\b2\b/.test(r)
      return {
        pass: hasWords && hasSentences,
        reason: 'Expected 6 words and 2 sentences',
      }
    },
  },
  {
    id: 'skill-agent-math-matrix',
    title: 'Math skill — matrix determinant (numpy)',
    description:
      'Uses the math-toolkit skill with NumPy to compute a matrix determinant',
    category: 'skill-agent',
    useTools: true,
    setup: ensureFixtureSkillsInstalled,
    prompt:
      'Activate the math-toolkit skill and run its scripts/matrix_ops.py ' +
      'with arguments: size=4 and operation="determinant". ' +
      'Show the matrix and the determinant value.',
    validate: (r) => {
      // 4x4 identity matrix has determinant = 1.0
      const hasDet = /1\.0|determinant.*1(?!\d)/i.test(r)
      const hasMatrix = /identity|eye|\[\[1/i.test(r)
      return {
        pass: hasDet || hasMatrix,
        reason: 'Expected 4×4 identity matrix with determinant = 1.0',
      }
    },
  },
  {
    id: 'skill-agent-math-primes',
    title: 'Math skill — prime generation',
    description: 'Uses the math-toolkit skill to generate primes up to 50',
    category: 'skill-agent',
    useTools: true,
    setup: ensureFixtureSkillsInstalled,
    prompt:
      'Activate the math-toolkit skill and run its scripts/primes.py ' +
      'with limit=50. List all the primes found.',
    validate: (r) => {
      // Primes up to 50: 2,3,5,7,11,13,17,19,23,29,31,37,41,43,47 (15 primes)
      const has47 = r.includes('47')
      const has2 = r.includes('2')
      return {
        pass: has47 && has2,
        reason: 'Expected primes up to 50 including 2 and 47',
      }
    },
  },
  {
    id: 'skill-agent-csv-summary',
    title: 'CSV skill — column statistics',
    description: 'Uses the csv-processor skill to summarize CSV data',
    category: 'skill-agent',
    useTools: true,
    setup: ensureFixtureSkillsInstalled,
    prompt:
      'Activate the csv-processor skill and run its scripts/summarize_csv.py ' +
      'with this csv_data argument: "name,age,score\\nAlice,30,95\\nBob,25,87\\nCarol,35,92\\nDave,28,78". ' +
      'Show the summary statistics for each numeric column.',
    validate: (r) => {
      // Age mean = (30+25+35+28)/4 = 29.5, Score mean = (95+87+92+78)/4 = 88.0
      const hasAgeMean = /29\.5/i.test(r)
      const hasScoreMean = /88/i.test(r)
      const hasRows = /\b4\b/.test(r)
      return {
        pass: (hasAgeMean || hasScoreMean) && hasRows,
        reason: 'Expected age mean ≈ 29.5 or score mean = 88, and 4 rows',
      }
    },
  },
]

// ============================================================================
// Skill Fixture Setup
// ============================================================================

/**
 * Reference-counted fixture skill installer.
 *
 * Multiple concurrent tests may call `ensureFixtureSkillsInstalled` in
 * parallel.  The ref-count guarantees skills are installed on the first
 * acquire and only uninstalled when the **last** test releases.
 */
let _fixtureRefCount = 0
let _fixtureInstalledIds: string[] = []

function ensureFixtureSkillsInstalled(): () => void {
  _fixtureRefCount++

  if (_fixtureRefCount === 1) {
    // First acquirer — actually install
    _fixtureInstalledIds = []
    for (const skill of FIXTURE_SKILLS) {
      if (!getSkillByName(skill.name)) {
        installSkill({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          author: skill.author,
          license: skill.license,
          metadata: skill.metadata,
          skillMdContent: skill.skillMdContent,
          scripts: skill.scripts,
          references: skill.references,
          assets: skill.assets,
          githubUrl: skill.githubUrl,
          stars: skill.stars,
        })
        _fixtureInstalledIds.push(skill.id)
      }
    }
  }

  return () => {
    _fixtureRefCount = Math.max(0, _fixtureRefCount - 1)
    if (_fixtureRefCount === 0) {
      for (const id of _fixtureInstalledIds) {
        uninstallSkill(id)
      }
      _fixtureInstalledIds = []
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

const CATEGORY_LABELS: Record<TestCategory, string> = {
  basic: 'Basic Chat',
  reasoning: 'Reasoning',
  'skill-no-code': 'Skills (No Code)',
  'skill-js': 'Skills (JavaScript)',
  'skill-python': 'Skills (Python)',
  'skill-python-deps': 'Skills (Python + Deps)',
  'skill-agent': 'Agent Skills',
}

const CATEGORY_COLORS: Record<
  TestCategory,
  'success' | 'warning' | 'danger' | 'primary' | 'secondary' | 'default'
> = {
  basic: 'success',
  reasoning: 'primary',
  'skill-no-code': 'default',
  'skill-js': 'warning',
  'skill-python': 'secondary',
  'skill-python-deps': 'danger',
  'skill-agent': 'primary',
}

const STATUS_COLORS: Record<
  TestStatus,
  'default' | 'primary' | 'success' | 'danger'
> = {
  idle: 'default',
  running: 'primary',
  passed: 'success',
  failed: 'danger',
}

const STATUS_LABELS: Record<TestStatus, string> = {
  idle: 'Pending',
  running: 'Running…',
  passed: 'Passed',
  failed: 'Failed',
}

// ============================================================================
// Components
// ============================================================================

function TestCaseCard({
  test,
  run,
  onRun,
}: {
  test: ConversationTest
  run: TestRunResult
  onRun: () => void
}) {
  const isRunning = run.status === 'running'
  const statusColor = STATUS_COLORS[run.status]
  const location = useLocation()

  return (
    <Card className="w-full" shadow="sm">
      <CardHeader className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <Chip size="sm" variant="flat" color={CATEGORY_COLORS[test.category]}>
            {CATEGORY_LABELS[test.category]}
          </Chip>
          {test.useTools && (
            <Chip size="sm" variant="flat" color="warning">
              Tools
            </Chip>
          )}
          <span className="font-semibold text-sm truncate">{test.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Chip size="sm" variant="dot" color={statusColor}>
            {STATUS_LABELS[run.status]}
          </Chip>
          <Button
            size="sm"
            color="primary"
            variant="flat"
            isLoading={isRunning}
            onPress={onRun}
            isDisabled={isRunning}
          >
            Run
          </Button>
        </div>
      </CardHeader>
      <CardBody className="pt-0 gap-2">
        <p className="text-xs text-default-500">{test.description}</p>

        {/* ── Prompt ── */}
        <Snippet
          size="sm"
          variant="flat"
          hideSymbol
          classNames={{
            base: 'w-full',
            pre: 'whitespace-pre-wrap text-xs max-h-32 overflow-auto',
          }}
        >
          {test.prompt}
        </Snippet>

        {/* ── System prompt ── */}
        {test.systemPrompt && (
          <div>
            <p className="text-xs font-mono text-default-500 mb-0.5">system:</p>
            <pre className="text-xs bg-primary-50 dark:bg-primary-50/10 rounded p-2 max-h-20 overflow-auto whitespace-pre-wrap">
              {test.systemPrompt}
            </pre>
          </div>
        )}

        {/* ── Status updates during run ── */}
        {run.statuses && run.statuses.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {run.statuses.map((s, i) => (
              <Chip key={i} size="sm" variant="flat" color="secondary">
                {s}
              </Chip>
            ))}
          </div>
        )}

        {/* ── Response ── */}
        {run.response && (
          <div className="mt-2 space-y-1">
            {run.durationMs !== undefined && (
              <p className="text-xs text-default-400">
                {(run.durationMs / 1000).toFixed(1)}s
              </p>
            )}
            <div className="bg-default-100 rounded p-3 max-h-64 overflow-auto">
              <MarkdownRenderer
                content={run.response}
                className="text-sm"
                renderWidgets={false}
              />
            </div>
            {run.validationMessage && run.status === 'failed' && (
              <p className="text-xs text-danger mt-1">
                Validation: {run.validationMessage}
              </p>
            )}

            {/* ── Trace links ── */}
            {run.traces && run.traces.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <span className="text-xs text-default-400">Traces:</span>
                {run.traces.map((trace) => (
                  <Tooltip key={trace.id} content={trace.name}>
                    <Button
                      as={Link}
                      to={`${location.pathname}${location.search}#settings/traces/logs/${trace.id}`}
                      size="sm"
                      variant="light"
                      className="min-w-0 h-5 px-1 gap-0.5 opacity-60 hover:opacity-100"
                    >
                      <Icon name="Activity" size="sm" />
                      <span className="text-xs truncate max-w-[120px]">
                        {trace.name}
                      </span>
                    </Button>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {run.error && !run.response && (
          <pre className="text-xs bg-danger-50 text-danger rounded p-2 mt-2 whitespace-pre-wrap">
            {run.error}
          </pre>
        )}
      </CardBody>
    </Card>
  )
}

// ============================================================================
// Page
// ============================================================================

export function ConversationTestsPage() {
  const { t, lang } = useI18n()
  const [runs, setRuns] = useState<Record<string, TestRunResult>>({})
  const [globalRunning, setGlobalRunning] = useState(false)
  const abortRef = useRef(false)

  const updateRun = useCallback(
    (id: string, update: Partial<TestRunResult>) => {
      setRuns((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...update } as TestRunResult,
      }))
    },
    [],
  )

  // ── Execute a single raw LLM test (no tools) ──────────────────
  const runRawTest = useCallback(
    async (test: ConversationTest) => {
      const config = await CredentialService.getActiveConfig()
      if (!config) {
        updateRun(test.id, {
          status: 'failed',
          error: 'No AI provider configured. Please configure one in Settings.',
        })
        return
      }

      const messages: LLMMessage[] = []
      if (test.systemPrompt) {
        messages.push({ role: 'system', content: test.systemPrompt })
      }
      messages.push({ role: 'user', content: test.prompt })

      let fullResponse = ''
      for await (const chunk of LLMService.streamChat(messages, config)) {
        if (abortRef.current) return
        fullResponse += chunk
        updateRun(test.id, { response: fullResponse })
      }

      return fullResponse
    },
    [updateRun],
  )

  // ── Execute a single tool-enabled test (submitChat) ────────────
  const runToolTest = useCallback(
    async (test: ConversationTest) => {
      const agentId = test.agentId ?? TOOL_TEST_AGENT_ID
      const agent: Agent | null = await getAgentByIdAsync(agentId)

      if (!agent) {
        updateRun(test.id, {
          status: 'failed',
          error: `Agent "${agentId}" not found. Make sure built-in agents are available.`,
        })
        return
      }

      const statuses: string[] = []
      let fullResponse = ''

      const result = await submitChat({
        prompt: test.prompt,
        agent,
        conversationMessages: [],
        includeHistory: false,
        lang,
        t,
        onResponseUpdate: (update: ResponseUpdate) => {
          if (update.type === 'content') {
            fullResponse = update.content
            updateRun(test.id, { response: fullResponse })
          } else if (update.type === 'status') {
            statuses.push(update.status.i18nKey)
            updateRun(test.id, { statuses: [...statuses] })
          }
        },
        onPromptClear: () => {},
      })

      if (!result.success && !fullResponse) {
        throw new Error(result.error || 'submitChat failed')
      }

      return fullResponse
    },
    [lang, t, updateRun],
  )

  // ── Run a single test ──────────────────────────────────────────
  const runTest = useCallback(
    async (test: ConversationTest) => {
      updateRun(test.id, {
        status: 'running',
        response: undefined,
        error: undefined,
        statuses: undefined,
        validationMessage: undefined,
        traces: undefined,
      })
      const start = performance.now()

      // Snapshot existing trace IDs so we can diff after the run.
      // This is parallel-safe — time-range queries would overlap with
      // concurrent tests and produce duplicate trace references.
      let preTraceIds: Set<string> = new Set()
      try {
        const preTraces = await TraceService.getTraces()
        preTraceIds = new Set(preTraces.map((t) => t.id))
      } catch {
        // Non-critical
      }

      // Run optional setup (e.g. install fixture skills)
      let teardown: (() => void) | void
      try {
        teardown = test.setup?.()
      } catch (setupErr) {
        updateRun(test.id, {
          status: 'failed',
          error: `Setup failed: ${setupErr instanceof Error ? setupErr.message : String(setupErr)}`,
        })
        return
      }

      try {
        const fullResponse = test.useTools
          ? await runToolTest(test)
          : await runRawTest(test)

        if (abortRef.current) return

        const durationMs = performance.now() - start
        const response = fullResponse ?? ''

        // Collect only the NEW traces created during this specific test
        let traceInfos: TraceInfo[] = []
        try {
          const allTraces = await TraceService.getTraces()
          traceInfos = allTraces
            .filter((t) => !preTraceIds.has(t.id))
            .map((t) => ({ id: t.id, name: t.name }))
        } catch {
          // Non-critical — traces may not be available
        }

        if (test.validate) {
          const runs_state = runs[test.id]
          const validation = test.validate(response, runs_state?.statuses ?? [])
          updateRun(test.id, {
            status: validation.pass ? 'passed' : 'failed',
            response,
            durationMs,
            traces: traceInfos,
            validationMessage: validation.pass ? undefined : validation.reason,
          })
        } else {
          updateRun(test.id, {
            status: response ? 'passed' : 'failed',
            response,
            durationMs,
            traces: traceInfos,
          })
        }
      } catch (err) {
        if (abortRef.current) return
        updateRun(test.id, {
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          durationMs: performance.now() - start,
        })
      } finally {
        // Run teardown (e.g. uninstall fixture skills)
        if (typeof teardown === 'function') {
          try {
            teardown()
          } catch {
            // Teardown errors are non-critical
          }
        }
      }
    },
    [updateRun, runRawTest, runToolTest, runs],
  )

  // ── Run tests concurrently (worker-pool) ───────────────────────
  const runConcurrent = useCallback(
    async (tests: ConversationTest[], concurrency: number) => {
      const queue = [...tests]
      const workers = Array.from(
        { length: Math.min(concurrency, queue.length) },
        async () => {
          while (queue.length > 0) {
            if (abortRef.current) return
            const test = queue.shift()!
            await runTest(test)
          }
        },
      )
      await Promise.all(workers)
    },
    [runTest],
  )

  // ── Batch run with concurrency ─────────────────────────────────
  const runBatch = useCallback(
    async (tests: ConversationTest[]) => {
      setGlobalRunning(true)
      abortRef.current = false
      await runConcurrent(tests, cpuCores)
      setGlobalRunning(false)
    },
    [runConcurrent],
  )

  const runAll = useCallback(() => runBatch([...TEST_CASES]), [runBatch])

  const runFiltered = useCallback(
    (filter: (t: ConversationTest) => boolean) =>
      runBatch(TEST_CASES.filter(filter)),
    [runBatch],
  )

  const stopAll = useCallback(() => {
    abortRef.current = true
    setGlobalRunning(false)
  }, [])

  const resetAll = useCallback(() => {
    abortRef.current = true
    setGlobalRunning(false)
    setRuns({})
  }, [])

  // ── Stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = TEST_CASES.length
    const passed = Object.values(runs).filter(
      (r) => r.status === 'passed',
    ).length
    const failed = Object.values(runs).filter(
      (r) => r.status === 'failed',
    ).length
    const running = Object.values(runs).filter(
      (r) => r.status === 'running',
    ).length
    const pending = total - passed - failed - running
    return { total, passed, failed, running, pending }
  }, [runs])

  // ── Category helpers ───────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = [...new Set(TEST_CASES.map((t) => t.category))]
    return cats.map((cat) => ({
      key: cat,
      label: CATEGORY_LABELS[cat],
      tests: TEST_CASES.filter((t) => t.category === cat),
    }))
  }, [])

  const basicTests = TEST_CASES.filter(
    (t) => t.category === 'basic' || t.category === 'reasoning',
  )
  const skillTests = TEST_CASES.filter((t) => t.category.startsWith('skill-'))
  const agentSkillTests = TEST_CASES.filter((t) => t.category === 'skill-agent')

  return (
    <Layout
      header={{
        title: 'Conversation Test Suite',
        subtitle: 'Live tests for LLM conversations & skill execution',
      }}
    >
      <Section>
        <Container>
          {/* ── Controls ───────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              color="primary"
              onPress={runAll}
              isLoading={globalRunning}
              isDisabled={globalRunning}
              startContent={
                !globalRunning ? <Icon name="Play" size="sm" /> : undefined
              }
            >
              Run All ({stats.total})
            </Button>
            <Button
              color="success"
              variant="flat"
              onPress={() =>
                runFiltered(
                  (t) => t.category === 'basic' || t.category === 'reasoning',
                )
              }
              isDisabled={globalRunning}
            >
              Basic ({basicTests.length})
            </Button>
            <Button
              color="warning"
              variant="flat"
              onPress={() =>
                runFiltered((t) => t.category.startsWith('skill-'))
              }
              isDisabled={globalRunning}
            >
              Skills ({skillTests.length})
            </Button>
            <Button
              color="primary"
              variant="flat"
              onPress={() => runFiltered((t) => t.category === 'skill-agent')}
              isDisabled={globalRunning}
            >
              Agent Skills ({agentSkillTests.length})
            </Button>
            {globalRunning && (
              <Button color="danger" variant="flat" onPress={stopAll}>
                Stop
              </Button>
            )}
            <Button
              variant="light"
              onPress={resetAll}
              isDisabled={globalRunning}
            >
              Reset
            </Button>
          </div>

          {/* ── Stats bar ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Chip variant="flat" color="success" size="sm">
              {stats.passed} passed
            </Chip>
            <Chip variant="flat" color="danger" size="sm">
              {stats.failed} failed
            </Chip>
            <Chip variant="flat" color="default" size="sm">
              {stats.pending} pending
            </Chip>
            {stats.running > 0 && (
              <Chip
                variant="flat"
                color="primary"
                size="sm"
                startContent={<Spinner size="sm" />}
              >
                {stats.running} running
              </Chip>
            )}
            <Chip variant="flat" color="secondary" size="sm">
              {cpuCores}× concurrency
            </Chip>
            {stats.passed + stats.failed > 0 && (
              <Progress
                size="sm"
                className="max-w-xs"
                color={stats.failed > 0 ? 'danger' : 'success'}
                value={((stats.passed + stats.failed) / stats.total) * 100}
                label={`${stats.passed + stats.failed} / ${stats.total}`}
                showValueLabel
              />
            )}
          </div>

          <Divider className="my-4" />

          {/* ── Test cases by category ─────────────────────── */}
          <Tabs
            aria-label="Category"
            variant="underlined"
            color="primary"
            classNames={{ panel: 'pt-4' }}
          >
            <Tab key="all" title={`All (${TEST_CASES.length})`}>
              <div className="grid gap-4 md:grid-cols-2">
                {TEST_CASES.map((test) => (
                  <TestCaseCard
                    key={test.id}
                    test={test}
                    run={runs[test.id] ?? { status: 'idle' }}
                    onRun={() => runTest(test)}
                  />
                ))}
              </div>
            </Tab>
            {categories.map((cat) => (
              <Tab key={cat.key} title={`${cat.label} (${cat.tests.length})`}>
                <div className="grid gap-4 md:grid-cols-2">
                  {cat.tests.map((test) => (
                    <TestCaseCard
                      key={test.id}
                      test={test}
                      run={runs[test.id] ?? { status: 'idle' }}
                      onRun={() => runTest(test)}
                    />
                  ))}
                </div>
              </Tab>
            ))}
          </Tabs>
        </Container>
      </Section>
    </Layout>
  )
}

export default ConversationTestsPage
