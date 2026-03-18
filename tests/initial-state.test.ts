import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'

import { usePipeline } from '../src'

//

describe('usePipeline - initial state', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
    ]));

    expect(result.current.state).toBe('idle');
  });

  it('has undefined current when idle', () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
    ]));

    expect(result.current.current).toBeUndefined();
  });

  it('provides run, stop, and resume methods', () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
    ]));

    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.resume).toBe('function');
  });

  it('accepts empty steps array', () => {
    const { result } = renderHook(() => usePipeline([]));

    expect(result.current.state).toBe('idle');
  });
});
