import * as React from 'react'

//

/**
 * Combines useState and useRef - state for React reactivity, ref for immediate access in async callbacks.
 */
export function useStateRef<T>(initialValue: T) {
  const [state, setState] = React.useState(initialValue);
  const ref = React.useRef(initialValue);

  const setValue = React.useCallback((value: T) => {
    ref.current = value;
    setState(value);
  }, []);

  return [state, ref, setValue] as const;
}
