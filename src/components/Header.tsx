import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="bg-white px-6 py-2 shadow-sm">
      <h1 className="text-xl font-bold">
        <Link
          className="cursor-pointer bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent transition-opacity hover:opacity-80"
          to="/"
        >
          Enhansome Registry
        </Link>
      </h1>
    </header>
  )
}
