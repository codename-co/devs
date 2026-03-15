/**
 * Demo / Task Timeline — Static showcase of a full task execution timeline
 *
 * Displays a realistic, non-interactive timeline featuring:
 * - User prompt → orchestrator analysis
 * - Task steps with ConversationStepTracker
 * - HITL prompts in all states (pending, answered, auto-resolved, dismissed)
 * - Multi-agent messages with agent chips
 * - Final synthesis
 *
 * All data is static — no LLM calls or store writes.
 *
 * @route /demo/timeline
 */

import { Chip, Divider } from '@heroui/react'

import { Container, Icon, Section, Title } from '@/components'
import { MessageBubble, HitlPrompt } from '@/components/chat'
import Layout from '@/layouts/Default'
import type { Agent, HitlRequest, Message } from '@/types'

// ============================================================================
// Mock Agents
// ============================================================================

const orchestrator: Agent = {
  id: 'devs',
  slug: 'devs',
  name: 'DEVS Orchestrator',
  icon: 'Settings',
  role: 'orchestrator',
  instructions: '',
  createdAt: new Date('2026-03-09T09:00:00Z'),
}

const architect: Agent = {
  id: 'architect-1',
  slug: 'software-architect',
  name: 'Software Architect',
  icon: 'DesignPencil',
  role: 'architect',
  instructions: '',
  createdAt: new Date('2026-03-09T09:00:00Z'),
}

const developer: Agent = {
  id: 'developer-1',
  slug: 'senior-developer',
  name: 'Senior Developer',
  icon: 'Code',
  role: 'developer',
  instructions: '',
  createdAt: new Date('2026-03-09T09:00:00Z'),
}

const qaEngineer: Agent = {
  id: 'qa-1',
  slug: 'qa-engineer',
  name: 'QA Engineer',
  icon: 'CheckCircle',
  role: 'qa',
  instructions: '',
  createdAt: new Date('2026-03-09T09:00:00Z'),
}

const agentMap: Record<string, Agent> = {
  [orchestrator.id]: orchestrator,
  [architect.id]: architect,
  [developer.id]: developer,
  [qaEngineer.id]: qaEngineer,
}

// ============================================================================
// Mock Messages
// ============================================================================

