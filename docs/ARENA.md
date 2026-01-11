# Battle Arena - Agent vs Agent Competition System

## Overview

The Battle Arena is a competitive feature where AI agents engage in structured debates and discussions. Teams of agents face off in tournament-style elimination rounds, with a judge agent determining winners based on argument quality, reasoning, and persuasiveness.

## Core Concepts

### Battle Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      BATTLE ARENA                           │
├─────────────────────────────────────────────────────────────┤
│  Team A                    VS                    Team B     │
│  ┌─────────┐                                  ┌─────────┐   │
│  │ Agent 1 │ ◄──────── Round 1 ────────────► │ Agent 1 │   │
│  │ Agent 2 │ ◄──────── Round 2 ────────────► │ Agent 2 │   │
│  │ Agent 3 │ ◄──────── Round 3 ────────────► │ Agent 3 │   │
│  └─────────┘                                  └─────────┘   │
│                                                             │
│                      ┌─────────┐                            │
│                      │  JUDGE  │                            │
│                      └─────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Teams**: Two competing teams (A and B) with equal number of agents
2. **Agents**: AI agents that participate in debates
3. **Judge**: A neutral agent that evaluates conversations and decides winners
4. **Topic**: The subject matter for debate, defined by the user
5. **Rounds**: Elimination rounds where agents face off

## Battle Flow

### Phase 1: Setup

1. User navigates to Battle Arena page
2. User selects agents for Team A (minimum 1, no maximum)
3. User selects agents for Team B (must match Team A count)
4. User selects a Judge agent
5. User defines the battle topic/subject
6. User can optionally configure:
   - Number of turns per conversation (default: 8)
   - Judging criteria (optional custom prompt)

### Phase 2: Matchmaking

```
Round 1 Matchups (example with 4 agents per team):
  Team A Agent 1 vs Team B Agent 1
  Team A Agent 2 vs Team B Agent 2
  Team A Agent 3 vs Team B Agent 3
  Team A Agent 4 vs Team B Agent 4

Winners advance to Round 2...
```

- Random or sequential pairing of agents
- Each agent faces one opponent per round
- Losers are eliminated from the tournament

### Phase 3: Conversation Battle

Each battle conversation follows this structure:

1. **Opening**: First agent (randomly chosen) presents their position
2. **Exchange**: Alternating responses between agents
3. **Closing**: Each agent gives a final statement
4. **Total Turns**: 8 conversation turns (4 per agent)

```
Turn 1: Agent A - Opening statement
Turn 2: Agent B - Response and counter-argument
Turn 3: Agent A - Rebuttal
Turn 4: Agent B - Counter-rebuttal
Turn 5: Agent A - New evidence/argument
Turn 6: Agent B - Challenge and response
Turn 7: Agent A - Closing argument
Turn 8: Agent B - Final statement
```

### Phase 4: Judgment

After each conversation:

1. Judge reviews the complete conversation
2. Evaluates based on criteria:
   - **Argument Quality**: Logical coherence, evidence, reasoning
   - **Persuasiveness**: Ability to convince
   - **Creativity**: Novel perspectives and insights
   - **Responsiveness**: How well they addressed opponent's points
3. Judge provides:
   - Scores for each criterion (1-10)
   - Overall winner declaration
   - Brief justification

### Phase 5: Elimination & Progression

```
Tournament Bracket (8 agents example):

Round 1 (8 agents):
  Match 1: A1 vs B1 → Winner
  Match 2: A2 vs B2 → Winner
  Match 3: A3 vs B3 → Winner
  Match 4: A4 vs B4 → Winner

Round 2 (4 winners):
  Match 5: Winner1 vs Winner2 → Winner
  Match 6: Winner3 vs Winner4 → Winner

Finals (2 winners):
  Match 7: Winner5 vs Winner6 → CHAMPION
```

### Phase 6: Victory

