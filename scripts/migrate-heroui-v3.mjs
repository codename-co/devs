#!/usr/bin/env node
/**
 * HeroUI v2 → v3 Migration Script
 * Handles all code transformations for the DEVS project.
 * Run with: node scripts/migrate-heroui-v3.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let totalChanges = 0;
let filesChanged = 0;

function readFile(filePath) {
  return fs.readFileSync(path.resolve(ROOT, filePath), 'utf-8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(path.resolve(ROOT, filePath), content, 'utf-8');
}

function processFile(filePath, transformer) {
  const fullPath = path.resolve(ROOT, filePath);
  if (!fs.existsSync(fullPath)) return;
  const original = fs.readFileSync(fullPath, 'utf-8');
  const result = transformer(original, filePath);
  if (result !== original) {
    fs.writeFileSync(fullPath, result, 'utf-8');
    filesChanged++;
    return true;
  }
  return false;
}

function findFiles(dir, extensions = ['.ts', '.tsx']) {
  const results = [];
  const fullDir = path.resolve(ROOT, dir);
  if (!fs.existsSync(fullDir)) return results;
  
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(full);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(path.relative(ROOT, full));
      }
    }
  }
  walk(fullDir);
  return results;
}

// ============================================================
// PHASE 1: Import transformations
// ============================================================

/**
 * Transform imports from @heroui/react
 * - Remove separate named imports for compound component parts
 * - Keep parent component imports
 * - Replace useDisclosure with useOverlayState
 * - Remove Divider (becomes Separator), etc.
 */
function transformImports(code) {
  // Track what changes we make
  let result = code;

  // Replace useDisclosure with useOverlayState
  result = result.replace(
    /\buseDisclosure\b/g,
    'useOverlayState'
  );

  // Replace separate component imports with parent-only imports
  // CardBody -> (removed, use Card.Content)
  // CardHeader -> (removed, use Card.Header)  
  // CardFooter -> (removed, use Card.Footer)
  // ModalContent, ModalHeader, ModalBody, ModalFooter -> compound
  // DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection -> compound
  // SelectItem, SelectSection -> use ListBox.Item, ListBox.Section
  // AccordionItem -> Accordion.Item
  // PopoverTrigger, PopoverContent -> compound
  // ListboxItem, ListboxSection -> ListBox.Item, ListBox.Section
  // Tab -> Tabs.Tab (but keep Tabs)
  // Divider -> Separator

  const compoundParts = [
    'CardBody', 'CardHeader', 'CardFooter',
    'ModalContent', 'ModalHeader', 'ModalBody', 'ModalFooter',
    'DropdownTrigger', 'DropdownMenu', 'DropdownItem', 'DropdownSection',
    'SelectItem', 'SelectSection',
    'AccordionItem',
    'PopoverTrigger', 'PopoverContent',
    'ListboxItem', 'ListboxSection',
  ];

  // Rename Divider -> Separator in imports
  // Rename Progress -> ProgressBar in imports
  // Rename Listbox -> ListBox in imports
  // Rename Textarea -> TextArea in imports

  // Process @heroui/react imports
  result = result.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@heroui\/react['"]/g,
    (match, imports) => {
      let importList = imports.split(',').map(s => s.trim()).filter(Boolean);
      
      // Remove compound parts (they'll be accessed via parent.SubComponent)
      importList = importList.filter(imp => !compoundParts.includes(imp));
      
      // Rename components
      importList = importList.map(imp => {
        if (imp === 'Divider') return 'Separator';
        if (imp === 'Listbox') return 'ListBox';
        if (imp === 'Textarea') return 'TextArea';
        // Tab is used standalone in v2, but in v3 it's Tabs.Tab
        // We'll keep Tabs import and remove Tab
        if (imp === 'Tab') return null;
        return imp;
      }).filter(Boolean);
      
      // Deduplicate
      importList = [...new Set(importList)];
      
      if (importList.length === 0) return '';
      
      // Format nicely
      if (importList.length > 4) {
        return `import {\n  ${importList.join(',\n  ')},\n} from '@heroui/react'`;
      }
      return `import { ${importList.join(', ')} } from '@heroui/react'`;
    }
  );

  return result;
}

// ============================================================
// PHASE 2: Component JSX transformations
// ============================================================

/**
 * Transform Card compound components
 * CardBody -> Card.Content
 * CardHeader -> Card.Header
 * CardFooter -> Card.Footer
 */
