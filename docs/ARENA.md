# Battle Arena - Playing Card Battle System

## Overview

The Battle Arena is a gamified competitive feature where AI agents battle as collectible playing cards. Each agent is transformed into a unique card with stats, abilities, elemental types, and AI-generated artwork. Battles feature animated turn-based combat, visual effects, and tournament-style competitions.

## Core Concepts

### Card Battle Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ⚔️ CARD BATTLE ARENA ⚔️                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐                  VS                  ┌─────────────┐  │
│   │ ╔═══════╗   │                                      │ ╔═══════╗   │  │
│   │ ║ CARD  ║   │    ⚡ Lightning Strike! ⚡           │ ║ CARD  ║   │  │
│   │ ║ [Art] ║   │         💥 -45 HP                    │ ║ [Art] ║   │  │
│   │ ║ HP:120║   │                                      │ ║ HP:75 ║   │  │
│   │ ║ ⚡:3  ║   │                                      │ ║ ⚡:2  ║   │  │
│   │ ╚═══════╝   │                                      │ ╚═══════╝   │  │
│   │  Einstein   │                                      │   Newton    │  │
│   │  Lv.42 ⭐⭐⭐│                                      │  Lv.38 ⭐⭐⭐│  │
│   └─────────────┘                                      └─────────────┘  │
│                                                                         │
│   [🛡️ Defend]  [⚡ Charge]           Turn 5/20         [Auto ▶️]        │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Battle Log:                                                     │   │
│   │ > Einstein used "Quantum Theory"! Super Effective! -45 HP       │   │
│   │ > Newton's defense fell!                                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Collectible Agent Cards**: Each AI agent becomes a unique trading card
2. **Eight Element Types**: Wisdom, Creativity, Charisma, Strategy, Nature, Spirit, Tech, Cosmic
3. **Rarity System**: Common, Uncommon, Rare, Epic, Legendary
4. **AI-Generated Artwork**: Card portraits generated via the Studio
5. **Turn-Based Combat**: Strategic battles with abilities, energy, and status effects
6. **Visual Effects**: Animated attacks, damage numbers, screen shakes
7. **Tournament Mode**: Elimination-style competitions

## Card System

### Agent Card Anatomy

```
┌───────────────────────────────────┐
│ [Einstein] ⚛️ Cosmic    Lv.50     │ ← Name, Element, Level
├───────────────────────────────────┤
│ ████████████████░░░░ HP: 180/200  │ ← Health Bar
├───────────────────────────────────┤
│                                   │
│           [PORTRAIT]              │ ← AI-Generated Art
│         "The Genius"              │ ← Title
│                                   │
├───────────────────────────────────┤
│ ATK ████████░░░░░░ 75             │
│ DEF ██████░░░░░░░░ 60             │ ← Base Stats
│ SPD ████████████░░ 90             │
├───────────────────────────────────┤
│ ⚡⚡⚡⚡░ Energy: 4/5              │ ← Energy System
├───────────────────────────────────┤
│ 🔮 Relativity Warp    ⚡3  💥80   │
│ ⚛️ Quantum Strike     ⚡2  💥50   │ ← Abilities
│ 🛡️ Thought Shield     ⚡2  🛡️40   │
├───────────────────────────────────┤
│ "Imagination is more important    │
│  than knowledge." - Flavor Text   │ ← Lore
├───────────────────────────────────┤
│         ⭐⭐⭐⭐⭐ LEGENDARY       │ ← Rarity
└───────────────────────────────────┘
```

### Element Types & Effectiveness

The element system creates strategic depth with rock-paper-scissors mechanics:

| Element    | Icon | Strong Against     | Weak Against       |
| ---------- | ---- | ------------------ | ------------------ |
| Wisdom     | 📚   | Creativity, Spirit | Charisma, Tech     |
| Creativity | 🎨   | Tech, Strategy     | Wisdom, Cosmic     |
| Charisma   | ⭐   | Wisdom, Nature     | Strategy, Spirit   |
| Strategy   | ♟️   | Charisma, Cosmic   | Creativity, Nature |
| Nature     | 🌿   | Strategy, Tech     | Charisma, Spirit   |
| Spirit     | ✨   | Nature, Charisma   | Tech, Wisdom       |
| Tech       | ⚙️   | Spirit, Wisdom     | Creativity, Nature |
| Cosmic     | 🌌   | Wisdom, Creativity | Strategy           |