const messages: Message[] = [
  // 1. User request
  {
    id: 'msg-1',
    role: 'user',
    content:
      'Build a REST API for a task management system with user authentication, CRUD operations for tasks, and role-based access control.',
    timestamp: '2026-03-09T10:00:00Z',
  },

  // 2. Orchestrator analysis (with steps)
  {
    id: 'msg-2',
    role: 'assistant',
    agentId: orchestrator.id,
    content:
      "I've analyzed your request and broken it down into a multi-agent workflow. Here's the execution plan:\n\n**Complexity:** Complex (multi-pass)\n\n**Identified subtasks:**\n1. **API Architecture Design** — Define endpoints, data models, and auth strategy\n2. **Implementation** — Build the REST API with authentication and RBAC\n3. **Testing & Validation** — Write tests and verify requirements\n\nI'm assembling a team of 3 specialists. Let me confirm the plan with you before proceeding.",
    timestamp: '2026-03-09T10:00:05Z',
    steps: [
      {
        id: 'step-1',
        icon: 'Brain',
        i18nKey: 'Thinking…',
        status: 'completed',
        startedAt: Date.now() - 8000,
        completedAt: Date.now() - 6000,
        thinkingContent:
          'Analyzing the user request... This involves multiple domains: API design, authentication (JWT/sessions), database modeling, and RBAC. This is a complex task requiring multiple agents.',
      },
      {
        id: 'step-2',
        icon: 'SearchEngine',
        i18nKey: 'Analyzing requirements',
        status: 'completed',
        startedAt: Date.now() - 6000,
        completedAt: Date.now() - 4000,
        title: 'Extracted 8 functional requirements, 3 constraints',
      },
      {
        id: 'step-3',
        icon: 'Group',
        i18nKey: 'Recruiting agents',
        status: 'completed',
        startedAt: Date.now() - 4000,
        completedAt: Date.now() - 2000,
        title: 'Assembled team: Architect, Developer, QA Engineer',
      },
    ],
  },

  // 4. Architect's analysis (after HITL approval)
  {
    id: 'msg-4',
    role: 'assistant',
    agentId: architect.id,
    content:
      "## API Architecture Design\n\n### Tech Stack\n- **Runtime:** Node.js + Express\n- **Database:** PostgreSQL with Prisma ORM\n- **Auth:** JWT with refresh tokens\n- **Validation:** Zod schemas\n\n### Endpoints\n\n| Method | Path | Auth | Description |\n|--------|------|------|-------------|\n| POST | `/auth/register` | Public | User registration |\n| POST | `/auth/login` | Public | Login + JWT |\n| GET | `/tasks` | User | List tasks |\n| POST | `/tasks` | User | Create task |\n| PUT | `/tasks/:id` | Owner/Admin | Update task |\n| DELETE | `/tasks/:id` | Admin | Delete task |\n\n### RBAC Model\n```typescript\nenum Role { USER = 'user', ADMIN = 'admin' }\n\n// Middleware\nfunction authorize(...roles: Role[]) {\n  return (req, res, next) => {\n    if (!roles.includes(req.user.role)) {\n      return res.status(403).json({ error: 'Forbidden' })\n    }\n    next()\n  }\n}\n```\n\nArchitecture ready — passing to implementation.",
    timestamp: '2026-03-09T10:01:30Z',
    steps: [
      {
        id: 'step-4',
        icon: 'DesignPencil',
        i18nKey: 'Designing architecture',
        status: 'completed',
        startedAt: Date.now() - 90000,
        completedAt: Date.now() - 70000,
        title: 'Evaluated REST patterns, chose Express + Prisma stack',
      },
      {
        id: 'step-5',
        icon: 'DatabaseScript',
        i18nKey: 'Modeling data',
        status: 'completed',
        startedAt: Date.now() - 70000,
        completedAt: Date.now() - 60000,
        title: 'Defined User, Task, and Role schemas',
      },
    ],
  },

  // 6. Developer's implementation (after HITL choice)
  {
    id: 'msg-6',
    role: 'assistant',
    agentId: developer.id,
    content:
      "## Implementation Complete\n\nI've built the full REST API based on the architect's design:\n\n### Files Created\n- `src/server.ts` — Express app setup with middleware\n- `src/routes/auth.ts` — Registration & login with bcrypt + JWT\n- `src/routes/tasks.ts` — CRUD with authorization middleware\n- `src/middleware/auth.ts` — JWT verification & RBAC guards\n- `src/prisma/schema.prisma` — Database schema\n- `src/validators/` — Zod validation schemas\n\n### Security Measures\n- Password hashing with bcrypt (12 rounds)\n- JWT with 15-min access + 7-day refresh tokens\n- Input validation on all endpoints\n- SQL injection prevention via Prisma\n- Rate limiting on auth endpoints\n\n```typescript\n// Example: Protected route with RBAC\nrouter.delete('/tasks/:id',\n  authenticate,\n  authorize(Role.ADMIN),\n  async (req, res) => {\n    await prisma.task.delete({ where: { id: req.params.id } })\n    res.status(204).send()\n  }\n)\n```\n\nAll endpoints functional — handing off to QA.",
    timestamp: '2026-03-09T10:03:00Z',
    steps: [
      {
        id: 'step-6',
        icon: 'Code',
        i18nKey: 'Implementing',
        status: 'completed',
        startedAt: Date.now() - 120000,
        completedAt: Date.now() - 90000,
        title: 'Built auth module with JWT + bcrypt',
        toolCalls: [
          {
            name: 'write_file',
            input: { path: 'src/routes/auth.ts' },
            output: 'Created auth routes with register/login endpoints',
          },
          {
            name: 'write_file',
            input: { path: 'src/middleware/auth.ts' },
            output: 'Created JWT verification and RBAC middleware',
          },
        ],
      },
      {
        id: 'step-7',
        icon: 'Code',
        i18nKey: 'Implementing',
        status: 'completed',
        startedAt: Date.now() - 90000,
        completedAt: Date.now() - 60000,
        title: 'Built CRUD routes with authorization',
        toolCalls: [
          {
            name: 'write_file',
            input: { path: 'src/routes/tasks.ts' },
            output: 'Created task CRUD with role-based guards',
          },
        ],
      },
    ],
  },

  // 7. QA Engineer's validation
  {
    id: 'msg-7',
    role: 'assistant',
    agentId: qaEngineer.id,
    content:
      "## Test Results\n\n### Test Suite: Task Management API\n\n✅ **Auth Tests** (6/6 passed)\n- Register with valid data → 201\n- Register with duplicate email → 409\n- Login with valid credentials → 200 + JWT\n- Login with wrong password → 401\n- Access protected route without token → 401\n- Refresh token flow → 200 + new tokens\n\n✅ **Task CRUD Tests** (5/5 passed)\n- Create task as authenticated user → 201\n- List tasks with pagination → 200\n- Update own task → 200\n- Update other's task as user → 403\n- Delete task as admin → 204\n\n✅ **RBAC Tests** (4/4 passed)\n- User cannot delete tasks → 403\n- Admin can delete any task → 204\n- Admin can update any task → 200\n- Invalid role in token → 403\n\n**Coverage:** 94.2% | **All 15 tests passing**\n\nAll requirements validated successfully.",
    timestamp: '2026-03-09T10:04:00Z',
    steps: [
      {
        id: 'step-8',
        icon: 'CheckCircle',
        i18nKey: 'Running tests',
        status: 'completed',
        startedAt: Date.now() - 50000,
        completedAt: Date.now() - 30000,
        title: '15/15 tests passing — 94.2% coverage',
        toolCalls: [
          {
            name: 'run_tests',
            input: { command: 'npm test -- --coverage' },
            output: 'All 15 tests passed. Coverage: 94.2%',
          },
        ],
      },
    ],
  },

  // 9. Final synthesis (after HITL confirmation)
  {
    id: 'msg-9',
    role: 'assistant',
    agentId: orchestrator.id,
    content:
      '## Task Complete ✅\n\nYour REST API for the task management system has been built and validated.\n\n### Deliverables\n| Artifact | Status |\n|----------|--------|\n| API Architecture Document | ✅ Complete |\n| Express + Prisma API Implementation | ✅ Complete |\n| JWT Authentication + RBAC | ✅ Complete |\n| Test Suite (15 tests, 94.2% coverage) | ✅ Complete |\n\n### Requirements Satisfied\n- ✅ User authentication (JWT with refresh tokens)\n- ✅ CRUD operations for tasks\n- ✅ Role-based access control (USER/ADMIN)\n- ✅ Input validation (Zod)\n- ✅ Security best practices (bcrypt, rate limiting)\n\n**Next steps:** Run `npx prisma migrate dev` to set up the database, then `npm run dev` to start the server.',
    timestamp: '2026-03-09T10:05:00Z',
  },
]