function transformCard(code) {
  let result = code;
  
  // CardBody -> Card.Content (opening and closing tags)
  result = result.replace(/<CardBody\b/g, '<Card.Content');
  result = result.replace(/<\/CardBody>/g, '</Card.Content>');
  
  // CardHeader -> Card.Header
  result = result.replace(/<CardHeader\b/g, '<Card.Header');
  result = result.replace(/<\/CardHeader>/g, '</Card.Header>');
  
  // CardFooter -> Card.Footer
  result = result.replace(/<CardFooter\b/g, '<Card.Footer');
  result = result.replace(/<\/CardFooter>/g, '</Card.Footer>');
  
  // Remove isPressable prop from Card (handle with wrapper button)
  result = result.replace(/(<Card\b[^>]*)\s+isPressable\b/g, '$1');
  
  // Remove shadow prop from Card
  result = result.replace(/(<Card\b[^>]*)\s+shadow="[^"]*"/g, '$1');
  
  // Remove radius prop from Card
  result = result.replace(/(<Card\b[^>]*)\s+radius="[^"]*"/g, '$1');
  
  // Remove isHoverable prop from Card
  result = result.replace(/(<Card\b[^>]*)\s+isHoverable\b/g, '$1');
  
  // Remove isBlurred prop
  result = result.replace(/(<Card\b[^>]*)\s+isBlurred\b/g, '$1');
  
  // Remove isFooterBlurred prop
  result = result.replace(/(<Card\b[^>]*)\s+isFooterBlurred\b/g, '$1');
  
  return result;
}

/**
 * Transform Modal compound components
 * This is the most complex transformation.
 * 
 * v2: <Modal isOpen={x} onOpenChange={y}><ModalContent>{(onClose) => (<><ModalHeader>...</ModalHeader><ModalBody>...</ModalBody><ModalFooter>...</ModalFooter></>)}</ModalContent></Modal>
 * v3: <Modal state={state}><Modal.Backdrop isOpen={x} onOpenChange={y}><Modal.Container><Modal.Dialog>{({close}) => (<><Modal.Header><Modal.Heading>...</Modal.Heading></Modal.Header><Modal.Body>...</Modal.Body><Modal.Footer>...</Modal.Footer></>)}</Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
 * 
 * However, many usages are simpler. Let's handle the JSX tag transformations.
 */
function transformModal(code) {
  let result = code;
  
  // ModalContent -> removed (will need manual wrapping with Modal.Backdrop > Modal.Container > Modal.Dialog)
  // For now, transform the sub-components
  result = result.replace(/<ModalHeader\b/g, '<Modal.Header');
  result = result.replace(/<\/ModalHeader>/g, '</Modal.Header>');
  
  result = result.replace(/<ModalBody\b/g, '<Modal.Body');
  result = result.replace(/<\/ModalBody>/g, '</Modal.Body>');
  
  result = result.replace(/<ModalFooter\b/g, '<Modal.Footer');
  result = result.replace(/<\/ModalFooter>/g, '</Modal.Footer>');
  
  // ModalContent with render prop -> Modal.Dialog with render prop
  // {(onClose) => (...)} -> {({close}) => (...)}
  result = result.replace(/<ModalContent\b/g, '<Modal.Dialog');
  result = result.replace(/<\/ModalContent>/g, '</Modal.Dialog>');
  
  // Transform render prop pattern: (onClose) -> ({close})
  result = result.replace(/\{\s*\(\s*onClose\s*\)\s*=>/g, '{({close}) =>');
  // Also handle uses of onClose inside the render prop
  // onClose() -> close()
  // Note: we only want to replace onClose that are function calls inside render props, not prop names
  // This is tricky; let's be conservative and only replace standalone onClose() calls
  
  // Now wrap Modal.Dialog in Modal.Backdrop > Modal.Container
  // This is the hardest part. We need to find <Modal ...props><Modal.Dialog> and wrap it.
  // Strategy: Find <Modal and insert the wrapper after it, and before </Modal>
  
  // For controlled modals: move isOpen and onOpenChange to Modal.Backdrop
  // <Modal isOpen={x} onOpenChange={y}> -> <Modal><Modal.Backdrop isOpen={x} onOpenChange={y}>
  
  // Complex regex to extract Modal props
  result = result.replace(
    /<Modal(\s+(?:(?!>)[^])*?)>/g,
    (match, props) => {
      // Extract isOpen and onOpenChange props to move to Backdrop
      let backdropProps = '';
      let remainingProps = props;
      
      // Extract isOpen
      const isOpenMatch = remainingProps.match(/\s+isOpen=\{([^}]+)\}/);
      if (isOpenMatch) {
        backdropProps += ` isOpen={${isOpenMatch[1]}}`;
        remainingProps = remainingProps.replace(isOpenMatch[0], '');
      }
      
      // Extract onOpenChange
      const onOpenChangeMatch = remainingProps.match(/\s+onOpenChange=\{([^}]+)\}/);
      if (onOpenChangeMatch) {
        backdropProps += ` onOpenChange={${onOpenChangeMatch[1]}}`;
        remainingProps = remainingProps.replace(onOpenChangeMatch[0], '');
      }
      
      // Extract placement
      const placementMatch = remainingProps.match(/\s+placement="([^"]+)"/);
      let containerProps = '';
      if (placementMatch) {
        containerProps += ` placement="${placementMatch[1]}"`;
        remainingProps = remainingProps.replace(placementMatch[0], '');
      }
      
      // Extract size
      const sizeMatch = remainingProps.match(/\s+size="([^"]+)"/);
      if (sizeMatch) {
        containerProps += ` size="${sizeMatch[1]}"`;
        remainingProps = remainingProps.replace(sizeMatch[0], '');
      }
      
      // Extract scrollBehavior -> scroll on Container
      const scrollMatch = remainingProps.match(/\s+scrollBehavior="([^"]+)"/);
      if (scrollMatch) {
        const scrollValue = scrollMatch[1] === 'normal' ? 'inside' : scrollMatch[1];
        containerProps += ` scroll="${scrollValue}"`;
        remainingProps = remainingProps.replace(scrollMatch[0], '');
      }
      
      // Extract backdrop -> variant on Backdrop
      const backdropMatch = remainingProps.match(/\s+backdrop="([^"]+)"/);
      if (backdropMatch) {
        backdropProps += ` variant="${backdropMatch[1]}"`;
        remainingProps = remainingProps.replace(backdropMatch[0], '');
      }
      
      // Extract isDismissable -> on Backdrop
      const isDismissableMatch = remainingProps.match(/\s+isDismissable(?:=\{([^}]+)\})?/);
      if (isDismissableMatch) {
        if (isDismissableMatch[1]) {
          backdropProps += ` isDismissable={${isDismissableMatch[1]}}`;
        } else {
          backdropProps += ' isDismissable';
        }
        remainingProps = remainingProps.replace(isDismissableMatch[0], '');
      }
      
      // Extract isKeyboardDismissDisabled -> on Backdrop
      const keyboardDismissMatch = remainingProps.match(/\s+isKeyboardDismissDisabled(?:=\{([^}]+)\})?/);
      if (keyboardDismissMatch) {
        if (keyboardDismissMatch[1]) {
          backdropProps += ` isKeyboardDismissDisabled={${keyboardDismissMatch[1]}}`;
        } else {
          backdropProps += ' isKeyboardDismissDisabled';
        }
        remainingProps = remainingProps.replace(keyboardDismissMatch[0], '');
      }
      
      // Remove hideCloseButton (handled by omitting Modal.CloseTrigger)
      remainingProps = remainingProps.replace(/\s+hideCloseButton(?:=\{[^}]+\})?/, '');
      
      // Remove motionProps
      remainingProps = remainingProps.replace(/\s+motionProps=\{[^}]+\}/, '');
      
      // Remove shouldBlockScroll
      remainingProps = remainingProps.replace(/\s+shouldBlockScroll(?:=\{[^}]+\})?/, '');
      
      // Remove classNames (complex object prop)
      remainingProps = remainingProps.replace(/\s+classNames=\{[^}]+\}/, '');
      
      // Remove onClose prop (use close from render prop)
      remainingProps = remainingProps.replace(/\s+onClose=\{[^}]+\}/, '');
      
      return `<Modal${remainingProps.trim() ? ' ' + remainingProps.trim() : ''}>\n        <Modal.Backdrop${backdropProps}>\n          <Modal.Container${containerProps}>`;
    }
  );
  
  // Close the wrapper before </Modal>
  result = result.replace(/<\/Modal>/g, '          </Modal.Container>\n        </Modal.Backdrop>\n      </Modal>');
  
  return result;
}

