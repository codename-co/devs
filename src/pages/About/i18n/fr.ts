import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const fr: I18n = {
  // Hero
  'Your AI Team, Ready When You Are':
    'Votre \u00e9quipe IA, pr\u00eate quand vous l\u2019\u00eates',
  '{product} gives you a team of AI helpers that work together \u2014 right in your browser. Just describe what you need, and they\u2019ll plan it, do it, and deliver it \u2014':
    '{product} vous donne une \u00e9quipe d\u2019assistants IA qui travaillent ensemble \u2014 directement dans votre navigateur. D\u00e9crivez simplement ce dont vous avez besoin, et ils le planifient, le r\u00e9alisent et vous le livrent \u2014',
  'without your data ever leaving your device':
    'sans que vos donn\u00e9es ne quittent jamais votre appareil',
  'Watch the 30-second tour': 'Voir la visite de 30 secondes',

  // See it in action section
  'See it in action': 'En action',
  'A guided tour, in 30-second clips':
    'Une visite guid\u00e9e, en clips de 30 secondes',
  'Product Tour': 'Visite du produit',
  'The full DEVS story in 30 seconds':
    'Toute l\u2019histoire de DEVS en 30 secondes',
  'Task Delegation': 'D\u00e9l\u00e9gation de t\u00e2ches',
  'Delegate, don\u2019t chat': 'D\u00e9l\u00e9guez, ne discutez pas',
  'Agent Studio': 'Studio d\u2019agents',
  'Build your own AI team': 'Construisez votre \u00e9quipe d\u2019IA',
  'Privacy First': 'La confidentialit\u00e9 avant tout',
  'Your keys. Your data. Your browser.':
    'Vos cl\u00e9s. Vos donn\u00e9es. Votre navigateur.',
  'Inbox Workflow': 'Flux de bo\u00eete de r\u00e9ception',
  'Your AI tasks': 'Votre espace de tâches IA',
  'Open full-screen': 'Ouvrir en plein \u00e9cran',
  '\u201CAI shouldn\u2019t be a privilege for tech experts. It should be a superpower anyone can use \u2014 like having a brilliant team on call, ready to tackle anything you throw at them.\u201D':
    '\u201CL\u2019IA ne devrait pas \u00eatre un privil\u00e8ge r\u00e9serv\u00e9 aux experts. Ce devrait \u00eatre un superpouvoir accessible \u00e0 tous \u2014 comme avoir une \u00e9quipe brillante \u00e0 disposition, pr\u00eate \u00e0 relever tous les d\u00e9fis.\u201D',

  // Principles section
  Philosophy: 'Philosophie',
  'What We Stand For': 'Ce que nous d\u00e9fendons',
  'Three promises we\u2019ll never break.':
    'Trois promesses que nous ne briserons jamais.',
  'Your Data Stays Yours': 'Vos donn\u00e9es restent les v\u00f4tres',
  'Everything stays on your device. Nothing is sent to our servers. No tracking, no snooping, no exceptions.':
    'Tout reste sur votre appareil. Rien n\u2019est envoy\u00e9 \u00e0 nos serveurs. Pas de pistage, pas d\u2019espionnage, pas d\u2019exception.',
  'Works in Any Browser': 'Fonctionne dans n\u2019importe quel navigateur',
  'No downloads, no special equipment. If you can open a web page, you can use DEVS.':
    'Pas de t\u00e9l\u00e9chargement, pas d\u2019\u00e9quipement sp\u00e9cial. Si vous pouvez ouvrir une page web, vous pouvez utiliser DEVS.',
  'Free & Open Source': 'Gratuit et open source',
  'The code is public, the community shapes it, and it will always be free. No hidden costs, ever.':
    'Le code est public, la communaut\u00e9 le fa\u00e7onne, et il sera toujours gratuit. Aucun co\u00fbt cach\u00e9, jamais.',

  // Capabilities section
  Capabilities: 'Fonctionnalit\u00e9s',
  'What Makes It Special': 'Ce qui le rend sp\u00e9cial',
  'Serious technology made simple \u2014 so you can focus on your ideas.':
    'Une technologie s\u00e9rieuse rendue simple \u2014 pour que vous puissiez vous concentrer sur vos id\u00e9es.',
  'A Team, Not Just a Chatbot': 'Une \u00e9quipe, pas juste un chatbot',
  'Better Together': 'Meilleurs ensemble',
  'Instead of one AI trying to do everything, multiple specialised helpers team up \u2014 each one great at something different, just like a real team.':
    'Au lieu d\u2019une seule IA qui essaie de tout faire, plusieurs assistants sp\u00e9cialis\u00e9s collaborent \u2014 chacun excellent dans un domaine diff\u00e9rent, comme une vraie \u00e9quipe.',
  'Use Any AI You Like': 'Utilisez l\u2019IA de votre choix',
  'Freedom of Choice': 'Libert\u00e9 de choix',
  'Works with OpenAI, Google, Anthropic, Mistral, and many more. Switch anytime \u2014 your conversations and data stay put.':
    'Compatible avec OpenAI, Google, Anthropic, Mistral et bien d\u2019autres. Changez quand vous voulez \u2014 vos conversations et donn\u00e9es restent intactes.',
  'Bank-Level Security': 'S\u00e9curit\u00e9 de niveau bancaire',
  'Locked Down by Default': 'Verrouill\u00e9 par d\u00e9faut',
  'Your passwords and keys are encrypted right in your browser. Nothing sensitive ever travels over the internet.':
    'Vos mots de passe et cl\u00e9s sont chiffr\u00e9s directement dans votre navigateur. Rien de sensible ne transite par internet.',
  'It Breaks Down the Hard Stuff':
    'Il d\u00e9compose les t\u00e2ches difficiles',
  'Smart Under the Hood': 'Intelligent sous le capot',
  'Describe a big goal and the system figures out what needs to happen, assigns the right helpers, and coordinates everything automatically.':
    'D\u00e9crivez un grand objectif et le syst\u00e8me d\u00e9termine ce qu\u2019il faut faire, assigne les bons assistants et coordonne tout automatiquement.',
  'Works Without Internet': 'Fonctionne sans internet',
  'Always On, Always Yours': 'Toujours actif, toujours \u00e0 vous',
  'Once loaded, it works offline. Optionally sync across your devices without relying on anyone else\u2019s servers.':
    'Une fois charg\u00e9, il fonctionne hors ligne. Synchronisez optionnellement entre vos appareils sans d\u00e9pendre des serveurs de quiconque.',
  'Endlessly Customisable': 'Infiniment personnalisable',
  'Make It Your Own': 'Faites-en le v\u00f4tre',
  'Browse a library of ready-made tools, connectors, and AI helpers \u2014 or let the community build new ones.':
    'Parcourez une biblioth\u00e8que d\u2019outils, de connecteurs et d\u2019assistants IA pr\u00eats \u00e0 l\u2019emploi \u2014 ou laissez la communaut\u00e9 en cr\u00e9er de nouveaux.',

  // How it works section
  'Getting Started': 'Premiers pas',
  'How It Works': 'Comment \u00e7a marche',
  'From idea to finished result in minutes.':
    'De l\u2019id\u00e9e au r\u00e9sultat fini en quelques minutes.',
  'Connect your AI': 'Connectez votre IA',
  'Pick your favourite AI provider \u2014 like OpenAI or Google \u2014 and add your key. Takes about 30 seconds.':
    'Choisissez votre fournisseur d\u2019IA pr\u00e9f\u00e9r\u00e9 \u2014 comme OpenAI ou Google \u2014 et ajoutez votre cl\u00e9. \u00c7a prend environ 30 secondes.',
  'Describe what you need': 'D\u00e9crivez ce dont vous avez besoin',
  'Just type what you want done, in plain language. The bigger the challenge, the more it shines.':
    'Tapez simplement ce que vous voulez, en langage courant. Plus le d\u00e9fi est grand, plus il brille.',
  'Watch the magic happen': 'Regardez la magie op\u00e9rer',
  'Your AI team plans, works, and double-checks in real time. Jump in anytime or sit back and relax.':
    'Votre \u00e9quipe IA planifie, travaille et v\u00e9rifie en temps r\u00e9el. Intervenez \u00e0 tout moment ou d\u00e9tendez-vous.',
  'Get your results': 'Obtenez vos r\u00e9sultats',
  'Receive polished deliverables \u2014 documents, code, analyses \u2014 and fine-tune them with simple feedback.':
    'Recevez des livrables soign\u00e9s \u2014 documents, code, analyses \u2014 et affinez-les avec vos retours.',

  // Use cases section
  'For Everyone': 'Pour tous',
  'Made for Everyone': 'Con\u00e7u pour tout le monde',
  'Whether you\u2019re coding, creating, or strategising \u2014 DEVS adapts to you.':
    'Que vous codiez, cr\u00e9iez ou planifiiez \u2014 DEVS s\u2019adapte \u00e0 vous.',
  Students: '\u00c9tudiants',
  'Research, study plans & homework help':
    'Recherche, plans d\u2019\u00e9tudes et aide aux devoirs',
  Developers: 'D\u00e9veloppeurs',
  'Quick prototypes, code & reviews':
    'Prototypes rapides, code et revues',
  Creators: 'Cr\u00e9ateurs',
  'Ideas, writing & content creation':
    'Id\u00e9es, \u00e9criture et cr\u00e9ation de contenu',
  Researchers: 'Chercheurs',
  'Literature reviews, data & experiments':
    'Revues de litt\u00e9rature, donn\u00e9es et exp\u00e9riences',
  Managers: 'Managers',
  'Project plans, task lists & operations':
    'Plans de projets, listes de t\u00e2ches et op\u00e9rations',
  Entrepreneurs: 'Entrepreneurs',
  'Idea testing, strategy & business plans':
    'Test d\u2019id\u00e9es, strat\u00e9gie et business plans',

  // FAQ section
  FAQ: 'FAQ',
  'Common Questions': 'Questions fr\u00e9quentes',
  'Is my data private?': 'Mes donn\u00e9es sont-elles priv\u00e9es\u00a0?',
  'Yes, 100%. Everything happens in your browser \u2014 we never see, collect, or store any of your data. Your AI keys are encrypted on your device and never sent anywhere.':
    'Oui, \u00e0 100\u00a0%. Tout se passe dans votre navigateur \u2014 nous ne voyons, collectons ni ne stockons jamais vos donn\u00e9es. Vos cl\u00e9s IA sont chiffr\u00e9es sur votre appareil et jamais envoy\u00e9es nulle part.',
  'Which AI providers can I use?':
    'Quels fournisseurs d\u2019IA puis-je utiliser\u00a0?',
  'We work with {providers}, plus any service compatible with the OpenAI format. You can switch at any time without losing anything.':
    'Nous travaillons avec {providers}, plus tout service compatible avec le format OpenAI. Vous pouvez changer \u00e0 tout moment sans rien perdre.',
  'Do I need to install anything?':
    'Dois-je installer quelque chose\u00a0?',
  'Nope. Just open the website and you\u2019re ready to go. You can add it to your home screen for a native app feel, but it\u2019s totally optional.':
    'Non. Ouvrez simplement le site et c\u2019est parti. Vous pouvez l\u2019ajouter \u00e0 votre \u00e9cran d\u2019accueil pour un rendu d\u2019appli native, mais c\u2019est totalement optionnel.',
  'Is this really free?': 'C\u2019est vraiment gratuit\u00a0?',
  'Yes \u2014 {license} licensed, now and forever. All the code is on GitHub. No subscriptions, no premium plans, no paywalls.':
    'Oui \u2014 sous licence {license}, maintenant et pour toujours. Tout le code est sur GitHub. Pas d\u2019abonnement, pas de plan premium, pas de paywall.',
  'Can I use it offline?':
    'Puis-je l\u2019utiliser hors ligne\u00a0?',
  'After your first visit, everything is saved locally so you can keep working without internet. The only thing that needs a connection is talking to your AI provider.':
    'Apr\u00e8s votre premi\u00e8re visite, tout est sauvegard\u00e9 localement pour continuer \u00e0 travailler sans internet. La seule chose qui n\u00e9cessite une connexion, c\u2019est de communiquer avec votre fournisseur d\u2019IA.',
  'How does the AI team work?':
    'Comment fonctionne l\u2019\u00e9quipe IA\u00a0?',
  'When you give it a big task, the system breaks it into smaller pieces, picks the best helper for each part, and coordinates them all at once \u2014 like a well-organised project team.':
    'Quand vous lui confiez une t\u00e2che importante, le syst\u00e8me la d\u00e9coupe en morceaux, choisit le meilleur assistant pour chaque partie et les coordonne tous en m\u00eame temps \u2014 comme une \u00e9quipe projet bien organis\u00e9e.',

  // CTA section
  'Join the Movement': 'Rejoignez le mouvement',
  '{product} is made by people who believe AI should empower everyone, not just the privileged few. Whether you contribute code, ideas, or feedback \u2014 you\u2019re helping make AI accessible to the world.':
    '{product} est cr\u00e9\u00e9 par des gens qui croient que l\u2019IA devrait donner du pouvoir \u00e0 tous, pas seulement aux privil\u00e9gi\u00e9s. Que vous contribuiez du code, des id\u00e9es ou des retours \u2014 vous aidez \u00e0 rendre l\u2019IA accessible au monde.',
  'View on GitHub': 'Voir sur GitHub',
  'Open an Issue': 'Ouvrir une issue',
  'Made with care for humans everywhere.':
    'Fait avec soin pour les humains du monde entier.',
}