**Super Effective**: 1.5x damage
**Not Very Effective**: 0.5x damage

### Rarity Tiers

| Rarity    | Base HP | Abilities | Frame     | Visual Effect    |
| --------- | ------- | --------- | --------- | ---------------- |
| Common    | 80      | 2         | Classic   | None             |
| Uncommon  | 100     | 2         | Elemental | None             |
| Rare      | 120     | 3         | Elemental | Shine            |
| Epic      | 150     | 3         | Holo      | Holographic      |
| Legendary | 200     | 4         | Golden    | Full Holographic |

### Card Stats

- **HP (Health Points)**: 50-200 based on rarity and level
- **Attack**: 10-100, increases ability damage
- **Defense**: 10-100, reduces incoming damage
- **Speed**: 10-100, determines turn order
- **Energy**: 3-5, resource for using abilities (regenerates +1/turn)
- **Level**: 1-100, affects all stats (+1% per level)

### Abilities

Each card has 2-4 abilities based on rarity:

```typescript
interface CardAbility {
  name: string // "Quantum Strike"
  description: string // "Unleash quantum energy"
  element: CardElement // "cosmic"
  power: number // 20-80 base damage
  cost: number // 1-5 energy cost
  cooldown: number // 0-3 turns
  effect: AbilityEffect // damage, heal, buff, debuff, etc.
  animation: string // beam, slash, explosion, etc.
}
```

**Effect Types:**

- \`damage\`: Direct damage to opponent
- \`heal\`: Restore HP to self
- \`buff_attack/defense\`: Increase own stats
- \`debuff_attack/defense\`: Reduce enemy stats
- \`stun\`: Skip enemy turn
- \`drain\`: Damage + heal
- \`shield\`: Absorb damage
- \`reflect\`: Return portion of damage
- \`burn\`: Damage over time
- \`confuse\`: Random targeting

## Battle Flow

### Phase 1: Card Generation

1. When entering Battle Arena with card mode enabled
2. System generates cards for all selected agents:
   - Determines element from agent personality/role
   - Assigns rarity based on agent characteristics
   - Generates stats appropriate to rarity
   - Uses LLM to create thematic abilities
   - Generates card artwork via Studio (if enabled)

### Phase 2: Battle Setup

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔️ CARD BATTLE SETUP                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Battle Topic: [What is the nature of consciousness?]           │
│                                                                 │
│  ┌───────────────────┐       ┌───────────────────┐             │
│  │     TEAM A        │       │     TEAM B        │             │
│  │  ─────────────    │       │  ─────────────    │             │
│  │  🃏 Einstein ⭐⭐⭐⭐│       │  🃏 Newton ⭐⭐⭐⭐ │             │
│  │  🃏 Da Vinci ⭐⭐⭐ │       │  🃏 Hawking ⭐⭐⭐  │             │
│  │  [+] Add Card     │       │  [+] Add Card     │             │
│  └───────────────────┘       └───────────────────┘             │
│                                                                 │
│  [✨ Generate Cards]  [🎴 View Collection]  [⚔️ Start Battle]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Turn-Based Combat

Each turn follows this sequence:

1. **Turn Order**: Determined by Speed stat
2. **Energy Recovery**: +1 energy at turn start (max 5)
3. **Status Effects**: Apply burn damage, check stun, etc.
4. **Action Selection**:
   - Use an Ability (costs energy)
   - Defend (50% damage reduction, +1 energy)
   - Charge (+2 energy, skip attack)
5. **Damage Calculation**:
   ```
   Final Damage = (Ability Power × Attack/50) × Element Modifier × Random(0.85-1.15)
   Damage Taken = Final Damage × (100 / (100 + Defense))
   ```
6. **Apply Effects**: Status effects, buffs, debuffs
7. **Check KO**: If HP ≤ 0, card is knocked out
8. **Next Turn**: Switch to opponent

### Phase 4: Visual Battle

The battle field features rich animations:

- **Card Entrance**: Cards slide in with element-colored aura
- **Attack Animations**: Beams, slashes, explosions, etc.
- **Damage Numbers**: Float up from damaged card
- **Screen Shake**: On critical hits
- **Status Effects**: Visual indicators on cards
- **KO Animation**: Card shatters and fades
- **Victory Celebration**: Winner card glows and poses

### Phase 5: Tournament Progression

```
Tournament Bracket (8 cards):