// ============================================================================
// Mock HITL Requests
// ============================================================================

const hitlRequests: HitlRequest[] = [
  // HITL 1: Approval — plan approval (answered)
  {
    id: 'hitl-1',
    conversationId: 'demo-conv',
    agentId: orchestrator.id,
    type: 'approval',
    question:
      "I'll execute this plan with **3 agents** across **3 subtasks**:\n\n1. 🏗️ **Software Architect** — API architecture & data modeling\n2. 💻 **Senior Developer** — Full implementation\n3. 🧪 **QA Engineer** — Testing & validation\n\nShould I proceed?",
    quickReplies: [
      { label: '✅ Proceed', value: 'proceed', color: 'success' },
      { label: '❌ Cancel', value: 'cancel', color: 'danger' },
      { label: '✏️ Modify plan', value: 'modify', color: 'warning' },
    ],
    status: 'answered',
    response: 'proceed',
    createdAt: '2026-03-09T10:00:10Z',
    resolvedAt: '2026-03-09T10:00:15Z',
  },

  // HITL 2: Choice — tech stack decision (answered with text)
  {
    id: 'hitl-2',
    conversationId: 'demo-conv',
    agentId: architect.id,
    type: 'choice',
    question:
      'Which authentication strategy would you prefer?\n\n- **JWT** — Stateless, scalable, good for SPAs\n- **Session-based** — Server-side state, simpler setup\n- **OAuth 2.0** — Third-party login providers',
    quickReplies: [
      { label: 'JWT', value: 'jwt', color: 'primary' },
      { label: 'Sessions', value: 'sessions' },
      { label: 'OAuth 2.0', value: 'oauth' },
    ],
    status: 'answered',
    response: 'jwt',
    createdAt: '2026-03-09T10:01:35Z',
    resolvedAt: '2026-03-09T10:01:40Z',
  },

  // HITL 3: Confirmation — pre-synthesis (pending — interactive)
  {
    id: 'hitl-3',
    conversationId: 'demo-conv',
    agentId: orchestrator.id,
    type: 'confirmation',
    question:
      'All subtasks are complete and validated:\n\n- ✅ Architecture designed\n- ✅ API implemented\n- ✅ Tests passing (15/15)\n\nShall I compile the final synthesis?',
    quickReplies: [
      { label: 'Compile synthesis', value: 'confirm', color: 'success' },
      { label: 'Review details first', value: 'review', color: 'warning' },
    ],
    status: 'pending',
    createdAt: '2026-03-09T10:04:30Z',
  },

  // HITL 4: Feedback (auto-resolved — YOLO mode example)
  {
    id: 'hitl-4',
    conversationId: 'demo-conv',
    agentId: qaEngineer.id,
    type: 'feedback',
    question:
      'Test coverage is at 94.2%. Would you like me to add more edge case tests to increase coverage, or is this sufficient?',
    quickReplies: [
      { label: 'Looks good', value: 'sufficient', color: 'success' },
      { label: 'Add more tests', value: 'more', color: 'primary' },
    ],
    status: 'auto-resolved',
    response: 'Looks good, proceed',
    createdAt: '2026-03-09T10:04:10Z',
    resolvedAt: '2026-03-09T10:04:10Z',
  },

  // HITL 5: Clarification (dismissed)
  {
    id: 'hitl-5',
    conversationId: 'demo-conv',
    agentId: developer.id,
    type: 'clarification',
    question:
      'Should the API support file attachments on tasks? This would require adding a file upload endpoint and S3/local storage integration.',
    status: 'dismissed',
    createdAt: '2026-03-09T10:02:45Z',
    resolvedAt: '2026-03-09T10:02:50Z',
  },
]

