/**
 * Extension Type Definitions for Monaco Editor
 *
 * These type definitions are injected into Monaco to provide IntelliSense
 * for extension developers using the `@devs/components` package and `DEVS` global.
 */

/**
 * Type definitions for the DEVS global API (from extension-bridge.js)
 */
export const DEVS_TYPES = /* ts */ `
// =============================================================================
// DEVS Global API
// =============================================================================

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMOptions {
  /** LLM provider (e.g., 'openai', 'anthropic', 'google') */
  provider?: string;
  /** Model ID (e.g., 'gpt-4', 'claude-3-opus') */
  model?: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

interface ToastOptions {
  /** Toast type */
  type?: 'success' | 'error' | 'warning' | 'info';
  /** Duration in ms */
  duration?: number;
}

interface ConfirmOptions {
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
}

interface PromptOptions {
  /** Placeholder text for the prompt area */
  placeholder?: string;
  /** Default prompt text */
  defaultPrompt?: string;
}

interface PromptResult {
  prompt: string;
  agentId?: string;
  methodologyId?: string;
}

interface Agent {
  id: string;
  slug: string;
  name: string;
  role: string;
  icon?: string;
  instructions?: string;
}

interface ImageGenerationOptions {
  /** Provider ('openai', 'stability', 'together', etc.) */
  provider?: string;
  /** Model ID */
  model?: string;
  /** Image size ('512x512', '1024x1024') */
  size?: string;
  /** Style ('vivid', 'natural') */
  style?: string;
  /** Quality ('standard', 'hd') */
  quality?: string;
}

interface ImageGenerationResult {
  url: string;
  base64?: string;
}

interface VisionAnalysisResult {
  description: string;
  elements?: Array<{
    type: string;
    bounds: { x: number; y: number; width: number; height: number };
    description: string;
  }>;
}

interface SketchInterpretationResult {
  interpretation: string;
  elements: Array<{
    type: string;
    label?: string;
    connections?: string[];
  }>;
  suggestedActions?: string[];
}

interface PresenceUpdate {
  userId: string;
  agentId?: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  selection?: string[];
}

interface CanvasSession {
  sessionId: string;
  participants: Array<{
    userId: string;
    name: string;
    color: string;
  }>;
}

interface CanvasChange {
  userId: string;
  agentId?: string;
  operation: 'add' | 'update' | 'delete';
  elements: any[];
}

interface AgentInviteOptions {
  /** Agent's role */
  role?: 'observer' | 'contributor' | 'facilitator';
  /** Initial context for the agent */
  context?: string;
  /** Current canvas state (base64 image) */
  canvasSnapshot?: string;
}

interface AgentActionRequest {
  /** Action type */
  action: 'analyze' | 'suggest' | 'create' | 'refine' | 'organize' | 'annotate';
  /** Selected elements to act on */
  elements?: any[];
  /** Natural language instruction */
  prompt?: string;
  /** Current canvas state (base64 image) */
  canvasSnapshot?: string;
}

interface AgentActionResponse {
  response: string;
  suggestedElements?: any[];
  annotations?: Array<{
    elementId?: string;
    text: string;
    position: { x: number; y: number };
  }>;
  actions?: Array<{ type: string; payload: any }>;
}

interface KnowledgeSearchOptions {
  /** Maximum results */
  limit?: number;
  /** Filter by item types */
  types?: Array<'file' | 'folder'>;
  /** Filter by tags */
  tags?: string[];
}

interface KnowledgeItem {
  id: string;
  name: string;
  path: string;
  content?: string;
  relevance?: number;
  fileType?: string;
  tags?: string[];
  description?: string;
}

interface TaskCreateOptions {
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Assigned agent ID */
  assignedAgentId?: string;
  /** Task requirements */
  requirements?: Array<{ type: string; description: string }>;
  /** Canvas element that spawned this task */
  sourceElementId?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgentId?: string;
  artifacts?: string[];
  workflowId?: string;
}

interface Conversation {
  id: string;
  title?: string;
  summary?: string;
  timestamp: string;
  messageCount: number;
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface Artifact {
  id: string;
  type: string;
  description: string;
  content: string;
  status: string;
}

interface ExportOptions {
  /** Specific elements to export (all if empty) */
  elementIds?: string[];
  /** Include agent annotations */
  includeAnnotations?: boolean;
  /** Include element metadata */
  includeMetadata?: boolean;
  /** Scale factor for raster exports */
  scale?: number;
}

interface ExportResult {
  data: string;
  mimeType: string;
  filename: string;
}

interface CodeExportOptions {
  /** Elements to convert */
  elementIds?: string[];
  /** Target format */
  target: 'react' | 'html' | 'svg' | 'figma';
  /** Framework variant (e.g., 'nextjs', 'vite') */
  framework?: string;
}

interface CodeExportResult {
  files: Array<{ path: string; content: string }>;
  preview?: string;
}

/**
 * DEVS Extension API
 *
 * Available as \`window.DEVS\` in extension sandboxed iframes.
 * Provides access to LLM, UI, storage, agents, and more.
 */
interface DEVS {
  /** Extension ID */
  readonly extensionId: string | undefined;
  /** Extension display name */
  readonly extensionName: string | undefined;
  /** Current theme ('dark' | 'light') */
  readonly theme: 'dark' | 'light';
  /** Current language code (e.g., 'en', 'fr') */
  readonly language: string;

  /**
   * Translation helper for UI labels
   * @param key - Translation key
   * @param params - Optional interpolation parameters
   * @returns Translated string or key as fallback
   */
  t(key: string, params?: Record<string, string>): string;

  /** LLM API for making AI calls */
  readonly llm: {
    /**
     * Send a chat completion request
     * @param messages - Array of chat messages
     * @param options - Optional LLM configuration
     * @returns Promise with response content and usage
     */
    chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;

    /**
     * Generate a simple completion from a prompt string
     * @param prompt - The prompt text
     * @param options - Optional configuration
     * @returns The generated text
     */
    complete(prompt: string, options?: LLMOptions): Promise<string>;
  };

  /** UI API for accessing DEVS UI components */
  readonly ui: {
    /**
     * Show the PromptArea component in a modal overlay
     * @param options - Optional configuration
     * @returns The submitted data or null if cancelled
     */
    prompt(options?: PromptOptions): Promise<PromptResult | null>;

    /**
     * Show a toast notification
     * @param message - Toast message
     * @param options - Toast options
     */
    toast(message: string, options?: ToastOptions): void;

    /**
     * Show a confirmation dialog
     * @param options - Confirm options
     * @returns True if confirmed, false if cancelled
     */
    confirm(options: ConfirmOptions): Promise<boolean>;
  };

  /** Agents API for accessing DEVS agents */
  readonly agents: {
    /**
     * List all available agents (built-in + custom)
     */
    list(): Promise<Agent[]>;

    /**
     * Get a specific agent by ID or slug
     * @param idOrSlug - Agent ID or slug
     */
    get(idOrSlug: string): Promise<Agent | null>;
  };

  /** Image Generation API */
  readonly image: {
    /**
     * Generate an image from a prompt
     * @param prompt - Image generation prompt
     * @param options - Generation options
     */
    generate(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;
  };

  /** Storage API for extension-specific data persistence */
  readonly storage: {
    /**
     * Store extension-specific data (scoped to extension ID)
     * @param key - Storage key
     * @param value - Value to store (will be JSON serialized)
     */
    set(key: string, value: any): Promise<void>;

    /**
     * Get stored value
     * @param key - Storage key
     */
    get<T = any>(key: string): Promise<T>;

    /**
     * Remove stored value
     * @param key - Storage key
     */
    remove(key: string): Promise<void>;

    /**
     * List all storage keys for this extension
     */
    keys(): Promise<string[]>;
  };

  /** Vision API for analyzing images and canvas content */
  readonly vision: {
    /**
     * Analyze an image using vision models
     * @param imageData - Base64 encoded image or data URL
     * @param prompt - Optional analysis prompt
     * @param options - Analysis options
     */
    analyze(imageData: string, prompt?: string, options?: { provider?: string; model?: string }): Promise<VisionAnalysisResult>;

    /**
     * Interpret hand-drawn sketches and diagrams
     * @param imageData - Base64 encoded sketch image
     * @param options - Interpretation options
     */
    interpretSketch(imageData: string, options?: { type?: 'flowchart' | 'wireframe' | 'diagram' | 'freeform' }): Promise<SketchInterpretationResult>;
  };

  /** Canvas Collaboration API for real-time P2P canvas sync */
  readonly canvas: {
    /**
     * Subscribe to real-time presence updates (cursors, selections)
     */
    onPresenceUpdate(callback: (update: PresenceUpdate) => void): () => void;

    /**
     * Broadcast local cursor/selection state to other participants
     */
    broadcastPresence(state: { position: { x: number; y: number }; selection?: string[] }): void;

    /**
     * Get a Yjs-compatible shared document for real-time sync
     * @param documentId - Canvas document ID
     */
    getSharedDocument(documentId: string): Promise<{ docId: string; roomId: string; awareness: object }>;

    /**
     * Join a collaborative canvas session
     * @param documentId - Canvas document ID
     * @param options - User display options
     */
    joinSession(documentId: string, options?: { name?: string; color?: string }): Promise<CanvasSession>;

    /**
     * Leave the current canvas session
     */
    leaveSession(sessionId: string): Promise<void>;

    /**
     * Subscribe to canvas change events from other participants
     */
    onCanvasChange(callback: (change: CanvasChange) => void): () => void;
  };

  /** Agent Collaboration API - Invite agents as active canvas participants */
  readonly agentCollaboration: {
    /**
     * Invite an agent to join the canvas as an active participant
     */
    inviteAgent(agentIdOrSlug: string, options?: AgentInviteOptions): Promise<{ sessionId: string; agentId: string; agentName: string }>;

    /**
     * Request an agent action on canvas elements
     */
    requestAction(sessionId: string, request: AgentActionRequest): Promise<AgentActionResponse>;

    /**
     * Stream agent responses for real-time canvas updates
     */
    streamAction(sessionId: string, request: AgentActionRequest, onChunk: (chunk: { type: 'text' | 'element' | 'annotation' | 'action'; data: any }) => void): Promise<void>;

    /**
     * Subscribe to agent-initiated canvas updates
     */
    onAgentUpdate(callback: (update: { sessionId: string; agentId: string; type: 'drawing' | 'annotation' | 'suggestion'; data: any }) => void): () => void;

    /**
     * Remove an agent from the canvas session
     */
    dismissAgent(sessionId: string): Promise<void>;

    /**
     * List all active agent sessions on the canvas
     */
    listActiveSessions(): Promise<Array<{ sessionId: string; agentId: string; agentName: string; role: string; joinedAt: string }>>;
  };

  /** Knowledge Base API for accessing user's knowledge */
  readonly knowledge: {
    /**
     * Search knowledge base for relevant context
     */
    search(query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeItem[]>;

    /**
     * Get a specific knowledge item by ID
     */
    get(id: string): Promise<KnowledgeItem | null>;

    /**
     * Save canvas content as a knowledge item
     */
    save(item: { name: string; content: string; path?: string; tags?: string[]; description?: string }): Promise<{ id: string }>;

    /**
     * Update an existing knowledge item
     */
    update(id: string, updates: Partial<KnowledgeItem>): Promise<void>;
  };

  /** Tasks API for creating and tracking tasks from canvas elements */
  readonly tasks: {
    /**
     * Create a task from canvas content
     */
    create(task: TaskCreateOptions): Promise<{ id: string; workflowId: string }>;

    /**
     * Link a canvas element to an existing task
     */
    linkElement(taskId: string, link: { elementId: string; type: 'source' | 'artifact' | 'reference'; description?: string }): Promise<void>;

    /**
     * Get task by ID
     */
    get(taskId: string): Promise<Task | null>;

    /**
     * List tasks with optional filtering
     */
    list(options?: { status?: Task['status']; assignedAgentId?: string; limit?: number }): Promise<Task[]>;

    /**
     * Subscribe to task status changes
     */
    onStatusChange(callback: (update: { taskId: string; status: string; agentId?: string }) => void): () => void;
  };

  /** Conversations API for accessing agent conversation history */
  readonly conversations: {
    /**
     * Get recent conversations with an agent
     */
    getRecent(agentId: string, options?: { limit?: number }): Promise<Conversation[]>;

    /**
     * Get messages from a specific conversation
     */
    getMessages(conversationId: string, options?: { limit?: number; before?: string }): Promise<ConversationMessage[]>;

    /**
     * Create a new conversation with canvas context
     */
    create(options: { agentId: string; initialContext?: string; canvasSnapshot?: string; title?: string }): Promise<{ conversationId: string }>;

    /**
     * Add a message to an existing conversation
     */
    addMessage(conversationId: string, content: string): Promise<{ messageId: string; response?: { content: string; messageId: string } }>;
  };

  /** Artifacts API for accessing task artifacts */
  readonly artifacts: {
    /**
     * Get artifacts for a task
     */
    getForTask(taskId: string): Promise<Artifact[]>;

    /**
     * Create an artifact from canvas content
     */
    create(artifact: { taskId: string; type: string; description: string; content: string; validates?: string[] }): Promise<{ id: string }>;
  };

  /** Export API for canvas portability */
  readonly export: {
    /**
     * Export canvas to various formats
     */
    canvas(format: 'json' | 'svg' | 'png' | 'pdf' | 'markdown', options?: ExportOptions): Promise<ExportResult>;

    /**
     * Export canvas elements as code/prototype
     */
    toCode(options: CodeExportOptions): Promise<CodeExportResult>;
  };

  /** Clipboard API for canvas clipboard operations */
  readonly clipboard: {
    /**
     * Copy elements to clipboard
     */
    copy(elements: any[], format?: 'elements' | 'image' | 'text'): Promise<void>;

    /**
     * Paste from clipboard
     */
    paste(): Promise<{ type: 'elements' | 'image' | 'text'; data: any } | null>;
  };
}

// Declare DEVS as a global variable
declare var DEVS: DEVS;

// =============================================================================
// Available Package Module Declarations
// =============================================================================

// React module (already available, no import needed - just for reference)
declare module 'react' {
  export = React;
}

// Framer Motion types (simplified)
declare module 'framer-motion' {
  import * as React from 'react';

  export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    variants?: any;
    whileHover?: any;
    whileTap?: any;
    whileFocus?: any;
    whileDrag?: any;
    whileInView?: any;
    drag?: boolean | 'x' | 'y';
    dragConstraints?: any;
    onAnimationStart?: () => void;
    onAnimationComplete?: () => void;
    layout?: boolean | 'position' | 'size';
    layoutId?: string;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
    onClick?: (event: MouseEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
  }

  type MotionComponent<T = HTMLElement> = React.FC<MotionProps & React.HTMLAttributes<T>>;

  interface Motion {
    div: MotionComponent<HTMLDivElement>;
    span: MotionComponent<HTMLSpanElement>;
    button: MotionComponent<HTMLButtonElement>;
    a: MotionComponent<HTMLAnchorElement>;
    ul: MotionComponent<HTMLUListElement>;
    ol: MotionComponent<HTMLOListElement>;
    li: MotionComponent<HTMLLIElement>;
    p: MotionComponent<HTMLParagraphElement>;
    h1: MotionComponent<HTMLHeadingElement>;
    h2: MotionComponent<HTMLHeadingElement>;
    h3: MotionComponent<HTMLHeadingElement>;
    h4: MotionComponent<HTMLHeadingElement>;
    h5: MotionComponent<HTMLHeadingElement>;
    h6: MotionComponent<HTMLHeadingElement>;
    img: MotionComponent<HTMLImageElement>;
    svg: MotionComponent<SVGElement>;
    path: MotionComponent<SVGPathElement>;
    circle: MotionComponent<SVGCircleElement>;
    rect: MotionComponent<SVGRectElement>;
    input: MotionComponent<HTMLInputElement>;
    textarea: MotionComponent<HTMLTextAreaElement>;
    form: MotionComponent<HTMLFormElement>;
    nav: MotionComponent<HTMLElement>;
    header: MotionComponent<HTMLElement>;
    footer: MotionComponent<HTMLElement>;
    main: MotionComponent<HTMLElement>;
    section: MotionComponent<HTMLElement>;
    article: MotionComponent<HTMLElement>;
    aside: MotionComponent<HTMLElement>;
  }

  export const motion: Motion;

  export interface AnimatePresenceProps {
    children?: React.ReactNode;
    initial?: boolean;
    mode?: 'sync' | 'wait' | 'popLayout';
    onExitComplete?: () => void;
  }

  export const AnimatePresence: React.FC<AnimatePresenceProps>;

  export interface TargetAndTransition {
    [key: string]: any;
  }

  export interface Transition {
    duration?: number;
    delay?: number;
    ease?: string | number[];
    type?: 'tween' | 'spring' | 'inertia';
    stiffness?: number;
    damping?: number;
    mass?: number;
    repeat?: number;
    repeatType?: 'loop' | 'reverse' | 'mirror';
    repeatDelay?: number;
  }

  export function useAnimation(): {
    start: (definition: TargetAndTransition) => Promise<void>;
    stop: () => void;
    set: (definition: TargetAndTransition) => void;
  };

  export function useMotionValue<T>(initial: T): {
    get: () => T;
    set: (value: T) => void;
    onChange: (callback: (value: T) => void) => () => void;
  };

  export function useTransform<I, O>(
    value: { get: () => I },
    inputRange: I[],
    outputRange: O[]
  ): { get: () => O };

  export function useSpring(
    value: { get: () => number },
    config?: { stiffness?: number; damping?: number; mass?: number }
  ): { get: () => number };

  export function useInView(
    ref: React.RefObject<Element>,
    options?: { once?: boolean; margin?: string; amount?: number | 'some' | 'all' }
  ): boolean;

  export function useScroll(options?: {
    target?: React.RefObject<Element>;
    offset?: string[];
    layoutEffect?: boolean;
  }): {
    scrollX: { get: () => number };
    scrollY: { get: () => number };
    scrollXProgress: { get: () => number };
    scrollYProgress: { get: () => number };
  };
}

// SVG Element types for framer-motion
interface SVGElement extends Element {}
interface SVGPathElement extends SVGElement {}
interface SVGCircleElement extends SVGElement {}
interface SVGRectElement extends SVGElement {}
`

