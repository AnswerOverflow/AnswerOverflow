"use client"

import React from "react"

export function Client(){
  const [counter, setCounter] = React.useState(0)
  return <div>
    <h1>Counter: {counter}</h1>
    <script>
      console.log('Hello from the client!')
    </script>
    <button onClick={() => setCounter(counter + 1)}>Increment</button>
  </div>
}
