import { useState } from 'react'

interface CounterProps {
  initialValue?: number;
  label?: string;
}

export default function Counter({ initialValue = 0, label = 'Count' }: CounterProps = {}) {
  const [count, setCount] = useState(initialValue)
  
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
      <h3>{label}: {count}</h3>
      <div>
        <button 
          onClick={() => setCount(count - 1)}
          style={{ marginRight: '0.5rem', padding: '0.5rem 1rem' }}
        >
          -
        </button>
        <button 
          onClick={() => setCount(count + 1)}
          style={{ padding: '0.5rem 1rem' }}
        >
          +
        </button>
      </div>
    </div>
  )
}