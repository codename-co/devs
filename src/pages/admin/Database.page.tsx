import React, { useState, useEffect } from 'react'
import {
  Button,
  Chip,
  Tabs,
  Tab,
  Code,
  Alert,
  Spinner,
  Tooltip,
  Pagination,
  Input,
} from '@heroui/react'
import { db, Database } from '@/lib/db'
import { useI18n } from '@/i18n'
import { Icon, Container, Section } from '@/components'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'
import clsx from 'clsx'
import { errorToast, successToast } from '@/lib/toast'

interface DatabaseStats {
  name: string
  version: number
  stores: StoreInfo[]
  totalRecords: number
  totalSize: number
}

interface StoreInfo {
  name: string
  recordCount: number
  indexes: string[]
  allData: any[]
  size: number
}

export const DatabasePage: React.FC = () => {
  const { lang, t } = useI18n()
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState<Record<string, string>>({})
  const ITEMS_PER_PAGE = 10

  function formatValue(value: any, shortened = true): string {
    if (value === null || value === undefined) {
      return 'null'
    }

    if (typeof value === 'number') {
      return value.toString()
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }

    if (value instanceof Date) {
      return value.toLocaleDateString(lang)
    }

    if (Array.isArray(value)) {
      return shortened
        ? `[${value.length} items]`
        : JSON.stringify(value, null, 2)
    }

    if (typeof value === 'object') {
      return shortened
        ? `{${Object.keys(value).length} fields}`
        : JSON.stringify(value, null, 2)
    }

    if (value.startsWith('data:')) {
      return `[data]`
    }

    if (typeof value === 'string') {
      return shortened && value.length > 50
        ? `${value.substring(0, 50)}…`
        : value
    }

    return String(value)
  }

  const loadDatabaseStats = async () => {
    try {
      setLoading(true)
      await db.init()

      const stores: StoreInfo[] = []
      let totalRecords = 0

      // Get all store names from the Database class
      const storeNames = Database.STORES

      for (const storeName of storeNames) {
        try {
          const records = await db.getAll(storeName)
          const recordCount = records.length
          totalRecords += recordCount

          // Store all data for pagination
          const allData = records

          // Estimate size
          const size = JSON.stringify(records).length

          // Get store indexes from database schema
          const indexes = await getStoreIndexes(storeName)

          stores.push({
            name: storeName,
            recordCount,
            indexes,
            allData,
            size,
          })
        } catch (error) {
          console.error(`Error loading store ${storeName}:`, error)
          stores.push({
            name: storeName,
            recordCount: 0,
            indexes: [],
            allData: [],
            size: 0,
          })
        }
      }

      const totalSize = stores.reduce((sum, store) => sum + store.size, 0)

      setStats({
        name: Database.DB_NAME,
        version: Database.DB_VERSION,
        stores,
        totalRecords,
        totalSize,
      })
    } catch (error) {
      console.error('Error loading database stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStoreIndexes = async (storeName: string): Promise<string[]> => {
    try {
      if (!db.isInitialized()) {
        await db.init()
      }

      return new Promise<string[]>((resolve) => {
        const request = indexedDB.open(Database.DB_NAME)

        request.onsuccess = () => {
          const database = request.result

          if (!database.objectStoreNames.contains(storeName)) {
            database.close()
            resolve([])
            return
          }

          // We need to create a transaction to access the store
          const transaction = database.transaction([storeName], 'readonly')
          const store = transaction.objectStore(storeName)

          // Get all index names from the store
          const indexNames: string[] = []
          for (let i = 0; i < store.indexNames.length; i++) {
            indexNames.push(store.indexNames.item(i)!)
          }

          database.close()
          resolve(indexNames)
        }

        request.onerror = () => {
          console.warn(
            `Failed to get indexes for store ${storeName}:`,
            request.error,
          )
          resolve([])
        }
      })
    } catch (error) {
      console.warn(`Error getting indexes for store ${storeName}:`, error)
      return []
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const viewRecord = (record: any) => {
    setSelectedRecord(record)
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedRecord(null)
  }

  const getPaginatedData = (store: StoreInfo) => {
    const page = currentPage[store.name] || 1
    const search = searchTerm[store.name] || ''

    // Add a local index to each record for consistent keys
    store.allData = store.allData.map((item, index) => ({
      ...item,
      _index: index + 1,
    }))

    // Sort data by most recent first if date fields exist
    let sortedData = [...store.allData].sort((a, b) => {
      // Try to find date fields to sort by (createdAt, updatedAt, timestamp, lastModified)
      const dateFields = ['createdAt', 'updatedAt', 'timestamp', 'lastModified']
      for (const field of dateFields) {
        if ((a as any)[field] && (b as any)[field]) {
          const dateA =
            (a as any)[field] instanceof Date
              ? (a as any)[field]
              : new Date((a as any)[field])
          const dateB =
            (b as any)[field] instanceof Date
              ? (b as any)[field]
              : new Date((b as any)[field])
          return dateB.getTime() - dateA.getTime() // Most recent first
        }
      }
      return 0 // No date fields found, maintain original order
    })

    let filteredData = sortedData

    if (search) {
      filteredData = sortedData.filter((item) => {
        const searchStr = JSON.stringify(item).toLowerCase()
        return searchStr.includes(search.toLowerCase())
      })
    }

    const startIndex = (page - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE

    return {
      data: filteredData.slice(startIndex, endIndex),
      totalItems: filteredData.length,
      totalPages: Math.ceil(filteredData.length / ITEMS_PER_PAGE),
    }
  }

  const handlePageChange = (storeName: string, page: number) => {
    setCurrentPage((prev) => ({ ...prev, [storeName]: page }))
  }

  const handleSearch = (storeName: string, term: string) => {
    setSearchTerm((prev) => ({ ...prev, [storeName]: term }))
    setCurrentPage((prev) => ({ ...prev, [storeName]: 1 })) // Reset to first page when searching
  }

  useEffect(() => {
    loadDatabaseStats()
  }, [])

  const handleExportDatabase = async () => {
    try {
      await db.init()

      const dbData: Record<string, any> = {}
      const stores = Database.STORES

      for (const store of stores) {
        try {
          dbData[store] = await db.getAll(store as any)
        } catch (error) {
          console.warn(`Failed to export store ${store}:`, error)
          dbData[store] = []
        }
      }

      const dataBlob = new Blob([JSON.stringify(dbData, null, 2)], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `devs-database-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      successToast(t('Database exported successfully'))
    } catch (error) {
      errorToast(t('Failed to export database'))
      console.error('Export error:', error)
    }
  }

  const handleResetDatabase = async () => {
    try {
      await db.resetDatabase()
      await loadDatabaseStats()
    } catch (error) {
      console.error('Error resetting database:', error)
    }
  }

  const handleImportDatabase = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const dbData = JSON.parse(text)

      await db.init()

      const stores = Database.STORES
      let importedCount = 0

      for (const store of stores) {
        if (dbData[store] && Array.isArray(dbData[store])) {
          for (const item of dbData[store]) {
            try {
              await db.add(store as any, item)
              importedCount++
            } catch (error) {
              console.warn(`Failed to import item in ${store}:`, error)
            }
          }
        }
      }

      // await loadCredentials()
      successToast(
        t('Database imported successfully ({count} items)', {
          count: importedCount,
        }),
      )
    } catch (error) {
      errorToast(t('Failed to import database - invalid file format'))
      console.error('Import error:', error)
    } finally {
      event.target.value = ''
    }
  }

  const header: HeaderProps = {
    icon: {
      name: 'Database',
      color: 'text-default-300 dark:text-default-600',
    },
    title: t('Database Administration'),
    subtitle:
      stats &&
      `${stats.name} v${stats.version} · ${t('{n} records', { n: stats.totalRecords })} · ${formatBytes(stats.totalSize)}`,
    moreActions: [
      {
        label: t('Refresh'),
        onClick: loadDatabaseStats,
        icon: 'DatabaseBackup',
      },
      {
        label: t('Backup database'),
        onClick: handleExportDatabase,
        icon: 'DatabaseExport',
      },
      {
        label: t('Restore database'),
        onClick: () => {
          document.getElementById('import-file-input')?.click()
        },
        icon: 'DatabaseRestore',
      },
      {
        label: t('Reset Database'),
        onClick: handleResetDatabase,
        icon: 'DatabaseXmark',
      },
    ],
  }

  if (loading) {
    return (
      <DefaultLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Spinner size="lg" />
            <p className="mt-4 text-default-500">
              {t('Loading database information…')}
            </p>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  if (!stats) {
    return (
      <DefaultLayout header={header}>
        <Section mainClassName="text-center">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Alert
              color="danger"
              className="max-w-md"
              endContent={
                <Button
                  onPress={loadDatabaseStats}
                  color="danger"
                  variant="flat"
                >
                  {t('Retry')}
                </Button>
              }
            >
              {t('Failed to load database information')}
            </Alert>
          </div>
        </Section>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout header={header}>
      <input
        type="file"
        accept=".json"
        onChange={handleImportDatabase}
        style={{ display: 'none' }}
        id="import-file-input"
      />

      <Section>
        <div className="flex h-full">
          {/* Main content */}
          <div className={`${isDrawerOpen ? 'flex-1 pr-4' : 'w-full'}`}>
            <Container>
              {/* Object Stores */}
              <Tabs
                aria-label="Database stores"
                classNames={{
                  tabList: 'overflow-x-auto flex-nowrap',
                  base: 'w-full',
                }}
              >
                {stats.stores
                  .filter((store) => store.recordCount > 0)
                  .map((store) => (
                    <Tab
                      key={store.name}
                      title={
                        <div className="flex items-center gap-2">
                          {t(store.name.replace(/_/g, ' ') as any)
                            .charAt(0)
                            .toUpperCase() +
                            t(store.name.replace(/_/g, ' ') as any).slice(1)}
                          <Chip size="sm" variant="flat">
                            {store.recordCount}
                          </Chip>
                        </div>
                      }
                      onClick={closeDrawer}
                    >
                      {(() => {
                        const paginatedData = getPaginatedData(store)
                        return (
                          <div className="space-y-4">
                            {/* Store Info */}
                            <div className="flex flex-wrap gap-2 text-small">
                              <Tooltip
                                placement="right"
                                content={
                                  store.indexes.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {store.indexes.map((index) => (
                                        <Chip
                                          key={index}
                                          size="sm"
                                          variant="flat"
                                        >
                                          {index}
                                        </Chip>
                                      ))}
                                    </div>
                                  ) : (
                                    <span>No indexes</span>
                                  )
                                }
                              >
                                <span className="underline decoration-dotted">
                                  {t('Indexes')} {store.indexes.length}
                                </span>
                              </Tooltip>
                              <span>·</span>
                              <span>
                                {t('Size')} {formatBytes(store.size)}
                              </span>
                            </div>

                            {/* Search */}
                            {store.recordCount > 0 && (
                              <div className="mb-4">
                                <Input
                                  type="search"
                                  placeholder={t(
                                    'Search {store} by {categories}…',
                                    {
                                      store: store.name,
                                      categories: store.indexes
                                        .map(t as any)
                                        .join(', '),
                                    },
                                  )}
                                  value={searchTerm[store.name] || ''}
                                  onValueChange={(value) =>
                                    handleSearch(store.name, value)
                                  }
                                  startContent={
                                    <Icon
                                      name="Search"
                                      size="sm"
                                      className="text-default-400"
                                    />
                                  }
                                  isClearable
                                  size="sm"
                                  className="max-w-sm"
                                />
                              </div>
                            )}

                            {/* Records List */}
                            <Container className="relative">
                              {/* Record Detail Drawer */}
                              {isDrawerOpen && (
                                <div className="float-right bg-background w-1/2 max-w-1/2 overflow-x-hidden px-4 border-l border-default-200 overflow-y-auto">
                                  <div>
                                    <Button
                                      isIconOnly
                                      variant="light"
                                      onPress={closeDrawer}
                                      aria-label={t('Close')}
                                      className="float-right h-7"
                                    >
                                      <Icon
                                        name="SidebarExpand"
                                        size="sm"
                                        className="text-default-400"
                                      />
                                    </Button>
                                    <Code size="sm">
                                      {String(selectedRecord[store.indexes[0]])}
                                    </Code>
                                  </div>
                                  <div className="p-4">
                                    {Object.entries(selectedRecord).map(
                                      ([key, value]) => (
                                        <dl
                                          key={key}
                                          className="text-sm font-mono mb-2"
                                        >
                                          <dt className="font-semibold break-words">
                                            {t(key as any)}
                                          </dt>
                                          <dd className="break-words whitespace-pre-wrap">
                                            {formatValue(
                                              value as string,
                                              false,
                                            )}
                                          </dd>
                                        </dl>
                                      ),
                                    )}
                                    <Code className="text-xs whitespace-pre-wrap w-full mt-4 break-words">
                                      {JSON.stringify(selectedRecord, null, 2)}
                                    </Code>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-medium font-semibold">
                                  {searchTerm[store.name]
                                    ? t('Filtered Records')
                                    : t('All Records')}
                                  <span className="text-default-400 ml-2 text-sm font-normal">
                                    {searchTerm[store.name]
                                      ? `(${paginatedData.totalItems})`
                                      : `(${store.recordCount})`}
                                  </span>
                                </h4>
                                {paginatedData.totalPages > 1 && (
                                  <span className="text-small text-default-500">
                                    Page {currentPage[store.name] || 1} of{' '}
                                    {paginatedData.totalPages}
                                  </span>
                                )}
                              </div>

                              {paginatedData.data.length > 0 ? (
                                <>
                                  <div className="divide-y divide-default-100 border border-default-200 rounded-lg">
                                    {paginatedData.data.map((record, index) => {
                                      const globalIndex =
                                        ((currentPage[store.name] || 1) - 1) *
                                          ITEMS_PER_PAGE +
                                        index
                                      return (
                                        <div
                                          key={record.id || globalIndex}
                                          onClick={() => viewRecord(record)}
                                          className={clsx(
                                            'p-4 flex items-center justify-between hover:bg-default-50 cursor-pointer group',
                                            {
                                              '!bg-primary-50':
                                                record.id ===
                                                selectedRecord?.id,
                                            },
                                          )}
                                        >
                                          <div className="flex items-center space-x-4 flex-1">
                                            <div className="flex-shrink-0">
                                              <Icon
                                                name="Document"
                                                className="w-5 h-5 text-default-400"
                                              />
                                            </div>
                                            <span className="text-tiny text-default-400">
                                              #{record._index}
                                            </span>
                                            <p className="text-small text-default-600 break-words whitespace-pre-wrap">
                                              {store.indexes
                                                .map((index) => record[index])
                                                .filter(Boolean)
                                                .map(formatValue as any)
                                                .join(' · ')}
                                            </p>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="light"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            startContent={
                                              <Icon
                                                name="SidebarCollapse"
                                                size="sm"
                                                className="text-default-400"
                                              />
                                            }
                                            onPress={() => viewRecord(record)}
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>

                                  {/* Pagination */}
                                  {paginatedData.totalPages > 1 && (
                                    <div className="flex justify-center mt-4">
                                      <Pagination
                                        total={paginatedData.totalPages}
                                        page={currentPage[store.name] || 1}
                                        onChange={(page) =>
                                          handlePageChange(store.name, page)
                                        }
                                        showControls
                                        size="sm"
                                      />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-center p-8 text-default-500 border border-default-200 rounded-lg">
                                  <Icon
                                    name="PageSearch"
                                    className="w-12 h-12 mx-auto mb-4 opacity-50"
                                  />
                                  <p className="text-sm">
                                    {searchTerm[store.name]
                                      ? `No records found matching "${searchTerm[store.name]}"`
                                      : t('No data recorded')}
                                  </p>
                                </div>
                              )}
                            </Container>
                          </div>
                        )
                      })()}
                    </Tab>
                  ))}
              </Tabs>
            </Container>
          </div>
        </div>
      </Section>
    </DefaultLayout>
  )
}

export default DatabasePage