/**
 * Transform Accordion compound components
 * AccordionItem -> Accordion.Item
 * key="x" -> id="x" on AccordionItem
 */
function transformAccordion(code) {
  let result = code;
  
  result = result.replace(/<AccordionItem\b/g, '<Accordion.Item');
  result = result.replace(/<\/AccordionItem>/g, '</Accordion.Item>');
  
  return result;
}

/**
 * Transform Tabs compound components
 * Tab -> Tabs.Tab (but need to restructure significantly)
 */
function transformTabs(code) {
  let result = code;
  
  // <Tab key="x" title="Y">content</Tab> -> need full restructure
  // For now, transform the tag names
  // Be careful not to match Tab inside Tabs or Tabbar
  result = result.replace(/<Tab\s+/g, '<Tabs.Tab ');
  result = result.replace(/<\/Tab>/g, '</Tabs.Tab>');
  
  // Transform title prop to children
  // <Tabs.Tab key="x" title="Y"> -> <Tabs.Tab id="x">Y
  // <Tabs.Tab key="x" title={expr}> -> <Tabs.Tab id="x">{expr}
  result = result.replace(
    /<Tabs\.Tab\s+([^>]*?)title="([^"]*)"([^>]*)>/g,
    (match, before, title, after) => {
      // Also convert key to id
      let props = before + after;
      props = props.replace(/key="([^"]*)"/, 'id="$1"');
      return `<Tabs.Tab ${props.trim()}>${title}`;
    }
  );
  result = result.replace(
    /<Tabs\.Tab\s+([^>]*?)title=\{([^}]+)\}([^>]*)>/g,
    (match, before, titleExpr, after) => {
      let props = before + after;
      props = props.replace(/key="([^"]*)"/, 'id="$1"');
      props = props.replace(/key=\{([^}]+)\}/, 'id={$1}');
      return `<Tabs.Tab ${props.trim()}>{${titleExpr}}`;
    }
  );
  
  return result;
}

/**
 * Transform Dropdown compound components
 */