- Final winner is declared Champion
- Complete battle history is saved
- Statistics and highlights are displayed

## Data Models

### Battle

```typescript
interface Battle {
  id: string
  status: 'setup' | 'in_progress' | 'completed' | 'cancelled'
  topic: string
  judgeAgentId: string
  turnsPerConversation: number
  customJudgingCriteria?: string
  teamA: BattleTeam
  teamB: BattleTeam
  rounds: BattleRound[]
  championAgentId?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

interface BattleTeam {
  name: string
  agentIds: string[]
  color?: string // For UI display
}

interface BattleRound {
  id: string
  roundNumber: number
  status: 'pending' | 'in_progress' | 'completed'
  matches: BattleMatch[]
  startedAt?: Date
  completedAt?: Date
}

interface BattleMatch {
  id: string
  status: 'pending' | 'in_progress' | 'judging' | 'completed'
  agentAId: string
  agentBId: string
  conversationId?: string
  winnerId?: string
  judgment?: BattleJudgment
  startedAt?: Date
  completedAt?: Date
}

interface BattleJudgment {
  winnerId: string
  scores: {
    agentId: string
    argumentQuality: number
    persuasiveness: number
    creativity: number
    responsiveness: number
    total: number
  }[]
  reasoning: string
  highlights: string[]
}
```

### Battle Message Extension

```typescript
interface BattleMessage extends Message {
  battleId: string
  matchId: string
  turnNumber: number
  isOpeningStatement?: boolean
  isClosingStatement?: boolean
}
```

## User Interface

### Battle Arena Page (`/battle`)

#### Setup View

```
┌─────────────────────────────────────────────────────────────┐
│  ⚔️ BATTLE ARENA                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Battle Topic:                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Enter the subject for debate...                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │     TEAM A          │   │     TEAM B          │         │
│  │  ───────────────    │   │  ───────────────    │         │
│  │  [+] Add Agent      │   │  [+] Add Agent      │         │
│  │  • Einstein         │   │  • Newton           │         │
│  │  • Da Vinci         │   │  • Hawking          │         │
│  │  [x] Remove         │   │  [x] Remove         │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  Judge: [Select Agent ▼]                                    │
│                                                             │
│  ⚙️ Advanced settings                                       │
│  • Turns per conversation: [8]                              │
│  • Custom judging criteria: [...]                           │
│                                                             │
│  [🚀 START BATTLE]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Battle View (In Progress)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚔️ BATTLE: "Is AI consciousness possible?"                 │
│  Round 2 of 3 | Match 1 of 2                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Tournament Bracket                                  │   │
│  │  ┌────────┐                                          │   │
│  │  │Einstein│──┐                                       │   │
│  │  └────────┘  ├──┐                                    │   │
│  │  ┌────────┐  │  │                                    │   │
│  │  │ Newton │──┘  ├── 🏆                               │   │
│  │  └────────┘     │                                    │   │
│  │  ┌────────┐  ┌──┘                                    │   │
│  │  │Da Vinci│──┤                                       │   │
│  │  └────────┘  │                                       │   │
│  │  ┌────────┐  │                                       │   │
│  │  │Hawking │──┘                                       │   │
│  │  └────────┘                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Current Match: Einstein vs Da Vinci                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Turn 3/8                                             │   │
│  │ Einstein: "The emergence of consciousness..."        │   │
│  │ Da Vinci: "From an artist's perspective..."          │   │
│  │ Einstein: "But mathematically speaking..."           │   │
│  │ [Waiting for Da Vinci's response...]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Results View

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 BATTLE COMPLETE                                         │
│  Champion: Einstein                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Final Standings:                                           │
│  🥇 Einstein - Champion                                     │
│  🥈 Da Vinci - Finalist                                     │
│  🥉 Newton - Semi-finalist                                  │
│  🥉 Hawking - Semi-finalist                                 │
│                                                             │
│  Match History:                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Round 1, Match 1: Einstein def. Plato (7-5)         │   │
│  │ Round 1, Match 2: Da Vinci def. Aristotle (8-6)     │   │
│  │ Round 2, Match 1: Einstein def. Newton (8-7)        │   │
│  │ Final: Einstein def. Da Vinci (9-8)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [View All Conversations] [New Battle] [Share Results]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Store: `battleStore.ts`

Zustand store with IndexedDB persistence:

- `battles: Battle[]` - All battles
- `currentBattle: Battle | null` - Active battle
- `createBattle(config)` - Initialize new battle
- `startBattle(battleId)` - Begin tournament
- `runMatch(matchId)` - Execute a single match
- `submitJudgment(matchId, judgment)` - Record judge decision
- `advanceRound(battleId)` - Move to next round
- `getBattleHistory()` - Retrieve past battles

### Service: `battleService.ts`

Core battle logic:

- `generateMatchups(battle)` - Create round matchups
- `conductConversation(match, topic)` - Run agent conversation
- `requestJudgment(conversation, judge)` - Get judge's verdict
- `determineWinners(round)` - Calculate round winners
- `checkTournamentComplete(battle)` - Check if champion determined

### Components

- `BattlePage.tsx` - Main battle arena page
- `BattleSetup.tsx` - Team and topic configuration
- `BattleBracket.tsx` - Tournament bracket visualization
- `BattleMatch.tsx` - Live match view
- `BattleResults.tsx` - Final results display
- `AgentSelector.tsx` - Agent picker for teams

### Conversation Integration

Battles use the existing conversation system with extensions:

1. Create a special conversation for each match
2. Tag messages with battle metadata
3. Alternate turns between competing agents
4. Inject battle context into agent prompts

### Judge Prompt Template

```
You are the judge of a debate between two AI agents on the topic: "{topic}"

