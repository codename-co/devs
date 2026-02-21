/**
 * Agent Skills Module
 *
 * Browser-native skill discovery, installation, and activation.
 *
 * @module lib/skills
 */

export {
  searchSkills,
  aiSearchSkills,
  SkillsmpError,
} from './skillsmp-client'
export type {
  SkillSearchResult,
  SkillsPagination,
  SkillSearchResponse,
  SkillAISearchResponse,
  SkillSearchOptions,
} from './skillsmp-client'

export {
  parseGitHubUrl,
  parseFrontmatter,
  detectLanguage,
  detectMimeType,
  extractPythonPackages,
  fetchSkillFromGitHub,
  fetchGitHubDirectory,
  fetchRawContent,
  fetchAllFilesInDirectory,
  PYTHON_STDLIB_MODULES,
} from './github-fetcher'
export type {
  ParsedGitHubUrl,
  SkillManifest,
  FetchedSkill,
} from './github-fetcher'

export {
  buildSkillCatalogXml,
  buildSkillInstructions,
  getSkillCompatibility,
} from './skill-prompt'

export {
  SandboxedCodeRunner,
  sandboxedCodeRunner,
  checkPackageCompatibility,
  PYODIDE_BUILTIN_PACKAGES,
  PYODIDE_INCOMPATIBLE_PACKAGES,
} from './sandboxed-code-runner'
export type {
  SandboxExecutionRequest,
  SandboxExecutionResult,
  SandboxInputFile,
  SandboxOutputFile,
  SandboxState,
  SandboxProgressEvent,
} from './sandboxed-code-runner'

export {
  resolveInputFiles,
  resolveKnowledgeFile,
  processOutputFiles,
  formatOutputForLLM,
  outputFileToKnowledgeData,
  inferMimeType,
  isBinaryMimeType,
} from './file-bridge'
export type {
  FileReference,
  KnowledgeFileReference,
  InlineFileReference,
  ProcessedOutputFile,
} from './file-bridge'