function transformDropdown(code) {
  let result = code;
  
  result = result.replace(/<DropdownTrigger\b/g, '<Dropdown.Trigger');
  result = result.replace(/<\/DropdownTrigger>/g, '</Dropdown.Trigger>');
  
  // DropdownMenu -> needs Dropdown.Popover wrapper + Dropdown.Menu
  result = result.replace(/<DropdownMenu\b/g, '<Dropdown.Popover><Dropdown.Menu');
  result = result.replace(/<\/DropdownMenu>/g, '</Dropdown.Menu></Dropdown.Popover>');
  
  result = result.replace(/<DropdownItem\b/g, '<Dropdown.Item');
  result = result.replace(/<\/DropdownItem>/g, '</Dropdown.Item>');
  
  result = result.replace(/<DropdownSection\b/g, '<Dropdown.Section');
  result = result.replace(/<\/DropdownSection>/g, '</Dropdown.Section>');
  
  // Transform key to id on Dropdown.Items
  // This is tricky because key could be used for React list reconciliation too
  // We'll convert key to id on Dropdown.Item specifically
  result = result.replace(
    /(<Dropdown\.Item\s+)key=/g,
    '$1id='
  );
  
  return result;
}

/**
 * Transform Select compound components
 * Select with SelectItem -> Select with compound components
 */
function transformSelect(code) {
  let result = code;
  
  // SelectItem -> ListBox.Item (inside Select)
  result = result.replace(/<SelectItem\b/g, '<ListBox.Item');
  result = result.replace(/<\/SelectItem>/g, '</ListBox.Item>');
  
  // SelectSection -> ListBox.Section
  result = result.replace(/<SelectSection\b/g, '<ListBox.Section');
  result = result.replace(/<\/SelectSection>/g, '</ListBox.Section>');
  
  // Transform key to id on ListBox.Item
  result = result.replace(
    /(<ListBox\.Item\s+)key=/g,
    '$1id='
  );
  
  // Note: Full Select restructuring (adding Select.Trigger, Select.Value, etc.)
  // will need manual work for each file since the structure varies significantly
  
  return result;
}

/**
 * Transform Popover compound components
 */
function transformPopover(code) {
  let result = code;
  
  result = result.replace(/<PopoverTrigger\b/g, '<Popover.Trigger');
  result = result.replace(/<\/PopoverTrigger>/g, '</Popover.Trigger>');
  
  result = result.replace(/<PopoverContent\b/g, '<Popover.Content');
  result = result.replace(/<\/PopoverContent>/g, '</Popover.Content>');
  
  return result;
}

/**
 * Transform Listbox compound components
 */
function transformListbox(code) {
  let result = code;
  
  // Listbox -> ListBox (already handled in imports)
  result = result.replace(/<Listbox\b/g, '<ListBox');
  result = result.replace(/<\/Listbox>/g, '</ListBox>');
  
  result = result.replace(/<ListboxItem\b/g, '<ListBox.Item');
  result = result.replace(/<\/ListboxItem>/g, '</ListBox.Item>');
  
  result = result.replace(/<ListboxSection\b/g, '<ListBox.Section');
  result = result.replace(/<\/ListboxSection>/g, '</ListBox.Section>');
  
  // Transform key to id on ListBox.Item
  result = result.replace(
    /(<ListBox\.Item\s+)key=/g,
    '$1id='
  );
  
  return result;
}

/**
 * Transform Divider -> Separator
 */
function transformDivider(code) {
  let result = code;
  
  result = result.replace(/<Divider\b/g, '<Separator');
  result = result.replace(/<\/Divider>/g, '</Separator>');
  // Self-closing
  result = result.replace(/<Divider\s*\/>/g, '<Separator />');
  
  return result;
}

/**
 * Transform Progress -> ProgressBar
 */
function transformProgress(code) {
  let result = code;
  
  // Be careful not to match CircularProgress
  result = result.replace(/<Progress\b(?!Bar|Circle)/g, '<ProgressBar');
  result = result.replace(/<\/Progress>(?!Bar|Circle)/g, '</ProgressBar>');
  
  return result;
}

/**
 * Transform Textarea -> TextArea
 */
function transformTextarea(code) {
  let result = code;
  
  result = result.replace(/<Textarea\b/g, '<TextArea');
  result = result.replace(/<\/Textarea>/g, '</TextArea>');
  // Self-closing
  result = result.replace(/<Textarea\s+((?:(?!\/>)[^])*?)\/>/g, '<TextArea $1/>');
  
  return result;
}

/**
 * Transform Switch compound components
 */
function transformSwitch(code) {
  // Switch in v3 is mostly the same for basic usage
  // Compound pattern: Switch.Control, Switch.Thumb (only needed for custom structures)
  // Basic <Switch> </Switch> remains the same
  return code;
}

/**
 * Transform Button props
 * - color + variant -> variant mapping
 * - isLoading -> isPending
 * - startContent/endContent -> place as children
 */