Round 1:
  🃏 Einstein vs 🃏 Plato → Einstein ✓
  🃏 Newton vs 🃏 Aristotle → Newton ✓
  🃏 Da Vinci vs 🃏 Hawking → Da Vinci ✓
  🃏 Tesla vs 🃏 Curie → Tesla ✓

Round 2 (Semi-finals):
  🃏 Einstein vs 🃏 Newton → Einstein ✓
  🃏 Da Vinci vs 🃏 Tesla → Da Vinci ✓

Finals:
  🃏 Einstein vs 🃏 Da Vinci → 🏆 Einstein CHAMPION
```

## Data Models

### AgentCard

```typescript
interface AgentCard {
  id: string
  agentId: string
  name: string
  title: string // "The Genius", "Master of Logic"
  element: CardElement
  rarity: CardRarity
  baseStats: CardStats
  currentStats: CardStats
  abilities: CardAbility[]
  artworkUrl?: string // AI-generated portrait
  frameStyle: CardFrameStyle
  flavorText: string
  createdAt: Date
  level: number
  xp: number
}
```

### BattleCardState

```typescript
interface BattleCardState {
  card: AgentCard
  currentHp: number
  currentEnergy: number
  statusEffects: StatusEffect[]
  cooldowns: Record<string, number> // abilityId → turns remaining
  isKnockedOut: boolean
  position: 'left' | 'right'
}
```

### CardBattleData

```typescript
interface CardBattleData {
  cardA: BattleCardState
  cardB: BattleCardState
  turns: BattleTurn[]
  currentTurn: number
  maxTurns: number
  winnerCardId?: string
  startedAt: Date
  endedAt?: Date
}
```

## Card Generation

Cards are generated using the \`cardGenerationService\`:

### Element Detection

Analyzes agent's name, role, and instructions for keywords:

```typescript
const ELEMENT_KEYWORDS = {
  wisdom: ['knowledge', 'learn', 'analyze', 'research', 'scholar'],
  creativity: ['art', 'create', 'design', 'imagine', 'innovate'],
  charisma: ['lead', 'influence', 'persuade', 'inspire'],
  // ... etc
}
```

### Rarity Assignment

Based on agent characteristics:

- **Legendary**: Famous historical figures (Einstein, Newton, etc.)
- **Epic**: Long, detailed instructions (>2000 chars)
- **Rare**: Moderate detail (>1000 chars)
- **Uncommon**: Basic instructions (>500 chars)
- **Common**: Minimal instructions

### Ability Generation

Uses LLM to create thematic abilities:

```
Create 3 unique abilities for this agent:
Name: Albert Einstein
Role: Theoretical Physicist
Element: Cosmic
Description: Expert in relativity and quantum mechanics...

Expected output:
- "Relativity Warp" - Bend space-time to dodge attacks
- "Quantum Entangle" - Link fates with opponent
- "E=MC²" - Devastating energy release
```

### Artwork Generation

Uses Studio image generation service:

```
Prompt: "Trading card game character portrait for:
Character: Albert Einstein
Element: Cosmic
Style: breathtaking, legendary, maximum detail

