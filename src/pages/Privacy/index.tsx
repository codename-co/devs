import { Container, Section } from '@/components'
import { useI18n } from '@/i18n'
import Layout from '@/layouts/Default'

export const PrivacyPage = () => {
  const { t, lang } = useI18n(localI18n)

  const lastUpdated = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date('2026-02-08'))

  return (
    <Layout
      header={{
        icon: {
          name: 'Lock',
          color: 'text-default-300 dark:text-default-400',
        },
        color: 'bg-default-50',
        title: t('Privacy Policy'),
        subtitle: t('How we handle your data'),
      }}
    >
      <Section>
        <Container className="markdown-content prose dark:prose-invert max-w-3xl">
          <h2>{t('Your Privacy Matters')}</h2>
          <p>
            <strong>{t(`Last updated: {date}`, { date: lastUpdated })}</strong>
          </p>
          <p>
            <mark>
              {t(
                'DEVS is designed with privacy as a core principle. All your data stays on your device.',
              )}
            </mark>
          </p>

          <h3>{t('Data Collection')}</h3>
          <p>
            <strong>{t('We do not collect any personal data.')}</strong>{' '}
            {t('DEVS runs entirely in your browser:')}
          </p>
          <ul>
            <li>{t('No user accounts required')}</li>
            <li>{t('No analytics or tracking')}</li>
            <li>{t('No cookies for advertising')}</li>
            <li>{t('No data sent to our servers')}</li>
          </ul>

          <h3>{t('Local Storage')}</h3>
          <p>
            {t(
              'All data is stored locally on your device using browser technologies:',
            )}
          </p>
          <ul>
            <li>
              <strong>Yjs / IndexedDB</strong> -{' '}
              {t(
                'For all application data: conversations, agents, knowledge base, tasks, and memories',
              )}
            </li>
            <li>
              <strong>IndexedDB</strong> -{' '}
              {t(
                'For encryption keys (non-extractable CryptoKey objects) and file system handles',
              )}
            </li>
            <li>
              <strong>LocalStorage</strong> -{' '}
              {t('For user preferences, settings, and encryption metadata')}
            </li>
          </ul>

          <h3>{t('Encryption & Data Security')}</h3>
          <p>
            {t(
              'DEVS encrypts your sensitive data at rest using industry-standard encryption:',
            )}
          </p>
          <ul>
            <li>
              {t(
                'API keys and OAuth tokens are encrypted with AES-GCM 256-bit using non-extractable keys that cannot be read or exported by JavaScript',
              )}
            </li>
            <li>
              {t(
                'Sensitive content (conversations, knowledge base, agent memories) is encrypted at the field level before storage',
              )}
            </li>
            <li>
              {t(
                'All encryption uses the browser-native Web Crypto API — no third-party cryptographic libraries',
              )}
            </li>
            <li>
              {t(
                'Encryption keys are device-bound and cannot be recovered if lost — back up your data regularly',
              )}
            </li>
          </ul>

          <h3>{t('External Connectors')}</h3>
          <p>
            {t(
              'When you connect external services (Gmail, Google Drive, Calendar, Notion, etc.):',
            )}
          </p>
          <ul>
            <li>
              {t(
                'Authentication uses OAuth 2.0 with PKCE — DEVS never sees or stores your passwords',
              )}
            </li>
            <li>
              {t(
                'Access and refresh tokens are encrypted at rest with AES-GCM-256',
              )}
            </li>
            <li>
              {t(
                'Tokens are decrypted in-memory only for the duration of each API call, then discarded',
              )}
            </li>
            <li>
              {t(
                'DEVS requests minimum necessary permissions (read-only where possible)',
              )}
            </li>
            <li>
              {t(
                'You can disconnect any connector and revoke access at any time',
              )}
            </li>
            <li>
              {t(
                'Imported content (emails, files, events) is encrypted at rest on your device',
              )}
            </li>
          </ul>

          <h3>{t('Third-Party Services')}</h3>
          <p>
            {t(
              'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.',
            )}
          </p>

          <h3>{t('P2P Sync (Optional)')}</h3>
          <p>
            {t(
              'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:',
            )}
          </p>
          <ul>
            <li>{t('Sync is opt-in and disabled by default')}</li>
            <li>
              {t(
                'All sync data is encrypted per-message with AES-GCM-256 using a key derived from your room password (PBKDF2 with 210,000 iterations)',
              )}
            </li>
            <li>
              {t(
                'A signaling server (wss://signal.devs.new) is used only for WebSocket connection relay',
              )}
            </li>
            <li>
              {t(
                'The signaling server sees only: derived room identifiers (opaque hashes) and encrypted binary payloads',
              )}
            </li>
            <li>{t('The signaling server is stateless and stores no data')}</li>
            <li>
              {t(
                'Your actual data is end-to-end encrypted and never visible to the server',
              )}
            </li>
            <li>
              {t(
                'You can self-host your own signaling server for maximum privacy',
              )}
            </li>
          </ul>

          <h3>{t('Observability (Optional)')}</h3>
          <p>
            {t('DEVS supports optional LLM observability integration:')}
          </p>
          <ul>
            <li>
              {t(
                'Disabled by default — you must explicitly configure it in Settings',
              )}
            </li>
            <li>
              {t(
                'When enabled, LLM prompts and responses are sent to your configured Langfuse instance',
              )}
            </li>
            <li>
              {t(
                'No observability data is sent to our servers — traces go to your own endpoint',
              )}
            </li>
          </ul>

          <h3>{t('Your Control')}</h3>
          <p>{t('You can:')}</p>
          <ul>
            <li>
              {t('Export all your data at any time:')}{' '}
              <a href="/admin/database">{t('Database Administration')}</a>
            </li>
            <li>{t('Delete all data by clearing browser storage')}</li>
            <li>{t('Use the app completely offline after initial load')}</li>
          </ul>

          <h3>{t('Contact')}</h3>
          <p>
            {t('For privacy questions, open an issue on our')}{' '}
            <a href="https://github.com/codename-co/devs">
              {t('GitHub repository')}
            </a>
            .
          </p>
        </Container>
      </Section>
    </Layout>
  )
}

