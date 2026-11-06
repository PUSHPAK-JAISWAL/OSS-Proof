import { useEffect, useState } from 'react'
import { go, scrollToId } from '../lib/router'
import { REPO_URL } from '../lib/config'
import { Btn, Icon, Mark } from './ui'

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || '')
  const effective = theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme
  }, [theme])
  const toggle = () => {
    const next = effective === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('ossproof-theme', next) } catch { /* private mode */ }
  }
  return [effective, toggle]
}

export default function Header({ path }) {
  const [theme, toggle] = useTheme()
  const onHome = path === '/'
  const jump = (id) => (e) => {
    e.preventDefault()
    if (onHome) scrollToId(id)
    else {
      go('/')
      setTimeout(() => scrollToId(id), 60)
    }
  }
  const link = (active) => `link text-[15px] ${active ? 'link--on' : ''}`

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-bg/85 backdrop-blur" style={{ height: 'var(--nav)' }}>
      <div className="wrap h-full flex items-center justify-between gap-6">
        <a href="#/" className="flex items-center gap-2.5 font-medium text-[17px] tracking-tight" aria-label="OSS Proof home">
          <Mark /> <span>OSS Proof</span>
        </a>
        <nav className="hidden md:flex items-center gap-8" aria-label="Main">
          <a href="#/" onClick={jump('how')} className={link(false)}>How it works</a>
          <a href="#/" onClick={jump('grading')} className={link(false)}>Grading</a>
          <a href="#/explore" className={link(path === '/explore')}>Developers</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={link(false)}>GitHub</a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="h-11 w-11 grid place-items-center rounded-sm hover:bg-ink/10 active:translate-y-px transition-colors cursor-pointer"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <Btn href="#/check" className="hidden sm:inline-flex">Get a certificate</Btn>
        </div>
      </div>
    </header>
  )
}