/**
 * Type definitions for @devs/components
 * Includes HeroUI re-exports and custom DEVS components
 */
export const DEVS_COMPONENTS_TYPES = /* ts */ `
// =============================================================================
// @devs/components - DEVS Extension Components
// =============================================================================

declare module '@devs/components' {
  import * as React from 'react';

  // ===========================================================================
  // Section Component
  // ===========================================================================

  export interface SectionProps {
    /** Child content */
    children?: React.ReactNode;
    /** Additional CSS classes for the inner container */
    className?: string;
    /** Additional CSS classes for the outer section */
    mainClassName?: string;
    /** Maximum width size (4=max-w-4xl, 5=max-w-5xl, 6=max-w-6xl, 7=max-w-7xl) */
    size?: 4 | 5 | 6 | 7;
    /** Inline styles */
    style?: React.CSSProperties;
  }

  /**
   * Section component for page layout
   * Provides consistent padding, margins, and max-width constraints
   *
   * @example
   * \`\`\`
   * <Section size={6}>
   *   <h1>My Content</h1>
   * </Section>
   * \`\`\`
   */
  export const Section: React.FC<SectionProps>;

  // ===========================================================================
  // Container Component
  // ===========================================================================

  export interface ContainerProps {
    /** Child content */
    children?: React.ReactNode;
    /** Additional CSS classes */
    className?: string;
    /** Maximum width size (4=max-w-4xl, 5=max-w-5xl, 6=max-w-6xl, 7=max-w-7xl) */
    size?: 4 | 5 | 6 | 7;
    /** Inline styles */
    style?: React.CSSProperties;
  }

  /**
   * Container component for content layout
   * Provides max-width constraints and centered content
   *
   * @example
   * \`\`\`
   * <Container size={5}>
   *   <Card>Content</Card>
   * </Container>
   * \`\`\`
   */
  export const Container: React.FC<ContainerProps>;

  // ===========================================================================
  // PromptArea Component
  // ===========================================================================

  export interface PromptAreaProps {
    /** Callback when the user submits the prompt */
    onSubmit?: (prompt: string) => void;
    /** Whether a request is currently in progress */
    isLoading?: boolean;
    /** Default prompt text */
    defaultPrompt?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Minimum number of rows */
    minRows?: number;
    /** Custom submit button content */
    submitLabel?: React.ReactNode;
    /** Whether to show the submit button */
    showSubmitButton?: boolean;
    /** Keyboard handler */
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    /** Controlled value */
    value?: string;
    /** Callback when value changes */
    onValueChange?: (value: string) => void;
    /** Additional CSS classes */
    className?: string;
    /** Disabled state */
    isDisabled?: boolean;
  }

  /**
   * PromptArea component for chat/prompt interfaces
   * Provides a textarea with optional submit button
   *
   * @example
   * \`\`\`
   * <PromptArea
   *   placeholder="Ask anything..."
   *   onSubmit={(prompt) => console.log(prompt)}
   *   isLoading={isProcessing}
   * />
   * \`\`\`
   */
  export const PromptArea: React.ForwardRefExoticComponent<
    PromptAreaProps & React.RefAttributes<HTMLTextAreaElement>
  >;

  // ===========================================================================
  // HeroUI Re-exports
  // ===========================================================================

  // Layout
  export { Divider } from '@heroui/react';
  export { Spacer } from '@heroui/react';

  // Buttons
  export { Button, ButtonGroup } from '@heroui/react';
  export type { ButtonProps, ButtonGroupProps } from '@heroui/react';

  // Forms
  export { Input } from '@heroui/react';
  export { Textarea } from '@heroui/react';
  export { Checkbox, CheckboxGroup } from '@heroui/react';
  export { Radio, RadioGroup } from '@heroui/react';
  export { Select, SelectItem, SelectSection } from '@heroui/react';
  export { Slider } from '@heroui/react';
  export { Switch } from '@heroui/react';
  export { Autocomplete, AutocompleteItem, AutocompleteSection } from '@heroui/react';
  export { DatePicker, DateRangePicker, DateInput } from '@heroui/react';
  export { TimeInput } from '@heroui/react';
  export { Form } from '@heroui/react';
  export type { InputProps, TextAreaProps, CheckboxProps, RadioProps, SelectProps, SliderProps, SwitchProps } from '@heroui/react';

  // Data Display
  export { Card, CardHeader, CardBody, CardFooter } from '@heroui/react';
  export { Avatar, AvatarGroup } from '@heroui/react';
  export { Badge } from '@heroui/react';
  export { Chip } from '@heroui/react';
  export { Code } from '@heroui/react';
  export { Image } from '@heroui/react';
  export { Kbd } from '@heroui/react';
  export { User } from '@heroui/react';
  export { Skeleton } from '@heroui/react';
  export { Snippet } from '@heroui/react';
  export type { CardProps, AvatarProps, BadgeProps, ChipProps, ImageProps } from '@heroui/react';

  // Feedback
  export { CircularProgress, Progress } from '@heroui/react';
  export { Spinner } from '@heroui/react';
  export type { ProgressProps, SpinnerProps } from '@heroui/react';

  // Navigation
  export { Accordion, AccordionItem } from '@heroui/react';
  export { Breadcrumbs, BreadcrumbItem } from '@heroui/react';
  export { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from '@heroui/react';
  export { Link } from '@heroui/react';
  export { Listbox, ListboxItem, ListboxSection } from '@heroui/react';
  export { Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from '@heroui/react';
  export { Pagination, PaginationItem, PaginationCursor } from '@heroui/react';
  export { Tabs, Tab } from '@heroui/react';
  export type { AccordionProps, LinkProps, TabsProps, PaginationProps } from '@heroui/react';

  // Overlay
  export { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
  export { Popover, PopoverTrigger, PopoverContent } from '@heroui/react';
  export { Tooltip } from '@heroui/react';
  export { Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter } from '@heroui/react';
  export type { ModalProps, PopoverProps, TooltipProps, DrawerProps } from '@heroui/react';

  // Disclosure
  export { useDisclosure } from '@heroui/react';
  export type { UseDisclosureReturn } from '@heroui/react';

  // Table
  export { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from '@heroui/react';
  export type { TableProps, TableColumnProps, TableRowProps, TableCellProps } from '@heroui/react';

  // Other
  export { Alert } from '@heroui/react';
  export { Calendar, RangeCalendar } from '@heroui/react';
  export { ScrollShadow } from '@heroui/react';
  export type { AlertProps, CalendarProps, ScrollShadowProps } from '@heroui/react';
}
`

