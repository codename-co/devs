# Spaces

Spaces let users organize their DEVS content into separate contexts. Each space acts as an isolated view so that work on different projects or topics stays cleanly separated.

## Concepts

| Term | Description |
|---|---|
| **Space** | A named container that groups conversations, tasks, sessions, agents, artifacts, knowledge items, studio entries, marketplace apps, skills, and tags together. Each space can also override global settings. |
| **Default Space** | A virtual space (ID `default`) that owns all pre-existing and unassigned data. It always exists and cannot be deleted or renamed. |
| **Active Space** | The space currently selected by the user. All new entities are automatically tagged with this space, and only its entities appear in the UI. |

## Data Model

### `Space` interface

```typescript
interface Space {
  id: string          // crypto.randomUUID() — or 'default' for the virtual space
  name: string        // User-chosen display name (max 60 chars)
  createdAt: string   // ISO 8601
  updatedAt?: string  // ISO 8601
}
```

Stored in the Yjs `spaces` map (`ydoc.getMap<Space>('spaces')`). The default space is **not** persisted; it is synthesised at runtime and always appears first in the list.

### Entity tagging

All space-scoped entities carry an optional `spaceId` field:

```typescript
spaceId?: string  // undefined | '' | 'default' → belongs to Default Space
```

**Scoped entities:**

| Entity | Interface | Store |
|---|---|---|
| Conversation | `Conversation.spaceId` | `conversationStore` |
| Task | `Task.spaceId` | `taskStore` |
| Session | `Session.spaceId` | `sessionStore` |
| Agent | `Agent.spaceId` | `agentStore` |
| Artifact | `Artifact.spaceId` | `artifactStore` |
| KnowledgeItem | `KnowledgeItem.spaceId` | `knowledgeStore` |
| Connector | `Connector.spaceId` | `connectorStore` |
| StudioEntry | `StudioEntry.spaceId` | `useStudioHistory` hook |
| InstalledExtension | `InstalledExtension.spaceId` | `marketplaceStore` |
| InstalledSkill | `InstalledSkill.spaceId` | `skillStore` |
| ThreadTag | `ThreadTag.spaceId` | `useThreadTags` hook |

**Global entities** (not space-scoped): Agent memories, shared contexts, credentials, traces, sync settings.

**Built-in agents** (loaded from JSON) are available in all spaces. Only custom (user-created) agents are space-scoped.

## Store API

All functions are importable from `@/stores/spaceStore` and can be called from both React and non-React code.

### Write operations

| Function | Description |
|---|---|
| `createSpace(name)` | Create a new space. Returns the `Space` object. |
| `renameSpace(id, name)` | Rename a space. No-op for the default space. |
| `deleteSpace(id)` | Delete a space. No-op for the default space. If the deleted space was active, automatically switches to default. Entities that belonged to it remain tagged (they become orphaned and fall back to the default space view). |

### Active space (per-device)

| Function | Description |
|---|---|
| `getActiveSpaceId()` | Returns the active space ID (from `userSettings` localStorage store). |
| `setActiveSpaceId(id)` | Sets the active space ID. |

The active space is stored per-device via Zustand's localStorage persistence (`userSettings`), not in Yjs — so each device can independently view a different space.

### Read operations

| Function | Description |
|---|---|
| `getAllSpaces()` | Returns `[DefaultSpace, ...userSpaces]`. |
| `getSpaceById(id)` | Returns the space, or the default space if not found. |

### Filtering helper

```typescript
entityBelongsToSpace(entitySpaceId: string | undefined, activeSpaceId: string): boolean
```

- When `activeSpaceId` is `'default'` (or empty): matches entities with `undefined`, `''`, or `'default'` spaceId.
- Otherwise: matches only entities whose `spaceId` equals `activeSpaceId`.

### React hooks

| Hook | Returns |
|---|---|
| `useSpaces()` | `Space[]` — reactive list of all spaces. |
| `useActiveSpaceId()` | `string` — reactive active space ID. |
| `useActiveSpace()` | `Space` — reactive active space object. |

