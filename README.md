# react-pipeline-runner

A lightweight React hook for running async actions sequentially with abort support, error handling, and resume capability.

## Installation

```bash
npm install react-pipeline-runner
```

## Features

- Sequential execution of sync/async actions
- AbortController support for cancellation
- Resume from failed step
- TypeScript-first with intelligent ID inference
- Discriminated union for type-safe state handling
- Automatic cleanup on unmount
- Zero dependencies (except React 18+)

## Basic Usage

```tsx
import { useMemo } from 'react'
import { usePipeline } from 'react-pipeline-runner'

function MyComponent() {
  const steps = useMemo(() => [
    async (signal) => {
      await fetch('/api/step1', { signal })
    },
    async (signal) => {
      await fetch('/api/step2', { signal })
    },
    async () => {
      console.log('Step 3 - no signal needed')
    },
  ], [])

  const pipeline = usePipeline(steps)

  return (
    <div>
      <p>State: {pipeline.state}</p>
      
      {pipeline.state === 'idle' && (
        <button onClick={pipeline.start}>Start</button>
      )}
      
      {pipeline.state === 'running' && (
        <>
          <p>Running step {pipeline.current.index + 1}...</p>
          <button onClick={pipeline.stop}>Cancel</button>
        </>
      )}
      
      {pipeline.state === 'failed' && (
        <>
          <p>Error at step {pipeline.current.index + 1}: {String(pipeline.current.error)}</p>
          <button onClick={pipeline.resume}>Retry</button>
          <button onClick={pipeline.stop}>Abandon</button>
        </>
      )}
      
      {pipeline.state === 'completed' && (
        <p>Done!</p>
      )}
    </div>
  )
}
```

## Steps with IDs

You can assign IDs to steps for better tracking. TypeScript will automatically infer the ID types.

```tsx
const steps = useMemo(() => [
  { id: 'fetch-user', action: async () => fetchUser() },
  { id: 'validate', action: () => validateData() },
  async () => doSomethingWithoutId(),
  { id: 'save', action: async () => saveData() },
], [])

const pipeline = usePipeline(steps)

if (pipeline.state === 'running') {
  console.log('Current step:', pipeline.current.id)
  // TypeScript knows: id is 'fetch-user' | 'validate' | 'save' | undefined
}
```

## Autostart

Start the pipeline automatically when the component mounts:

```tsx
const steps = useMemo(() => [step1, step2, step3], [])

const pipeline = usePipeline(steps, { autostart: true })
```

## API

### `usePipeline(steps, options?)`

#### Parameters

- `steps` - Array of actions. Each action can be:
  - A function: `(signal?: AbortSignal) => Promise<unknown> | unknown`
  - An object: `{ id: string, action: (signal?: AbortSignal) => Promise<unknown> | unknown }`
- `options` - Optional configuration:
  - `autostart?: boolean` - Start pipeline on mount (default: `false`)

#### Returns (Discriminated Union)

The hook returns a discriminated union based on `state`:

| State | `current` | Description |
|-------|-----------|-------------|
| `'idle'` | `undefined` | Not started or stopped |
| `'running'` | `CurrentStatus` | Executing steps |
| `'failed'` | `CurrentStatus` | Stopped on error |
| `'completed'` | `undefined` | All steps done |

**Methods:**

- `start()` - Start from beginning. Returns `true` if started, `false` if running or failed.
- `stop()` - Cancel and reset to idle. Returns `true` if was running or failed, `false` otherwise.
- `resume()` - Retry failed step. Returns `true` if was failed, `false` otherwise.

**State transitions:**

| State | `start()` | `stop()` | `resume()` |
|-------|-----------|----------|------------|
| `idle` | ✅ starts | ❌ false | ❌ false |
| `running` | ❌ false | ✅ → idle | ❌ false |
| `failed` | ❌ false | ✅ → idle | ✅ retries |
| `completed` | ✅ restarts | ❌ false | ❌ false |

**CurrentStatus:**

```ts
{
  index: number              // Step index (0-based)
  id: string | undefined     // Step ID if provided
  state: 'running' | 'failed'
  error: unknown | undefined // Error if failed
}
```

## Type Safety

Thanks to discriminated unions, TypeScript narrows the `current` type based on `state`:

```tsx
if (pipeline.state === 'failed') {
  // TypeScript knows current is defined!
  console.log(pipeline.current.error) // ✅ No need for && pipeline.current
}

if (pipeline.state === 'idle') {
  pipeline.current.index // ❌ Compile error - current is undefined
}
```

## AbortController Support

Each action receives an optional `AbortSignal`. Use it to make your actions cancellable:

```tsx
async (signal) => {
  // Fetch automatically aborts when signal fires
  const response = await fetch('/api/data', { signal })
  return response.json()
}
```

When `stop()` is called or the component unmounts, the signal is aborted automatically.

## Best Practice: Memoize Steps

Always wrap your steps array in `useMemo` to ensure stable references:

```tsx
// ❌ Bad - new array on every render
const pipeline = usePipeline([
  () => fetchData(),
  () => processData(),
])

// ✅ Good - stable reference
const steps = useMemo(() => [
  () => fetchData(),
  () => processData(),
], [])

const pipeline = usePipeline(steps)
```

If steps depend on props or state, include them in dependencies:

```tsx
const steps = useMemo(() => [
  () => fetchUser(userId),
  () => sendNotification(),
], [userId])

const pipeline = usePipeline(steps)
```

**Why?** Without `useMemo`, the `start` and `resume` methods get new references on every render, which can cause unnecessary re-renders in child components or issues with effect dependencies.

## License

ISC
