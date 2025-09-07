import { test, expect, DevsTestHelper } from './fixtures/test-base'
import path from 'path'

test.describe('Knowledge Base Management', () => {
  let _: DevsTestHelper

  test.beforeEach(async ({ page }) => {
    _ = new DevsTestHelper(page)
    await _.goHome()
  })

  test('should display knowledge base page', async ({ page }) => {
    await _.navigateViaDrawer('Knowledge')

    await _.expectTitle('Knowledge Base')

    // Should show upload area or file list
    const hasUploadArea = await page
      .locator('[data-testid="upload-area"]')
      .isVisible()
      .catch(() => false)
    const hasFileList = await page
      .locator('[data-testid="file-list"]')
      .isVisible()
      .catch(() => false)
    const hasKnowledgeItems = await page
      .locator('[data-testid="knowledge-items"]')
      .isVisible()
      .catch(() => false)

    expect(hasUploadArea || hasFileList || hasKnowledgeItems).toBe(true)

    const hasEmptyState = await page
      .locator('[data-testid="empty-state"]')
      .isVisible()
      .catch(() => false)

    // Should show some indication of empty state OR upload functionality
    expect(hasEmptyState).toBe(true)
  })

  test('should handle file upload UI interaction', async ({ page }) => {
    await _.navigateViaDrawer('Knowledge')

    // Look for file upload button or area
    const uploadButton = page
      .locator('input[type="file"]')
      .or(page.locator('[data-testid="upload-files-button"]'))
      .or(page.locator('[data-testid="upload-folder-button"]'))
      .or(page.locator('text="Upload"'))
      .or(page.locator('text="Choose Files"'))

    const uploadArea = page
      .locator('[data-testid="upload-area"]')
      .or(page.locator('.upload-zone'))
      .or(page.locator('[data-testid="drop-zone"]'))

    // Either upload button or drag-drop area should be present
    const hasUploadButton = await uploadButton.isVisible().catch(() => false)
    const hasUploadArea = await uploadArea.isVisible().catch(() => false)

    expect(hasUploadButton || hasUploadArea).toBe(true)
  })

  test('should display folder sync options', async ({ page }) => {
    await _.navigateViaDrawer('Knowledge')

    // Look for folder sync functionality
    const syncButton = page
      .locator('text="Sync Folder"')
      .or(page.locator('text="Watch Folder"'))
      .or(page.locator('[data-testid="folder-sync"]'))
      .or(page.locator('text="Connect Folder"'))

    if (await syncButton.isVisible()) {
      await syncButton.click()

      // Should trigger File System API or show explanation
      // Note: File System API may not work in test environment
      const hasDialog = await page
        .locator('[data-testid="sync-dialog"]')
        .isVisible()
        .catch(() => false)
      const hasExplanation =
        (await page
          .locator('text="File System API"')
          .isVisible()
          .catch(() => false)) ||
        (await page
          .locator('text="browser permission"')
          .isVisible()
          .catch(() => false))

      expect(hasDialog || hasExplanation).toBe(true)
    }
  })
})