## Entity auto-tagging

Each store automatically injects `spaceId: getActiveSpaceId()` when creating new entities:

- `conversationStore.createConversation()`
- `taskStore.createTask()`
- `sessionStore.createSession()`
- `agentStore.createAgent()`
- `artifactStore.createArtifact()`
- `knowledgeStore.addKnowledgeItem()`
- `useStudioHistory.addToHistory()` / `addVideoToHistory()`
- `marketplaceStore.installExtension()`
- `skillStore.installSkill()` / `skillStore.createCustomSkill()`
- `createThreadTag()` (from `useThreadTags` hook)

## Per-Space Settings Overrides

Every synced setting (from `SyncedSettings`) can be overridden per space. Global settings serve as defaults; space-level overrides take precedence when set.

### Data model

Overrides are stored in the Yjs `spaceSettings` map (`ydoc.getMap<Record<string, unknown>>('spaceSettings')`), keyed by space ID. Each entry is a partial object containing only the keys that differ from the global defaults. The default space has no overrides (it always uses the global values).

### API

All functions are available from `@/stores/userStore`.

| Function | Description |
|---|---|
| `getSpaceSettingsOverride(spaceId)` | Get the raw override object for a space. |
| `setSpaceSettingOverride(spaceId, key, value)` | Set a single setting override. Pass `undefined` to remove. |
| `clearSpaceSettingsOverrides(spaceId)` | Remove all overrides for a space (revert to global). |
| `getEffectiveSettings(spaceId?)` | Get merged settings (global + space overrides). Defaults to active space. |
| `useEffectiveSettings()` | Reactive hook returning merged settings for the active space. |

### Example

```typescript
import { setSpaceSettingOverride, getEffectiveSettings } from '@/stores/userStore'

// Override the global system instructions for a specific space
setSpaceSettingOverride(spaceId, 'globalSystemInstructions', 'You are a coding assistant.')

// Read the effective value (space override wins over global)
const settings = getEffectiveSettings(spaceId)
console.log(settings.globalSystemInstructions) // 'You are a coding assistant.'

// Remove the override (reverts to global value)
setSpaceSettingOverride(spaceId, 'globalSystemInstructions', undefined)
```

## Filtering

### Thread list (`useThreads`)

The `useThreads` hook filters conversations, tasks, sessions, **and studio entries** by the active space before building the unified thread list.

### Agent list (V2)

Custom agents are filtered by space in the V2 shell. Built-in agents remain global.

### Installed apps (Sidebar)

The sidebar `useInstalledApps` hook filters marketplace apps by the active space.

### Skills

All skill store read operations and hooks filter by the active space:

- `getInstalledSkills()`, `getEnabledSkills()` — return only skills in the active space
- `getSkillsForAgent(agentId)` — filters by space before matching agent assignment
- `isSkillInstalled(githubUrl)`, `getSkillByGitHubUrl(url)` — scoped to active space
- `useSkills()`, `useSkillsForAgent(agentId)` — reactive hooks filtered by active space

### Thread tags

`useThreadTagDefinitions()` and `useThreadTagMap()` return only tags belonging to the active space.

## URL Routing

Spaces are represented in the URL via an optional `/spaces/:encodedSpaceId` prefix. The space ID is encoded using `uuidToBase64url()` (from `@/lib/url`) to produce short, URL-safe strings.

### Route patterns

```
/v2                                    → default space
/spaces/<base64url>/v2                 → specific space
/:lang/v2                              → default space, with language
/:lang/spaces/<base64url>/v2           → specific space, with language
```

### `SpacePath` component

The `SpacePath` layout component (in `Router.tsx`) decodes the base64url segment back to a UUID and calls `setActiveSpaceId()`. All child routes inherit the space context.

```typescript
const SpacePath = () => {
  const { encodedSpaceId } = useParams()
  useEffect(() => {
    if (encodedSpaceId) {
      const spaceId = base64urlToUuid(encodedSpaceId)
      setActiveSpaceId(spaceId)
    }
  }, [encodedSpaceId])
  return <Outlet />
}
```

