import Header from './components/Header'
import { useRoute } from './lib/router'
import Check from './pages/Check'
import Explore from './pages/Explore'
import Home from './pages/Home'
import Verify from './pages/Verify'

export default function App() {
  const { parts, path } = useRoute()
  const [section, arg] = parts

  let page
  if (section === 'check') page = <Check username={arg} />
  else if (section === 'verify' && arg) page = <Verify login={arg} />
  else if (section === 'explore') page = <Explore />
  else page = <Home />

  return (
    <>
      <Header path={path} />
      {page}
    </>
  )
}
