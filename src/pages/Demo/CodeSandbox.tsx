/**
 * Demo / Code Sandbox — Live Test Suite
 *
 * Interactive page that runs demonstrative examples of the sandbox
 * code execution engine for both JavaScript and Python. Each test
 * case can be run individually or all at once.
 *
 * @route /demo/code
 */

import { useCallback, useMemo, useRef, useState } from 'react'
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
} from '@heroui/react'

import { Container, Icon, Section } from '@/components'
import Layout from '@/layouts/Default'
import { sandbox } from '@/lib/sandbox'
import type {
  SandboxLanguage,
  SandboxRequest,
  SandboxResult,
} from '@/lib/sandbox'

// ============================================================================
// Types
// ============================================================================

interface TestCase {
  id: string
  title: string
  description: string
  language: SandboxLanguage
  category: 'basic' | 'intermediate' | 'advanced'
  request: SandboxRequest
  /** Optional validator — if omitted, success: true is sufficient */
  validate?: (result: SandboxResult) => { pass: boolean; reason?: string }
}

type TestStatus = 'idle' | 'running' | 'passed' | 'failed'

interface TestRunResult {
  status: TestStatus
  result?: SandboxResult
  error?: string
  validationMessage?: string
  durationMs?: number
}

// ============================================================================
// Test Cases
// ============================================================================