## UI — Space Switcher

The space switcher lives in the sidebar (both desktop and mobile drawer), between the brand header and the main navigation.

- **Expanded sidebar**: Renders a HeroUI `Select` component showing all spaces plus a "New Space" action. Uses an `ArrowSeparateVertical` icon as the custom indicator.
- **Collapsed sidebar**: Renders a folder icon button with a tooltip showing the active space name.
- **Creating a space**: Selecting "New Space" reveals an inline text input. Pressing Enter confirms; Escape or blur cancels.
- **URL navigation**: Switching spaces updates the browser URL to include or remove the `/spaces/<base64url>` prefix, preserving the current path, language prefix, query string, and hash. The `useSpaceNavigate()` hook in the Sidebar handles the URL rewriting.

## UI — Settings Scope Switcher

When the active space is not the default space, the **Settings modal** shows a scope toggle on sections that support per-space overrides (General, Features, Tags, Connectors, Providers, Skills). The toggle appears between the section header and the section content.

- **Global tab** (globe icon) — edits the global settings shared by all spaces.
- **Space tab** (cube icon + space name) — edits overrides for the current space only.

The toggle is not shown when the user is in the default space (global settings apply directly).

### Implementation

- `SettingsContext` provides a `SettingsScope` (`'global' | 'space'`) via `useSettingsScope()` and `useSetSettingsScope()`.
- `useSpaceScopedSetting(key, globalValue, globalSetter)` returns `[value, setter, hasOverride]`. In global scope it delegates to the global setter; in space scope it reads/writes the `spaceSettings` Yjs map.
- Section components (`FeaturesSection`, `GeneralSection`) wrap each synced setting with this hook. Theme and color theme are space-overridable via `useSpaceScopedSetting`; the device-local theme acts as the default.
- `ConnectorsSection` filters connectors by space when in space scope using `entityBelongsToSpace()`.
- `Providers.tsx` computes the effective theme using `useEffectiveTheme()` — space override > device-local default.
- Business logic in `src/lib/` reads settings via `getEffectiveSettings()` so space overrides for `globalSystemInstructions`, `enableWebSearchGrounding`, `yoloMode`, `autoMemoryLearning`, and `pptxTheme` are honoured at runtime.

## Architecture decisions

1. **Virtual default space** — Instead of creating a real Yjs entry for "Default", the store synthesises it in memory. This avoids migration for existing data: any entity without a `spaceId` (or with `spaceId === 'default'`) automatically belongs to the default space.

2. **Per-device active space** — The active space is stored in `localStorage` via the `userSettings` Zustand store, not in Yjs. This means each P2P-synced device can independently navigate to a different space.

3. **Soft ownership** — Entities reference their space via an optional `spaceId` string. There is no cascading delete: when a space is deleted, its entities remain and fall back to the default space view. This prevents accidental data loss.

4. **Built-in agents are global** — Agents loaded from the bundled JSON files are available everywhere. Only custom user-created agents are tagged with a space.

5. **URL-encoded space IDs** — Space UUIDs are encoded as base64url in the URL to keep paths short. The encoding uses `uuidToBase64url()` / `base64urlToUuid()` from `@/lib/url`.

6. **Settings override via merge** — Per-space settings are stored as sparse overrides, not full copies. `getEffectiveSettings()` merges global defaults with space overrides, so unset keys always fall back to the global value. The default space has no overrides.

## File map

