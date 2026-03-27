const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = 'My Presentation';
pres.author = 'Author\'s name';

// Slide 1 — Title
let slide1 = pres.addSlide();
slide1.background = { color: '003B75' };
slide1.addText('My Presentation', {
  x: 0.5, y: 1.2, w: 9, h: 1.5,
  fontSize: 36, fontFace: 'Arial',
  color: 'FFFFFF', bold: true, align: 'center',
});
slide1.addShape(pres.ShapeType.line, {
  x: 3, y: 2.7, w: 4, h: 0,
  line: { color: 'CCDDEE', width: 1 },
});
slide1.addText('Author\'s name, Company name', {
  x: 0.5, y: 3, w: 9, h: 0.8,
  fontSize: 18, fontFace: 'Arial',
  color: 'CCDDEE', align: 'center',
});
slide1.addText('Sept 14, 2025 — Amazing Event, Location', {
  x: 0.5, y: 4.8, w: 9, h: 0.5,
  fontSize: 10, fontFace: 'Arial',
  color: '8899AA', align: 'center',
});

// Slide 2 — Agenda
let slide2 = pres.addSlide();
slide2.background = { color: 'FFFFFF' };
slide2.addText('Agenda:', {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 28, fontFace: 'Arial',
  color: '003B75', bold: true,
});
slide2.addText([
  { text: '1. Key item #1', options: { breakLine: true } },
  { text: '2. Key item #2', options: { breakLine: true } },
  { text: '3. Key item #3', options: { breakLine: true } },
  { text: '4. Key item #4', options: {} },
], {
  x: 0.8, y: 1.5, w: 8, h: 3,
  fontSize: 18, fontFace: 'Arial',
  color: '333333', lineSpacingMultiple: 1.5,
});

// Slide 3 — Section: Key item #1
let slide3 = pres.addSlide();
slide3.background = { color: '003B75' };
slide3.addText([
  { text: 'Key', options: { bold: true } },
  { text: ' item ' },
  { text: '#1', options: { italic: true } },
], {
  x: 0.5, y: 2, w: 9, h: 1.5,
  fontSize: 32, fontFace: 'Arial',
  color: 'FFFFFF', align: 'center',
});

// Slide 4 — A very important section
let slide4 = pres.addSlide();
slide4.background = { color: 'FFFFFF' };
slide4.addText([
  { text: 'A very ' },
  { text: 'important', options: { bold: true } },
  { text: ' section' },
], {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 24, fontFace: 'Arial',
  color: '003B75',
});

// Slide 5 — Features
let slide5 = pres.addSlide();
slide5.background = { color: 'FFFFFF' };
slide5.addText('Features', {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 24, fontFace: 'Arial',
  color: '003B75',
});
slide5.addText([
  { text: 'Pagination', options: { bold: true } },
  { text: ': Slide-based navigation', options: { breakLine: true } },
  { text: 'Formatting', options: { bold: true } },
  { text: ': Support for Markdown', options: { breakLine: true } },
  { text: 'Math', options: { bold: true } },
  { text: ': Support for LaTeX, between $…$', options: { breakLine: true } },
  { text: 'Themes', options: { bold: true } },
  { text: ': Customizable appearance' },
], {
  x: 0.8, y: 1.5, w: 8, h: 3,
  fontSize: 18, fontFace: 'Arial',
  color: '333333', bullet: true, lineSpacingMultiple: 1.5,
});

// Slide 6 — Citations support (inline)
let slide6 = pres.addSlide();
slide6.background = { color: 'FFFFFF' };
slide6.addText([
  { text: 'Citations', options: { bold: true } },
  { text: ' support' },
], {
  x: 0.5, y: 0.3, w: 9, h: 0.8,
  fontSize: 24, fontFace: 'Arial',
  color: '003B75',
});
slide6.addText('Inline:', {
  x: 0.8, y: 1.3, w: 8, h: 0.5,
  fontSize: 18, fontFace: 'Arial',
  color: '333333',
});
slide6.addShape(pres.ShapeType.rect, {
  x: 0.8, y: 2, w: 8, h: 2,
  fill: { color: 'F5F5F5' },
  line: { color: '003B75', width: 0.5 },
  rectRadius: 0.05,
});
slide6.addText([
  { text: 'Mass–energy equivalence equation:\n', options: {} },
  { text: 'E = mc²', options: { bold: true, fontSize: 22 } },
  { text: '\n\n— Einstein, 1905', options: { italic: true } },
], {
  x: 1.2, y: 2.1, w: 7.2, h: 1.8,
  fontSize: 16, fontFace: 'Arial',
  color: '333333',
});

// Slide 7 — Full-slide quote
let slide7 = pres.addSlide();
slide7.background = { color: '003B75' };
slide7.addText('Mass–energy equivalence equation:', {
  x: 1, y: 1.5, w: 8, h: 0.8,
  fontSize: 20, fontFace: 'Arial',
  color: 'CCDDEE', italic: true,
});
slide7.addText('E = mc²', {
  x: 1, y: 2.3, w: 8, h: 1.2,
  fontSize: 40, fontFace: 'Arial',
  color: 'FFFFFF', bold: true, align: 'center',
});
slide7.addText('Einstein, 1905', {
  x: 1, y: 3.5, w: 8, h: 0.8,
  fontSize: 16, fontFace: 'Arial',
  color: 'CCDDEE', italic: true, align: 'center',
});

// Slide 8 — Section: Key item #2
let slide8 = pres.addSlide();
slide8.background = { color: '003B75' };
slide8.addText([
  { text: 'Key', options: { bold: true } },
  { text: ' item ' },
  { text: '#2', options: { italic: true } },
], {
  x: 0.5, y: 2, w: 9, h: 1.5,
  fontSize: 32, fontFace: 'Arial',
  color: 'FFFFFF', align: 'center',
});

// Slide 9 — What's next?
let slide9 = pres.addSlide();
slide9.background = { color: 'FFFFFF' };
slide9.addText([
  { text: 'What\'s ' },
  { text: 'next?', options: { bold: true } },
], {
  x: 0.5, y: 2, w: 9, h: 1.5,
  fontSize: 28, fontFace: 'Arial',
  color: '003B75', align: 'center',
});

// Slide 10 — Thank you
let slide10 = pres.addSlide();
slide10.background = { color: '003B75' };
slide10.addText('Thank you', {
  x: 0.5, y: 2, w: 9, h: 1.5,
  fontSize: 36, fontFace: 'Arial',
  color: 'FFFFFF', bold: true, align: 'center',
});