function transformButton(code) {
  let result = code;
  
  // isLoading -> isPending
  result = result.replace(/\bisLoading\b/g, 'isPending');
  
  // Simple color+variant mappings for Button
  // color="primary" variant="solid" -> variant="primary"
  // color="danger" variant="flat" -> variant="danger-soft"
  // color="primary" variant="bordered" -> variant="secondary"
  // color="primary" variant="light" -> variant="tertiary"
  // color="primary" variant="flat" -> variant="tertiary"
  // color="primary" variant="ghost" -> variant="ghost"
  // color="danger" -> variant="danger"
  // color="default" -> variant="secondary"
  // color="secondary" -> variant="secondary"
  // color="warning" -> variant="primary" (with className)
  // color="success" -> variant="primary" (with className)
  
  // Remove color prop from Button/ButtonGroup (not needed in v3)
  // Note: only target Button and ButtonGroup, not other components
  // This is hard to do perfectly with regex. We'll handle common patterns.
  
  // Handle combined color + variant on Buttons
  // Pattern: color="primary" variant="solid" -> variant="primary"
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+color="primary"\s+variant="solid"/g,
    '$1 variant="primary"'
  );
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+variant="solid"\s+color="primary"/g,
    '$1 variant="primary"'
  );
  
  // color="danger" variant="flat" -> variant="danger-soft"
  result = result.replace(
    /(<Button\b[^>]*)\s+color="danger"\s+variant="flat"/g,
    '$1 variant="danger-soft"'
  );
  result = result.replace(
    /(<Button\b[^>]*)\s+variant="flat"\s+color="danger"/g,
    '$1 variant="danger-soft"'
  );
  
  // color="primary" variant="bordered" -> variant="secondary"
  result = result.replace(
    /(<Button\b[^>]*)\s+color="primary"\s+variant="bordered"/g,
    '$1 variant="secondary"'
  );
  result = result.replace(
    /(<Button\b[^>]*)\s+variant="bordered"\s+color="primary"/g,
    '$1 variant="secondary"'
  );
  
  // color="primary" variant="light" or "flat" -> variant="tertiary"
  result = result.replace(
    /(<Button\b[^>]*)\s+color="primary"\s+variant="(?:light|flat)"/g,
    '$1 variant="tertiary"'
  );
  result = result.replace(
    /(<Button\b[^>]*)\s+variant="(?:light|flat)"\s+color="primary"/g,
    '$1 variant="tertiary"'
  );
  
  // color="primary" variant="ghost" -> variant="ghost"
  result = result.replace(
    /(<Button\b[^>]*)\s+color="primary"\s+variant="ghost"/g,
    '$1 variant="ghost"'
  );
  result = result.replace(
    /(<Button\b[^>]*)\s+variant="ghost"\s+color="primary"/g,
    '$1 variant="ghost"'
  );
  
  // Standalone color on Button (without explicit variant)
  // color="primary" -> variant="primary"
  result = result.replace(
    /(<Button(?:Group)?\b(?:(?!variant=)[^>])*)\s+color="primary"(?![^>]*variant=)/g,
    '$1 variant="primary"'
  );
  
  // color="danger" (standalone) -> variant="danger"
  result = result.replace(
    /(<Button\b(?:(?!variant=)[^>])*)\s+color="danger"(?![^>]*variant=)/g,
    '$1 variant="danger"'
  );
  
  // color="default" -> variant="secondary"
  result = result.replace(
    /(<Button(?:Group)?\b(?:(?!variant=)[^>])*)\s+color="default"(?![^>]*variant=)/g,
    '$1 variant="secondary"'
  );
  
  // color="secondary" -> variant="secondary"
  result = result.replace(
    /(<Button\b(?:(?!variant=)[^>])*)\s+color="secondary"(?![^>]*variant=)/g,
    '$1 variant="secondary"'
  );
  
  // color="success" -> variant="primary"
  result = result.replace(
    /(<Button\b(?:(?!variant=)[^>])*)\s+color="success"(?![^>]*variant=)/g,
    '$1 variant="primary"'
  );
  
  // color="warning" -> variant="primary"
  result = result.replace(
    /(<Button\b(?:(?!variant=)[^>])*)\s+color="warning"(?![^>]*variant=)/g,
    '$1 variant="primary"'
  );
  
  // Map remaining variant values on Button
  // variant="solid" -> variant="primary"
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+variant="solid"/g,
    '$1 variant="primary"'
  );
  
  // variant="bordered" -> variant="secondary"
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+variant="bordered"/g,
    '$1 variant="secondary"'
  );
  
  // variant="light" -> variant="tertiary"
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+variant="light"/g,
    '$1 variant="tertiary"'
  );
  
  // variant="flat" -> variant="tertiary"
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+variant="flat"/g,
    '$1 variant="tertiary"'
  );
  
  // variant="faded" -> variant="secondary"
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+variant="faded"/g,
    '$1 variant="secondary"'
  );
  
  // variant="shadow" -> variant="primary"
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+variant="shadow"/g,
    '$1 variant="primary"'
  );
  
  // Remove leftover color props on Button that weren't caught
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+color="[^"]*"/g,
    '$1'
  );
  
  // Remove radius prop from Button
  result = result.replace(
    /(<Button(?:Group)?\b[^>]*)\s+radius="[^"]*"/g,
    '$1'
  );
  
  // Remove disableRipple
  result = result.replace(
    /(<Button\b[^>]*)\s+disableRipple(?:=\{[^}]*\})?/g,
    '$1'
  );
  
  // Remove disableAnimation from Button
  result = result.replace(
    /(<Button\b[^>]*)\s+disableAnimation(?:=\{[^}]*\})?/g,
    '$1'
  );
  
  return result;
}