/**
 * React and JSX type definitions for extensions
 */
export const REACT_TYPES = /* ts */ `
// =============================================================================
// ES Built-ins and DOM Types for Extensions
// =============================================================================

// Promise
interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2>;
}

interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<T | TResult>;
  finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}

interface PromiseConstructor {
  new <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
  race<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>;
  resolve<T>(value: T | PromiseLike<T>): Promise<T>;
  resolve(): Promise<void>;
  reject<T = never>(reason?: any): Promise<T>;
}
declare var Promise: PromiseConstructor;

type Awaited<T> = T extends null | undefined ? T : T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ? F extends ((value: infer V, ...args: infer _) => any) ? Awaited<V> : never : T;

// Array
interface Array<T> {
  length: number;
  push(...items: T[]): number;
  pop(): T | undefined;
  concat(...items: T[][]): T[];
  join(separator?: string): string;
  slice(start?: number, end?: number): T[];
  indexOf(searchElement: T, fromIndex?: number): number;
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  filter(predicate: (value: T, index: number, array: T[]) => boolean): T[];
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
  find(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => boolean): number;
  includes(searchElement: T, fromIndex?: number): boolean;
  some(predicate: (value: T, index: number, array: T[]) => boolean): boolean;
  every(predicate: (value: T, index: number, array: T[]) => boolean): boolean;
  sort(compareFn?: (a: T, b: T) => number): this;
  reverse(): T[];
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  flat<D extends number = 1>(depth?: D): T[];
  flatMap<U>(callback: (value: T, index: number, array: T[]) => U | U[]): U[];
  [n: number]: T;
  [Symbol.iterator](): IterableIterator<T>;
}

interface ArrayConstructor {
  new <T>(...items: T[]): T[];
  isArray(arg: any): arg is any[];
  from<T>(arrayLike: ArrayLike<T>): T[];
}
declare var Array: ArrayConstructor;

interface ArrayLike<T> {
  readonly length: number;
  readonly [n: number]: T;
}

// Record and other utility types
type Record<K extends keyof any, T> = { [P in K]: T };
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

// Object
interface Object {
  constructor: Function;
  toString(): string;
  valueOf(): Object;
  hasOwnProperty(v: string | number | symbol): boolean;
}

interface ObjectConstructor {
  new(value?: any): Object;
  keys(o: object): string[];
  values<T>(o: { [s: string]: T } | ArrayLike<T>): T[];
  entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
  assign<T extends {}, U>(target: T, source: U): T & U;
  freeze<T>(o: T): Readonly<T>;
}
declare var Object: ObjectConstructor;

// String
interface String {
  charAt(pos: number): string;
  charCodeAt(index: number): number;
  concat(...strings: string[]): string;
  indexOf(searchString: string, position?: number): number;
  lastIndexOf(searchString: string, position?: number): number;
  slice(start?: number, end?: number): string;
  split(separator: string | RegExp, limit?: number): string[];
  substring(start: number, end?: number): string;
  toLowerCase(): string;
  toUpperCase(): string;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  padStart(maxLength: number, fillString?: string): string;
  padEnd(maxLength: number, fillString?: string): string;
  replace(searchValue: string | RegExp, replaceValue: string): string;
  match(regexp: string | RegExp): RegExpMatchArray | null;
  includes(searchString: string, position?: number): boolean;
  startsWith(searchString: string, position?: number): boolean;
  endsWith(searchString: string, endPosition?: number): boolean;
  repeat(count: number): string;
  length: number;
  [index: number]: string;
}

interface RegExpMatchArray extends Array<string> {
  index?: number;
  input?: string;
}

// Number
interface Number {
  toString(radix?: number): string;
  toFixed(fractionDigits?: number): string;
  valueOf(): number;
}

// Boolean
interface Boolean {
  valueOf(): boolean;
}

// Function
interface Function {
  apply(this: Function, thisArg: any, argArray?: any): any;
  call(this: Function, thisArg: any, ...argArray: any[]): any;
  bind(this: Function, thisArg: any, ...argArray: any[]): any;
  name: string;
  length: number;
}

// JSON
interface JSON {
  parse(text: string): any;
  stringify(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
}
declare var JSON: JSON;

// Console
interface Console {
  log(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
  info(...data: any[]): void;
  debug(...data: any[]): void;
  table(tabularData: any, properties?: string[]): void;
  clear(): void;
  group(...label: any[]): void;
  groupEnd(): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
}
declare var console: Console;

// Timer functions
declare function setTimeout(callback: (...args: any[]) => void, ms?: number, ...args: any[]): number;
declare function clearTimeout(id: number | undefined): void;
declare function setInterval(callback: (...args: any[]) => void, ms?: number, ...args: any[]): number;
declare function clearInterval(id: number | undefined): void;
declare function requestAnimationFrame(callback: (time: number) => void): number;
declare function cancelAnimationFrame(handle: number): void;

// URI encoding/decoding functions
declare function encodeURIComponent(uriComponent: string | number | boolean): string;
declare function decodeURIComponent(encodedURIComponent: string): string;
declare function encodeURI(uri: string): string;
declare function decodeURI(encodedURI: string): string;

// Other global functions
declare function parseInt(string: string, radix?: number): number;
declare function parseFloat(string: string): number;
declare function isNaN(number: number): boolean;
declare function isFinite(number: number): boolean;
declare function btoa(data: string): string;
declare function atob(data: string): string;

// Math object
interface Math {
  readonly E: number;
  readonly LN10: number;
  readonly LN2: number;
  readonly LOG2E: number;
  readonly LOG10E: number;
  readonly PI: number;
  readonly SQRT1_2: number;
  readonly SQRT2: number;
  abs(x: number): number;
  acos(x: number): number;
  asin(x: number): number;
  atan(x: number): number;
  atan2(y: number, x: number): number;
  ceil(x: number): number;
  cos(x: number): number;
  exp(x: number): number;
  floor(x: number): number;
  log(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  pow(x: number, y: number): number;
  random(): number;
  round(x: number): number;
  sin(x: number): number;
  sqrt(x: number): number;
  tan(x: number): number;
  trunc(x: number): number;
  sign(x: number): number;
  cbrt(x: number): number;
  hypot(...values: number[]): number;
}
declare var Math: Math;

// Date
interface Date {
  toString(): string;
  toDateString(): string;
  toTimeString(): string;
  toLocaleString(): string;
  toLocaleDateString(): string;
  toLocaleTimeString(): string;
  valueOf(): number;
  getTime(): number;
  getFullYear(): number;
  getMonth(): number;
  getDate(): number;
  getDay(): number;
  getHours(): number;
  getMinutes(): number;
  getSeconds(): number;
  getMilliseconds(): number;
  getTimezoneOffset(): number;
  setTime(time: number): number;
  setFullYear(year: number, month?: number, date?: number): number;
  setMonth(month: number, date?: number): number;
  setDate(date: number): number;
  setHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setMinutes(min: number, sec?: number, ms?: number): number;
  setSeconds(sec: number, ms?: number): number;
  setMilliseconds(ms: number): number;
  toISOString(): string;
  toJSON(): string;
}

interface DateConstructor {
  new(): Date;
  new(value: number | string): Date;
  new(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
  (): string;
  readonly prototype: Date;
  parse(s: string): number;
  now(): number;
  UTC(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
}
declare var Date: DateConstructor;

// RegExp
interface RegExp {
  exec(string: string): RegExpExecArray | null;
  test(string: string): boolean;
  readonly source: string;
  readonly global: boolean;
  readonly ignoreCase: boolean;
  readonly multiline: boolean;
  lastIndex: number;
  readonly flags: string;
}

interface RegExpExecArray extends Array<string> {
  index: number;
  input: string;
  groups?: { [key: string]: string };
}

interface RegExpConstructor {
  new(pattern: string | RegExp, flags?: string): RegExp;
  (pattern: string | RegExp, flags?: string): RegExp;
}
declare var RegExp: RegExpConstructor;

// Error
interface Error {
  name: string;
  message: string;
  stack?: string;
}

interface ErrorConstructor {
  new(message?: string): Error;
  (message?: string): Error;
}
declare var Error: ErrorConstructor;

// Map and Set
interface Map<K, V> {
  readonly size: number;
  clear(): void;
  delete(key: K): boolean;
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[K, V]>;
}

interface MapConstructor {
  new <K, V>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
}
declare var Map: MapConstructor;

interface Set<T> {
  readonly size: number;
  add(value: T): this;
  clear(): void;
  delete(value: T): boolean;
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void): void;
  has(value: T): boolean;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  entries(): IterableIterator<[T, T]>;
}

interface SetConstructor {
  new <T>(values?: readonly T[] | null): Set<T>;
}
declare var Set: SetConstructor;

interface IterableIterator<T> {
  next(): IteratorResult<T>;
  [Symbol.iterator](): IterableIterator<T>;
}

interface IteratorResult<T> {
  done: boolean;
  value: T;
}

declare var Symbol: {
  readonly iterator: unique symbol;
  readonly toStringTag: unique symbol;
};

// Fetch API
interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData | Blob;
  mode?: 'cors' | 'no-cors' | 'same-origin';
  credentials?: 'omit' | 'same-origin' | 'include';
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache';
  redirect?: 'follow' | 'error' | 'manual';
}

interface Response {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
  clone(): Response;
}

interface Headers {
  get(name: string): string | null;
  set(name: string, value: string): void;
  has(name: string): boolean;
  delete(name: string): void;
  forEach(callback: (value: string, key: string) => void): void;
}

interface Blob {
  size: number;
  type: string;
  slice(start?: number, end?: number, contentType?: string): Blob;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface FormData {
  append(name: string, value: string | Blob, fileName?: string): void;
  delete(name: string): void;
  get(name: string): string | File | null;
  getAll(name: string): (string | File)[];
  has(name: string): boolean;
  set(name: string, value: string | Blob, fileName?: string): void;
}

interface File extends Blob {
  name: string;
  lastModified: number;
}

declare function fetch(input: string | Request, init?: RequestInit): Promise<Response>;

interface Request {
  url: string;
  method: string;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
  clone(): Request;
}

interface ReadableStream<R = any> {
  readonly locked: boolean;
  cancel(reason?: any): Promise<void>;
  getReader(): ReadableStreamDefaultReader<R>;
}

interface ReadableStreamDefaultReader<R = any> {
  readonly closed: Promise<undefined>;
  cancel(reason?: any): Promise<void>;
  read(): Promise<ReadableStreamReadResult<R>>;
  releaseLock(): void;
}

interface ReadableStreamReadResult<T> {
  done: boolean;
  value: T;
}

// DOM Types
interface EventTarget {
  addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | EventListenerOptions): void;
  dispatchEvent(event: Event): boolean;
}

interface EventListener {
  (evt: Event): void;
}

interface EventListenerObject {
  handleEvent(object: Event): void;
}

interface AddEventListenerOptions extends EventListenerOptions {
  once?: boolean;
  passive?: boolean;
  signal?: AbortSignal;
}

interface EventListenerOptions {
  capture?: boolean;
}

interface AbortSignal extends EventTarget {
  readonly aborted: boolean;
  readonly reason: any;
  onabort: ((this: AbortSignal, ev: Event) => any) | null;
  throwIfAborted(): void;
}

interface AbortController {
  readonly signal: AbortSignal;
  abort(reason?: any): void;
}

declare var AbortController: {
  new(): AbortController;
};

interface Event {
  readonly type: string;
  readonly target: EventTarget | null;
  readonly currentTarget: EventTarget | null;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

interface Node extends EventTarget {
  readonly nodeName: string;
  readonly nodeType: number;
  readonly parentNode: Node | null;
  readonly childNodes: NodeList;
  readonly firstChild: Node | null;
  readonly lastChild: Node | null;
  textContent: string | null;
  appendChild<T extends Node>(node: T): T;
  removeChild<T extends Node>(child: T): T;
  cloneNode(deep?: boolean): Node;
  contains(other: Node | null): boolean;
}

interface NodeList {
  readonly length: number;
  item(index: number): Node | null;
  forEach(callback: (node: Node, index: number, listObj: NodeList) => void): void;
  [index: number]: Node;
}

interface Element extends Node {
  readonly tagName: string;
  id: string;
  className: string;
  classList: DOMTokenList;
  innerHTML: string;
  outerHTML: string;
  getAttribute(qualifiedName: string): string | null;
  setAttribute(qualifiedName: string, value: string): void;
  removeAttribute(qualifiedName: string): void;
  hasAttribute(qualifiedName: string): boolean;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
  closest<E extends Element = Element>(selectors: string): E | null;
  getBoundingClientRect(): DOMRect;
  scrollIntoView(arg?: boolean | ScrollIntoViewOptions): void;
}

interface NodeListOf<TNode extends Node> extends NodeList {
  item(index: number): TNode;
  forEach(callback: (node: TNode, index: number, listObj: NodeListOf<TNode>) => void): void;
  [index: number]: TNode;
}

interface DOMTokenList {
  readonly length: number;
  add(...tokens: string[]): void;
  remove(...tokens: string[]): void;
  toggle(token: string, force?: boolean): boolean;
  contains(token: string): boolean;
  item(index: number): string | null;
}

interface DOMRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

interface ScrollIntoViewOptions {
  behavior?: 'auto' | 'smooth';
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
}

interface HTMLElement extends Element {
  style: CSSStyleDeclaration;
  innerText: string;
  hidden: boolean;
  tabIndex: number;
  title: string;
  dir: string;
  lang: string;
  offsetHeight: number;
  offsetWidth: number;
  offsetTop: number;
  offsetLeft: number;
  click(): void;
  focus(options?: FocusOptions): void;
  blur(): void;
}

interface CSSStyleDeclaration {
  cssText: string;
  length: number;
  getPropertyValue(property: string): string;
  setProperty(property: string, value: string | null, priority?: string): void;
  removeProperty(property: string): string;
  [index: number]: string;
  // Common properties
  color: string;
  backgroundColor: string;
  display: string;
  position: string;
  top: string;
  left: string;
  right: string;
  bottom: string;
  width: string;
  height: string;
  margin: string;
  padding: string;
  border: string;
  opacity: string;
  transform: string;
  transition: string;
  visibility: string;
  overflow: string;
  zIndex: string;
  cursor: string;
  fontSize: string;
  fontWeight: string;
  textAlign: string;
}

interface FocusOptions {
  preventScroll?: boolean;
}

interface HTMLInputElement extends HTMLElement {
  value: string;
  type: string;
  placeholder: string;
  disabled: boolean;
  readOnly: boolean;
  checked: boolean;
  name: string;
  min: string;
  max: string;
  step: string;
  select(): void;
}

interface HTMLTextAreaElement extends HTMLElement {
  value: string;
  placeholder: string;
  disabled: boolean;
  readOnly: boolean;
  rows: number;
  cols: number;
  name: string;
  select(): void;
}

interface HTMLButtonElement extends HTMLElement {
  disabled: boolean;
  type: string;
  name: string;
  value: string;
}

interface HTMLAnchorElement extends HTMLElement {
  href: string;
  target: string;
  rel: string;
  download: string;
}

interface HTMLImageElement extends HTMLElement {
  src: string;
  alt: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  complete: boolean;
}

interface HTMLCanvasElement extends HTMLElement {
  width: number;
  height: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
  getContext(contextId: 'webgl' | 'webgl2'): WebGLRenderingContext | null;
  toDataURL(type?: string, quality?: any): string;
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: any): void;
}

interface CanvasRenderingContext2D {
  canvas: HTMLCanvasElement;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: 'start' | 'end' | 'left' | 'right' | 'center';
  textBaseline: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom';
  globalAlpha: number;
  globalCompositeOperation: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): TextMetrics;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  drawImage(image: HTMLImageElement | HTMLCanvasElement, dx: number, dy: number): void;
  drawImage(image: HTMLImageElement | HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(image: HTMLImageElement | HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
  putImageData(imagedata: ImageData, dx: number, dy: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
}

interface CanvasGradient {
  addColorStop(offset: number, color: string): void;
}

interface CanvasPattern {}

interface TextMetrics {
  width: number;
}

interface ImageData {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

interface Uint8ClampedArray {
  readonly length: number;
  [index: number]: number;
}

interface WebGLRenderingContext {}

interface Document extends Node {
  readonly body: HTMLElement;
  readonly head: HTMLHeadElement;
  readonly documentElement: HTMLElement;
  getElementById(elementId: string): HTMLElement | null;
  getElementsByClassName(classNames: string): HTMLCollectionOf<Element>;
  getElementsByTagName(qualifiedName: string): HTMLCollectionOf<Element>;
  querySelector<E extends Element = Element>(selectors: string): E | null;
  querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E>;
  createElement<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K];
  createElement(tagName: string): HTMLElement;
  createTextNode(data: string): Text;
  createDocumentFragment(): DocumentFragment;
  createComment(data: string): Comment;
  activeElement: Element | null;
  hasFocus(): boolean;
}

interface HTMLHeadElement extends HTMLElement {}
interface Text extends Node {}
interface Comment extends Node {}
interface DocumentFragment extends Node {}

interface HTMLElementTagNameMap {
  'div': HTMLDivElement;
  'span': HTMLSpanElement;
  'a': HTMLAnchorElement;
  'button': HTMLButtonElement;
  'input': HTMLInputElement;
  'textarea': HTMLTextAreaElement;
  'img': HTMLImageElement;
  'canvas': HTMLCanvasElement;
  'p': HTMLParagraphElement;
  'h1': HTMLHeadingElement;
  'h2': HTMLHeadingElement;
  'h3': HTMLHeadingElement;
  'h4': HTMLHeadingElement;
  'h5': HTMLHeadingElement;
  'h6': HTMLHeadingElement;
  'ul': HTMLUListElement;
  'ol': HTMLOListElement;
  'li': HTMLLIElement;
  'table': HTMLTableElement;
  'form': HTMLFormElement;
  'label': HTMLLabelElement;
  'select': HTMLSelectElement;
  'option': HTMLOptionElement;
}

interface HTMLDivElement extends HTMLElement {}
interface HTMLSpanElement extends HTMLElement {}
interface HTMLParagraphElement extends HTMLElement {}
interface HTMLHeadingElement extends HTMLElement {}
interface HTMLUListElement extends HTMLElement {}
interface HTMLOListElement extends HTMLElement {}
interface HTMLLIElement extends HTMLElement {}
interface HTMLTableElement extends HTMLElement {}
interface HTMLFormElement extends HTMLElement {}
interface HTMLLabelElement extends HTMLElement {}
interface HTMLSelectElement extends HTMLElement {
  value: string;
  selectedIndex: number;
  options: HTMLOptionsCollection;
}
interface HTMLOptionElement extends HTMLElement {
  value: string;
  text: string;
  selected: boolean;
}
interface HTMLOptionsCollection {
  readonly length: number;
  [index: number]: HTMLOptionElement;
}

interface HTMLCollectionOf<T extends Element> {
  readonly length: number;
  item(index: number): T | null;
  [index: number]: T;
}

interface Window extends EventTarget {
  readonly document: Document;
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly outerWidth: number;
  readonly outerHeight: number;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly localStorage: Storage;
  readonly sessionStorage: Storage;
  readonly location: Location;
  readonly history: History;
  readonly navigator: Navigator;
  alert(message?: any): void;
  confirm(message?: string): boolean;
  prompt(message?: string, _default?: string): string | null;
  open(url?: string, target?: string, features?: string): Window | null;
  close(): void;
  scroll(x: number, y: number): void;
  scrollTo(x: number, y: number): void;
  scrollBy(x: number, y: number): void;
  getComputedStyle(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration;
  matchMedia(query: string): MediaQueryList;
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(handle: number): void;
  DEVS: DEVS;
}

interface Storage {
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
}

interface Location {
  readonly href: string;
  readonly protocol: string;
  readonly host: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly origin: string;
  assign(url: string): void;
  replace(url: string): void;
  reload(): void;
}

interface History {
  readonly length: number;
  readonly state: any;
  back(): void;
  forward(): void;
  go(delta?: number): void;
  pushState(data: any, unused: string, url?: string | null): void;
  replaceState(data: any, unused: string, url?: string | null): void;
}

interface Navigator {
  readonly userAgent: string;
  readonly language: string;
  readonly languages: readonly string[];
  readonly platform: string;
  readonly onLine: boolean;
  readonly clipboard: Clipboard;
}

interface Clipboard extends EventTarget {
  read(): Promise<ClipboardItems>;
  readText(): Promise<string>;
  write(data: ClipboardItems): Promise<void>;
  writeText(data: string): Promise<void>;
}

type ClipboardItems = ClipboardItem[];
interface ClipboardItem {
  readonly types: readonly string[];
  getType(type: string): Promise<Blob>;
}

interface MediaQueryList extends EventTarget {
  readonly matches: boolean;
  readonly media: string;
}

declare var window: Window;
declare var document: Document;
declare var navigator: Navigator;
declare var localStorage: Storage;
declare var sessionStorage: Storage;

// =============================================================================
// React Types for Extensions
// =============================================================================

declare namespace React {
  type ReactNode =
    | React.ReactElement<any, any>
    | string
    | number
    | boolean
    | null
    | undefined
    | React.ReactNodeArray;

  interface ReactNodeArray extends Array<ReactNode> {}

  interface ReactElement<P = any, T extends string | React.JSXElementConstructor<any> = string | React.JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: string | null;
  }

  type JSXElementConstructor<P> = ((props: P) => ReactElement<any, any> | null) | (new (props: P) => Component<P, any>);

  interface Component<P = {}, S = {}> {
    props: P;
    state: S;
    render(): ReactNode;
  }

  interface FC<P = {}> {
    (props: P): ReactElement<any, any> | null;
    displayName?: string;
  }

  type FunctionComponent<P = {}> = FC<P>;

  interface ForwardRefExoticComponent<P> extends React.FC<P> {
    defaultProps?: Partial<P>;
  }

  interface RefAttributes<T> {
    ref?: React.Ref<T>;
  }

  type Ref<T> = ((instance: T | null) => void) | React.RefObject<T> | null;

  interface RefObject<T> {
    readonly current: T | null;
  }

  interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  type KeyboardEventHandler<T = Element> = (event: KeyboardEvent<T>) => void;

  interface KeyboardEvent<T = Element> {
    key: string;
    code: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    preventDefault(): void;
    stopPropagation(): void;
  }

  interface MouseEvent<T = Element> {
    clientX: number;
    clientY: number;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    preventDefault(): void;
    stopPropagation(): void;
  }

  interface ChangeEvent<T = Element> {
    target: T;
    currentTarget: T;
  }

  interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
  }

  // Hooks
  function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useRef<T>(initialValue: T): RefObject<T>;
  function useContext<T>(context: React.Context<T>): T;
  function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void];

  interface Context<T> {
    Provider: React.FC<{ value: T; children?: ReactNode }>;
    Consumer: React.FC<{ children: (value: T) => ReactNode }>;
  }

  function createContext<T>(defaultValue: T): Context<T>;
  function forwardRef<T, P = {}>(render: (props: P, ref: React.Ref<T>) => ReactElement | null): ForwardRefExoticComponent<P & RefAttributes<T>>;
  function memo<P>(component: FC<P>): FC<P>;
  function lazy<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>): T;

  // Fragment
  const Fragment: React.FC<{ children?: ReactNode }>;
}

declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass extends React.Component<any> {}
    interface IntrinsicElements {
      div: any;
      span: any;
      p: any;
      h1: any;
      h2: any;
      h3: any;
      h4: any;
      h5: any;
      h6: any;
      a: any;
      button: any;
      input: any;
      textarea: any;
      select: any;
      option: any;
      form: any;
      label: any;
      img: any;
      svg: any;
      path: any;
      canvas: any;
      video: any;
      audio: any;
      iframe: any;
      ul: any;
      ol: any;
      li: any;
      table: any;
      thead: any;
      tbody: any;
      tr: any;
      th: any;
      td: any;
      nav: any;
      header: any;
      footer: any;
      main: any;
      section: any;
      article: any;
      aside: any;
      pre: any;
      code: any;
      strong: any;
      em: any;
      br: any;
      hr: any;
    }
  }
}
`

/**
 * Combine all type definitions for Monaco
 */
export const ALL_EXTENSION_TYPES =
  DEVS_TYPES + '\n\n' + DEVS_COMPONENTS_TYPES + '\n\n' + REACT_TYPES
