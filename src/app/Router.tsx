import { Outlet, Route, Routes, useParams } from 'react-router-dom'

import { defaultLang, I18nProvider, Lang, langs } from '@/i18n'
import { IndexPage } from '@/pages/IndexPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SettingsPage } from '@/pages/SettingsPage'

const routes = {
  index: IndexPage,
  settings: SettingsPage,
  '*': NotFoundPage,
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Outlet />}>
        {Object.entries(routes).map(([path, Component]) => (
          <Route
            key={path}
            path={path === 'index' ? undefined : path}
            element={
              <I18nProvider>
                <Component />
              </I18nProvider>
            }
            index={path === 'index'}
          />
        ))}
        <Route path=":lang" element={<LanguagePath />}>
          {Object.entries(routes).map(([path, Component]) => (
            <Route
              key={path}
              path={path === 'index' ? undefined : path}
              element={<Component />}
              index={path === 'index'}
            />
          ))}
        </Route>
      </Route>
    </Routes>
  )
}

export default Router

const LanguagePath = () => {
  const params = useParams()
  const lang = (params.lang as Lang) || defaultLang

  return (
    <I18nProvider lang={lang}>
      {!langs.includes(lang) ? <NotFoundPage /> : <Outlet />}
    </I18nProvider>
  )
}
export { LanguagePath }