const localI18n = {
  en: [
    'Privacy Policy',
    'How we handle your data',
    'Your Privacy Matters',
    'Last updated: {date}',
    'DEVS is designed with privacy as a core principle. All your data stays on your device.',
    'Data Collection',
    'We do not collect any personal data.',
    'DEVS runs entirely in your browser:',
    'No user accounts required',
    'No analytics or tracking',
    'No cookies for advertising',
    'No data sent to our servers',
    'Local Storage',
    'All data is stored locally on your device using browser technologies:',
    'For all application data: conversations, agents, knowledge base, tasks, and memories',
    'For encryption keys (non-extractable CryptoKey objects) and file system handles',
    'For user preferences, settings, and encryption metadata',
    'Encryption & Data Security',
    'DEVS encrypts your sensitive data at rest using industry-standard encryption:',
    'API keys and OAuth tokens are encrypted with AES-GCM 256-bit using non-extractable keys that cannot be read or exported by JavaScript',
    'Sensitive content (conversations, knowledge base, agent memories) is encrypted at the field level before storage',
    'All encryption uses the browser-native Web Crypto API — no third-party cryptographic libraries',
    'Encryption keys are device-bound and cannot be recovered if lost — back up your data regularly',
    'External Connectors',
    'When you connect external services (Gmail, Google Drive, Calendar, Notion, etc.):',
    'Authentication uses OAuth 2.0 with PKCE — DEVS never sees or stores your passwords',
    'Access and refresh tokens are encrypted at rest with AES-GCM-256',
    'Tokens are decrypted in-memory only for the duration of each API call, then discarded',
    'DEVS requests minimum necessary permissions (read-only where possible)',
    'You can disconnect any connector and revoke access at any time',
    'Imported content (emails, files, events) is encrypted at rest on your device',
    'Third-Party Services',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.',
    'P2P Sync (Optional)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:',
    'Sync is opt-in and disabled by default',
    'All sync data is encrypted per-message with AES-GCM-256 using a key derived from your room password (PBKDF2 with 210,000 iterations)',
    'A signaling server (wss://signal.devs.new) is used only for WebSocket connection relay',
    'The signaling server sees only: derived room identifiers (opaque hashes) and encrypted binary payloads',
    'The signaling server is stateless and stores no data',
    'Your actual data is end-to-end encrypted and never visible to the server',
    'You can self-host your own signaling server for maximum privacy',
    'Observability (Optional)',
    'DEVS supports optional LLM observability integration:',
    'Disabled by default — you must explicitly configure it in Settings',
    'When enabled, LLM prompts and responses are sent to your configured Langfuse instance',
    'No observability data is sent to our servers — traces go to your own endpoint',
    'Your Control',
    'You can:',
    'Export all your data at any time:',
    'Database Administration',
    'Delete all data by clearing browser storage',
    'Use the app completely offline after initial load',
    'Contact',
    'For privacy questions, open an issue on our',
    'GitHub repository',
  ] as const,
  ar: {
    'Privacy Policy': 'سياسة الخصوصية',
    'How we handle your data': 'كيف نتعامل مع بياناتك',
    'Your Privacy Matters': 'خصوصيتك مهمة',
    'Last updated: {date}': 'آخر تحديث: {date}',
    'DEVS is designed with privacy as a core principle. All your data stays on your device.':
      'تم تصميم DEVS مع الخصوصية كمبدأ أساسي. جميع بياناتك تبقى على جهازك.',
    'Data Collection': 'جمع البيانات',
    'We do not collect any personal data.': 'لا نقوم بجمع أي بيانات شخصية.',
    'DEVS runs entirely in your browser:': 'يعمل DEVS بالكامل في متصفحك:',
    'No user accounts required': 'لا حاجة لحسابات المستخدمين',
    'No analytics or tracking': 'لا يوجد تحليلات أو تتبع',
    'No cookies for advertising': 'لا توجد ملفات تعريف ارتباط للإعلانات',
    'No data sent to our servers': 'لا يتم إرسال أي بيانات إلى خوادمنا',
    'Local Storage': 'التخزين المحلي',
    'All data is stored locally on your device using browser technologies:':
      'يتم تخزين جميع البيانات محليًا على جهازك باستخدام تقنيات المتصفح:',
    'For all application data: conversations, agents, knowledge base, tasks, and memories':
      'لجميع بيانات التطبيق: المحادثات، الوكلاء، قاعدة المعرفة، المهام، والذكريات',
    'For encryption keys (non-extractable CryptoKey objects) and file system handles':
      'لمفاتيح التشفير (كائنات CryptoKey غير القابلة للاستخراج) ومقابض نظام الملفات',
    'For user preferences, settings, and encryption metadata':
      'لتفضيلات المستخدم والإعدادات وبيانات التشفير الوصفية',
    'Encryption & Data Security': 'التشفير وأمان البيانات',
    'DEVS encrypts your sensitive data at rest using industry-standard encryption:':
      'يقوم DEVS بتشفير بياناتك الحساسة أثناء التخزين باستخدام تشفير متوافق مع معايير الصناعة:',
    'API keys and OAuth tokens are encrypted with AES-GCM 256-bit using non-extractable keys that cannot be read or exported by JavaScript':
      'يتم تشفير مفاتيح API ورموز OAuth باستخدام AES-GCM 256-bit بمفاتيح غير قابلة للاستخراج لا يمكن قراءتها أو تصديرها بواسطة JavaScript',
    'Sensitive content (conversations, knowledge base, agent memories) is encrypted at the field level before storage':
      'يتم تشفير المحتوى الحساس (المحادثات، قاعدة المعرفة، ذكريات الوكلاء) على مستوى الحقل قبل التخزين',
    'All encryption uses the browser-native Web Crypto API — no third-party cryptographic libraries':
      'يستخدم كل التشفير Web Crypto API المدمج في المتصفح — بدون مكتبات تشفير خارجية',
    'Encryption keys are device-bound and cannot be recovered if lost — back up your data regularly':
      'مفاتيح التشفير مرتبطة بالجهاز ولا يمكن استردادها في حال فقدانها — قم بنسخ بياناتك احتياطيًا بانتظام',
    'External Connectors': 'الموصلات الخارجية',
    'When you connect external services (Gmail, Google Drive, Calendar, Notion, etc.):':
      'عند ربط خدمات خارجية (Gmail، Google Drive، Calendar، Notion، إلخ):',
    'Authentication uses OAuth 2.0 with PKCE — DEVS never sees or stores your passwords':
      'تستخدم المصادقة OAuth 2.0 مع PKCE — لا يرى DEVS كلمات مرورك ولا يخزنها أبدًا',
    'Access and refresh tokens are encrypted at rest with AES-GCM-256':
      'يتم تشفير رموز الوصول والتحديث أثناء التخزين باستخدام AES-GCM-256',
    'Tokens are decrypted in-memory only for the duration of each API call, then discarded':
      'يتم فك تشفير الرموز في الذاكرة فقط طوال مدة كل استدعاء API، ثم يتم التخلص منها',
    'DEVS requests minimum necessary permissions (read-only where possible)':
      'يطلب DEVS الحد الأدنى من الصلاحيات اللازمة (للقراءة فقط حيثما أمكن)',
    'You can disconnect any connector and revoke access at any time':
      'يمكنك فصل أي موصل وإلغاء الوصول في أي وقت',
    'Imported content (emails, files, events) is encrypted at rest on your device':
      'يتم تشفير المحتوى المستورد (رسائل البريد الإلكتروني، الملفات، الأحداث) أثناء التخزين على جهازك',
    'Third-Party Services': 'خدمات الطرف الثالث',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'عند تكوين مزودي LLM (OpenAI، Anthropic، Google، إلخ)، يتم إرسال مطالباتك مباشرة إلى تلك الخدمات. يرجى مراجعة سياسات الخصوصية الخاصة بهم.',
    'P2P Sync (Optional)': 'مزامنة P2P (اختيارية)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'يقدم DEVS ميزة مزامنة اختيارية من نظير إلى نظير لمزامنة بياناتك عبر الأجهزة:',
    'Sync is opt-in and disabled by default':
      'المزامنة اختيارية ومعطلة افتراضيًا',
    'All sync data is encrypted per-message with AES-GCM-256 using a key derived from your room password (PBKDF2 with 210,000 iterations)':
      'يتم تشفير جميع بيانات المزامنة لكل رسالة باستخدام AES-GCM-256 بمفتاح مشتق من كلمة مرور الغرفة (PBKDF2 مع 210,000 تكرار)',
    'A signaling server (wss://signal.devs.new) is used only for WebSocket connection relay':
      'يُستخدم خادم الإشارات (wss://signal.devs.new) فقط لترحيل اتصالات WebSocket',
    'The signaling server sees only: derived room identifiers (opaque hashes) and encrypted binary payloads':
      'يرى خادم الإشارات فقط: معرفات الغرف المشتقة (تجزئات معتمة) وحمولات ثنائية مشفرة',
    'The signaling server is stateless and stores no data':
      'خادم الإشارات عديم الحالة ولا يخزن أي بيانات',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'بياناتك الفعلية مشفرة من طرف إلى طرف ولا تكون مرئية للخادم أبدًا',
    'You can self-host your own signaling server for maximum privacy':
      'يمكنك استضافة خادم الإشارات الخاص بك ذاتيًا لتحقيق أقصى قدر من الخصوصية',
    'Observability (Optional)': 'المراقبة (اختيارية)',
    'DEVS supports optional LLM observability integration:':
      'يدعم DEVS تكامل مراقبة LLM الاختياري:',
    'Disabled by default — you must explicitly configure it in Settings':
      'معطل افتراضيًا — يجب تفعيله صراحة في الإعدادات',
    'When enabled, LLM prompts and responses are sent to your configured Langfuse instance':
      'عند التفعيل، يتم إرسال مطالبات واستجابات LLM إلى نسخة Langfuse المُعدّة لديك',
    'No observability data is sent to our servers — traces go to your own endpoint':
      'لا يتم إرسال أي بيانات مراقبة إلى خوادمنا — تذهب السجلات إلى نقطة النهاية الخاصة بك',
    'Your Control': 'تحكمك',
    'You can:': 'يمكنك:',
    'Export all your data at any time:': 'تصدير جميع بياناتك في أي وقت:',
    'Database Administration': 'إدارة قاعدة البيانات',
    'Delete all data by clearing browser storage':
      'حذف جميع البيانات عن طريق مسح تخزين المتصفح',
    'Use the app completely offline after initial load':
      'استخدام التطبيق دون اتصال تمامًا بعد التحميل الأولي',
    Contact: 'اتصل',
    'For privacy questions, open an issue on our':
      'لأسئلة الخصوصية، افتح تذكرة في',
    'GitHub repository': 'مستودع GitHub',
  },
  de: {
    'Privacy Policy': 'Datenschutzerklärung',
    'How we handle your data': 'Wie wir mit Ihren Daten umgehen',
    'Your Privacy Matters': 'Ihre Privatsphäre ist uns wichtig',
    'Last updated: {date}': 'Zuletzt aktualisiert: {date}',
    'DEVS is designed with privacy as a core principle. All your data stays on your device.':
      'DEVS wurde mit Datenschutz als Kernprinzip entwickelt. Alle Ihre Daten bleiben auf Ihrem Gerät.',
    'Data Collection': 'Datenerhebung',
    'We do not collect any personal data.':
      'Wir erheben keine personenbezogenen Daten.',
    'DEVS runs entirely in your browser:':
      'DEVS läuft vollständig in Ihrem Browser:',
    'No user accounts required': 'Keine Benutzerkonten erforderlich',
    'No analytics or tracking': 'Keine Analysen oder Nachverfolgung',
    'No cookies for advertising': 'Keine Werbe-Cookies',
    'No data sent to our servers':
      'Keine Daten werden an unsere Server gesendet',
    'Local Storage': 'Lokale Speicherung',
    'All data is stored locally on your device using browser technologies:':
      'Alle Daten werden lokal auf Ihrem Gerät mit Browser-Technologien gespeichert:',
    'For all application data: conversations, agents, knowledge base, tasks, and memories':
      'Für alle Anwendungsdaten: Konversationen, Agenten, Wissensdatenbank, Aufgaben und Erinnerungen',
    'For encryption keys (non-extractable CryptoKey objects) and file system handles':
      'Für Verschlüsselungsschlüssel (nicht extrahierbare CryptoKey-Objekte) und Dateisystem-Handles',
    'For user preferences, settings, and encryption metadata':
      'Für Benutzereinstellungen, Präferenzen und Verschlüsselungsmetadaten',
    'Encryption & Data Security': 'Verschlüsselung und Datensicherheit',
    'DEVS encrypts your sensitive data at rest using industry-standard encryption:':
      'DEVS verschlüsselt Ihre sensiblen Daten im Ruhezustand mit branchenüblicher Verschlüsselung:',
    'API keys and OAuth tokens are encrypted with AES-GCM 256-bit using non-extractable keys that cannot be read or exported by JavaScript':
      'API-Schlüssel und OAuth-Tokens werden mit AES-GCM 256-bit unter Verwendung nicht extrahierbarer Schlüssel verschlüsselt, die von JavaScript weder gelesen noch exportiert werden können',
    'Sensitive content (conversations, knowledge base, agent memories) is encrypted at the field level before storage':
      'Sensible Inhalte (Konversationen, Wissensdatenbank, Agenten-Erinnerungen) werden vor der Speicherung auf Feldebene verschlüsselt',
    'All encryption uses the browser-native Web Crypto API — no third-party cryptographic libraries':
      'Die gesamte Verschlüsselung nutzt die browserintegrierte Web Crypto API — keine kryptographischen Drittanbieter-Bibliotheken',
    'Encryption keys are device-bound and cannot be recovered if lost — back up your data regularly':
      'Verschlüsselungsschlüssel sind gerätegebunden und können bei Verlust nicht wiederhergestellt werden — sichern Sie Ihre Daten regelmäßig',
    'External Connectors': 'Externe Konnektoren',
    'When you connect external services (Gmail, Google Drive, Calendar, Notion, etc.):':
      'Wenn Sie externe Dienste verbinden (Gmail, Google Drive, Calendar, Notion, usw.):',
    'Authentication uses OAuth 2.0 with PKCE — DEVS never sees or stores your passwords':
      'Die Authentifizierung verwendet OAuth 2.0 mit PKCE — DEVS sieht oder speichert Ihre Passwörter niemals',
    'Access and refresh tokens are encrypted at rest with AES-GCM-256':
      'Zugriffs- und Aktualisierungstoken werden im Ruhezustand mit AES-GCM-256 verschlüsselt',
    'Tokens are decrypted in-memory only for the duration of each API call, then discarded':
      'Tokens werden nur für die Dauer jedes API-Aufrufs im Arbeitsspeicher entschlüsselt und danach verworfen',
    'DEVS requests minimum necessary permissions (read-only where possible)':
      'DEVS fordert nur die minimal erforderlichen Berechtigungen an (schreibgeschützt, wo möglich)',
    'You can disconnect any connector and revoke access at any time':
      'Sie können jeden Konnektor trennen und den Zugriff jederzeit widerrufen',
    'Imported content (emails, files, events) is encrypted at rest on your device':
      'Importierte Inhalte (E-Mails, Dateien, Termine) werden im Ruhezustand auf Ihrem Gerät verschlüsselt',
    'Third-Party Services': 'Drittanbieterdienste',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'Wenn Sie LLM-Anbieter (OpenAI, Anthropic, Google, etc.) konfigurieren, werden Ihre Prompts direkt an diese Dienste gesendet. Bitte prüfen Sie deren jeweilige Datenschutzrichtlinien.',
    'P2P Sync (Optional)': 'P2P-Synchronisation (Optional)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS bietet eine optionale Peer-to-Peer-Synchronisierungsfunktion zur Synchronisierung Ihrer Daten über Geräte hinweg:',
    'Sync is opt-in and disabled by default':
      'Die Synchronisierung ist optional und standardmäßig deaktiviert',
    'All sync data is encrypted per-message with AES-GCM-256 using a key derived from your room password (PBKDF2 with 210,000 iterations)':
      'Alle Synchronisierungsdaten werden pro Nachricht mit AES-GCM-256 verschlüsselt, unter Verwendung eines aus Ihrem Raumpasswort abgeleiteten Schlüssels (PBKDF2 mit 210.000 Iterationen)',
    'A signaling server (wss://signal.devs.new) is used only for WebSocket connection relay':
      'Ein Signalisierungsserver (wss://signal.devs.new) wird nur für die WebSocket-Verbindungsweiterleitung verwendet',
    'The signaling server sees only: derived room identifiers (opaque hashes) and encrypted binary payloads':
      'Der Signalisierungsserver sieht nur: abgeleitete Raumkennungen (undurchsichtige Hashes) und verschlüsselte Binärdaten',
    'The signaling server is stateless and stores no data':
      'Der Signalisierungsserver ist zustandslos und speichert keine Daten',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'Ihre tatsächlichen Daten sind Ende-zu-Ende verschlüsselt und für den Server niemals sichtbar',
    'You can self-host your own signaling server for maximum privacy':
      'Sie können Ihren eigenen Signalisierungsserver selbst hosten, um maximale Privatsphäre zu gewährleisten',
    'Observability (Optional)': 'Beobachtbarkeit (Optional)',
    'DEVS supports optional LLM observability integration:':
      'DEVS unterstützt eine optionale LLM-Beobachtbarkeitsintegration:',
    'Disabled by default — you must explicitly configure it in Settings':
      'Standardmäßig deaktiviert — Sie müssen es explizit in den Einstellungen konfigurieren',
    'When enabled, LLM prompts and responses are sent to your configured Langfuse instance':
      'Bei Aktivierung werden LLM-Prompts und -Antworten an Ihre konfigurierte Langfuse-Instanz gesendet',
    'No observability data is sent to our servers — traces go to your own endpoint':
      'Es werden keine Beobachtbarkeitsdaten an unsere Server gesendet — Traces gehen an Ihren eigenen Endpunkt',
    'Your Control': 'Ihre Kontrolle',
    'You can:': 'Sie können:',
    'Export all your data at any time:':
      'Exportieren Sie jederzeit alle Ihre Daten:',
    'Database Administration': 'Datenbankverwaltung',
    'Delete all data by clearing browser storage':
      'Löschen Sie alle Daten, indem Sie den Browser-Speicher leeren',
    'Use the app completely offline after initial load':
      'Verwenden Sie die App nach dem ersten Laden vollständig offline',
    Contact: 'Kontakt',
    'For privacy questions, open an issue on our':
      'Bei Datenschutzfragen öffnen Sie ein Issue in unserem',
    'GitHub repository': 'GitHub-Repository',
  },
  es: {
    'Privacy Policy': 'Política de privacidad',
    'How we handle your data': 'Cómo manejamos tus datos',
    'Your Privacy Matters': 'Tu privacidad es importante',
    'Last updated: {date}': 'Última actualización: {date}',
    'DEVS is designed with privacy as a core principle. All your data stays on your device.':
      'DEVS está diseñado con la privacidad como principio fundamental. Todos tus datos permanecen en tu dispositivo.',
    'Data Collection': 'Recopilación de datos',
    'We do not collect any personal data.':
      'No recopilamos ningún dato personal.',
    'DEVS runs entirely in your browser:':
      'DEVS se ejecuta completamente en tu navegador:',
    'No user accounts required': 'No se requieren cuentas de usuario',
    'No analytics or tracking': 'Sin análisis ni seguimiento',
    'No cookies for advertising': 'Sin cookies de publicidad',
    'No data sent to our servers': 'No se envían datos a nuestros servidores',
    'Local Storage': 'Almacenamiento local',
    'All data is stored locally on your device using browser technologies:':
      'Todos los datos se almacenan localmente en tu dispositivo usando tecnologías del navegador:',
    'For all application data: conversations, agents, knowledge base, tasks, and memories':
      'Para todos los datos de la aplicación: conversaciones, agentes, base de conocimientos, tareas y memorias',
    'For encryption keys (non-extractable CryptoKey objects) and file system handles':
      'Para claves de cifrado (objetos CryptoKey no extraíbles) y manejadores del sistema de archivos',
    'For user preferences, settings, and encryption metadata':
      'Para preferencias de usuario, configuraciones y metadatos de cifrado',
    'Encryption & Data Security': 'Cifrado y seguridad de datos',
    'DEVS encrypts your sensitive data at rest using industry-standard encryption:':
      'DEVS cifra tus datos sensibles en reposo utilizando cifrado estándar de la industria:',
    'API keys and OAuth tokens are encrypted with AES-GCM 256-bit using non-extractable keys that cannot be read or exported by JavaScript':
      'Las claves API y los tokens OAuth se cifran con AES-GCM 256-bit usando claves no extraíbles que no pueden ser leídas ni exportadas por JavaScript',
    'Sensitive content (conversations, knowledge base, agent memories) is encrypted at the field level before storage':
      'El contenido sensible (conversaciones, base de conocimientos, memorias de agentes) se cifra a nivel de campo antes del almacenamiento',
    'All encryption uses the browser-native Web Crypto API — no third-party cryptographic libraries':
      'Todo el cifrado utiliza la Web Crypto API nativa del navegador — sin bibliotecas criptográficas de terceros',
    'Encryption keys are device-bound and cannot be recovered if lost — back up your data regularly':
      'Las claves de cifrado están vinculadas al dispositivo y no se pueden recuperar si se pierden — haz copias de seguridad regularmente',
    'External Connectors': 'Conectores externos',
    'When you connect external services (Gmail, Google Drive, Calendar, Notion, etc.):':
      'Cuando conectas servicios externos (Gmail, Google Drive, Calendar, Notion, etc.):',
    'Authentication uses OAuth 2.0 with PKCE — DEVS never sees or stores your passwords':
      'La autenticación usa OAuth 2.0 con PKCE — DEVS nunca ve ni almacena tus contraseñas',
    'Access and refresh tokens are encrypted at rest with AES-GCM-256':
      'Los tokens de acceso y actualización se cifran en reposo con AES-GCM-256',
    'Tokens are decrypted in-memory only for the duration of each API call, then discarded':
      'Los tokens se descifran en memoria solo durante cada llamada API y luego se descartan',
    'DEVS requests minimum necessary permissions (read-only where possible)':
      'DEVS solicita los permisos mínimos necesarios (solo lectura cuando es posible)',
    'You can disconnect any connector and revoke access at any time':
      'Puedes desconectar cualquier conector y revocar el acceso en cualquier momento',
    'Imported content (emails, files, events) is encrypted at rest on your device':
      'El contenido importado (correos, archivos, eventos) se cifra en reposo en tu dispositivo',
    'Third-Party Services': 'Servicios de terceros',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'Cuando configuras proveedores LLM (OpenAI, Anthropic, Google, etc.), tus prompts se envían directamente a esos servicios. Por favor, revisa sus respectivas políticas de privacidad.',
    'P2P Sync (Optional)': 'Sincronización P2P (Opcional)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS ofrece una función opcional de sincronización entre pares para sincronizar tus datos entre dispositivos:',
    'Sync is opt-in and disabled by default':
      'La sincronización es opcional y está deshabilitada por defecto',
    'All sync data is encrypted per-message with AES-GCM-256 using a key derived from your room password (PBKDF2 with 210,000 iterations)':
      'Todos los datos de sincronización se cifran por mensaje con AES-GCM-256 usando una clave derivada de tu contraseña de sala (PBKDF2 con 210.000 iteraciones)',
    'A signaling server (wss://signal.devs.new) is used only for WebSocket connection relay':
      'Un servidor de señalización (wss://signal.devs.new) se usa solo para la retransmisión de conexiones WebSocket',
    'The signaling server sees only: derived room identifiers (opaque hashes) and encrypted binary payloads':
      'El servidor de señalización solo ve: identificadores de sala derivados (hashes opacos) y cargas binarias cifradas',
    'The signaling server is stateless and stores no data':
      'El servidor de señalización no tiene estado y no almacena ningún dato',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'Tus datos reales están cifrados de extremo a extremo y nunca son visibles para el servidor',
    'You can self-host your own signaling server for maximum privacy':
      'Puedes alojar tu propio servidor de señalización para máxima privacidad',
    'Observability (Optional)': 'Observabilidad (Opcional)',
    'DEVS supports optional LLM observability integration:':
      'DEVS soporta integración opcional de observabilidad LLM:',
    'Disabled by default — you must explicitly configure it in Settings':
      'Deshabilitado por defecto — debes configurarlo explícitamente en Configuración',
    'When enabled, LLM prompts and responses are sent to your configured Langfuse instance':
      'Cuando está habilitado, los prompts y respuestas LLM se envían a tu instancia de Langfuse configurada',
    'No observability data is sent to our servers — traces go to your own endpoint':
      'No se envían datos de observabilidad a nuestros servidores — las trazas van a tu propio endpoint',
    'Your Control': 'Tu control',
    'You can:': 'Puedes:',
    'Export all your data at any time:':
      'Exportar todos tus datos en cualquier momento:',
    'Database Administration': 'Administración de base de datos',
    'Delete all data by clearing browser storage':
      'Eliminar todos los datos borrando el almacenamiento del navegador',
    'Use the app completely offline after initial load':
      'Usar la aplicación completamente sin conexión después de la carga inicial',
    Contact: 'Contacto',
    'For privacy questions, open an issue on our':
      'Para preguntas de privacidad, abre un issue en nuestro',
    'GitHub repository': 'repositorio de GitHub',
  },
  fr: {
    'Privacy Policy': 'Politique de confidentialité',
    'How we handle your data': 'Comment nous traitons vos données',
    'Your Privacy Matters': 'Votre vie privée compte',
    'Last updated: {date}': 'Dernière mise à jour : {date}',
    'DEVS is designed with privacy as a core principle. All your data stays on your device.':
      'DEVS est conçu avec la confidentialité comme principe fondamental. Toutes vos données restent sur votre appareil.',
    'Data Collection': 'Collecte de données',
    'We do not collect any personal data.':
      'Nous ne collectons aucune donnée personnelle.',
    'DEVS runs entirely in your browser:':
      'DEVS fonctionne entièrement dans votre navigateur :',
    'No user accounts required': 'Aucun compte utilisateur requis',
    'No analytics or tracking': 'Aucune analyse ni suivi',
    'No cookies for advertising': 'Aucun cookie publicitaire',
    'No data sent to our servers': 'Aucune donnée envoyée à nos serveurs',
    'Local Storage': 'Stockage local',
    'All data is stored locally on your device using browser technologies:':
      'Toutes les données sont stockées localement sur votre appareil :',
    'For all application data: conversations, agents, knowledge base, tasks, and memories':
      'Pour toutes les données applicatives : conversations, agents, base de connaissances, tâches et mémoires',
    'For encryption keys (non-extractable CryptoKey objects) and file system handles':
      'Pour les clés de chiffrement (objets CryptoKey non extractibles) et les descripteurs du système de fichiers',
    'For user preferences, settings, and encryption metadata':
      'Pour les préférences utilisateur, les paramètres et les métadonnées de chiffrement',
    'Encryption & Data Security': 'Chiffrement et sécurité des données',
    'DEVS encrypts your sensitive data at rest using industry-standard encryption:':
      'DEVS chiffre vos données sensibles au repos avec un chiffrement conforme aux standards de l\'industrie :',
    'API keys and OAuth tokens are encrypted with AES-GCM 256-bit using non-extractable keys that cannot be read or exported by JavaScript':
      'Les clés API et les tokens OAuth sont chiffrés avec AES-GCM 256-bit à l\'aide de clés non extractibles qui ne peuvent être ni lues ni exportées par JavaScript',
    'Sensitive content (conversations, knowledge base, agent memories) is encrypted at the field level before storage':
      'Le contenu sensible (conversations, base de connaissances, mémoires d\'agents) est chiffré au niveau du champ avant le stockage',
    'All encryption uses the browser-native Web Crypto API — no third-party cryptographic libraries':
      'Tout le chiffrement utilise la Web Crypto API native du navigateur — aucune bibliothèque cryptographique tierce',
    'Encryption keys are device-bound and cannot be recovered if lost — back up your data regularly':
      'Les clés de chiffrement sont liées à l\'appareil et ne peuvent pas être récupérées en cas de perte — sauvegardez régulièrement vos données',
    'External Connectors': 'Connecteurs externes',
    'When you connect external services (Gmail, Google Drive, Calendar, Notion, etc.):':
      'Lorsque vous connectez des services externes (Gmail, Google Drive, Calendar, Notion, etc.) :',
    'Authentication uses OAuth 2.0 with PKCE — DEVS never sees or stores your passwords':
      'L\'authentification utilise OAuth 2.0 avec PKCE — DEVS ne voit et ne stocke jamais vos mots de passe',
    'Access and refresh tokens are encrypted at rest with AES-GCM-256':
      'Les tokens d\'accès et de rafraîchissement sont chiffrés au repos avec AES-GCM-256',
    'Tokens are decrypted in-memory only for the duration of each API call, then discarded':
      'Les tokens sont déchiffrés en mémoire uniquement le temps de chaque appel API, puis supprimés',
    'DEVS requests minimum necessary permissions (read-only where possible)':
      'DEVS demande les permissions minimales nécessaires (lecture seule lorsque possible)',
    'You can disconnect any connector and revoke access at any time':
      'Vous pouvez déconnecter n\'importe quel connecteur et révoquer l\'accès à tout moment',
    'Imported content (emails, files, events) is encrypted at rest on your device':
      'Le contenu importé (e-mails, fichiers, événements) est chiffré au repos sur votre appareil',
    'Third-Party Services': 'Services tiers',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'Lorsque vous configurez des fournisseurs LLM (OpenAI, Anthropic, Google, etc.), vos prompts sont envoyés directement à ces services. Veuillez consulter leurs politiques de confidentialité respectives.',
    'P2P Sync (Optional)': 'Synchronisation P2P (Optionnelle)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS offre une fonction optionnelle de synchronisation pair-à-pair pour synchroniser vos données entre vos appareils :',
    'Sync is opt-in and disabled by default':
      'La synchronisation est optionnelle et désactivée par défaut',
    'All sync data is encrypted per-message with AES-GCM-256 using a key derived from your room password (PBKDF2 with 210,000 iterations)':
      'Toutes les données de synchronisation sont chiffrées par message avec AES-GCM-256 à l\'aide d\'une clé dérivée de votre mot de passe de salon (PBKDF2 avec 210 000 itérations)',
    'A signaling server (wss://signal.devs.new) is used only for WebSocket connection relay':
      'Un serveur de signalisation (wss://signal.devs.new) est utilisé uniquement pour le relais de connexions WebSocket',
    'The signaling server sees only: derived room identifiers (opaque hashes) and encrypted binary payloads':
      'Le serveur de signalisation ne voit que : des identifiants de salon dérivés (hachages opaques) et des charges utiles binaires chiffrées',
    'The signaling server is stateless and stores no data':
      'Le serveur de signalisation est sans état et ne stocke aucune donnée',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'Vos données réelles sont chiffrées de bout en bout et jamais visibles par le serveur',
    'You can self-host your own signaling server for maximum privacy':
      'Vous pouvez héberger votre propre serveur de signalisation pour une confidentialité maximale',
    'Observability (Optional)': 'Observabilité (Optionnelle)',
    'DEVS supports optional LLM observability integration:':
      'DEVS prend en charge l\'intégration optionnelle d\'observabilité LLM :',
    'Disabled by default — you must explicitly configure it in Settings':
      'Désactivée par défaut — vous devez la configurer explicitement dans les Paramètres',
    'When enabled, LLM prompts and responses are sent to your configured Langfuse instance':
      'Lorsqu\'elle est activée, les prompts et réponses LLM sont envoyés à votre instance Langfuse configurée',
    'No observability data is sent to our servers — traces go to your own endpoint':
      'Aucune donnée d\'observabilité n\'est envoyée à nos serveurs — les traces vont vers votre propre endpoint',
    'Your Control': 'Votre contrôle',
    'You can:': 'Vous pouvez :',
    'Export all your data at any time:':
      'Exporter toutes vos données à tout moment :',
    'Database Administration': 'Administration de la base de données',
    'Delete all data by clearing browser storage':
      'Supprimer toutes les données en vidant le stockage du navigateur',
    'Use the app completely offline after initial load':
      "Utiliser l'application hors ligne après le chargement initial",
    Contact: 'Contact',
    'For privacy questions, open an issue on our':
      'Pour toute question de confidentialité, ouvrez une issue sur notre',
    'GitHub repository': 'dépôt GitHub',
  },
  ko: {
    'Privacy Policy': '개인정보 처리방침',
    'How we handle your data': '귀하의 데이터를 처리하는 방법',
    'Your Privacy Matters': '귀하의 개인정보는 소중합니다',
    'Last updated: {date}': '최종 업데이트: {date}',
    'DEVS is designed with privacy as a core principle. All your data stays on your device.':
      'DEVS는 개인정보 보호를 핵심 원칙으로 설계되었습니다. 모든 데이터는 귀하의 기기에만 저장됩니다.',
    'Data Collection': '데이터 수집',
    'We do not collect any personal data.': '개인정보를 수집하지 않습니다.',
    'DEVS runs entirely in your browser:': 'DEVS는 브라우저에서만 동작합니다:',
    'No user accounts required': '사용자 계정 불필요',
    'No analytics or tracking': '분석 또는 추적 없음',
    'No cookies for advertising': '광고용 쿠키 없음',
    'No data sent to our servers': '서버로 데이터 전송 없음',
    'Local Storage': '로컬 저장소',
    'All data is stored locally on your device using browser technologies:':
      '모든 데이터는 브라우저 기술을 이용해 귀하의 기기에만 저장됩니다:',
    'For all application data: conversations, agents, knowledge base, tasks, and memories':
      '모든 애플리케이션 데이터: 대화, 에이전트, 지식 기반, 작업 및 메모리',
    'For encryption keys (non-extractable CryptoKey objects) and file system handles':
      '암호화 키(추출 불가능한 CryptoKey 객체) 및 파일 시스템 핸들',
    'For user preferences, settings, and encryption metadata':
      '사용자 환경설정, 설정 및 암호화 메타데이터',
    'Encryption & Data Security': '암호화 및 데이터 보안',
    'DEVS encrypts your sensitive data at rest using industry-standard encryption:':
      'DEVS는 업계 표준 암호화를 사용하여 저장된 민감한 데이터를 암호화합니다:',
    'API keys and OAuth tokens are encrypted with AES-GCM 256-bit using non-extractable keys that cannot be read or exported by JavaScript':
      'API 키와 OAuth 토큰은 JavaScript에서 읽거나 내보낼 수 없는 추출 불가능한 키를 사용하여 AES-GCM 256-bit로 암호화됩니다',
    'Sensitive content (conversations, knowledge base, agent memories) is encrypted at the field level before storage':
      '민감한 콘텐츠(대화, 지식 기반, 에이전트 메모리)는 저장 전에 필드 수준에서 암호화됩니다',
    'All encryption uses the browser-native Web Crypto API — no third-party cryptographic libraries':
      '모든 암호화는 브라우저 내장 Web Crypto API를 사용합니다 — 서드파티 암호화 라이브러리 없음',
    'Encryption keys are device-bound and cannot be recovered if lost — back up your data regularly':
      '암호화 키는 기기에 귀속되며 분실 시 복구할 수 없습니다 — 정기적으로 데이터를 백업하세요',
    'External Connectors': '외부 커넥터',
    'When you connect external services (Gmail, Google Drive, Calendar, Notion, etc.):':
      '외부 서비스(Gmail, Google Drive, Calendar, Notion 등)를 연결할 때:',
    'Authentication uses OAuth 2.0 with PKCE — DEVS never sees or stores your passwords':
      '인증은 OAuth 2.0과 PKCE를 사용합니다 — DEVS는 비밀번호를 보거나 저장하지 않습니다',
    'Access and refresh tokens are encrypted at rest with AES-GCM-256':
      '액세스 및 갱신 토큰은 AES-GCM-256으로 저장 시 암호화됩니다',
    'Tokens are decrypted in-memory only for the duration of each API call, then discarded':
      '토큰은 각 API 호출 기간 동안에만 메모리에서 복호화된 후 폐기됩니다',
    'DEVS requests minimum necessary permissions (read-only where possible)':
      'DEVS는 최소한의 필요 권한만 요청합니다(가능한 경우 읽기 전용)',
    'You can disconnect any connector and revoke access at any time':
      '언제든지 커넥터를 해제하고 접근 권한을 철회할 수 있습니다',
    'Imported content (emails, files, events) is encrypted at rest on your device':
      '가져온 콘텐츠(이메일, 파일, 일정)는 기기에서 저장 시 암호화됩니다',
    'Third-Party Services': '타사 서비스',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'OpenAI, Anthropic, Google 등 LLM 공급자를 설정하면 프롬프트가 해당 서비스로 직접 전송됩니다. 각 서비스의 개인정보 처리방침을 확인하세요.',
    'P2P Sync (Optional)': 'P2P 동기화 (선택사항)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS는 여러 기기 간에 데이터를 동기화하는 선택적 P2P 동기화 기능을 제공합니다:',
    'Sync is opt-in and disabled by default':
      '동기화는 선택 사항이며 기본적으로 비활성화되어 있습니다',
    'All sync data is encrypted per-message with AES-GCM-256 using a key derived from your room password (PBKDF2 with 210,000 iterations)':
      '모든 동기화 데이터는 방 비밀번호에서 파생된 키(PBKDF2, 210,000회 반복)를 사용하여 AES-GCM-256으로 메시지별 암호화됩니다',
    'A signaling server (wss://signal.devs.new) is used only for WebSocket connection relay':
      '신호 서버(wss://signal.devs.new)는 WebSocket 연결 중계에만 사용됩니다',
    'The signaling server sees only: derived room identifiers (opaque hashes) and encrypted binary payloads':
      '신호 서버는 다음만 확인합니다: 파생된 방 식별자(불투명 해시) 및 암호화된 바이너리 페이로드',
    'The signaling server is stateless and stores no data':
      '신호 서버는 상태를 저장하지 않으며 데이터를 저장하지 않습니다',
    'Your actual data is end-to-end encrypted and never visible to the server':
      '실제 데이터는 종단 간 암호화되어 서버에서 절대 볼 수 없습니다',
    'You can self-host your own signaling server for maximum privacy':
      '최대 개인정보 보호를 위해 자체 신호 서버를 호스팅할 수 있습니다',
    'Observability (Optional)': '관측성 (선택사항)',
    'DEVS supports optional LLM observability integration:':
      'DEVS는 선택적 LLM 관측성 통합을 지원합니다:',
    'Disabled by default — you must explicitly configure it in Settings':
      '기본적으로 비활성화 — 설정에서 명시적으로 구성해야 합니다',
    'When enabled, LLM prompts and responses are sent to your configured Langfuse instance':
      '활성화하면 LLM 프롬프트와 응답이 구성된 Langfuse 인스턴스로 전송됩니다',
    'No observability data is sent to our servers — traces go to your own endpoint':
      '관측성 데이터는 당사 서버로 전송되지 않습니다 — 트레이스는 귀하의 엔드포인트로 전송됩니다',
    'Your Control': '귀하의 제어권',
    'You can:': '다음이 가능합니다:',
    'Export all your data at any time:': '언제든지 모든 데이터 내보내기:',
    'Database Administration': '데이터베이스 관리',
    'Delete all data by clearing browser storage':
      '브라우저 저장소를 비워 모든 데이터 삭제',
    'Use the app completely offline after initial load':
      '최초 로드 후 완전 오프라인 사용 가능',
    Contact: '문의',
    'For privacy questions, open an issue on our':
      '개인정보 관련 문의는 다음에서 이슈를 등록하세요:',
    'GitHub repository': 'GitHub 저장소',
  },
}
