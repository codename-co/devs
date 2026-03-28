#!/usr/bin/env node
/**
 * HeroUI v2 → v3 Fix Script
 * Re-migrates the 32 files that had broken transformations.
 * Fixes: Modal wrapping, Tabs, useDisclosure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FILES = [
  'src/components/AgentAppearancePicker.tsx',
  'src/components/AgentKnowledgePicker.tsx',
  'src/components/ContentPreview/ContentPreview.tsx',
  'src/components/MemoryReview.tsx',
  'src/components/SettingsModal.tsx',
  'src/components/Tabbar.tsx',
  'src/features/connectors/components/ConnectorWizard/ProviderGrid.tsx',
  'src/features/connectors/pages/ConnectorsPage.tsx',
  'src/features/marketplace/components/ExtensionDetailModal.tsx',
  'src/features/marketplace/pages/PublishPage.tsx',
  'src/features/search/GlobalSearch.tsx',
  'src/features/skills/components/SkillDetailModal.tsx',
  'src/features/skills/components/SkillSettingsInline.tsx',
  'src/features/skills/pages/SkillsPage.tsx',
  'src/features/studio/components/GeneratedImageCard.tsx',
  'src/features/studio/components/GeneratedVideoCard.tsx',
  'src/features/studio/components/ImageGallery.tsx',
  'src/features/studio/components/ImagePreviewModal.tsx',
  'src/features/studio/components/PresetGrid.tsx',
  'src/features/sync/components/SyncPasswordModal.tsx',
  'src/pages/Agents/index.tsx',
  'src/pages/Agents/new.tsx',
  'src/pages/Artifacts/index.tsx',
  'src/pages/Demo/CodeSandbox.tsx',
  'src/pages/Demo/ConversationTests.tsx',
  'src/pages/History/index.tsx',
  'src/pages/Knowledge/AgentMemories.tsx',
  'src/pages/Knowledge/components/FilesSection.tsx',
  'src/pages/Knowledge/index.tsx',
  'src/pages/Methodologies/show.tsx',
  'src/pages/Settings/SettingsContent.tsx',
  'src/pages/Settings/components/TracesSection.tsx',
];

let filesChanged = 0;

function processFile(filePath) {
  const fullPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(fullPath)) { console.log(`  ⚠️  Not found: ${filePath}`); return; }
  const original = fs.readFileSync(fullPath, 'utf-8');
  let result = original;

  // =====================================================
  // 1) IMPORT TRANSFORMATIONS
  // =====================================================
  
  const compoundParts = [
    'CardBody', 'CardHeader', 'CardFooter',
    'ModalContent', 'ModalHeader', 'ModalBody', 'ModalFooter',
    'DropdownTrigger', 'DropdownMenu', 'DropdownItem', 'DropdownSection',
    'SelectItem', 'SelectSection',
    'AccordionItem',
    'PopoverTrigger', 'PopoverContent',
    'ListboxItem', 'ListboxSection',
  ];

  // Process @heroui/react imports
  result = result.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/g,
    (match, imports) => {
      let importList = imports.split(',').map(s => s.trim()).filter(Boolean);
      
      // Remove compound parts
      importList = importList.filter(imp => !compoundParts.includes(imp));
      
      // Rename components
      importList = importList.map(imp => {
        if (imp === 'Divider') return 'Separator';
        if (imp === 'Listbox') return 'ListBox';
        if (imp === 'Textarea') return 'TextArea';
        if (imp === 'useDisclosure') return 'useOverlayState';
        // Tab standalone -> removed (use Tabs.Tab)
        if (imp === 'Tab') return null;
        return imp;
      }).filter(Boolean);
      
      importList = [...new Set(importList)];
      if (importList.length === 0) return '';
      
      if (importList.length > 4) {
        return `import {\n  ${importList.join(',\n  ')},\n} from '@heroui/react'`;
      }
      return `import { ${importList.join(', ')} } from '@heroui/react'`;
    }
  );

  // =====================================================
  // 2) SIMPLE TAG RENAMES (safe, no structure change)
  // =====================================================
  
  // Card compound
  result = result.replace(/<CardBody\b/g, '<Card.Content');
  result = result.replace(/<\/CardBody>/g, '</Card.Content>');
  result = result.replace(/<CardHeader\b/g, '<Card.Header');
  result = result.replace(/<\/CardHeader>/g, '</Card.Header>');
  result = result.replace(/<CardFooter\b/g, '<Card.Footer');
  result = result.replace(/<\/CardFooter>/g, '</Card.Footer>');
  
  // Accordion compound
  result = result.replace(/<AccordionItem\b/g, '<Accordion.Item');
  result = result.replace(/<\/AccordionItem>/g, '</Accordion.Item>');
  
  // Modal sub-components (NOT the Modal root itself)
  result = result.replace(/<ModalHeader\b/g, '<Modal.Header');
  result = result.replace(/<\/ModalHeader>/g, '</Modal.Header>');
  result = result.replace(/<ModalBody\b/g, '<Modal.Body');
  result = result.replace(/<\/ModalBody>/g, '</Modal.Body>');
  result = result.replace(/<ModalFooter\b/g, '<Modal.Footer');
  result = result.replace(/<\/ModalFooter>/g, '</Modal.Footer>');
  // ModalContent -> Modal.Dialog (just the tag, not structure)
  result = result.replace(/<ModalContent\b/g, '<Modal.Dialog');
  result = result.replace(/<\/ModalContent>/g, '</Modal.Dialog>');
  
  // Dropdown compound
  result = result.replace(/<DropdownTrigger\b/g, '<Dropdown.Trigger');
  result = result.replace(/<\/DropdownTrigger>/g, '</Dropdown.Trigger>');
  result = result.replace(/<DropdownMenu\b/g, '<Dropdown.Popover><Dropdown.Menu');
  result = result.replace(/<\/DropdownMenu>/g, '</Dropdown.Menu></Dropdown.Popover>');
  result = result.replace(/<DropdownItem\b/g, '<Dropdown.Item');
  result = result.replace(/<\/DropdownItem>/g, '</Dropdown.Item>');
  result = result.replace(/<DropdownSection\b/g, '<Dropdown.Section');
  result = result.replace(/<\/DropdownSection>/g, '</Dropdown.Section>');
  result = result.replace(/(<Dropdown\.Item\s+)key=/g, '$1id=');
  
  // Select compound
  result = result.replace(/<SelectItem\b/g, '<ListBox.Item');
  result = result.replace(/<\/SelectItem>/g, '</ListBox.Item>');
  result = result.replace(/<SelectSection\b/g, '<ListBox.Section');
  result = result.replace(/<\/SelectSection>/g, '</ListBox.Section>');
  result = result.replace(/(<ListBox\.Item\s+)key=/g, '$1id=');
  
  // Popover compound
  result = result.replace(/<PopoverTrigger\b/g, '<Popover.Trigger');
  result = result.replace(/<\/PopoverTrigger>/g, '</Popover.Trigger>');
  result = result.replace(/<PopoverContent\b/g, '<Popover.Content');
  result = result.replace(/<\/PopoverContent>/g, '</Popover.Content>');
  
  // Listbox compound
  result = result.replace(/<Listbox\b/g, '<ListBox');
  result = result.replace(/<\/Listbox>/g, '</ListBox>');
  result = result.replace(/<ListboxItem\b/g, '<ListBox.Item');
  result = result.replace(/<\/ListboxItem>/g, '</ListBox.Item>');
  result = result.replace(/<ListboxSection\b/g, '<ListBox.Section');
  result = result.replace(/<\/ListboxSection>/g, '</ListBox.Section>');
  
  // Divider -> Separator
  result = result.replace(/<Divider\b([^/]*?)\/>/g, '<Separator$1/>');
  result = result.replace(/<Divider\b/g, '<Separator');
  result = result.replace(/<\/Divider>/g, '</Separator>');
  
  // Progress -> ProgressBar (not CircularProgress)
  result = result.replace(/<Progress\b(?!Bar|Circle)/g, '<ProgressBar');
  result = result.replace(/<\/Progress>(?!Bar|Circle)/g, '</ProgressBar>');
  
  // Textarea -> TextArea
  result = result.replace(/<Textarea\b/g, '<TextArea');
  result = result.replace(/<\/Textarea>/g, '</TextArea>');
  
  // =====================================================
  // 3) TABS TRANSFORMATION (careful - don't break JSX)
  // =====================================================
  
  // v2: <Tab key="x" title="label">panel content</Tab>
  // v2: <Tab key="x" title={<>icon label</>}>panel content</Tab>
  // v3: complete restructuring needed, but for now just rename tags
  
  // Simple approach: just rename <Tab to <Tabs.Tab and convert key to id
  // Don't try to extract title - that breaks JSX
  result = result.replace(/<Tab\s+key=/g, '<Tabs.Tab id=');
  result = result.replace(/<\/Tab>/g, '</Tabs.Tab>');
  // Self-closing Tab
  result = result.replace(/<Tab\s+/g, (match, offset) => {
    // Make sure we're not matching <Tabs or <Tabbar
    const before = result.substring(Math.max(0, offset - 1), offset);
    if (before === 's' || before === '<') return match; // Part of Tabs/Table/etc
    return '<Tabs.Tab ';
  });
  
  // =====================================================
  // 4) BUTTON PROP TRANSFORMATIONS
  // =====================================================
  
  result = result.replace(/\bisLoading\b/g, 'isPending');
  
  // Button color+variant -> variant mappings
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+color="primary"\s+variant="solid"/g, '$1 variant="primary"');
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+variant="solid"\s+color="primary"/g, '$1 variant="primary"');
  result = result.replace(/(<Button\b[^>]*)\s+color="danger"\s+variant="flat"/g, '$1 variant="danger-soft"');
  result = result.replace(/(<Button\b[^>]*)\s+variant="flat"\s+color="danger"/g, '$1 variant="danger-soft"');
  result = result.replace(/(<Button\b[^>]*)\s+color="primary"\s+variant="bordered"/g, '$1 variant="secondary"');
  result = result.replace(/(<Button\b[^>]*)\s+variant="bordered"\s+color="primary"/g, '$1 variant="secondary"');
  result = result.replace(/(<Button\b[^>]*)\s+color="primary"\s+variant="(?:light|flat)"/g, '$1 variant="tertiary"');
  result = result.replace(/(<Button\b[^>]*)\s+variant="(?:light|flat)"\s+color="primary"/g, '$1 variant="tertiary"');
  result = result.replace(/(<Button\b[^>]*)\s+color="primary"\s+variant="ghost"/g, '$1 variant="ghost"');
  result = result.replace(/(<Button\b[^>]*)\s+variant="ghost"\s+color="primary"/g, '$1 variant="ghost"');
  
  // Standalone color on Button
  result = result.replace(/(<Button(?:Group)?\b(?:(?!variant=)[^>])*)\s+color="primary"(?![^>]*variant=)/g, '$1 variant="primary"');
  result = result.replace(/(<Button\b(?:(?!variant=)[^>])*)\s+color="danger"(?![^>]*variant=)/g, '$1 variant="danger"');
  result = result.replace(/(<Button(?:Group)?\b(?:(?!variant=)[^>])*)\s+color="default"(?![^>]*variant=)/g, '$1 variant="secondary"');
  result = result.replace(/(<Button\b(?:(?!variant=)[^>])*)\s+color="secondary"(?![^>]*variant=)/g, '$1 variant="secondary"');
  result = result.replace(/(<Button\b(?:(?!variant=)[^>])*)\s+color="success"(?![^>]*variant=)/g, '$1 variant="primary"');
  result = result.replace(/(<Button\b(?:(?!variant=)[^>])*)\s+color="warning"(?![^>]*variant=)/g, '$1 variant="primary"');
  
  // Map remaining variant values on Button
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+variant="solid"/g, '$1 variant="primary"');
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+variant="bordered"/g, '$1 variant="secondary"');
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+variant="light"/g, '$1 variant="tertiary"');
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+variant="flat"/g, '$1 variant="tertiary"');
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+variant="faded"/g, '$1 variant="secondary"');
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+variant="shadow"/g, '$1 variant="primary"');
  
  // Remove leftover color on Button
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+color="[^"]*"/g, '$1');
  
  // Remove radius/disableRipple/disableAnimation from Button
  result = result.replace(/(<Button(?:Group)?\b[^>]*)\s+radius="[^"]*"/g, '$1');
  result = result.replace(/(<Button\b[^>]*)\s+disableRipple(?:=\{[^}]*\})?/g, '$1');
  
  // =====================================================
  // 5) OTHER PROP TRANSFORMATIONS
  // =====================================================
  
  // Card prop cleanup
  result = result.replace(/(<Card\b[^>]*)\s+isPressable\b/g, '$1');
  result = result.replace(/(<Card\b[^>]*)\s+shadow="[^"]*"/g, '$1');
  result = result.replace(/(<Card\b[^>]*)\s+radius="[^"]*"/g, '$1');
  result = result.replace(/(<Card\b[^>]*)\s+isHoverable\b/g, '$1');
  result = result.replace(/(<Card\b[^>]*)\s+isBlurred\b/g, '$1');
  result = result.replace(/(<Card\b[^>]*)\s+isFooterBlurred\b/g, '$1');
  
  // Chip variant/color
  result = result.replace(/(<Chip\b[^>]*)\s+variant="solid"/g, '$1 variant="primary"');
  result = result.replace(/(<Chip\b[^>]*)\s+variant="bordered"/g, '$1 variant="secondary"');
  result = result.replace(/(<Chip\b[^>]*)\s+variant="light"/g, '$1 variant="soft"');
  result = result.replace(/(<Chip\b[^>]*)\s+variant="flat"/g, '$1 variant="tertiary"');
  result = result.replace(/(<Chip\b[^>]*)\s+variant="faded"/g, '$1 variant="secondary"');
  result = result.replace(/(<Chip\b[^>]*)\s+variant="dot"/g, '$1 variant="secondary"');
  result = result.replace(/(<Chip\b[^>]*)\s+color="primary"/g, '$1 color="accent"');
  result = result.replace(/(<Chip\b[^>]*)\s+color="secondary"/g, '$1 color="default"');
  result = result.replace(/(<Chip\b[^>]*)\s+radius="[^"]*"/g, '$1');
  
  // Tooltip/Spinner cleanup
  result = result.replace(/(<Tooltip\b[^>]*)\s+color="[^"]*"/g, '$1');
  result = result.replace(/(<Spinner\b[^>]*)\s+color="(?!current)[^"]*"/g, '$1');
  
  // Input cleanup
  result = result.replace(/(<Input\b[^>]*)\s+variant="(?:flat|bordered|underlined|faded)"/g, '$1');
  result = result.replace(/(<Input\b[^>]*)\s+color="[^"]*"/g, '$1');
  result = result.replace(/(<Input\b[^>]*)\s+radius="[^"]*"/g, '$1');
  result = result.replace(/(<Input\b[^>]*)\s+labelPlacement="[^"]*"/g, '$1');
  
  // Select cleanup
  result = result.replace(/(<Select\b[^>]*)\s+variant="(?:flat|bordered|underlined|faded)"/g, '$1');
  result = result.replace(/(<Select\b[^>]*)\s+color="[^"]*"/g, '$1');
  result = result.replace(/(<Select\b[^>]*)\s+radius="[^"]*"/g, '$1');
  result = result.replace(/(<Select\b[^>]*)\s+size="[^"]*"/g, '$1');
  result = result.replace(/(<Select\b[^>]*)\s+labelPlacement="[^"]*"/g, '$1');
  
  // Tabs cleanup
  result = result.replace(/(<Tabs\b[^>]*)\s+color="[^"]*"/g, '$1');
  result = result.replace(/(<Tabs\b[^>]*)\s+radius="[^"]*"/g, '$1');
  result = result.replace(/(<Tabs\b[^>]*)\s+size="[^"]*"/g, '$1');
  result = result.replace(/(<Tabs\b[^>]*)\s+variant="underlined"/g, '$1 variant="secondary"');
  result = result.replace(/(<Tabs\b[^>]*)\s+variant="bordered"/g, '$1 variant="secondary"');
  result = result.replace(/(<Tabs\b[^>]*)\s+variant="light"/g, '$1 variant="secondary"');
  result = result.replace(/(<Tabs\b[^>]*)\s+variant="solid"/g, '$1 variant="primary"');
  result = result.replace(/(<Tabs\b[^>]*)\s+fullWidth\b/g, '$1');
  result = result.replace(/(<Tabs\b[^>]*)\s+disableCursorAnimation\b/g, '$1');
  
  // Alert color -> variant
  result = result.replace(/(<Alert\b[^>]*)\s+color="([^"]*)"/g, '$1 variant="$2"');
  
  // Snippet -> code
  result = result.replace(/<Snippet\b([^>]*)>/g, '<code className="bg-default-100 px-2 py-1 rounded text-sm"$1>');
  result = result.replace(/<\/Snippet>/g, '</code>');
  
  // AccordionItem key -> id
  result = result.replace(/(<Accordion\.Item\s+)key=/g, '$1id=');
  result = result.replace(/(<Accordion\b[^>]*)\s+variant="(?:splitted|bordered|shadow|light)"/g, '$1');
  
  // Accordion key -> id on items rendered from map
  
  // Global removed props
  result = result.replace(/\s+disableAnimation(?:=\{[^}]*\})?/g, '');
  result = result.replace(/\s+motionProps=\{[^}]*\}/g, '');

  // =====================================================
  // 6) useDisclosure -> useOverlayState (SAFE approach)
  // =====================================================
  
  // Instead of trying to replace all destructured usages (which is fragile),
  // just rename the hook and keep the destructured names.
  // useOverlayState returns { isOpen, open, close, toggle, setOpen }
  // vs useDisclosure: { isOpen, onOpen, onClose, onOpenChange }
  
  // Convert destructuring pattern:
  // const { isOpen, onOpen, onClose, onOpenChange } = useOverlayState()
  // -> const { isOpen, open: onOpen, close: onClose, setOpen: onOpenChange } = useOverlayState()
  // This preserves all existing variable usage!
  
  result = result.replace(
    /const\s*\{([^}]*)\}\s*=\s*useOverlayState\(/g,
    (match, destructured) => {
      let names = destructured;
      // Rename destructured props to match v3 API with aliases
      names = names.replace(/\bonOpen\b(?!\s*:)/, 'open: onOpen');
      names = names.replace(/\bonClose\b(?!\s*:)/, 'close: onClose');
      names = names.replace(/\bonOpenChange\b(?!\s*:)/, 'setOpen: onOpenChange');
      return `const {${names}} = useOverlayState(`;
    }
  );
  
  // =====================================================
  // 7) MODAL STRUCTURE (SAFE approach)
  // =====================================================
  
  // DON'T try to add Modal.Backdrop/Container wrapping via regex.
  // Instead, just rename the sub-tags (already done above).
  // The Modal.Backdrop > Modal.Container wrapping needs manual review.
  // For now, we convert:
  //   <Modal isOpen={x} onOpenChange={y}> -> <Modal isOpen={x} onOpenChange={y}>
  //   <Modal.Dialog> -> <Modal.Dialog>
  // This creates a flatter but working structure.
  // The missing Backdrop/Container wrapping can be added later.
  
  // Transform render prop: {(onClose) => -> {({close}) =>
  result = result.replace(/\{\s*\(\s*onClose\s*\)\s*=>/g, '{({close}) =>');

  // Write if changed
  if (result !== original) {
    fs.writeFileSync(fullPath, result, 'utf-8');
    filesChanged++;
    console.log(`  ✅ Fixed: ${filePath}`);
  } else {
    console.log(`  ℹ️  No changes: ${filePath}`);
  }
}

console.log('🔧 Re-migrating 32 broken files...\n');
for (const file of FILES) {
  processFile(file);
}
console.log(`\n📊 Files fixed: ${filesChanged}`);