const TEST_CASES: TestCase[] = [
  // ── JavaScript · Basic ──────────────────────────────────────────
  {
    id: 'js-hello',
    title: 'Hello World',
    description: 'Basic console.log output',
    language: 'javascript',
    category: 'basic',
    request: {
      language: 'javascript',
      code: 'console.log("Hello from QuickJS!")',
    },
    validate: (r) => ({
      pass: r.console.some((e) =>
        e.args.join(' ').includes('Hello from QuickJS!'),
      ),
      reason: 'Expected console output containing "Hello from QuickJS!"',
    }),
  },
  {
    id: 'js-return-value',
    title: 'Return value via export default',
    description: 'Captures the default export as the result',
    language: 'javascript',
    category: 'basic',
    request: {
      language: 'javascript',
      code: 'export default 42',
    },
    validate: (r) => ({
      pass: r.result === '42',
      reason: `Expected result "42", got "${r.result}"`,
    }),
  },
  {
    id: 'js-arithmetic',
    title: 'Arithmetic expressions',
    description: 'Evaluates arithmetic and returns the result',
    language: 'javascript',
    category: 'basic',
    request: {
      language: 'javascript',
      code: 'export default (2 + 3) * 7 - 1',
    },
    validate: (r) => ({
      pass: r.result === '34',
      reason: `Expected result "34", got "${r.result}"`,
    }),
  },
  {
    id: 'js-string-ops',
    title: 'String operations',
    description: 'Template literals and string methods',
    language: 'javascript',
    category: 'basic',
    request: {
      language: 'javascript',
      code: `
const name = "DEVS"
const greeting = \`Hello, \${name.toLowerCase()}!\`
export default greeting
      `.trim(),
    },
    validate: (r) => ({
      pass: r.result === 'Hello, devs!',
      reason: `Expected "Hello, devs!", got ${r.result}`,
    }),
  },

  // ── JavaScript · Intermediate ───────────────────────────────────
  {
    id: 'js-array-methods',
    title: 'Array higher-order functions',
    description: 'map, filter, reduce on arrays',
    language: 'javascript',
    category: 'intermediate',
    request: {
      language: 'javascript',
      code: `
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const result = data
  .filter(n => n % 2 === 0)
  .map(n => n * n)
  .reduce((sum, n) => sum + n, 0)
export default result
      `.trim(),
    },
    validate: (r) => ({
      pass: r.result === '220',
      reason: `Expected 220 (sum of squares of evens 2-10), got ${r.result}`,
    }),
  },
  {
    id: 'js-json-processing',
    title: 'JSON parse & stringify',
    description: 'Deserialize, transform, and serialize JSON',
    language: 'javascript',
    category: 'intermediate',
    request: {
      language: 'javascript',
      code: `
const input = '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}'
const data = JSON.parse(input)
const names = data.users.map(u => u.name).sort()
export default JSON.stringify(names)
      `.trim(),
    },
    validate: (r) => ({
      pass:
        r.result === '"[\\"Alice\\",\\"Bob\\"]"' ||
        r.result === '["Alice","Bob"]',
      reason: `Expected ["Alice","Bob"], got ${r.result}`,
    }),
  },
  {
    id: 'js-context-injection',
    title: 'Context variable injection',
    description: 'Reads values from the injected `input` variable',
    language: 'javascript',
    category: 'intermediate',
    request: {
      language: 'javascript',
      code: `
const doubled = input.values.map(v => v * 2)
export default doubled
      `.trim(),
      context: { values: [10, 20, 30] },
    },
    validate: (r) => {
      const parsed = r.result
      return {
        pass: parsed === '[20,40,60]' || parsed === '[\n  20,\n  40,\n  60\n]',
        reason: `Expected [20,40,60], got ${parsed}`,
      }
    },
  },
  {
    id: 'js-regex',
    title: 'Regular expressions',
    description: 'Extract data with regex groups',
    language: 'javascript',
    category: 'intermediate',
    request: {
      language: 'javascript',
      code: `
const text = "Orders: #A123, #B456, #C789"
const ids = [...text.matchAll(/#([A-Z]\\d+)/g)].map(m => m[1])
export default ids
      `.trim(),
    },
    validate: (r) => {
      const hasAll =
        !!r.result?.includes('A123') &&
        !!r.result?.includes('B456') &&
        !!r.result?.includes('C789')
      return {
        pass: hasAll,
        reason: `Expected [A123, B456, C789], got ${r.result}`,
      }
    },
  },

  // ── JavaScript · Advanced ───────────────────────────────────────
  {
    id: 'js-higher-order',
    title: 'Higher-order function composition',
    description: 'Compose, pipe, and curried functions',
    language: 'javascript',
    category: 'advanced',
    request: {
      language: 'javascript',
      code: `
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x)
const double = (n) => n * 2
const add10 = (n) => n + 10
const square = (n) => n * n

const transform = pipe(double, add10, square)
const results = [1, 2, 3, 4, 5].map(transform)
export default results
      `.trim(),
    },
    validate: (r) => ({
      // pipe(1) = square(add10(double(1))) = square(12) = 144
      // pipe(2) = square(add10(double(2))) = square(14) = 196
      // pipe(5) = square(add10(double(5))) = square(20) = 400
      pass: !!r.result?.includes('144') && !!r.result?.includes('400'),
      reason: `Expected [144,196,256,324,400], got ${r.result}`,
    }),
  },
  {
    id: 'js-class-oop',
    title: 'Classes & OOP',
    description: 'Class inheritance and method calls',
    language: 'javascript',
    category: 'advanced',
    request: {
      language: 'javascript',
      code: `
class Shape {
  constructor(name) { this.name = name }
  area() { return 0 }
}

class Circle extends Shape {
  constructor(radius) {
    super("circle")
    this.radius = radius
  }
  area() { return Math.PI * this.radius ** 2 }
}

class Rectangle extends Shape {
  constructor(w, h) {
    super("rectangle")
    this.w = w
    this.h = h
  }
  area() { return this.w * this.h }
}

const shapes = [new Circle(5), new Rectangle(4, 6)]
const totalArea = shapes.reduce((sum, s) => sum + s.area(), 0)
export default Math.round(totalArea * 100) / 100
      `.trim(),
    },
    validate: (r) => ({
      pass: r.result === '102.54',
      reason: `Expected 102.54 (π*25 + 24, rounded), got ${r.result}`,
    }),
  },
  {
    id: 'js-generator',
    title: 'Generators & iterators',
    description: 'Fibonacci with generator function',
    language: 'javascript',
    category: 'advanced',
    request: {
      language: 'javascript',
      code: `
function* fibonacci() {
  let a = 0, b = 1
  while (true) {
    yield a;
    [a, b] = [b, a + b]
  }
}

const fib = fibonacci()
const first10 = Array.from({ length: 10 }, () => fib.next().value)
export default first10
      `.trim(),
    },
    validate: (r) => {
      const expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
      const has34 = !!r.result?.includes('34')
      const has0 = !!r.result?.includes('0')
      return {
        pass: has34 && has0,
        reason: `Expected ${JSON.stringify(expected)}, got ${r.result}`,
      }
    },
  },
  {
    id: 'js-error-handling',
    title: 'Error handling (expected failure)',
    description: 'Verifies runtime errors are properly caught',
    language: 'javascript',
    category: 'advanced',
    request: {
      language: 'javascript',
      code: `undefined.property`,
    },
    validate: (r) => ({
      pass: !r.success && !!r.error,
      reason: `Expected a runtime error, got success=${r.success}`,
    }),
  },
  {
    id: 'js-destructuring-spread',
    title: 'Destructuring & spread operators',
    description: 'Modern JS syntax features',
    language: 'javascript',
    category: 'advanced',
    request: {
      language: 'javascript',
      code: `
const config = { host: "localhost", port: 3000, debug: true }
const { host, ...rest } = config
const merged = { ...rest, host: host.toUpperCase(), protocol: "https" }
export default merged
      `.trim(),
    },
    validate: (r) => {
      const hasKeys =
        r.result?.includes('LOCALHOST') && r.result?.includes('protocol')
      return {
        pass: !!hasKeys,
        reason: `Expected object with LOCALHOST and protocol, got ${r.result}`,
      }
    },
  },

  // ── Python · Basic ──────────────────────────────────────────────
  {
    id: 'py-hello',
    title: 'Hello World',
    description: 'Basic print statement',
    language: 'python',
    category: 'basic',
    request: {
      language: 'python',
      code: 'print("Hello from Pyodide!")',
    },
    validate: (r) => ({
      pass: r.stdout.includes('Hello from Pyodide!'),
      reason: `Expected stdout containing "Hello from Pyodide!"`,
    }),
  },
  {
    id: 'py-return-value',
    title: 'Return value (last expression)',
    description:
      'The last expression in a Python script is captured as the result',
    language: 'python',
    category: 'basic',
    request: {
      language: 'python',
      code: '2 ** 10',
    },
    validate: (r) => ({
      pass: r.result === '1024',
      reason: `Expected result "1024", got "${r.result}"`,
    }),
  },
  {
    id: 'py-arithmetic',
    title: 'Arithmetic & math (result)',
    description: 'Math operations — result captured via last expression',
    language: 'python',
    category: 'basic',
    request: {
      language: 'python',
      code: `
import math
round(math.sqrt(144) + math.pi, 4)
      `.trim(),
    },
    validate: (r) => ({
      pass: r.result === '15.1416',
      reason: `Expected result "15.1416", got "${r.result}"`,
    }),
  },
  {
    id: 'py-string-formatting',
    title: 'String formatting',
    description: 'f-strings and string methods',
    language: 'python',
    category: 'basic',
    request: {
      language: 'python',
      code: `
name = "World"
greeting = f"Hello, {name.upper()}!"
reversed_name = name[::-1]
print(greeting)
print(f"Reversed: {reversed_name}")
      `.trim(),
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('Hello, WORLD!') &&
        r.stdout.includes('Reversed: dlroW'),
      reason: 'Expected greeting and reversed string',
    }),
  },
  {
    id: 'py-list-operations',
    title: 'List operations (result + stdout)',
    description:
      'List comprehensions — prints details, returns sum via last expression',
    language: 'python',
    category: 'basic',
    request: {
      language: 'python',
      code: `
numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
unique_sorted = sorted(set(numbers))
squares = [x**2 for x in unique_sorted]
print(f"Sorted unique: {unique_sorted}")
print(f"Squares: {squares}")
sum(squares)
      `.trim(),
    },
    validate: (r) => ({
      pass: r.result === '172' && r.stdout.includes('Squares:'),
      reason: `Expected result "172" and Squares in stdout, got result="${r.result}"`,
    }),
  },

  // ── Python · Intermediate ───────────────────────────────────────
  {
    id: 'py-dict-result',
    title: 'Dictionary result',
    description: 'Returns a dict as the last expression',
    language: 'python',
    category: 'intermediate',
    request: {
      language: 'python',
      code: `
scores = {"Alice": 85, "Bob": 92, "Charlie": 78, "Diana": 95, "Eve": 88}
{name: score for name, score in scores.items() if score >= 90}
      `.trim(),
    },
    validate: (r) => ({
      pass: !!r.result?.includes('Bob') && !!r.result?.includes('Diana'),
      reason: `Expected dict with Bob:92, Diana:95 in result, got "${r.result}"`,
    }),
  },
  {
    id: 'py-dict-comprehension',
    title: 'Dictionary comprehensions',
    description: 'Transform and filter dictionaries',
    language: 'python',
    category: 'intermediate',
    request: {
      language: 'python',
      code: `
scores = {"Alice": 85, "Bob": 92, "Charlie": 78, "Diana": 95, "Eve": 88}
honors = {name: score for name, score in scores.items() if score >= 88}
print(f"Honors: {honors}")
print(f"Average: {sum(honors.values()) / len(honors):.1f}")
      `.trim(),
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('Bob') &&
        r.stdout.includes('Diana') &&
        r.stdout.includes('Eve'),
      reason: 'Expected Bob, Diana, Eve in honors',
    }),
  },
  {
    id: 'py-classes',
    title: 'Classes & dataclasses',
    description: 'OOP with Python dataclasses',
    language: 'python',
    category: 'intermediate',
    request: {
      language: 'python',
      code: `
from dataclasses import dataclass, field

@dataclass
class Task:
    title: str
    priority: int
    tags: list = field(default_factory=list)

    @property
    def is_urgent(self):
        return self.priority >= 8

tasks = [
    Task("Deploy v2", 9, ["ops", "release"]),
    Task("Write docs", 5, ["docs"]),
    Task("Fix bug #42", 8, ["bugfix"]),
]
urgent = [t.title for t in tasks if t.is_urgent]
print(f"Urgent tasks: {urgent}")
print(f"All tags: {sorted({tag for t in tasks for tag in t.tags})}")
      `.trim(),
    },
    validate: (r) => ({
      pass: r.stdout.includes('Deploy v2') && r.stdout.includes('Fix bug #42'),
      reason: 'Expected urgent tasks in output',
    }),
  },
  {
    id: 'py-exception-handling',
    title: 'Exception handling',
    description: 'try/except/finally with custom exceptions',
    language: 'python',
    category: 'intermediate',
    request: {
      language: 'python',
      code: `
class ValidationError(Exception):
    def __init__(self, field, message):
        self.field = field
        super().__init__(f"{field}: {message}")

def validate_age(age):
    if not isinstance(age, int):
        raise ValidationError("age", "must be an integer")
    if age < 0 or age > 150:
        raise ValidationError("age", f"invalid value {age}")
    return True

test_values = [25, -5, 200, "abc", 42]
for val in test_values:
    try:
        validate_age(val)
        print(f"  {val!r} -> OK")
    except ValidationError as e:
        print(f"  {val!r} -> Error: {e}")
    except Exception as e:
        print(f"  {val!r} -> Unexpected: {e}")
      `.trim(),
    },
    validate: (r) => ({
      pass: r.stdout.includes('OK') && r.stdout.includes('Error:'),
      reason: 'Expected both OK and Error outputs',
    }),
  },
  {
    id: 'py-generators',
    title: 'Generators & itertools',
    description: 'Lazy iteration with generators',
    language: 'python',
    category: 'intermediate',
    request: {
      language: 'python',
      code: `
from itertools import islice

def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

fib_20 = list(islice(fibonacci(), 20))
print(f"First 20 Fibonacci: {fib_20}")
print(f"Sum: {sum(fib_20)}")
      `.trim(),
    },
    validate: (r) => ({
      pass: r.stdout.includes('4181') && r.stdout.includes('Sum: 10945'),
      reason: 'Expected fib(19)=4181 and sum=17710 in output',
    }),
  },

  // ── Python · Advanced ───────────────────────────────────────────
  {
    id: 'py-decorators',
    title: 'Decorators & closures',
    description: 'Function decorators with arguments',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
import functools
import time

def memoize(func):
    cache = {}
    @functools.wraps(func)
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    wrapper.cache = cache
    return wrapper

@memoize
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

results = [fib(i) for i in range(30)]
print(f"fib(29) = {results[-1]}")
print(f"Cache size: {len(fib.cache)}")
      `.trim(),
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('fib(29) = 514229') &&
        r.stdout.includes('Cache size: 30'),
      reason: 'Expected fib(29)=514229 with 30 cached values',
    }),
  },
  {
    id: 'py-context-managers',
    title: 'Context managers',
    description: 'Custom context manager with __enter__/__exit__',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
from contextlib import contextmanager

@contextmanager
def transaction(name):
    print(f"BEGIN {name}")
    try:
        yield name
        print(f"COMMIT {name}")
    except Exception as e:
        print(f"ROLLBACK {name}: {e}")

with transaction("tx1") as tx:
    print(f"  Working in {tx}...")

try:
    with transaction("tx2") as tx:
        print(f"  Working in {tx}...")
        raise ValueError("something went wrong")
except ValueError:
    pass

print("Done.")
      `.trim(),
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('COMMIT tx1') && r.stdout.includes('ROLLBACK tx2'),
      reason: 'Expected COMMIT for tx1 and ROLLBACK for tx2',
    }),
  },
  {
    id: 'py-collections',
    title: 'Advanced collections',
    description: 'Counter, defaultdict, and namedtuple',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
from collections import Counter, defaultdict, namedtuple

# Counter
words = "the quick brown fox jumps over the lazy dog".split()
word_counts = Counter(words)
print(f"Top 3: {word_counts.most_common(3)}")

# defaultdict
graph = defaultdict(list)
edges = [("a","b"), ("a","c"), ("b","c"), ("c","d")]
for src, dst in edges:
    graph[src].append(dst)
print(f"Graph: {dict(graph)}")

# namedtuple
Point = namedtuple("Point", ["x", "y"])
p1, p2 = Point(3, 4), Point(6, 8)
distance = ((p2.x - p1.x)**2 + (p2.y - p1.y)**2) ** 0.5
print(f"Distance: {distance}")
      `.trim(),
    },
    validate: (r) => ({
      pass: r.stdout.includes('Top 3') && r.stdout.includes('Distance: 5.0'),
      reason: 'Expected Counter top 3 and distance = 5.0',
    }),
  },
  {
    id: 'py-error-expected',
    title: 'Runtime error (expected failure)',
    description: 'Verifies Python errors are properly reported',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `x = 1 / 0`,
    },
    validate: (r) => ({
      pass: !r.success && (!!r.error || r.stderr.includes('ZeroDivision')),
      reason: `Expected ZeroDivisionError, got success=${r.success}`,
    }),
  },
  {
    id: 'py-async',
    title: 'Async / await',
    description: 'Asyncio coroutines (Pyodide supports top-level await)',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
import asyncio

async def compute(n):
    await asyncio.sleep(0)
    return n ** 2

async def main():
    tasks = [compute(i) for i in range(1, 6)]
    results = await asyncio.gather(*tasks)
    print(f"Squares: {results}")
    print(f"Total: {sum(results)}")

await main()
      `.trim(),
    },
    validate: (r) => ({
      pass: r.stdout.includes('Total: 55'),
      reason: 'Expected sum of squares 1²+2²+3²+4²+5² = 55',
    }),
  },
  {
    id: 'py-json-processing',
    title: 'JSON data processing',
    description: 'Parse, transform, and output JSON data',
    language: 'python',
    category: 'intermediate',
    request: {
      language: 'python',
      code: `
import json

data = {
    "team": "DEVS",
    "members": [
        {"name": "Alice", "role": "architect", "skills": ["python", "rust"]},
        {"name": "Bob", "role": "developer", "skills": ["javascript", "typescript"]},
        {"name": "Charlie", "role": "qa", "skills": ["python", "selenium"]},
    ]
}

# Find all unique skills
all_skills = sorted({s for m in data["members"] for s in m["skills"]})
python_devs = [m["name"] for m in data["members"] if "python" in m["skills"]]

print(f"All skills: {all_skills}")
print(f"Python devs: {python_devs}")
print(json.dumps({"skill_count": len(all_skills)}, indent=2))
      `.trim(),
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('skill_count') && r.stdout.includes('Python devs'),
      reason: 'Expected skill analysis output',
    }),
  },

  // ── Python · PIL ────────────────────────────────────────────────
  {
    id: 'py-pil',
    title: 'PIL (Pillow) — image creation',
    description: 'Import PIL and create an in-memory image',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
from PIL import Image, ImageDraw

img = Image.new("RGB", (100, 100), color="navy")
draw = ImageDraw.Draw(img)
draw.rectangle([10, 10, 90, 90], fill="gold", outline="white")
draw.ellipse([25, 25, 75, 75], fill="crimson")

print(f"Image size: {img.size}")
print(f"Mode: {img.mode}")
print(f"Pixel at center: {img.getpixel((50, 50))}")
      `.trim(),
      packages: ['pillow'],
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('Image size: (100, 100)') &&
        r.stdout.includes('Mode: RGB'),
      reason: 'Expected 100x100 RGB image info in output',
    }),
  },

  // ── Python · Well-known packages ────────────────────────────────
  {
    id: 'py-numpy',
    title: 'NumPy — array operations',
    description: 'Import numpy for matrix math',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
import numpy as np

a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])

product = a @ b  # matrix multiply
det = np.linalg.det(a)
eigenvalues = np.linalg.eigvals(a)

print(f"Matrix product:\\n{product}")
print(f"Determinant of a: {det:.1f}")
print(f"Eigenvalues of a: {np.sort(eigenvalues)}")
print(f"Sum of all elements: {product.sum()}")
      `.trim(),
      packages: ['numpy'],
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('Determinant of a: -2.0') &&
        r.stdout.includes('Sum of all elements:'),
      reason: 'Expected determinant = -2.0 and sum output',
    }),
  },
  {
    id: 'py-pandas',
    title: 'Pandas — DataFrame operations',
    description: 'Import pandas for tabular data analysis',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie", "Diana"],
    "score": [92, 85, 78, 95],
    "department": ["eng", "eng", "sales", "sales"],
})