/**
 * Transform Chip props
 * - variant mapping
 * - color mapping
 */
function transformChip(code) {
  let result = code;
  
  // Chip variant mappings
  // variant="solid" -> variant="primary"
  result = result.replace(
    /(<Chip\b[^>]*)\s+variant="solid"/g,
    '$1 variant="primary"'
  );
  // variant="bordered" -> variant="secondary"
  result = result.replace(
    /(<Chip\b[^>]*)\s+variant="bordered"/g,
    '$1 variant="secondary"'
  );
  // variant="light" -> variant="soft"
  result = result.replace(
    /(<Chip\b[^>]*)\s+variant="light"/g,
    '$1 variant="soft"'
  );
  // variant="flat" -> variant="tertiary"
  result = result.replace(
    /(<Chip\b[^>]*)\s+variant="flat"/g,
    '$1 variant="tertiary"'
  );
  // variant="faded" -> variant="secondary"
  result = result.replace(
    /(<Chip\b[^>]*)\s+variant="faded"/g,
    '$1 variant="secondary"'
  );
  // variant="dot" -> variant="secondary" (no dot in v3)
  result = result.replace(
    /(<Chip\b[^>]*)\s+variant="dot"/g,
    '$1 variant="secondary"'
  );
  
  // Chip color mappings
  // color="primary" -> color="accent"
  result = result.replace(
    /(<Chip\b[^>]*)\s+color="primary"/g,
    '$1 color="accent"'
  );
  // color="secondary" -> color="default"
  result = result.replace(
    /(<Chip\b[^>]*)\s+color="secondary"/g,
    '$1 color="default"'
  );
  
  // Remove radius from Chip
  result = result.replace(
    /(<Chip\b[^>]*)\s+radius="[^"]*"/g,
    '$1'
  );
  
  return result;
}

/**
 * Transform Input props
 * Input with label -> TextField + Label + Input
 * This is complex and best handled per-file, but we can do simple transformations
 */
function transformInput(code) {
  let result = code;
  
  // Remove variant prop from Input (v3 has primary/secondary only, default is fine)
  // v2 variants: flat, bordered, underlined, faded
  result = result.replace(
    /(<Input\b[^>]*)\s+variant="(?:flat|bordered|underlined|faded)"/g,
    '$1'
  );
  
  // Remove color from Input
  result = result.replace(
    /(<Input\b[^>]*)\s+color="[^"]*"/g,
    '$1'
  );
  
  // Remove radius from Input
  result = result.replace(
    /(<Input\b[^>]*)\s+radius="[^"]*"/g,
    '$1'
  );
  
  // onValueChange -> onChange (but the handler signature changes)
  // This needs manual review, just flag it
  
  // Remove labelPlacement from Input
  result = result.replace(
    /(<Input\b[^>]*)\s+labelPlacement="[^"]*"/g,
    '$1'
  );
  
  return result;
}

/**
 * Transform Tooltip props  
 */
function transformTooltip(code) {
  let result = code;
  
  // Remove color from Tooltip
  result = result.replace(
    /(<Tooltip\b[^>]*)\s+color="[^"]*"/g,
    '$1'
  );
  
  // Remove radius from Tooltip
  result = result.replace(
    /(<Tooltip\b[^>]*)\s+radius="[^"]*"/g,
    '$1'
  );
  
  return result;
}

/**
 * Transform Spinner props
 */
function transformSpinner(code) {
  let result = code;
  
  // Remove color from Spinner (v3 uses className for color)
  // Keep color="current" as it may still work
  result = result.replace(
    /(<Spinner\b[^>]*)\s+color="(?!current)[^"]*"/g,
    '$1'
  );
  
  // Remove label prop from Spinner 
  // v3 handles label differently
  
  return result;
}

/**
 * Transform Link props
 */
function transformLink(code) {
  let result = code;
  
  // Remove color from Link
  result = result.replace(
    /(<Link\b[^>]*)\s+color="[^"]*"/g,
    '$1'
  );
  
  return result;
}

/**
 * Transform Alert props
 */
function transformAlert(code) {
  let result = code;
  
  // Alert color mapping -> variant
  // color="warning" -> variant="warning"
  // color="danger" -> variant="danger"
  // color="success" -> variant="success"
  // color="primary" -> variant="primary"
  result = result.replace(
    /(<Alert\b[^>]*)\s+color="([^"]*)"/g,
    '$1 variant="$2"'
  );
  
  return result;
}

/**
 * Transform Snippet -> custom code block (Snippet removed in v3)
 */
function transformSnippet(code) {
  let result = code;
  
  // <Snippet>content</Snippet> -> <code className="bg-default-100 px-2 py-1 rounded">content</code>
  result = result.replace(/<Snippet\b([^>]*)>/g, '<code className="bg-default-100 px-2 py-1 rounded text-sm"$1>');
  result = result.replace(/<\/Snippet>/g, '</code>');
  
  return result;
}

