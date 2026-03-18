import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { usePipeline } from '../src'
import * as Helpers from './helpers'

//

describe('usePipeline - mixed steps (with and without IDs)', () => {
  it('handles pipeline with mixed step types', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'func1'),
      { id: 'named-step', action: Helpers.createSyncStep(tracker, 'named') },
      Helpers.createSyncStep(tracker, 'func2'),
      { id: 'another-named', action: Helpers.createSyncStep(tracker, 'another') },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['func1', 'named', 'func2', 'another']);
  });

  it('tracks correct id for step with id in mixed pipeline', async () => {
    const { result } = renderHook(() => usePipeline([
      async () => { await Helpers.delay(10); },
      { id: 'middle', action: async () => { await Helpers.delay(100); } },
      () => {},
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(20);

    await waitFor(() => {
      return result.current.current?.id === 'middle';
    });

    expect(result.current.current!.id).toBe('middle');
    expect(result.current.current!.index).toBe(1);

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });
  });

  it('fails on step without id and preserves undefined id', async () => {
    const { result } = renderHook(() => usePipeline([
      { id: 'first', action: () => {} },
      () => { throw new Error('fail'); },
      { id: 'third', action: () => {} },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.index).toBe(1);
    expect(result.current.current!.id).toBeUndefined();
  });

  it('fails on step with id and preserves that id', async () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
      { id: 'failing-step', action: () => { throw new Error('fail'); } },
      () => {},
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.index).toBe(1);
    expect(result.current.current!.id).toBe('failing-step');
  });
});

//

describe('usePipeline - non-Error throws', () => {
  it('handles step throwing a string', async () => {
    const { result } = renderHook(() => usePipeline([
      () => { throw 'string error'; },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBe('string error');
  });

  it('handles step throwing undefined', async () => {
    const { result } = renderHook(() => usePipeline([
      () => { throw undefined; },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBeUndefined();
  });

  it('handles step throwing null', async () => {
    const { result } = renderHook(() => usePipeline([
      () => { throw null; },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBeNull();
  });

  it('handles step throwing a number', async () => {
    const { result } = renderHook(() => usePipeline([
      () => { throw 42; },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBe(42);
  });

  it('handles step throwing an object', async () => {
    const errorObj = { code: 'ERR_001', message: 'Custom error' };

    const { result } = renderHook(() => usePipeline([
      () => { throw errorObj; },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toEqual(errorObj);
  });

  it('handles async step rejecting with non-Error', async () => {
    const { result } = renderHook(() => usePipeline([
      async () => {
        await Helpers.delay(10);
        throw 'async string error';
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBe('async string error');
  });
});

//

describe('usePipeline - AbortError handling', () => {
  it('handles step throwing AbortError', async () => {
    const { result } = renderHook(() => usePipeline([
      () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect((result.current.current!.error as Error).name).toBe('AbortError');
  });

  it('handles DOMException abort from fetch-like operation', async () => {
    const { result } = renderHook(() => usePipeline([
      () => {
        throw new DOMException('The operation was aborted', 'AbortError');
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect((result.current.current!.error as DOMException).name).toBe('AbortError');
  });
});

//

describe('usePipeline - method reference stability', () => {
  it('returned object is referentially stable when nothing changes', () => {
    const steps = [() => {}];

    const { result, rerender } = renderHook(() => usePipeline(steps));

    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('returned object changes when state changes', async () => {
    const steps = [Helpers.createSyncStep([], 'step')];

    const { result } = renderHook(() => usePipeline(steps));

    const firstResult = result.current;

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(result.current).not.toBe(firstResult);
  });

  it('stop method is referentially stable across rerenders', () => {
    const { result, rerender } = renderHook(() => usePipeline([
      () => {},
    ]));

    const firstStop = result.current.stop;

    rerender();

    expect(result.current.stop).toBe(firstStop);
  });

  it('stop method remains stable across multiple rerenders', () => {
    const { result, rerender } = renderHook(() => usePipeline([
      () => {},
    ]));

    const firstStop = result.current.stop;

    for (let i = 0; i < 5; i++)
      rerender();

    expect(result.current.stop).toBe(firstStop);
  });

  it('methods are callable after rerender', async () => {
    const tracker: string[] = [];

    const { result, rerender } = renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'step'),
    ]));

    rerender();
    rerender();

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step']);
  });
});

//

describe('usePipeline - rapid sequences', () => {
  it('stop immediately after start', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createAbortAwareStep(tracker, 'step1', 50),
      Helpers.createSyncStep(tracker, 'step2'),
    ]));

    act(() => {
      result.current.start();
      result.current.stop();
    });

    expect(result.current.state).toBe('idle');

    await Helpers.advanceTime(100);

    expect(tracker).toContain('step1:start');
    expect(tracker).toContain('step1:aborted');
    expect(tracker).not.toContain('step2');
  });

  it('start immediately after stop uses fresh AbortController', async () => {
    const tracker: string[] = [];
    const signals: AbortSignal[] = [];

    const { result } = renderHook(() => usePipeline([
      async (signal) => {
        if (signal)
          signals.push(signal);

        tracker.push('step:start');
        await Helpers.delay(30);

        if (signal?.aborted) {
          tracker.push('step:aborted');
          return;
        }

        tracker.push('step:end');
      },
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    act(() => {
      result.current.stop();
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(signals.length).toBe(2);
    expect(signals[0]).not.toBe(signals[1]);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('multiple stop calls are safe', () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    let results: boolean[] = [];

    act(() => {
      results.push(result.current.stop());
      results.push(result.current.stop());
      results.push(result.current.stop());
    });

    expect(results).toEqual([true, false, false]);
    expect(result.current.state).toBe('idle');
  });

  it('multiple start calls during running are safe', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep(tracker, 'step', 50),
    ]));

    let results: boolean[] = [];

    act(() => {
      results.push(result.current.start());
      results.push(result.current.start());
      results.push(result.current.start());
    });

    expect(results).toEqual([true, false, false]);

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step']);
  });

  it('resume then stop in failed state', async () => {
    let shouldFail = true;

    const { result } = renderHook(() => usePipeline([
      async () => {
        await Helpers.delay(50);

        if (shouldFail)
          throw new Error('fail');
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    shouldFail = false;

    act(() => {
      result.current.resume();
    });

    expect(result.current.state).toBe('running');

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe('idle');
  });
});

//

describe('usePipeline - steps array changes', () => {
  it('uses new steps array on next start', async () => {
    const tracker: string[] = [];
    let useAltSteps = false;

    const { result, rerender } = renderHook(() => usePipeline(
      useAltSteps
        ? [Helpers.createSyncStep(tracker, 'alt1'), Helpers.createSyncStep(tracker, 'alt2')]
        : [Helpers.createSyncStep(tracker, 'orig1'), Helpers.createSyncStep(tracker, 'orig2')]
    ));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['orig1', 'orig2']);

    useAltSteps = true;
    rerender();
    tracker.length = 0;

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['alt1', 'alt2']);
  });

  it('handles steps count change', async () => {
    const tracker: string[] = [];
    let stepCount = 2;

    const { result, rerender } = renderHook(() => usePipeline(
      Array.from({ length: stepCount }, (_, i) =>
        Helpers.createSyncStep(tracker, `step${i + 1}`)
      )
    ));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2']);

    stepCount = 4;
    rerender();
    tracker.length = 0;

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2', 'step3', 'step4']);
  });
});
