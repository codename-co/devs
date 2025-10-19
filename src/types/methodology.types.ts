/**
 * TypeScript types generated from methodology.schema.json
 * Universal schema for defining task execution methodologies for AI agent swarm coordination
 */

import { IconName } from '@/lib/types'

export type MethodologyType =
  | 'sequential'
  | 'parallel-sequential'
  | 'event-driven'
  | 'iterative'
  | 'hierarchical'
  | 'time-boxed'
  | 'hybrid'
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'expert'
export type ExecutionStrategy =
  | 'sequential'
  | 'parallel'
  | 'conditional'
  | 'iterative'
  | 'nested'
export type FailureStrategy = 'abort' | 'retry' | 'skip' | 'fallback'
export type CommunicationType =
  | 'direct'
  | 'broadcast'
  | 'request-response'
  | 'publish-subscribe'
export type ContextType =
  | 'decision'
  | 'finding'
  | 'resource'
  | 'constraint'
  | 'requirement'
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'expert'
export type AuthorityLevel =
  | 'observer'
  | 'contributor'
  | 'reviewer'
  | 'approver'
  | 'leader'
export type TaskType =
  | 'analysis'
  | 'design'
  | 'implementation'
  | 'review'
  | 'decision'
  | 'documentation'
  | 'testing'
  | 'planning'
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'expert'
export type RequirementType = 'functional' | 'non_functional' | 'constraint'
export type RequirementPriority = 'must' | 'should' | 'could' | 'wont'
export type ArtifactFormat =
  | 'markdown'
  | 'json'
  | 'code'
  | 'html'
  | 'binary'
  | 'structured'
export type CriterionType =
  | 'artifact-exists'
  | 'requirement-satisfied'
  | 'metric-threshold'
  | 'phase-completed'
  | 'custom'
export type ComparisonOperator = '<' | '≤' | '>' | '≥' | '==' | '!='
export type TimeUnit =
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months'
  | 'years'
export type CeremonyTiming =
  | 'phase-start'
  | 'phase-end'
  | 'daily'
  | 'periodic'
  | 'on-demand'

export interface MethodologyMetadata {
  id: string
  name: string
  title?: string
  description?: string
  type: MethodologyType
  version: string
  origin?: string
  domains?: string[]
  complexity?: ComplexityLevel
  tags?: string[]
  diagram?: string
  i18n?: Record<string, { name?: string; title?: string; description?: string }>
}

export interface TimeBoxConfiguration {
  duration: number
  unit: TimeUnit
  strict?: boolean
}

export interface QualityGateConfiguration {
  enabled?: boolean
  autoRetry?: boolean
  maxRetries?: number
}

export interface ParallelizationConfiguration {
  enabled?: boolean
  maxConcurrentTasks?: number
  maxConcurrentAgents?: number
}

export interface ConvergenceConfiguration {
  metric: string
  threshold: number
  operator: ComparisonOperator
}

export interface MethodologyConfiguration {
  maxIterations?: number
  timeBox?: TimeBoxConfiguration
  qualityGates?: QualityGateConfiguration
  parallelization?: ParallelizationConfiguration
  convergence?: ConvergenceConfiguration
}

export interface Criterion {
  type: CriterionType
  description?: string
  artifactType?: string
  requirementId?: string
  metric?: string
  threshold?: number
  operator?: ComparisonOperator
  phaseId?: string
  customValidator?: string
}

export interface ArtifactReference {
  typeId: string
  required?: boolean
  minCount?: number
  maxCount?: number
}

export interface TaskRequirement {
  type: RequirementType
  description: string
  priority: RequirementPriority
  validationCriteria: string[]
}

export interface TaskTemplate {
  id: string
  title: string
  description?: string
  type?: TaskType
  complexity?: TaskComplexity
  dependencies?: string[]
  assignedRole?: string
  estimatedDuration?: number
  artifacts?: {
    inputs?: ArtifactReference[]
    outputs?: ArtifactReference[]
  }
  requirements?: TaskRequirement[]
  parallelizable?: boolean
}

export interface PhaseDuration {
  estimated: number
  min?: number
  max?: number
}

export interface PhaseAgentRequirements {
  roles?: string[]
  skills?: string[]
  minExperience?: ExperienceLevel
}

export interface Phase {
  id: string
  name: string
  title?: string
  description?: string
  order?: number
  parentPhaseId?: string
  entryCriteria?: Criterion[]
  exitCriteria?: Criterion[]
  tasks: TaskTemplate[]
  duration?: PhaseDuration
  artifacts?: {
    inputs?: ArtifactReference[]
    outputs?: ArtifactReference[]
  }
  agentRequirements?: PhaseAgentRequirements
  parallelizable?: boolean
  optional?: boolean
  repeatable?: boolean
}

export interface Loop {
  id: string
  name?: string
  description?: string
  phases: string[]
  maxIterations?: number
  convergenceCriteria?: Criterion[]
  exitConditions?: Criterion[]
}

export interface Branch {
  id?: string
  condition: Criterion
  truePhase: string
  falsePhase: string
}

export interface FailureHandling {
  strategy: FailureStrategy
  fallbackPhase?: string
}

export interface Execution {
  strategy: ExecutionStrategy
  phaseOrder?: string[]
  loops?: Loop[]
  branches?: Branch[]
  failureHandling?: FailureHandling
}

export interface AgentRole {
  id: string
  name: string
  icon?: IconName
  description?: string
  responsibilities: string[]
  requiredSkills?: string[]
  optionalSkills?: string[]
  experienceLevel?: ExperienceLevel
  authority?: AuthorityLevel
}

export interface TeamComposition {
  minSize?: number
  maxSize?: number
  required?: string[]
  optional?: string[]
}

export interface CommunicationPattern {
  from: string
  to: string
  type: CommunicationType
  contextTypes?: ContextType[]
}

export interface DecisionAuthority {
  decision: string
  authority: string
  requiresConsensus?: boolean
  consensusRoles?: string[]
}

export interface AgentCoordination {
  roles?: AgentRole[]
  teamComposition?: TeamComposition
  communicationPatterns?: CommunicationPattern[]
  decisionAuthority?: DecisionAuthority[]
}

export interface ValidationRule {
  rule: string
  errorMessage: string
}

export interface ArtifactTemplate {
  name: string
  content: string
}

export interface ArtifactType {
  id: string
  name: string
  description?: string
  format: ArtifactFormat
  schema?: Record<string, any>
  validationRules?: ValidationRule[]
  templates?: ArtifactTemplate[]
}

export interface ArtifactDependency {
  artifact: string
  dependsOn: string[]
}

export interface ArtifactFlow {
  artifactTypes?: ArtifactType[]
  dependencies?: ArtifactDependency[]
}

export interface Ceremony {
  id: string
  name: string
  description?: string
  timing: CeremonyTiming
  duration?: number
  participants: string[]
  artifacts?: {
    inputs?: string[]
    outputs?: string[]
  }
  objectives?: string[]
}

export interface Methodology {
  metadata: MethodologyMetadata
  configuration?: MethodologyConfiguration
  phases: Phase[]
  execution: Execution
  agentCoordination?: AgentCoordination
  artifactFlow?: ArtifactFlow
  ceremonies?: Ceremony[]
}