// ============================================================================
// Timeline order: interleave messages and HITL by timestamp
// ============================================================================

type TimelineItem =
  | { type: 'message'; data: Message; timestamp: Date }
  | { type: 'hitl'; data: HitlRequest; timestamp: Date }
  | { type: 'divider'; label: string; timestamp: Date }

function buildTimeline(): TimelineItem[] {
  const items: TimelineItem[] = []

  // Messages
  for (const msg of messages) {
    items.push({
      type: 'message',
      data: msg,
      timestamp: new Date(msg.timestamp),
    })
  }

  // HITL requests
  for (const req of hitlRequests) {
    items.push({
      type: 'hitl',
      data: req,
      timestamp: new Date(req.createdAt),
    })
  }

  // Phase dividers
  items.push({
    type: 'divider',
    label: 'Phase 1 — Architecture',
    timestamp: new Date('2026-03-09T10:01:00Z'),
  })
  items.push({
    type: 'divider',
    label: 'Phase 2 — Implementation',
    timestamp: new Date('2026-03-09T10:02:30Z'),
  })
  items.push({
    type: 'divider',
    label: 'Phase 3 — Testing & Validation',
    timestamp: new Date('2026-03-09T10:03:30Z'),
  })
  items.push({
    type: 'divider',
    label: 'Synthesis',
    timestamp: new Date('2026-03-09T10:04:25Z'),
  })

  return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

const timeline = buildTimeline()

// ============================================================================
// Component
// ============================================================================

export function TaskTimelineDemo() {
  return (
    <Layout
      header={{
        color: 'bg-default-50',
        title: 'Task Timeline Demo',
        subtitle:
          'Static rendering of a full multi-agent task execution with HITL interventions',
      }}
    >
      <Section>
        <Container>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Chip size="sm" variant="flat" color="warning">
              HITL — Pending
            </Chip>
            <Chip size="sm" variant="flat" color="success">
              HITL — Answered
            </Chip>
            <Chip size="sm" variant="flat" color="secondary">
              HITL — Auto-resolved
            </Chip>
            <Chip size="sm" variant="flat" color="default">
              HITL — Dismissed
            </Chip>
          </div>

          <Title level={2}>Multi-Agent Task Execution</Title>
          <p className="text-default-500 mb-8">
            A user requests a REST API. The orchestrator recruits 3 agents,
            plans subtasks, and coordinates execution with human-in-the-loop
            checkpoints throughout the workflow.
          </p>

          {/* Timeline */}
          <div className="flex flex-col gap-6">
            {timeline.map((item, idx) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={`div-${idx}`}
                    className="flex items-center gap-3 my-2"
                  >
                    <Divider className="flex-1" />
                    <Chip
                      size="sm"
                      variant="bordered"
                      startContent={
                        <Icon name="Timer" size="sm" className="ml-1" />
                      }
                    >
                      {item.label}
                    </Chip>
                    <Divider className="flex-1" />
                  </div>
                )
              }

              if (item.type === 'hitl') {
                return (
                  <HitlPrompt
                    key={item.data.id}
                    request={item.data}
                    agent={agentMap[item.data.agentId] ?? null}
                  />
                )
              }

              // Message
              const msg = item.data
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  agent={msg.agentId ? (agentMap[msg.agentId] ?? null) : null}
                  showAgentChip={
                    !!msg.agentId && msg.agentId !== orchestrator.id
                  }
                />
              )
            })}
          </div>
        </Container>
      </Section>
    </Layout>
  )
}
