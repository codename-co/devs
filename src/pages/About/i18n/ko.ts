import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const ko: I18n = {
  // Hero
  'Your AI Team, Ready When You Are':
    '\uB2F9\uC2E0\uC758 AI \uD300, \uC900\uBE44 \uC644\uB8CC',
  '{product} gives you a team of AI helpers that work together \u2014 right in your browser. Just describe what you need, and they\u2019ll plan it, do it, and deliver it \u2014':
    '{product}\uC740 \uD568\uAED8 \uC77C\uD558\uB294 AI \uB3C4\uC6B0\uBBF8 \uD300\uC744 \uC81C\uACF5\uD569\uB2C8\uB2E4 \u2014 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uBC14\uB85C. \uD544\uC694\uD55C \uAC83\uC744 \uC124\uBA85\uD558\uBA74, \uACC4\uD68D\uD558\uACE0, \uC2E4\uD589\uD558\uACE0, \uC804\uB2EC\uD569\uB2C8\uB2E4 \u2014',
  'without your data ever leaving your device':
    '\uB370\uC774\uD130\uAC00 \uAE30\uAE30\uB97C \uB5A0\uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4',
  'Watch the 30-second tour': '30\uCD08 \uD22C\uC5B4 \uBCF4\uAE30',

  // See it in action section
  'See it in action': '\uC2E4\uC81C\uB85C \uBCF4\uAE30',
  'A guided tour, in 30-second clips': '30\uCD08 \uD074\uB9BD\uC73C\uB85C \uB5A0\uB098\uB294 \uAC00\uC774\uB4DC \uD22C\uC5B4',
  'Product Tour': '\uC81C\uD488 \uD22C\uC5B4',
  'The full DEVS story in 30 seconds': '30\uCD08 \uC548\uC5D0 \uBCF4\uB294 DEVS\uC758 \uBAA8\uB4E0 \uAC83',
  'Task Delegation': '\uC791\uC5C5 \uC704\uC784',
  'Delegate, don\u2019t chat': '\uB300\uD654\uD558\uC9C0 \uB9D0\uACE0 \uC704\uC784\uD558\uC138\uC694',
  'Agent Studio': '\uC5D0\uC774\uC804\uD2B8 \uC2A4\uD29C\uB514\uC624',
  'Build your own AI team': '\uB098\uB9CC\uC758 AI \uD300\uC744 \uB9CC\uB4DC\uC138\uC694',
  'Privacy First': '\uD504\uB77C\uC774\uBC84\uC2DC \uC6B0\uC120',
  'Your keys. Your data. Your browser.':
    '\uB2F9\uC2E0\uC758 \uD0A4. \uB2F9\uC2E0\uC758 \uB370\uC774\uD130. \uB2F9\uC2E0\uC758 \uBE0C\uB77C\uC6B0\uC800.',
  'Inbox Workflow': '\uBC1B\uC740\uD3B8\uC9C0\uD568 \uC6CC\uD06C\uD50C\uB85C',
  'Your AI tasks': '\uB2F9\uC2E0\uC758 AI \uC791\uC5C5',
  'Open full-screen': '\uC804\uCCB4 \uD654\uBA74\uC73C\uB85C \uC5F4\uAE30',
  '\u201CAI shouldn\u2019t be a privilege for tech experts. It should be a superpower anyone can use \u2014 like having a brilliant team on call, ready to tackle anything you throw at them.\u201D':
    '\u201CAI\uB294 \uAE30\uC220 \uC804\uBB38\uAC00\uC758 \uD2B9\uAD8C\uC774 \uC544\uB2C8\uB77C \uB204\uAD6C\uB098 \uC4F8 \uC218 \uC788\uB294 \uCD08\uB2A5\uB825\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4 \u2014 \uC5B8\uC81C\uB4E0 \uBD80\uB97C \uC218 \uC788\uB294 \uBB34\uC801\uC758 \uD300\uCC98\uB7FC.\u201D',

  // Principles section
  Philosophy: '\uCCA0\uD559',
  'What We Stand For': '\uC6B0\uB9AC\uAC00 \uC9C0\uD0A4\uB294 \uAC83',
  'Three promises we\u2019ll never break.':
    '\uC808\uB300 \uAE68\uC9C0 \uC54A\uC744 \uC138 \uAC00\uC9C0 \uC57D\uC18D.',
  'Your Data Stays Yours': '\uB370\uC774\uD130\uB294 \uB2F9\uC2E0\uC758 \uAC83',
  'Everything stays on your device. Nothing is sent to our servers. No tracking, no snooping, no exceptions.':
    '\uBAA8\uB4E0 \uAC83\uC774 \uAE30\uAE30\uC5D0 \uBA38\uBB3D\uB2C8\uB2E4. \uC11C\uBC84\uB85C \uC804\uC1A1\uB418\uB294 \uAC83\uC740 \uC5C6\uC2B5\uB2C8\uB2E4. \uCD94\uC801 \uC5C6\uC74C, \uC5FF\uBCF4\uAE30 \uC5C6\uC74C, \uC608\uC678 \uC5C6\uC74C.',
  'Works in Any Browser': '\uBAA8\uB4E0 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC791\uB3D9',
  'No downloads, no special equipment. If you can open a web page, you can use DEVS.':
    '\uB2E4\uC6B4\uB85C\uB4DC \uBD88\uD544\uC694, \uD2B9\uC218 \uC7A5\uBE44 \uBD88\uD544\uC694. \uC6F9 \uD398\uC774\uC9C0\uB97C \uC5F4 \uC218 \uC788\uB2E4\uBA74 DEVS\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  'Free & Open Source': '\uBB34\uB8CC & \uC624\uD508 \uC18C\uC2A4',
  'The code is public, the community shapes it, and it will always be free. No hidden costs, ever.':
    '\uCF54\uB4DC\uB294 \uACF5\uAC1C\uB418\uC5B4 \uC788\uACE0, \uCEE4\uBBA4\uB2C8\uD2F0\uAC00 \uD615\uC131\uD558\uBA70, \uC601\uC6D0\uD788 \uBB34\uB8CC\uC785\uB2C8\uB2E4. \uC228\uACA8\uC9C4 \uBE44\uC6A9 \uC5C6\uC74C.',

  // Capabilities section
  Capabilities: '\uAE30\uB2A5',
  'What Makes It Special': '\uBB34\uC5C7\uC774 \uD2B9\uBCC4\uD55C\uAC00',
  'Serious technology made simple \u2014 so you can focus on your ideas.':
    '\uC9C4\uC9C0\uD55C \uAE30\uC220\uC744 \uAC04\uB2E8\uD558\uAC8C \u2014 \uC544\uC774\uB514\uC5B4\uC5D0 \uC9D1\uC911\uD560 \uC218 \uC788\uB3C4\uB85D.',
  'A Team, Not Just a Chatbot': '\uCC57\uBD07\uC774 \uC544\uB2CC \uD300',
  'Better Together': '\uD568\uAED8\uD558\uBA74 \uB354 \uC88B\uC740',
  'Instead of one AI trying to do everything, multiple specialised helpers team up \u2014 each one great at something different, just like a real team.':
    '\uD558\uB098\uC758 AI\uAC00 \uBAA8\uB4E0 \uAC83\uC744 \uD558\uB824\uB294 \uB300\uC2E0, \uC5EC\uB7EC \uC804\uBB38 \uB3C4\uC6B0\uBBF8\uAC00 \uD300\uC744 \uC774\uB8F9\uB2C8\uB2E4 \u2014 \uAC01\uAC01 \uB2E4\uB978 \uBD84\uC57C\uC5D0\uC11C \uB6F0\uC5B4\uB098\uACE0, \uC9C4\uC9DC \uD300\uCC98\uB7FC.',
  'Use Any AI You Like': '\uC6D0\uD558\uB294 AI\uB97C \uC0AC\uC6A9\uD558\uC138\uC694',
  'Freedom of Choice': '\uC120\uD0DD\uC758 \uC790\uC720',
  'Works with OpenAI, Google, Anthropic, Mistral, and many more. Switch anytime \u2014 your conversations and data stay put.':
    'OpenAI, Google, Anthropic, Mistral \uB4F1 \uB2E4\uC591\uD55C \uC11C\uBE44\uC2A4\uC640 \uD638\uD658. \uC5B8\uC81C\uB4E0 \uC804\uD658 \uAC00\uB2A5 \u2014 \uB300\uD654\uC640 \uB370\uC774\uD130\uB294 \uADF8\uB300\uB85C.',
  'Bank-Level Security': '\uC740\uD589 \uC218\uC900\uC758 \uBCF4\uC548',
  'Locked Down by Default': '\uAE30\uBCF8\uC801\uC73C\uB85C \uC7A0\uAE40',
  'Your passwords and keys are encrypted right in your browser. Nothing sensitive ever travels over the internet.':
    '\uBE44\uBC00\uBC88\uD638\uC640 \uD0A4\uAC00 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uBC14\uB85C \uC554\uD638\uD654\uB429\uB2C8\uB2E4. \uBBFC\uAC10\uD55C \uC815\uBCF4\uB294 \uC808\uB300 \uC778\uD130\uB137\uC744 \uD1B5\uD574 \uC804\uC1A1\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  'It Breaks Down the Hard Stuff': '\uC5B4\uB824\uC6B4 \uAC83\uC744 \uBD84\uD574\uD569\uB2C8\uB2E4',
  'Smart Under the Hood': '\uB0B4\uBD80\uC5D0\uC11C \uB611\uB625\uD558\uAC8C',
  'Describe a big goal and the system figures out what needs to happen, assigns the right helpers, and coordinates everything automatically.':
    '\uD070 \uBAA9\uD45C\uB97C \uC124\uBA85\uD558\uBA74 \uC2DC\uC2A4\uD15C\uC774 \uBB34\uC5C7\uC744 \uD574\uC57C \uD558\uB294\uC9C0 \uD30C\uC545\uD558\uACE0, \uC801\uD569\uD55C \uB3C4\uC6B0\uBBF8\uB97C \uBC30\uC815\uD558\uACE0, \uBAA8\uB4E0 \uAC83\uC744 \uC790\uB3D9\uC73C\uB85C \uC870\uC728\uD569\uB2C8\uB2E4.',
  'Works Without Internet': '\uC778\uD130\uB137 \uC5C6\uC774 \uC791\uB3D9',
  'Always On, Always Yours': '\uD56D\uC0C1 \uCF1C\uC838 \uC788\uACE0, \uD56D\uC0C1 \uB2F9\uC2E0\uC758 \uAC83',
  'Once loaded, it works offline. Optionally sync across your devices without relying on anyone else\u2019s servers.':
    '\uD55C\uBC88 \uB85C\uB4DC\uD558\uBA74 \uC624\uD504\uB77C\uC778\uC73C\uB85C \uC791\uB3D9\uD569\uB2C8\uB2E4. \uB2E4\uB978 \uC0AC\uB78C\uC758 \uC11C\uBC84\uC5D0 \uC758\uC874\uD558\uC9C0 \uC54A\uACE0 \uAE30\uAE30 \uAC04 \uC120\uD0DD\uC801 \uB3D9\uAE30\uD654.',
  'Endlessly Customisable': '\uBB34\uD55C\uD788 \uCEE4\uC2A4\uD130\uB9C8\uC774\uC988 \uAC00\uB2A5',
  'Make It Your Own': '\uB098\uB9CC\uC758 \uAC83\uC73C\uB85C',
  'Browse a library of ready-made tools, connectors, and AI helpers \u2014 or let the community build new ones.':
    '\uAE30\uC131\uD488 \uB3C4\uAD6C, \uCEE4\uB125\uD130, AI \uB3C4\uC6B0\uBBF8 \uB77C\uC774\uBE0C\uB7EC\uB9AC\uB97C \uD0D0\uC0C9\uD558\uAC70\uB098 \uCEE4\uBBA4\uB2C8\uD2F0\uAC00 \uC0C8\uB85C\uC6B4 \uAC83\uC744 \uB9CC\uB4E4\uAC8C \uD558\uC138\uC694.',

  // How it works section
  'Getting Started': '\uC2DC\uC791\uD558\uAE30',
  'How It Works': '\uC0AC\uC6A9 \uBC29\uBC95',
  'From idea to finished result in minutes.':
    '\uC544\uC774\uB514\uC5B4\uC5D0\uC11C \uC644\uC131\uB41C \uACB0\uACFC\uBB3C\uAE4C\uC9C0 \uBA87 \uBD84 \uB9CC\uC5D0.',
  'Connect your AI': 'AI \uC5F0\uACB0\uD558\uAE30',
  'Pick your favourite AI provider \u2014 like OpenAI or Google \u2014 and add your key. Takes about 30 seconds.':
    '\uC120\uD638\uD558\uB294 AI \uACF5\uAE09\uC790 \u2014 OpenAI\uB098 Google \uAC19\uC740 \u2014 \uB97C \uC120\uD0DD\uD558\uACE0 \uD0A4\uB97C \uCD94\uAC00\uD558\uC138\uC694. \uC57D 30\uCD08 \uAC78\uB9BD\uB2C8\uB2E4.',
  'Describe what you need': '\uD544\uC694\uD55C \uAC83\uC744 \uC124\uBA85\uD558\uC138\uC694',
  'Just type what you want done, in plain language. The bigger the challenge, the more it shines.':
    '\uC6D0\uD558\uB294 \uAC83\uC744 \uC77C\uBC18 \uC5B8\uC5B4\uB85C \uC785\uB825\uD558\uC138\uC694. \uB3C4\uC804\uC774 \uD074\uC218\uB85D \uB354 \uBE5B\uB0A9\uB2C8\uB2E4.',
  'Watch the magic happen': '\uB9C8\uBC95\uC774 \uC77C\uC5B4\uB098\uB294 \uAC78 \uBCF4\uC138\uC694',
  'Your AI team plans, works, and double-checks in real time. Jump in anytime or sit back and relax.':
    'AI \uD300\uC774 \uC2E4\uC2DC\uAC04\uC73C\uB85C \uACC4\uD68D\uD558\uACE0, \uC791\uC5C5\uD558\uACE0, \uC7AC\uD655\uC778\uD569\uB2C8\uB2E4. \uC5B8\uC81C\uB4E0 \uCC38\uC5EC\uD558\uAC70\uB098 \uD3B8\uD558\uAC8C \uC9C0\uCF1C\uBCF4\uC138\uC694.',
  'Get your results': '\uACB0\uACFC\uBB3C \uBC1B\uAE30',
  'Receive polished deliverables \u2014 documents, code, analyses \u2014 and fine-tune them with simple feedback.':
    '\uC644\uC131\uB41C \uACB0\uACFC\uBB3C \u2014 \uBB38\uC11C, \uCF54\uB4DC, \uBD84\uC11D \u2014 \uC744 \uBC1B\uACE0 \uAC04\uB2E8\uD55C \uD53C\uB4DC\uBC31\uC73C\uB85C \uB2E4\uB4EC\uC73C\uC138\uC694.',

  // Use cases section
  'For Everyone': '\uBAA8\uB450\uB97C \uC704\uD574',
  'Made for Everyone': '\uBAA8\uB450\uB97C \uC704\uD574 \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4',
  'Whether you\u2019re coding, creating, or strategising \u2014 DEVS adapts to you.':
    '\uCF54\uB529\uD558\uB4E0, \uCC3D\uC791\uD558\uB4E0, \uC804\uB7B5\uC744 \uC138\uC6B0\uB4E0 \u2014 DEVS\uAC00 \uB2F9\uC2E0\uC5D0\uAC8C \uB9DE\uCDA5\uB2C8\uB2E4.',
  Students: '\uD559\uC0DD',
  'Research, study plans & homework help': '\uC5F0\uAD6C, \uD559\uC2B5 \uACC4\uD68D \uBC0F \uC219\uC81C \uB3C4\uC6C0',
  Developers: '\uAC1C\uBC1C\uC790',
  'Quick prototypes, code & reviews':
    '\uBE60\uB978 \uD504\uB85C\uD1A0\uD0C0\uC785, \uCF54\uB4DC \uBC0F \uB9AC\uBDF0',
  Creators: '\uD06C\uB9AC\uC5D0\uC774\uD130',
  'Ideas, writing & content creation':
    '\uC544\uC774\uB514\uC5B4, \uAE00\uC4F0\uAE30 \uBC0F \uCF58\uD150\uCE20 \uC81C\uC791',
  Researchers: '\uC5F0\uAD6C\uC790',
  'Literature reviews, data & experiments':
    '\uBB38\uD5CC \uAC80\uD1A0, \uB370\uC774\uD130 \uBC0F \uC2E4\uD5D8',
  Managers: '\uAD00\uB9AC\uC790',
  'Project plans, task lists & operations':
    '\uD504\uB85C\uC81D\uD2B8 \uACC4\uD68D, \uC791\uC5C5 \uBAA9\uB85D \uBC0F \uC6B4\uC601',
  Entrepreneurs: '\uAE30\uC5C5\uAC00',
  'Idea testing, strategy & business plans':
    '\uC544\uC774\uB514\uC5B4 \uAC80\uC99D, \uC804\uB7B5 \uBC0F \uC0AC\uC5C5 \uACC4\uD68D',

  // FAQ section
  FAQ: 'FAQ',
  'Common Questions': '\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38',
  'Is my data private?': '\uB0B4 \uB370\uC774\uD130\uB294 \uBE44\uACF5\uAC1C\uC778\uAC00\uC694?',
  'Yes, 100%. Everything happens in your browser \u2014 we never see, collect, or store any of your data. Your AI keys are encrypted on your device and never sent anywhere.':
    '\uB124, 100%. \uBAA8\uB4E0 \uAC83\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC77C\uC5B4\uB0A9\uB2C8\uB2E4 \u2014 \uB370\uC774\uD130\uB97C \uBCF4\uAC70\uB098, \uC218\uC9D1\uD558\uAC70\uB098, \uC800\uC7A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. AI \uD0A4\uB294 \uAE30\uAE30\uC5D0\uC11C \uC554\uD638\uD654\uB418\uBA70 \uC5B4\uB514\uB85C\uB3C4 \uC804\uC1A1\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  'Which AI providers can I use?': '\uC5B4\uB5A4 AI \uACF5\uAE09\uC790\uB97C \uC0AC\uC6A9\uD560 \uC218 \uC788\uB098\uC694?',
  'We work with {providers}, plus any service compatible with the OpenAI format. You can switch at any time without losing anything.':
    '{providers}\uC640 \uD568\uAED8 \uC791\uB3D9\uD558\uBA70, OpenAI \uD615\uC2DD\uACFC \uD638\uD658\uB418\uB294 \uBAA8\uB4E0 \uC11C\uBE44\uC2A4\uB97C \uC9C0\uC6D0\uD569\uB2C8\uB2E4. \uC5B8\uC81C\uB4E0 \uC804\uD658 \uAC00\uB2A5\uD558\uBA70 \uC544\uBB34\uAC83\uB3C4 \uC783\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  'Do I need to install anything?': '\uC124\uCE58\uD574\uC57C \uD558\uB294 \uAC83\uC774 \uC788\uB098\uC694?',
  'Nope. Just open the website and you\u2019re ready to go. You can add it to your home screen for a native app feel, but it\u2019s totally optional.':
    '\uC544\uB2C8\uC694. \uC6F9\uC0AC\uC774\uD2B8\uB97C \uC5F4\uBA74 \uBC14\uB85C \uC2DC\uC791\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uB124\uC774\uD2F0\uBE0C \uC571 \uB290\uB08C\uC744 \uC704\uD574 \uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00\uD560 \uC218 \uC788\uC9C0\uB9CC \uC644\uC804\uD788 \uC120\uD0DD \uC0AC\uD56D\uC785\uB2C8\uB2E4.',
  'Is this really free?': '\uC815\uB9D0 \uBB34\uB8CC\uC778\uAC00\uC694?',
  'Yes \u2014 {license} licensed, now and forever. All the code is on GitHub. No subscriptions, no premium plans, no paywalls.':
    '\uB124 \u2014 {license} \uB77C\uC774\uC120\uC2A4\uC774\uBA70 \uC601\uC6D0\uD788 \uADF8\uB7F4 \uAC83\uC785\uB2C8\uB2E4. \uBAA8\uB4E0 \uCF54\uB4DC\uB294 GitHub\uC5D0 \uC788\uC2B5\uB2C8\uB2E4. \uAD6C\uB3C5\uB8CC \uC5C6\uC74C, \uD504\uB9AC\uBBF8\uC5C4 \uD50C\uB79C \uC5C6\uC74C, \uC720\uB8CC \uC7A5\uBCBD \uC5C6\uC74C.',
  'Can I use it offline?': '\uC624\uD504\uB77C\uC778\uC73C\uB85C \uC0AC\uC6A9\uD560 \uC218 \uC788\uB098\uC694?',
  'After your first visit, everything is saved locally so you can keep working without internet. The only thing that needs a connection is talking to your AI provider.':
    '\uCCAB \uBC29\uBB38 \uD6C4 \uBAA8\uB4E0 \uAC83\uC774 \uB85C\uCEEC\uC5D0 \uC800\uC7A5\uB418\uC5B4 \uC778\uD130\uB137 \uC5C6\uC774\uB3C4 \uACC4\uC18D \uC791\uC5C5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC5F0\uACB0\uC774 \uD544\uC694\uD55C \uAC83\uC740 AI \uACF5\uAE09\uC790\uC640\uC758 \uD1B5\uC2E0\uBFD0\uC785\uB2C8\uB2E4.',
  'How does the AI team work?': 'AI \uD300\uC740 \uC5B4\uB5BB\uAC8C \uC791\uB3D9\uD558\uB098\uC694?',
  'When you give it a big task, the system breaks it into smaller pieces, picks the best helper for each part, and coordinates them all at once \u2014 like a well-organised project team.':
    '\uD070 \uC791\uC5C5\uC744 \uC8FC\uBA74 \uC2DC\uC2A4\uD15C\uC774 \uC791\uC740 \uC870\uAC01\uC73C\uB85C \uB098\uB204\uACE0, \uAC01 \uBD80\uBD84\uC5D0 \uAC00\uC7A5 \uC801\uD569\uD55C \uB3C4\uC6B0\uBBF8\uB97C \uC120\uD0DD\uD558\uACE0, \uBAA8\uB450 \uB3D9\uC2DC\uC5D0 \uC870\uC728\uD569\uB2C8\uB2E4 \u2014 \uC798 \uC870\uC9C1\uB41C \uD504\uB85C\uC81D\uD2B8 \uD300\uCC98\uB7FC.',

  // CTA section
  'Join the Movement': '\uC6B4\uB3D9\uC5D0 \uD568\uAED8\uD558\uC138\uC694',
  '{product} is made by people who believe AI should empower everyone, not just the privileged few. Whether you contribute code, ideas, or feedback \u2014 you\u2019re helping make AI accessible to the world.':
    '{product}\uC740 AI\uAC00 \uC18C\uC218\uC758 \uD2B9\uAD8C\uC774 \uC544\uB2CC \uBAA8\uB4E0 \uC0AC\uB78C\uC5D0\uAC8C \uD798\uC744 \uC8FC\uC5B4\uC57C \uD55C\uB2E4\uACE0 \uBBF8\uB294 \uC0AC\uB78C\uB4E4\uC774 \uB9CC\uB4ED\uB2C8\uB2E4. \uCF54\uB4DC, \uC544\uC774\uB514\uC5B4, \uD53C\uB4DC\uBC31 \uBB34\uC5C7\uC774\uB4E0 \u2014 \uC138\uACC4\uC5D0 AI\uB97C \uC811\uADFC \uAC00\uB2A5\uD558\uAC8C \uB9CC\uB4DC\uB294 \uB370 \uB3D5\uACE0 \uC788\uC2B5\uB2C8\uB2E4.',
  'View on GitHub': 'GitHub\uC5D0\uC11C \uBCF4\uAE30',
  'Open an Issue': 'Issue \uC5F4\uAE30',
  'Made with care for humans everywhere.':
    '\uC804 \uC138\uACC4 \uBAA8\uB4E0 \uC0AC\uB78C\uC744 \uC704\uD574 \uC815\uC131\uAEF7 \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4.',
}