/**
 * Transform Accordion props
 */
function transformAccordionProps(code) {
  let result = code;
  
  // AccordionItem: key -> id
  result = result.replace(
    /(<Accordion\.Item\s+)key=/g,
    '$1id='
  );
  
  // Remove variant from Accordion (v3 has different variants)
  result = result.replace(
    /(<Accordion\b[^>]*)\s+variant="(?:splitted|bordered|shadow|light)"/g,
    '$1'
  );
  
  return result;
}

/**
 * Transform useDisclosure -> useOverlayState usage patterns
 * const { isOpen, onOpen, onClose, onOpenChange } = useOverlayState()
 * ->
 * const state = useOverlayState()
 * Then: isOpen -> state.isOpen, onOpen -> state.open, onClose -> state.close, onOpenChange -> state.setOpen
 */
function transformUseDisclosure(code) {
  let result = code;
  
  // Pattern: const { isOpen, onOpen, onClose, onOpenChange } = useOverlayState(...)
  // -> const overlayState = useOverlayState(...)
  // Then replace all destructured usages
  
  // Find all useOverlayState destructuring patterns
  const disclosurePattern = /const\s*\{([^}]+)\}\s*=\s*useOverlayState\(([^)]*)\)/g;
  let match;
  const replacements = [];
  
  while ((match = disclosurePattern.exec(result)) !== null) {
    const destructured = match[1];
    const args = match[2];
    const fullMatch = match[0];
    
    // Parse destructured names
    const names = destructured.split(',').map(s => s.trim()).filter(Boolean);
    
    // Generate a unique state variable name
    // If there are multiple useOverlayState calls, we need unique names
    const stateVarName = replacements.length === 0 ? 'overlayState' : `overlayState${replacements.length + 1}`;
    
    replacements.push({
      original: fullMatch,
      replacement: `const ${stateVarName} = useOverlayState(${args})`,
      mappings: {
        isOpen: `${stateVarName}.isOpen`,
        onOpen: `${stateVarName}.open`,
        onClose: `${stateVarName}.close`,
        onOpenChange: `${stateVarName}.setOpen`,
      },
      names,
    });
  }
  
  // Apply replacements in reverse order to preserve positions
  for (const rep of replacements.reverse()) {
    result = result.replace(rep.original, rep.replacement);
    
    // Now replace all usages of the destructured names
    // Be careful to only replace standalone identifiers, not property names
    for (const name of rep.names) {
      const mapping = rep.mappings[name];
      if (mapping) {
        // Replace standalone identifier usage (not after . or as property)
        // For function calls like onOpen() -> state.open()
        // For values like isOpen -> state.isOpen
        // For props like isOpen={isOpen} -> isOpen={state.isOpen}
        // For props like onOpenChange={onOpenChange} -> onOpenChange={state.setOpen}
        
        // onOpen and onClose need special handling since they become method references
        if (name === 'onOpen') {
          // onOpen() -> state.open()
          // onPress={onOpen} -> onPress={state.open}
          const regex = new RegExp(`(?<![.\\w])${name}(?![\\w])`, 'g');
          result = result.replace(regex, mapping);
        } else if (name === 'onClose') {
          const regex = new RegExp(`(?<![.\\w])${name}(?![\\w])`, 'g');
          result = result.replace(regex, mapping);
        } else if (name === 'onOpenChange') {
          const regex = new RegExp(`(?<![.\\w])${name}(?![\\w])`, 'g');
          result = result.replace(regex, mapping);
        } else if (name === 'isOpen') {
          const regex = new RegExp(`(?<![.\\w])${name}(?![\\w])`, 'g');
          result = result.replace(regex, mapping);
        }
      }
    }
  }
  
  return result;
}

/**
 * Transform Tabs props
 */
function transformTabsProps(code) {
  let result = code;
  
  // Remove color from Tabs
  result = result.replace(
    /(<Tabs\b[^>]*)\s+color="[^"]*"/g,
    '$1'
  );
  
  // Remove radius from Tabs
  result = result.replace(
    /(<Tabs\b[^>]*)\s+radius="[^"]*"/g,
    '$1'
  );
  
  // Remove size from Tabs
  result = result.replace(
    /(<Tabs\b[^>]*)\s+size="[^"]*"/g,
    '$1'
  );
  
  // Variant mapping for Tabs
  // variant="underlined" -> variant="secondary"
  result = result.replace(
    /(<Tabs\b[^>]*)\s+variant="underlined"/g,
    '$1 variant="secondary"'
  );
  // variant="bordered" -> variant="secondary"
  result = result.replace(
    /(<Tabs\b[^>]*)\s+variant="bordered"/g,
    '$1 variant="secondary"'
  );
  // variant="light" -> variant="secondary"
  result = result.replace(
    /(<Tabs\b[^>]*)\s+variant="light"/g,
    '$1 variant="secondary"'
  );
  // variant="solid" -> variant="primary"
  result = result.replace(
    /(<Tabs\b[^>]*)\s+variant="solid"/g,
    '$1 variant="primary"'
  );
  
  // Remove classNames from Tabs
  result = result.replace(
    /(<Tabs\b[^>]*)\s+classNames=\{[^}]+\}/g,
    '$1'
  );
  
  // Remove fullWidth from Tabs  
  result = result.replace(
    /(<Tabs\b[^>]*)\s+fullWidth\b/g,
    '$1'
  );
  
  // Remove disableCursorAnimation
  result = result.replace(
    /(<Tabs\b[^>]*)\s+disableCursorAnimation\b/g,
    '$1'
  );
  
  return result;
}

