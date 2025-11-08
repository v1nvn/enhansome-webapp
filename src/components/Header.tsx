import { useState } from 'react'

import { Link } from '@tanstack/react-router'
import { Database, Home, Menu, X } from 'lucide-react'

import ThemeToggle from './ThemeToggle'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white shadow-lg dark:bg-slate-900">
        <div className="flex items-center">
          <button
            aria-label="Open menu"
            className="rounded-lg p-2 transition-colors hover:bg-slate-700 dark:hover:bg-slate-800"
            onClick={() => {
              setIsOpen(true)
            }}
            type="button"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-4 text-xl font-semibold">
            <Link
              className="text-white transition-colors hover:text-cyan-400"
              to="/"
            >
              Enhansome Registry
            </Link>
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 transform flex-col bg-slate-900 text-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-950 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-700 p-4 dark:border-slate-800">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            aria-label="Close menu"
            className="rounded-lg p-2 transition-colors hover:bg-slate-800 dark:hover:bg-slate-900"
            onClick={() => {
              setIsOpen(false)
            }}
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <Link
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2 dark:bg-cyan-700 dark:hover:bg-cyan-600',
            }}
            className="mb-2 flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-800 dark:hover:bg-slate-900"
            onClick={() => {
              setIsOpen(false)
            }}
            to="/"
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2 dark:bg-cyan-700 dark:hover:bg-cyan-600',
            }}
            className="mb-2 flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-800 dark:hover:bg-slate-900"
            onClick={() => {
              setIsOpen(false)
            }}
            to="/registry"
          >
            <Database size={20} />
            <span className="font-medium">Browse All</span>
          </Link>
        </nav>
      </aside>
    </>
  )
}
