import { Container, Section } from '@/components'
import { useI18n } from '@/i18n'
import Layout from '@/layouts/Default'

export const PrivacyPage = () => {
  const { t } = useI18n(localI18n)

  return (
    <Layout
      header={{
        icon: {
          name: 'Lock',
          color: 'text-default-400',
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
            <strong>{t('Last updated: January 2026')}</strong>
          </p>
          <p>
            {t(
              'DEVS is designed with privacy as a core principle. All your data stays on your device.',
            )}
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
              <strong>IndexedDB</strong> -{' '}
              {t('For conversations, agents, and knowledge base')}
            </li>
            <li>
              <strong>LocalStorage</strong> -{' '}
              {t('For user preferences and settings')}
            </li>
            <li>
              <strong>Web Crypto API</strong> - {t('For encrypting API keys')}
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
                'When enabled, encrypted updates are synchronized between your devices',
              )}
            </li>
            <li>
              {t(
                'A signaling server (wss://signal.devs.new) is used only for WebRTC connection negotiation',
              )}
            </li>
            <li>
              {t(
                'The signaling server sees only: room IDs and peer IP addresses',
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
    'Last updated: January 2026',
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
    'For conversations, agents, and knowledge base',
    'For user preferences and settings',
    'For encrypting API keys',
    'Third-Party Services',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.',
    'P2P Sync (Optional)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:',
    'Sync is opt-in and disabled by default',
    'When enabled, encrypted updates are synchronized between your devices',
    'A signaling server (wss://signal.devs.new) is used only for WebRTC connection negotiation',
    'The signaling server sees only: room IDs and peer IP addresses',
    'The signaling server is stateless and stores no data',
    'Your actual data is end-to-end encrypted and never visible to the server',
    'You can self-host your own signaling server for maximum privacy',
    'Your Control',
    'You can:',
    'Export all your data at any time:',
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
    'Last updated: January 2026': 'آخر تحديث: يناير 2026',
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
    'For conversations, agents, and knowledge base':
      'للمحادثات والوكلاء وقاعدة المعرفة',
    'For user preferences and settings': 'لتفضيلات المستخدم والإعدادات',
    'For encrypting API keys': 'لتشفير مفاتيح API',
    'Third-Party Services': 'خدمات الطرف الثالث',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'عند تكوين مزودي LLM (OpenAI، Anthropic، Google، إلخ)، يتم إرسال مطالباتك مباشرة إلى تلك الخدمات. يرجى مراجعة سياسات الخصوصية الخاصة بهم.',
    'P2P Sync (Optional)': 'مزامنة P2P (اختيارية)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'يقدم DEVS ميزة مزامنة اختيارية من نظير إلى نظير لمزامنة بياناتك عبر الأجهزة:',
    'Sync is opt-in and disabled by default':
      'المزامنة اختيارية ومعطلة افتراضيًا',
    'When enabled, encrypted updates are synchronized between your devices':
      'عند التمكين، يتم مزامنة التحديثات المشفرة بين أجهزتك',
    'A signaling server (wss://signal.devs.new) is used only for WebRTC connection negotiation':
      'يُستخدم خادم الإشارات (wss://signal.devs.new) فقط للتفاوض على اتصال WebRTC',
    'The signaling server sees only: room IDs and peer IP addresses':
      'يرى خادم الإشارات فقط: معرفات الغرف وعناوين IP للأقران',
    'The signaling server is stateless and stores no data':
      'خادم الإشارات عديم الحالة ولا يخزن أي بيانات',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'بياناتك الفعلية مشفرة من طرف إلى طرف ولا تكون مرئية للخادم أبدًا',
    'You can self-host your own signaling server for maximum privacy':
      'يمكنك استضافة خادم الإشارات الخاص بك ذاتيًا لتحقيق أقصى قدر من الخصوصية',
    'Your Control': 'تحكمك',
    'You can:': 'يمكنك:',
    'Export all your data at any time:': 'تصدير جميع بياناتك في أي وقت:',
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
    'Last updated: January 2026': 'Zuletzt aktualisiert: Januar 2026',
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
    'For conversations, agents, and knowledge base':
      'Für Konversationen, Agenten und Wissensdatenbank',
    'For user preferences and settings':
      'Für Benutzereinstellungen und Präferenzen',
    'For encrypting API keys': 'Für die Verschlüsselung von API-Schlüsseln',
    'Third-Party Services': 'Drittanbieterdienste',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'Wenn Sie LLM-Anbieter (OpenAI, Anthropic, Google, etc.) konfigurieren, werden Ihre Prompts direkt an diese Dienste gesendet. Bitte prüfen Sie deren jeweilige Datenschutzrichtlinien.',
    'P2P Sync (Optional)': 'P2P-Synchronisation (Optional)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS bietet eine optionale Peer-to-Peer-Synchronisierungsfunktion zur Synchronisierung Ihrer Daten über Geräte hinweg:',
    'Sync is opt-in and disabled by default':
      'Die Synchronisierung ist optional und standardmäßig deaktiviert',
    'When enabled, encrypted updates are synchronized between your devices':
      'Bei Aktivierung werden verschlüsselte Updates zwischen Ihren Geräten synchronisiert',
    'A signaling server (wss://signal.devs.new) is used only for WebRTC connection negotiation':
      'Ein Signalisierungsserver (wss://signal.devs.new) wird nur für die WebRTC-Verbindungsaushandlung verwendet',
    'The signaling server sees only: room IDs and peer IP addresses':
      'Der Signalisierungsserver sieht nur: Raum-IDs und Peer-IP-Adressen',
    'The signaling server is stateless and stores no data':
      'Der Signalisierungsserver ist zustandslos und speichert keine Daten',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'Ihre tatsächlichen Daten sind Ende-zu-Ende verschlüsselt und für den Server niemals sichtbar',
    'You can self-host your own signaling server for maximum privacy':
      'Sie können Ihren eigenen Signalisierungsserver selbst hosten, um maximale Privatsphäre zu gewährleisten',
    'Your Control': 'Ihre Kontrolle',
    'You can:': 'Sie können:',
    'Export all your data at any time:':
      'Exportieren Sie jederzeit alle Ihre Daten:',
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
    'Last updated: January 2026': 'Última actualización: enero de 2026',
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
    'For conversations, agents, and knowledge base':
      'Para conversaciones, agentes y base de conocimientos',
    'For user preferences and settings':
      'Para preferencias y configuraciones de usuario',
    'For encrypting API keys': 'Para cifrar claves API',
    'Third-Party Services': 'Servicios de terceros',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'Cuando configuras proveedores LLM (OpenAI, Anthropic, Google, etc.), tus prompts se envían directamente a esos servicios. Por favor, revisa sus respectivas políticas de privacidad.',
    'P2P Sync (Optional)': 'Sincronización P2P (Opcional)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS ofrece una función opcional de sincronización entre pares para sincronizar tus datos entre dispositivos:',
    'Sync is opt-in and disabled by default':
      'La sincronización es opcional y está deshabilitada por defecto',
    'When enabled, encrypted updates are synchronized between your devices':
      'Cuando está habilitada, las actualizaciones cifradas se sincronizan entre tus dispositivos',
    'A signaling server (wss://signal.devs.new) is used only for WebRTC connection negotiation':
      'Un servidor de señalización (wss://signal.devs.new) se usa solo para la negociación de conexión WebRTC',
    'The signaling server sees only: room IDs and peer IP addresses':
      'El servidor de señalización solo ve: IDs de salas y direcciones IP de pares',
    'The signaling server is stateless and stores no data':
      'El servidor de señalización no tiene estado y no almacena ningún dato',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'Tus datos reales están cifrados de extremo a extremo y nunca son visibles para el servidor',
    'You can self-host your own signaling server for maximum privacy':
      'Puedes alojar tu propio servidor de señalización para máxima privacidad',
    'Your Control': 'Tu control',
    'You can:': 'Puedes:',
    'Export all your data at any time:':
      'Exportar todos tus datos en cualquier momento:',
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
    'Last updated: January 2026': 'Dernière mise à jour : janvier 2026',
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
    'For conversations, agents, and knowledge base':
      'Pour les conversations, agents et base de connaissances',
    'For user preferences and settings': 'Pour les préférences et paramètres',
    'For encrypting API keys': 'Pour le chiffrement des clés API',
    'Third-Party Services': 'Services tiers',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'Lorsque vous configurez des fournisseurs LLM (OpenAI, Anthropic, Google, etc.), vos prompts sont envoyés directement à ces services. Veuillez consulter leurs politiques de confidentialité respectives.',
    'P2P Sync (Optional)': 'Synchronisation P2P (Optionnelle)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS offre une fonction optionnelle de synchronisation pair-à-pair pour synchroniser vos données entre vos appareils :',
    'Sync is opt-in and disabled by default':
      'La synchronisation est optionnelle et désactivée par défaut',
    'When enabled, encrypted updates are synchronized between your devices':
      "Lorsqu'elle est activée, les mises à jour chiffrées sont synchronisées entre vos appareils",
    'A signaling server (wss://signal.devs.new) is used only for WebRTC connection negotiation':
      'Un serveur de signalisation (wss://signal.devs.new) est utilisé uniquement pour la négociation de connexion WebRTC',
    'The signaling server sees only: room IDs and peer IP addresses':
      'Le serveur de signalisation ne voit que : les IDs de salon et les adresses IP des pairs',
    'The signaling server is stateless and stores no data':
      'Le serveur de signalisation est sans état et ne stocke aucune donnée',
    'Your actual data is end-to-end encrypted and never visible to the server':
      'Vos données réelles sont chiffrées de bout en bout et jamais visibles par le serveur',
    'You can self-host your own signaling server for maximum privacy':
      'Vous pouvez héberger votre propre serveur de signalisation pour une confidentialité maximale',
    'Your Control': 'Votre contrôle',
    'You can:': 'Vous pouvez :',
    'Export all your data at any time:':
      'Exporter toutes vos données à tout moment :',
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
    'Last updated: January 2026': '최종 업데이트: 2026년 1월',
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
    'For conversations, agents, and knowledge base':
      '대화, 에이전트, 지식 기반',
    'For user preferences and settings': '사용자 설정 및 환경설정',
    'For encrypting API keys': 'API 키 암호화용',
    'Third-Party Services': '타사 서비스',
    'When you configure LLM providers (OpenAI, Anthropic, Google, etc.), your prompts are sent directly to those services. Please review their respective privacy policies.':
      'OpenAI, Anthropic, Google 등 LLM 공급자를 설정하면 프롬프트가 해당 서비스로 직접 전송됩니다. 각 서비스의 개인정보 처리방침을 확인하세요.',
    'P2P Sync (Optional)': 'P2P 동기화 (선택사항)',
    'DEVS offers an optional peer-to-peer sync feature to synchronize your data across devices:':
      'DEVS는 여러 기기 간에 데이터를 동기화하는 선택적 P2P 동기화 기능을 제공합니다:',
    'Sync is opt-in and disabled by default':
      '동기화는 선택 사항이며 기본적으로 비활성화되어 있습니다',
    'When enabled, encrypted updates are synchronized between your devices':
      '활성화하면 암호화된 업데이트가 기기 간에 동기화됩니다',
    'A signaling server (wss://signal.devs.new) is used only for WebRTC connection negotiation':
      '신호 서버(wss://signal.devs.new)는 WebRTC 연결 협상에만 사용됩니다',
    'The signaling server sees only: room IDs and peer IP addresses':
      '신호 서버는 다음만 확인합니다: 방 ID 및 피어 IP 주소',
    'The signaling server is stateless and stores no data':
      '신호 서버는 상태를 저장하지 않으며 데이터를 저장하지 않습니다',
    'Your actual data is end-to-end encrypted and never visible to the server':
      '실제 데이터는 종단 간 암호화되어 서버에서 절대 볼 수 없습니다',
    'You can self-host your own signaling server for maximum privacy':
      '최대 개인정보 보호를 위해 자체 신호 서버를 호스팅할 수 있습니다',
    'Your Control': '귀하의 제어권',
    'You can:': '다음이 가능합니다:',
    'Export all your data at any time:': '언제든지 모든 데이터 내보내기:',
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