/**
 * Transform Select props
 */
function transformSelectProps(code) {
  let result = code;
  
  // Remove variant from Select (v2 variants don't map directly)
  result = result.replace(
    /(<Select\b[^>]*)\s+variant="(?:flat|bordered|underlined|faded)"/g,
    '$1'
  );
  
  // Remove color from Select
  result = result.replace(
    /(<Select\b[^>]*)\s+color="[^"]*"/g,
    '$1'
  );
  
  // Remove radius from Select
  result = result.replace(
    /(<Select\b[^>]*)\s+radius="[^"]*"/g,
    '$1'
  );
  
  // Remove size from Select
  result = result.replace(
    /(<Select\b[^>]*)\s+size="[^"]*"/g,
    '$1'
  );
  
  // Remove labelPlacement from Select
  result = result.replace(
    /(<Select\b[^>]*)\s+labelPlacement="[^"]*"/g,
    '$1'
  );
  
  return result;
}

/**
 * General cleanup of removed props across all components
 */
function cleanupRemovedProps(code) {
  let result = code;
  
  // Remove disableAnimation from any component
  result = result.replace(
    /\s+disableAnimation(?:=\{[^}]*\})?/g,
    ''
  );
  
  // Remove motionProps from any component
  result = result.replace(
    /\s+motionProps=\{[^}]*\}/g,
    ''
  );
  
  return result;
}

/**
 * Remove Snippet import and replace with HTML
 */
function removeSnippetImport(code) {
  let result = code;
  // Remove Snippet from imports if present
  result = result.replace(
    /,?\s*Snippet\s*,?/g,
    (match) => {
      // If it was ", Snippet," return ","
      // If ", Snippet" return ""
      // If "Snippet," return ""
      if (match.startsWith(',') && match.endsWith(',')) return ',';
      return '';
    }
  );
  return result;
}

// ============================================================
// MAIN: Apply all transformations
// ============================================================

function migrateFile(code, filePath) {
  let result = code;
  
  // Only process files that have HeroUI imports
  if (!result.includes('@heroui/react') && !result.includes('useDisclosure') && !result.includes('framer-motion')) {
    return result;
  }
  
  // Phase 1: Import transformations
  result = transformImports(result);
  
  // Phase 2: useDisclosure -> useOverlayState transformations
  if (result.includes('useOverlayState')) {
    result = transformUseDisclosure(result);
  }
  
  // Phase 3: Component JSX transformations
  result = transformCard(result);
  result = transformModal(result);
  result = transformAccordion(result);
  result = transformAccordionProps(result);
  result = transformTabs(result);
  result = transformTabsProps(result);
  result = transformDropdown(result);
  result = transformSelect(result);
  result = transformSelectProps(result);
  result = transformPopover(result);
  result = transformListbox(result);
  result = transformDivider(result);
  result = transformProgress(result);
  result = transformTextarea(result);
  result = transformButton(result);
  result = transformChip(result);
  result = transformInput(result);
  result = transformTooltip(result);
  result = transformSpinner(result);
  result = transformLink(result);
  result = transformAlert(result);
  result = transformSnippet(result);
  result = transformSwitch(result);
  
  // Phase 4: General cleanup
  result = cleanupRemovedProps(result);
  
  return result;
}

// ============================================================
// RUN
// ============================================================

console.log('🚀 Starting HeroUI v2 → v3 migration...\n');

// Find all TypeScript/React files in src/
const sourceFiles = findFiles('src');
console.log(`Found ${sourceFiles.length} source files to scan.\n`);

for (const file of sourceFiles) {
  const changed = processFile(file, migrateFile);
  if (changed) {
    console.log(`  ✅ Migrated: ${file}`);
    totalChanges++;
  }
}

console.log(`\n📊 Migration Summary:`);
console.log(`   Files changed: ${filesChanged}`);
console.log(`   Total transformations: ${totalChanges}`);
console.log('\n⚠️  Manual review needed for:');
console.log('   - Modal wrapper structure (Backdrop > Container > Dialog)');
console.log('   - Select compound components (Trigger > Value > Indicator)');
console.log('   - Tabs restructure (ListContainer > List > Tab + Panel)');
console.log('   - Input -> TextField conversions with label/description');
console.log('   - startContent/endContent -> children on Button');
console.log('   - framer-motion replacement in animation files');
console.log('   - HeroUIProvider removal');
console.log('   - tailwind.config.js and vite.config.ts updates');