| File | Purpose |
|---|---|
| [`src/types/index.ts`](../src/types/index.ts) | `Space` interface, `DEFAULT_SPACE_ID` constant, `spaceId` fields on entities |
| [`src/features/studio/types.ts`](../src/features/studio/types.ts) | `spaceId` on `StudioEntry` |
| [`src/features/marketplace/types.ts`](../src/features/marketplace/types.ts) | `spaceId` on `InstalledExtension` |
| [`src/lib/yjs/maps.ts`](../src/lib/yjs/maps.ts) | `spaces` and `spaceSettings` Y.Map definitions, `ThreadTag.spaceId` |
| [`src/stores/spaceStore.ts`](../src/stores/spaceStore.ts) | CRUD, active space, filtering, React hooks |
| [`src/stores/userStore.ts`](../src/stores/userStore.ts) | `activeSpaceId` in local settings, per-space settings overrides |
| [`src/stores/agentStore.ts`](../src/stores/agentStore.ts) | Auto-injects `spaceId` on agent creation |
| [`src/stores/conversationStore.ts`](../src/stores/conversationStore.ts) | Auto-injects `spaceId` on creation |
| [`src/stores/taskStore.ts`](../src/stores/taskStore.ts) | Auto-injects `spaceId` on creation |
| [`src/stores/sessionStore.ts`](../src/stores/sessionStore.ts) | Auto-injects `spaceId` on creation |
| [`src/stores/artifactStore.ts`](../src/stores/artifactStore.ts) | Auto-injects `spaceId` on creation |
| [`src/stores/knowledgeStore.ts`](../src/stores/knowledgeStore.ts) | Auto-injects `spaceId` on creation |
| [`src/features/connectors/stores/connectorStore.ts`](../src/features/connectors/stores/connectorStore.ts) | Auto-injects `spaceId` on creation, `getConnectorsForSpace()` filter |
| [`src/features/connectors/types.ts`](../src/features/connectors/types.ts) | `spaceId` on `Connector` |
| [`src/stores/skillStore.ts`](../src/stores/skillStore.ts) | Auto-injects `spaceId` on install/create, filters by space |
| [`src/features/studio/hooks/useStudioHistory.ts`](../src/features/studio/hooks/useStudioHistory.ts) | Auto-injects `spaceId` on creation |
| [`src/features/marketplace/store.ts`](../src/features/marketplace/store.ts) | Auto-injects `spaceId` on installation |
| [`src/pages/V2/hooks/useThreads.ts`](../src/pages/V2/hooks/useThreads.ts) | Filters threads by active space |
| [`src/pages/V2/hooks/useThreadTags.ts`](../src/pages/V2/hooks/useThreadTags.ts) | Tag CRUD with space scoping, filters by active space |
| [`src/pages/V2/index.tsx`](../src/pages/V2/index.tsx) | Filters agents by active space |
| [`src/pages/V2/components/Sidebar.tsx`](../src/pages/V2/components/Sidebar.tsx) | Space switcher UI with URL navigation, filters installed apps |
| [`src/app/Router.tsx`](../src/app/Router.tsx) | `SpacePath` route layout, `/spaces/:encodedSpaceId` prefix |
| [`src/lib/url.ts`](../src/lib/url.ts) | `uuidToBase64url` / `base64urlToUuid` encoding |
| [`src/pages/Settings/SettingsContext.tsx`](../src/pages/Settings/SettingsContext.tsx) | Settings scope context (`'global'` / `'space'`) |
| [`src/pages/Settings/useSpaceScopedSetting.ts`](../src/pages/Settings/useSpaceScopedSetting.ts) | Hook for reading/writing settings respecting scope |
| [`src/pages/Settings/SettingsContent.tsx`](../src/pages/Settings/SettingsContent.tsx) | Scope tab switcher in settings modal |
| [`src/pages/Settings/components/FeaturesSection.tsx`](../src/pages/Settings/components/FeaturesSection.tsx) | Synced settings wired through `useSpaceScopedSetting` |
| [`src/pages/Settings/components/GeneralSection.tsx`](../src/pages/Settings/components/GeneralSection.tsx) | Theme, color theme, platform name & background wired through `useSpaceScopedSetting` |
| [`src/pages/Settings/components/ConnectorsSection.tsx`](../src/pages/Settings/components/ConnectorsSection.tsx) | Filters connectors by space when in space scope |
| [`src/app/Providers.tsx`](../src/app/Providers.tsx) | Applies effective theme via `useEffectiveTheme()` |
| [`src/test/stores/spaceStore.test.ts`](../src/test/stores/spaceStore.test.ts) | Unit tests (22 tests) |
