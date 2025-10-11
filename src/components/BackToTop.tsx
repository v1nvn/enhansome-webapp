import { useEffect, useState } from 'react'

import { ArrowUp } from 'lucide-react'

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      behavior: 'smooth',
      top: 0,
    })
  }

  if (!isVisible) {
    return null
  }

  return (
    <button
      aria-label="Back to top"
      className="fixed bottom-8 right-8 z-50 rounded-full bg-cyan-500 p-3 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-cyan-600"
      onClick={scrollToTop}
    >
      <ArrowUp className="h-6 w-6" />
    </button>
  )
}