avg_by_dept = df.groupby("department")["score"].mean()
top_scorer = df.loc[df["score"].idxmax()]

print(f"Average by department:\\n{avg_by_dept}")
print(f"\\nTop scorer: {top_scorer['name']} ({top_scorer['score']})")
print(f"Shape: {df.shape}")
      `.trim(),
      packages: ['pandas'],
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('Top scorer: Diana (95)') &&
        r.stdout.includes('Shape: (4,'),
      reason: 'Expected Diana as top scorer and shape (4, 3)',
    }),
  },
  {
    id: 'py-sympy',
    title: 'SymPy — symbolic math',
    description: 'Import sympy for symbolic algebra and calculus',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
from sympy import symbols, expand, factor, diff, integrate, sqrt, pi

x = symbols("x")

# Polynomial expansion
expr = (x + 1) ** 3
expanded = expand(expr)
factored = factor(expanded)
print(f"Expanded: {expanded}")
print(f"Factored: {factored}")

# Calculus
derivative = diff(x**3 + 2*x**2 - x + 7, x)
integral = integrate(x**2, (x, 0, 3))
print(f"Derivative of x³+2x²−x+7: {derivative}")
print(f"Integral of x² from 0 to 3: {integral}")
      `.trim(),
      packages: ['sympy'],
    },
    validate: (r) => ({
      pass:
        r.stdout.includes('(x + 1)**3') &&
        r.stdout.includes('Integral of') &&
        r.stdout.includes('9'),
      reason: 'Expected factored form and integral = 9',
    }),
  },
  {
    id: 'py-regex-yaml',
    title: 'regex + PyYAML — parsing',
    description: 'Import regex and yaml for data parsing',
    language: 'python',
    category: 'intermediate',
    request: {
      language: 'python',
      code: `
import yaml
import regex

# Parse YAML
config_str = """
app:
  name: DEVS
  version: 2.0
  features:
    - sandbox
    - agents
    - sync
"""
config = yaml.safe_load(config_str)
print(f"App: {config['app']['name']} v{config['app']['version']}")
print(f"Features: {config['app']['features']}")

# Advanced regex with Unicode support
pattern = regex.compile(r"\\p{Lu}\\p{Ll}+")
text = "Hello World über Straße Ñoño"
matches = pattern.findall(text)
print(f"Capitalized words: {matches}")
      `.trim(),
      packages: ['pyyaml', 'regex'],
    },
    validate: (r) => ({
      pass: r.stdout.includes('DEVS v2.0') && r.stdout.includes('sandbox'),
      reason: 'Expected DEVS config and features in output',
    }),
  },
  {
    id: 'py-networkx',
    title: 'NetworkX — graph algorithms',
    description: 'Import networkx for graph theory computations',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
import networkx as nx

G = nx.DiGraph()
edges = [
    ("start", "A", 4), ("start", "B", 2),
    ("A", "C", 5), ("A", "D", 10),
    ("B", "A", 1), ("B", "D", 8),
    ("C", "end", 3),
    ("D", "C", 2), ("D", "end", 6),
]
G.add_weighted_edges_from(edges)

shortest = nx.shortest_path(G, "start", "end", weight="weight")
length = nx.shortest_path_length(G, "start", "end", weight="weight")
is_dag = nx.is_directed_acyclic_graph(G)

print(f"Shortest path: {' → '.join(shortest)}")
print(f"Path length: {length}")
print(f"Is DAG: {is_dag}")
print(f"Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")
      `.trim(),
      packages: ['networkx'],
    },
    validate: (r) => ({
      pass: r.stdout.includes('Shortest path:') && r.stdout.includes('Is DAG:'),
      reason: 'Expected shortest path and DAG analysis in output',
    }),
  },
  {
    id: 'py-scipy',
    title: 'SciPy — scientific computing',
    description: 'Import scipy for optimization and statistics',
    language: 'python',
    category: 'advanced',
    request: {
      language: 'python',
      code: `
import numpy as np
from scipy import optimize, stats

# Find root of f(x) = x³ - 2x - 5
def f(x):
    return x**3 - 2*x - 5

root = optimize.brentq(f, 1, 3)
print(f"Root of x³-2x-5: {root:.6f}")

# Normal distribution
data = np.array([2.3, 2.5, 2.8, 3.1, 2.7, 2.9, 3.0, 2.6])
mean, std = np.mean(data), np.std(data, ddof=1)
t_stat, p_value = stats.ttest_1samp(data, 2.5)
print(f"Mean: {mean:.2f}, Std: {std:.2f}")
print(f"T-test (μ=2.5): t={t_stat:.3f}, p={p_value:.4f}")
      `.trim(),
      packages: ['numpy', 'scipy'],
    },
    validate: (r) => ({
      pass: r.stdout.includes('Root of') && r.stdout.includes('T-test'),
      reason: 'Expected root finding and t-test results',
    }),
  },
]

// ============================================================================
// Helpers
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const CATEGORY_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  basic: 'success',
  intermediate: 'warning',
  advanced: 'danger',
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
  test: TestCase
  run: TestRunResult
  onRun: () => void
}) {
  const isRunning = run.status === 'running'
  const statusColor = STATUS_COLORS[run.status]

  return (
    <Card className="w-full" shadow="sm">
      <CardHeader className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <Chip size="sm" variant="flat" color={CATEGORY_COLORS[test.category]}>
            {CATEGORY_LABELS[test.category]}
          </Chip>
          <Chip
            size="sm"
            variant="flat"
            color={test.language === 'javascript' ? 'warning' : 'primary'}
          >
            {test.language === 'javascript' ? 'JS' : 'PY'}
          </Chip>
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
        <Snippet
          size="sm"
          variant="flat"
          hideSymbol
          classNames={{
            base: 'w-full',
            pre: 'whitespace-pre-wrap text-xs max-h-48 overflow-auto',
          }}
        >
          {test.request.code}
        </Snippet>

        {/* ── Inputs (context, packages, files) ── */}
        {(test.request.context ||
          test.request.packages?.length ||
          test.request.files?.length) && (
          <div className="space-y-1">
            {test.request.context && (
              <div>
                <p className="text-xs font-mono text-default-500 mb-0.5">
                  context (input):
                </p>
                <pre className="text-xs bg-primary-50 dark:bg-primary-50/10 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(test.request.context, null, 2)}
                </pre>
              </div>
            )}
            {test.request.packages && test.request.packages.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-mono text-default-500">
                  packages:
                </span>
                {test.request.packages.map((pkg) => (
                  <Chip key={pkg} size="sm" variant="flat" color="secondary">
                    {pkg}
                  </Chip>
                ))}
              </div>
            )}
            {test.request.files && test.request.files.length > 0 && (
              <div>
                <p className="text-xs font-mono text-default-500 mb-0.5">
                  files:
                </p>
                {test.request.files.map((f) => (
                  <div key={f.path} className="mb-1">
                    <Chip size="sm" variant="flat" className="mb-0.5">
                      {f.path}
                    </Chip>
                    <pre className="text-xs bg-primary-50 dark:bg-primary-50/10 rounded p-2 max-h-24 overflow-auto whitespace-pre-wrap">
                      {f.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {run.result && (
          <div className="mt-2 space-y-1">
            {run.durationMs !== undefined && (
              <p className="text-xs text-default-400">
                ⏱ {run.durationMs.toFixed(0)} ms
              </p>
            )}
            {run.result.stdout && (
              <div>
                <p className="text-xs font-mono text-default-500 mb-0.5">
                  stdout:
                </p>
                <pre className="text-xs bg-default-100 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                  {run.result.stdout}
                </pre>
              </div>
            )}
            {run.result.result !== undefined && (
              <div>
                <p className="text-xs font-mono text-default-500 mb-0.5">
                  result:
                </p>
                <pre className="text-xs bg-default-100 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                  {run.result.result}
                </pre>
              </div>
            )}
            {run.result.console.length > 0 && (
              <div>
                <p className="text-xs font-mono text-default-500 mb-0.5">
                  console:
                </p>
                <pre className="text-xs bg-default-100 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                  {run.result.console
                    .map((e) => `[${e.type}] ${e.args.join(' ')}`)
                    .join('\n')}
                </pre>
              </div>
            )}
            {(run.result.error || run.result.stderr) && (
              <div>
                <p className="text-xs font-mono text-danger mb-0.5">error:</p>
                <pre className="text-xs bg-danger-50 text-danger rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
                  {run.result.error || run.result.stderr}
                </pre>
              </div>
            )}
            {run.validationMessage && run.status === 'failed' && (
              <p className="text-xs text-danger mt-1">
                Validation: {run.validationMessage}
              </p>
            )}
          </div>
        )}

        {run.error && !run.result && (
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

export function CodeSandboxPage() {
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

  const runTest = useCallback(
    async (test: TestCase) => {
      updateRun(test.id, {
        status: 'running',
        result: undefined,
        error: undefined,
        validationMessage: undefined,
      })
      const start = performance.now()
      try {
        const result = await sandbox.execute(test.request)
        const durationMs = performance.now() - start

        if (test.validate) {
          const validation = test.validate(result)
          updateRun(test.id, {
            status: validation.pass ? 'passed' : 'failed',
            result,
            durationMs,
            validationMessage: validation.pass ? undefined : validation.reason,
          })
        } else {
          updateRun(test.id, {
            status: result.success ? 'passed' : 'failed',
            result,
            durationMs,
          })
        }
      } catch (err) {
        updateRun(test.id, {
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          durationMs: performance.now() - start,
        })
      }
    },
    [updateRun],
  )

  /**
   * Run a list of tests sequentially for a single runtime.
   * Each runtime (language) must run one test at a time since the
   * underlying engines (Pyodide Worker, QuickJS module) are not
   * re-entrant.
   */
  const runSequential = useCallback(
    async (tests: TestCase[]) => {
      for (const test of tests) {
        if (abortRef.current) return
        await runTest(test)
      }
    },
    [runTest],
  )

  /**
   * Run tests with per-language parallelism.
   * Different language runtimes execute concurrently (Python + JS at the
   * same time) but tests within the same language run sequentially to
   * avoid corrupting shared runtime state.
   */
  const runBatch = useCallback(
    async (tests: TestCase[]) => {
      setGlobalRunning(true)
      abortRef.current = false

      // Group tests by language so each language stream is sequential
      const byLanguage = new Map<SandboxLanguage, TestCase[]>()
      for (const test of tests) {
        const group = byLanguage.get(test.language) ?? []
        group.push(test)
        byLanguage.set(test.language, group)
      }

      // Run all language groups in parallel
      await Promise.all(
        [...byLanguage.values()].map((group) => runSequential(group)),
      )
      setGlobalRunning(false)
    },
    [runSequential],
  )

  const runAll = useCallback(() => runBatch([...TEST_CASES]), [runBatch])

  const runFiltered = useCallback(
    (filter: (t: TestCase) => boolean) => runBatch(TEST_CASES.filter(filter)),
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

  // Stats
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

  const jsCases = TEST_CASES.filter((t) => t.language === 'javascript')
  const pyCases = TEST_CASES.filter((t) => t.language === 'python')
  const languageCount = new Set(TEST_CASES.map((t) => t.language)).size

  return (
    <Layout
      header={{
        title: 'Sandbox Test Suite',
        subtitle: 'Live tests for the polyglot code execution engine',
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
              color="warning"
              variant="flat"
              onPress={() => runFiltered((t) => t.language === 'javascript')}
              isDisabled={globalRunning}
            >
              Run JS ({jsCases.length})
            </Button>
            <Button
              color="primary"
              variant="flat"
              onPress={() => runFiltered((t) => t.language === 'python')}
              isDisabled={globalRunning}
            >
              Run Python ({pyCases.length})
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
            <Chip variant="flat" color="default" size="sm">
              {languageCount} runtimes in parallel
            </Chip>
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

          {/* ── Test cases by language ──────────────────────── */}
          <Tabs
            aria-label="Language"
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
            <Tab key="javascript" title={`JavaScript (${jsCases.length})`}>
              <div className="grid gap-4 md:grid-cols-2">
                {jsCases.map((test) => (
                  <TestCaseCard
                    key={test.id}
                    test={test}
                    run={runs[test.id] ?? { status: 'idle' }}
                    onRun={() => runTest(test)}
                  />
                ))}
              </div>
            </Tab>
            <Tab key="python" title={`Python (${pyCases.length})`}>
              <div className="grid gap-4 md:grid-cols-2">
                {pyCases.map((test) => (
                  <TestCaseCard
                    key={test.id}
                    test={test}
                    run={runs[test.id] ?? { status: 'idle' }}
                    onRun={() => runTest(test)}
                  />
                ))}
              </div>
            </Tab>
          </Tabs>
        </Container>
      </Section>
    </Layout>
  )
}

export default CodeSandboxPage