Your role is to evaluate the conversation and determine a winner based on:
1. Argument Quality (1-10): Logical coherence, evidence, sound reasoning
2. Persuasiveness (1-10): Ability to convince and engage
3. Creativity (1-10): Novel perspectives, unique insights
4. Responsiveness (1-10): How well they addressed opponent's points

After reviewing the conversation, provide:
- Scores for each agent on all criteria
- Your decision on the winner
- A brief justification (2-3 sentences)
- Notable highlights from the debate

{customCriteria}
```

## Future Enhancements

- **Team Battles**: Multiple agents collaborate as a team
- **Audience Mode**: Let users vote alongside the judge
- **League System**: Persistent rankings and seasons
- **Battle Replays**: Watch recorded battles
- **Custom Rules**: Time limits, specific formats
- **AI Commentator**: Real-time commentary agent

## File Structure

```
src/
├── features/
│   └── battle/
│       ├── index.ts
│       ├── types.ts
│       ├── components/
│       │   ├── BattleSetup.tsx
│       │   ├── BattleBracket.tsx
│       │   ├── BattleMatch.tsx
│       │   ├── BattleResults.tsx
│       │   └── AgentSelector.tsx
│       ├── hooks/
│       │   ├── useBattle.ts
│       │   └── useBattleMatch.ts
│       └── services/
│           └── battleService.ts
├── pages/
│   └── battle.tsx
└── stores/
    └── battleStore.ts
```

## Accessibility

- Full keyboard navigation for team selection
- Screen reader announcements for match progress
- High contrast mode for bracket visualization
- Live region updates for real-time events

## Internationalization

All UI text must use i18n keys:

- `battle.title` - "Battle Arena"
- `battle.setup.topic` - "Battle Topic"
- `battle.setup.teamA` - "Team A"
- `battle.setup.teamB` - "Team B"
- `battle.judge` - "Judge"
- `battle.start` - "Start Battle"
- `battle.round` - "Round {n}"
- `battle.match` - "Match {n}"
- `battle.winner` - "Winner"
- `battle.champion` - "Champion"
