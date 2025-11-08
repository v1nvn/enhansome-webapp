import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock ResizeObserver for react-virtual
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}))

// Mock getBoundingClientRect for virtualization
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  bottom: 600,
  height: 600,
  left: 0,
  right: 1024,
  top: 0,
  width: 1024,
  x: 0,
  y: 0,
  toJSON: () => {},
})

// Mock offsetHeight/offsetWidth for virtualization
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: {
    get() {
      return 600
    },
  },
  offsetWidth: {
    get() {
      return 1024
    },
  },
})
