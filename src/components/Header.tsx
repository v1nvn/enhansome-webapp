import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="bg-white py-3 pl-8 shadow-sm">
      <h1 className="text-2xl font-black">
        <Link
          className="cursor-pointer bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent transition-opacity hover:opacity-80"
          to="/"
        >
          Enhansome
        </Link>
      </h1>
    </header>
  )
}
