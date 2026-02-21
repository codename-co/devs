/**
 * SkillSearch — Search interface for discovering skills from SkillsMP.
 */

import { useState, useCallback } from 'react'
import { Input, Button, Spinner, ButtonGroup } from '@heroui/react'
import { Icon } from '@/components'
import { searchSkills, aiSearchSkills } from '@/lib/skills/skillsmp-client'
import type { SkillSearchResult } from '@/lib/skills/skillsmp-client'
import { isSkillInstalled } from '@/stores/skillStore'
import { SkillCard } from './SkillCard'

interface SkillSearchProps {
  /** SkillsMP API key */
  apiKey: string
  /** Translate function */
  t: (key: string) => string
  /** Called when a skill is selected for detail view */
  onSelect?: (result: SkillSearchResult) => void
  /** Called when install is requested */
  onInstall?: (result: SkillSearchResult) => void
  /** Set of skill IDs currently being installed */
  installingIds?: Set<string>
}

export function SkillSearch({
  apiKey,
  t,
  onSelect,
  onInstall,
  installingIds = new Set(),
}: SkillSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SkillSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword')
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !apiKey) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      if (searchMode === 'ai') {
        const response = await aiSearchSkills(query, apiKey)
        setResults(response.data.skills)
      } else {
        const response = await searchSkills(query, apiKey, {
          limit: 20,
          sortBy: 'stars',
        })
        setResults(response.data.skills)
      }
    } catch (error) {
      console.error('Skill search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [query, apiKey, searchMode])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch()
    },
    [handleSearch],
  )

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          value={query}
          onValueChange={setQuery}
          onKeyDown={handleKeyDown}
          placeholder={t('Search skills...')}
          startContent={
            <Icon
              name="Search"
              width={16}
              height={16}
              className="text-default-400"
            />
          }
          size="sm"
          className="flex-1"
        />
        <ButtonGroup size="sm">
          <Button
            variant={searchMode === 'keyword' ? 'solid' : 'flat'}
            onPress={() => setSearchMode('keyword')}
          >
            {t('Keyword')}
          </Button>
          <Button
            variant={searchMode === 'ai' ? 'solid' : 'flat'}
            onPress={() => setSearchMode('ai')}
          >
            {t('AI Search')}
          </Button>
        </ButtonGroup>
        <Button
          size="sm"
          color="primary"
          onPress={handleSearch}
          isDisabled={!query.trim() || isSearching}
        >
          {isSearching ? <Spinner size="sm" /> : t('Discover')}
        </Button>
      </div>

      {/* Results */}
      {isSearching && (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" label={t('Searching...')} />
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="text-center py-8 text-default-400">
          <Icon name="Search" width={32} height={32} className="mx-auto mb-2" />
          <p className="text-sm">{t('No skills found')}</p>
          <p className="text-xs">{t('Try a different search query')}</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map((result) => (
            <SkillCard
              key={result.id}
              searchResult={result}
              isInstalled={isSkillInstalled(result.githubUrl)}
              isInstalling={installingIds.has(result.id)}
              t={t}
              onInstall={() => onInstall?.(result)}
              onSelect={() => onSelect?.(result)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
