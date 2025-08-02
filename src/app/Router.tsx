import { Outlet, Route, Routes, useParams } from 'react-router-dom'

import { I18nProvider } from '@/i18n'
import { IndexPage } from '@/pages/IndexPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CustomErrorPage } from '@/pages/CustomErrorPage'

const routes = {
  index: IndexPage,
  settings: SettingsPage,
  404: CustomErrorPage,
  '*': CustomErrorPage,
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
            errorElement="Page not found"
          />
        ))}
        <Route path=":lang" element={<LanguagePath />}>
          {Object.entries(routes).map(([path, Component]) => (
            <Route
              key={path}
              path={path === 'index' ? undefined : path}
              element={<Component />}
              index={path === 'index'}
              errorElement="Page not found"
            />
          ))}
        </Route>
      </Route>
    </Routes>
  )
}

export default Router

const LanguagePath = () => {
  const { lang } = useParams()
  // const navigate = useNavigate()
  // const curPath = location.pathname
  // useEffect(() => {
  //   if (lang) {
  //     navigate('/' + lang + curPath, { replace: true })
  //   }
  // }, [lang])

  const l = !lang ? 'en' : lang.length === 2 ? lang : 'en'

  // Provide the language from URL to I18nProvider
  return (
    <I18nProvider lang={l as any}>
      <Outlet />
    </I18nProvider>
  )
}