The image should be:
- Dramatic portrait, upper body and face
- Cosmic effects: stars, galaxies, dimensional rifts
- Professional TCG art style
- Rich colors with dramatic lighting"
```

## UI Components

### AgentCard Component

Renders the playing card with:

- Element-colored gradient background
- Holographic effects for rare cards
- HP bar with color coding (green/yellow/red)
- Energy bar with filled segments
- Ability slots with tooltips
- Stat bars (ATK/DEF/SPD)
- Rarity badge
- Flavor text

### CardBattleField Component

The main battle arena featuring:

- Two card positions (left vs right)
- VS badge with glow animation
- Turn indicator
- Auto-play toggle
- Ability animations
- Damage numbers
- Screen shake effects
- Battle log
- Element effectiveness indicators

### Animation System

```typescript
interface BattleAnimationSequence {
  announcements: BattleAnnouncement[]
  effects: BattleVisualEffect[]
  shakes: ScreenShake[]
  cardAnimations: CardAnimation[]
  hpChanges: HpBarAnimation[]
  totalDuration: number
}
```

**Animation Types:**

- \`beam\`: Energy beam projectile
- \`slash\`: Physical strike effect
- \`explosion\`: Area burst
- \`wave\`: Spreading wave
- \`vortex\`: Spinning vortex
- \`lightning\`: Electric bolts
- \`heal_glow\`: Healing aura
- \`shield_dome\`: Protective dome
- \`particle_swarm\`: Particle effects
- \`cosmic_rift\`: Dimensional tear

## File Structure

```
src/features/battle/
├── index.ts
├── types.ts                    # Card & battle type definitions
├── components/
│   ├── index.ts
│   ├── AgentCard.tsx           # Playing card component
│   ├── CardBattleField.tsx     # Main battle arena
│   ├── AgentTeamSelector.tsx
│   ├── BattleBracket.tsx
│   ├── BattleMatch.tsx
│   ├── BattleResults.tsx
│   └── BattleSetup.tsx
├── hooks/
│   ├── useBattle.ts
│   ├── useBattleMatch.ts
│   └── useCardBattle.ts        # Card battle state management
├── services/
│   ├── battleService.ts
│   └── cardGenerationService.ts # Card generation logic
└── i18n/
    └── index.ts                # Battle translations
```

## Card Collection System

### Collection Storage

```typescript
interface CardCollection {
  ownerId: string
  cards: AgentCard[]
  favoriteCardIds: string[]
  decks: CardDeck[]
  stats: CollectionStats
  createdAt: Date
  updatedAt: Date
}
```

### Deck Building

- Create custom decks from collected cards
- Set a "main deck" for battles
- Deck size limits based on tournament rules

### Collection Stats

Track player progress:

- Total cards owned
- Cards by rarity/element
- Battles won/played
- Highest level card
- Total XP earned

## Future Enhancements

- **Card Trading**: Exchange cards with other users
- **Pack Opening**: Randomized card acquisition
- **Card Evolution**: Upgrade cards to higher rarities
- **PvP Mode**: Real-time battles with other players
- **Seasons & Leagues**: Competitive ranked play
- **Daily Challenges**: Earn rewards and new cards
- **Card Crafting**: Combine cards for new abilities
- **Achievement System**: Unlock special cards

## Accessibility

- Full keyboard navigation for card selection and battles
- Screen reader support for all game elements
- High contrast mode for visual effects
- Reduced motion option for animations
- Battle log provides text-based play-by-play

## Internationalization

Key translation strings:

- \`battle.card.hp\` - "HP"
- \`battle.card.attack\` - "Attack"
- \`battle.card.defense\` - "Defense"
- \`battle.card.speed\` - "Speed"
- \`battle.card.energy\` - "Energy"
- \`battle.card.ability\` - "Ability"
- \`battle.card.rarity.\*\` - Rarity names
- \`battle.card.element.\*\` - Element names
- \`battle.action.defend\` - "Defend"
- \`battle.action.charge\` - "Charge"
- \`battle.effect.super_effective\` - "Super Effective!"
- \`battle.effect.not_effective\` - "Not Very Effective..."
- \`battle.result.knockout\` - "Knockout!"
- \`battle.result.victory\` - "Victory!"
