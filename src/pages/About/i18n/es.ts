import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  // Hero
  'Your AI Team, Ready When You Are':
    'Tu equipo de IA, listo cuando t\u00fa lo est\u00e9s',
  '{product} gives you a team of AI helpers that work together \u2014 right in your browser. Just describe what you need, and they\u2019ll plan it, do it, and deliver it \u2014':
    '{product} te da un equipo de asistentes de IA que trabajan juntos \u2014 directamente en tu navegador. Solo describe lo que necesitas y ellos lo planifican, lo hacen y te lo entregan \u2014',
  'without your data ever leaving your device':
    'sin que tus datos salgan jam\u00e1s de tu dispositivo',
  'Watch the 30-second tour': 'Ver la visita de 30 segundos',

  // See it in action section
  'See it in action': 'En acci\u00f3n',
  'A guided tour, in 30-second clips':
    'Un recorrido guiado, en clips de 30 segundos',
  'Product Tour': 'Recorrido del producto',
  'The full DEVS story in 30 seconds':
    'Toda la historia de DEVS en 30 segundos',
  'Task Delegation': 'Delegaci\u00f3n de tareas',
  'Delegate, don\u2019t chat': 'Delega, no charles',
  'Agent Studio': 'Estudio de agentes',
  'Build your own AI team': 'Construye tu propio equipo de IA',
  'Privacy First': 'Privacidad ante todo',
  'Your keys. Your data. Your browser.': 'Tus claves. Tus datos. Tu navegador.',
  'Inbox Workflow': 'Flujo de bandeja de entrada',
  'Your AI tasks': 'Tus tareas de IA',
  'Open full-screen': 'Abrir en pantalla completa',
  '\u201CAI shouldn\u2019t be a privilege for tech experts. It should be a superpower anyone can use \u2014 like having a brilliant team on call, ready to tackle anything you throw at them.\u201D':
    '\u201CLa IA no deber\u00eda ser un privilegio para expertos en tecnolog\u00eda. Deber\u00eda ser un superpoder al alcance de todos \u2014 como tener un equipo brillante a tu disposici\u00f3n, listo para afrontar cualquier reto.\u201D',

  // Principles section
  Philosophy: 'Filosof\u00eda',
  'What We Stand For': 'Lo que defendemos',
  'Three promises we\u2019ll never break.':
    'Tres promesas que nunca romperemos.',
  'Your Data Stays Yours': 'Tus datos son tuyos',
  'Everything stays on your device. Nothing is sent to our servers. No tracking, no snooping, no exceptions.':
    'Todo permanece en tu dispositivo. Nada se env\u00eda a nuestros servidores. Sin rastreo, sin espionaje, sin excepciones.',
  'Works in Any Browser': 'Funciona en cualquier navegador',
  'No downloads, no special equipment. If you can open a web page, you can use DEVS.':
    'Sin descargas, sin equipo especial. Si puedes abrir una p\u00e1gina web, puedes usar DEVS.',
  'Free & Open Source': 'Gratuito y de c\u00f3digo abierto',
  'The code is public, the community shapes it, and it will always be free. No hidden costs, ever.':
    'El c\u00f3digo es p\u00fablico, la comunidad lo moldea y siempre ser\u00e1 gratuito. Sin costes ocultos, nunca.',

  // Capabilities section
  Capabilities: 'Capacidades',
  'What Makes It Special': 'Qu\u00e9 lo hace especial',
  'Serious technology made simple \u2014 so you can focus on your ideas.':
    'Tecnolog\u00eda seria hecha simple \u2014 para que te centres en tus ideas.',
  'A Team, Not Just a Chatbot': 'Un equipo, no solo un chatbot',
  'Better Together': 'Mejor juntos',
  'Instead of one AI trying to do everything, multiple specialised helpers team up \u2014 each one great at something different, just like a real team.':
    'En lugar de una sola IA intentando hacerlo todo, varios asistentes especializados trabajan juntos \u2014 cada uno excelente en algo diferente, como un equipo real.',
  'Use Any AI You Like': 'Usa la IA que prefieras',
  'Freedom of Choice': 'Libertad de elecci\u00f3n',
  'Works with OpenAI, Google, Anthropic, Mistral, and many more. Switch anytime \u2014 your conversations and data stay put.':
    'Compatible con OpenAI, Google, Anthropic, Mistral y muchos m\u00e1s. Cambia cuando quieras \u2014 tus conversaciones y datos se quedan.',
  'Bank-Level Security': 'Seguridad de nivel bancario',
  'Locked Down by Default': 'Blindado por defecto',
  'Your passwords and keys are encrypted right in your browser. Nothing sensitive ever travels over the internet.':
    'Tus contrase\u00f1as y claves se cifran directamente en tu navegador. Nada sensible viaja jam\u00e1s por internet.',
  'It Breaks Down the Hard Stuff': 'Descompone lo dif\u00edcil',
  'Smart Under the Hood': 'Inteligente bajo el cap\u00f3',
  'Describe a big goal and the system figures out what needs to happen, assigns the right helpers, and coordinates everything automatically.':
    'Describe un gran objetivo y el sistema determina qu\u00e9 hay que hacer, asigna los asistentes adecuados y coordina todo autom\u00e1ticamente.',
  'Works Without Internet': 'Funciona sin internet',
  'Always On, Always Yours': 'Siempre activo, siempre tuyo',
  'Once loaded, it works offline. Optionally sync across your devices without relying on anyone else\u2019s servers.':
    'Una vez cargado, funciona sin conexi\u00f3n. Sincroniza opcionalmente entre tus dispositivos sin depender de servidores ajenos.',
  'Endlessly Customisable': 'Infinitamente personalizable',
  'Make It Your Own': 'Hazlo tuyo',
  'Browse a library of ready-made tools, connectors, and AI helpers \u2014 or let the community build new ones.':
    'Explora una biblioteca de herramientas, conectores y asistentes de IA listos para usar \u2014 o deja que la comunidad cree nuevos.',

  // How it works section
  'Getting Started': 'Primeros pasos',
  'How It Works': 'C\u00f3mo funciona',
  'From idea to finished result in minutes.':
    'De la idea al resultado terminado en minutos.',
  'Connect your AI': 'Conecta tu IA',
  'Pick your favourite AI provider \u2014 like OpenAI or Google \u2014 and add your key. Takes about 30 seconds.':
    'Elige tu proveedor de IA favorito \u2014 como OpenAI o Google \u2014 y a\u00f1ade tu clave. Tarda unos 30 segundos.',
  'Describe what you need': 'Describe lo que necesitas',
  'Just type what you want done, in plain language. The bigger the challenge, the more it shines.':
    'Simplemente escribe lo que quieres, en lenguaje sencillo. Cuanto mayor sea el reto, m\u00e1s brilla.',
  'Watch the magic happen': 'Mira c\u00f3mo ocurre la magia',
  'Your AI team plans, works, and double-checks in real time. Jump in anytime or sit back and relax.':
    'Tu equipo de IA planifica, trabaja y verifica en tiempo real. Interv\u00e9n en cualquier momento o si\u00e9ntate y rel\u00e1jate.',
  'Get your results': 'Obt\u00e9n tus resultados',
  'Receive polished deliverables \u2014 documents, code, analyses \u2014 and fine-tune them with simple feedback.':
    'Recibe entregables pulidos \u2014 documentos, c\u00f3digo, an\u00e1lisis \u2014 y af\u00ednalos con comentarios sencillos.',

  // Use cases section
  'For Everyone': 'Para todos',
  'Made for Everyone': 'Hecho para todos',
  'Whether you\u2019re coding, creating, or strategising \u2014 DEVS adapts to you.':
    'Ya sea que programes, crees o planifiques \u2014 DEVS se adapta a ti.',
  Students: 'Estudiantes',
  'Research, study plans & homework help':
    'Investigaci\u00f3n, planes de estudio y ayuda con tareas',
  Developers: 'Desarrolladores',
  'Quick prototypes, code & reviews':
    'Prototipos r\u00e1pidos, c\u00f3digo y revisiones',
  Creators: 'Creadores',
  'Ideas, writing & content creation':
    'Ideas, escritura y creaci\u00f3n de contenido',
  Researchers: 'Investigadores',
  'Literature reviews, data & experiments':
    'Revisi\u00f3n de literatura, datos y experimentos',
  Managers: 'Gerentes',
  'Project plans, task lists & operations':
    'Planes de proyecto, listas de tareas y operaciones',
  Entrepreneurs: 'Emprendedores',
  'Idea testing, strategy & business plans':
    'Prueba de ideas, estrategia y planes de negocio',

  // FAQ section
  FAQ: 'FAQ',
  'Common Questions': 'Preguntas frecuentes',
  'Is my data private?': '\u00bfMis datos son privados?',
  'Yes, 100%. Everything happens in your browser \u2014 we never see, collect, or store any of your data. Your AI keys are encrypted on your device and never sent anywhere.':
    'S\u00ed, al 100%. Todo ocurre en tu navegador \u2014 nunca vemos, recopilamos ni almacenamos tus datos. Tus claves de IA se cifran en tu dispositivo y nunca se env\u00edan a ning\u00fan sitio.',
  'Which AI providers can I use?':
    '\u00bfQu\u00e9 proveedores de IA puedo usar?',
  'We work with {providers}, plus any service compatible with the OpenAI format. You can switch at any time without losing anything.':
    'Trabajamos con {providers}, m\u00e1s cualquier servicio compatible con el formato OpenAI. Puedes cambiar en cualquier momento sin perder nada.',
  'Do I need to install anything?': '\u00bfNecesito instalar algo?',
  'Nope. Just open the website and you\u2019re ready to go. You can add it to your home screen for a native app feel, but it\u2019s totally optional.':
    'No. Solo abre la web y listo. Puedes a\u00f1adirlo a tu pantalla de inicio para que se sienta como una app nativa, pero es totalmente opcional.',
  'Is this really free?': '\u00bfEs realmente gratuito?',
  'Yes \u2014 {license} licensed, now and forever. All the code is on GitHub. No subscriptions, no premium plans, no paywalls.':
    'S\u00ed \u2014 con licencia {license}, ahora y para siempre. Todo el c\u00f3digo est\u00e1 en GitHub. Sin suscripciones, sin planes premium, sin muros de pago.',
  'Can I use it offline?': '\u00bfPuedo usarlo sin conexi\u00f3n?',
  'After your first visit, everything is saved locally so you can keep working without internet. The only thing that needs a connection is talking to your AI provider.':
    'Despu\u00e9s de tu primera visita, todo se guarda localmente para que sigas trabajando sin internet. Lo \u00fanico que necesita conexi\u00f3n es comunicarse con tu proveedor de IA.',
  'How does the AI team work?': '\u00bfC\u00f3mo funciona el equipo de IA?',
  'When you give it a big task, the system breaks it into smaller pieces, picks the best helper for each part, and coordinates them all at once \u2014 like a well-organised project team.':
    'Cuando le das una tarea grande, el sistema la divide en partes m\u00e1s peque\u00f1as, elige al mejor asistente para cada parte y los coordina a todos a la vez \u2014 como un equipo de proyecto bien organizado.',

  // CTA section
  'Join the Movement': '\u00danete al movimiento',
  '{product} is made by people who believe AI should empower everyone, not just the privileged few. Whether you contribute code, ideas, or feedback \u2014 you\u2019re helping make AI accessible to the world.':
    '{product} est\u00e1 hecho por personas que creen que la IA debe empoderar a todos, no solo a unos pocos privilegiados. Ya contribuyas c\u00f3digo, ideas o comentarios \u2014 est\u00e1s ayudando a hacer la IA accesible al mundo.',
  'View on GitHub': 'Ver en GitHub',
  'Open an Issue': 'Abrir un Issue',
  'Made with care for humans everywhere.':
    'Hecho con cari\u00f1o para humanos en todas partes.',
}
