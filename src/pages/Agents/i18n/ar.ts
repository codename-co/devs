import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ar: I18n = {
  'Agent Builder': 'بناء الوكيل',
  'Design and configure your custom specialized AI agent':
    'صمم وكوّن وكيل الذكاء الاصطناعي المتخصص الخاص بك',
  'Agent Profile': 'ملف الوكيل',
  "Define your agent's personality and capabilities": 'حدد شخصية وقدرات وكيلك',
  'Agent created successfully! Redirecting to agents list...':
    'تم إنشاء الوكيل بنجاح! جارٍ إعادة التوجيه إلى قائمة الوكلاء...',
  Name: 'الاسم',
  'e.g., Mike the Magician': 'مثال: مايك الساحر',
  'A friendly name for your agent': 'اسم ودود لوكيلك',
  Role: 'الدور',
  'e.g., Performs magic tricks and illusions': 'مثال: يؤدي حيل سحرية وأوهام',
  'What does your agent do?': 'ماذا يفعل وكيلك؟',
  Instructions: 'التعليمات',
  "Detailed instructions for the agent's personality, skills, constraints, and goals…":
    'تعليمات مفصلة لشخصية الوكيل ومهاراته وقيوده وأهدافه…',
  "Detailed instructions for the agent's behavior":
    'تعليمات مفصلة لسلوك الوكيل',
  'Advanced Configuration': 'التكوين المتقدم',
  'Configure advanced settings for your agent':
    'تكوين الإعدادات المتقدمة لوكيلك',
  Provider: 'المزود',
  Model: 'النموذج',
  Temperature: 'درجة الحرارة',
  'Lower values = more focused, Higher values = more creative':
    'قيم أقل = أكثر تركيزاً، قيم أعلى = أكثر إبداعاً',
  'Creating...': 'جارٍ الإنشاء...',
  'Create Agent': 'إنشاء وكيل',
  'Reset Form': 'إعادة تعيين النموذج',
  'Live Preview': 'معاينة حية',
  Clear: 'مسح',
  'Start a conversation to test your agent': 'ابدأ محادثة لاختبار وكيلك',
  'The chat will use your current form configuration':
    'ستستخدم المحادثة تكوين النموذج الحالي الخاص بك',
  'Ask {agentName} something…': 'اسأل {agentName} شيئاً…',
  Send: 'إرسال',
  Current: 'الحالية', // current conversation
} as const
