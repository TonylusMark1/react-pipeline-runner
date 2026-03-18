import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { usePipeline } from '../src'
import * as Helpers from './helpers'

//

describe('usePipeline - cleanup on unmount', () => {
  it('aborts signal on unmount', async () => {
    let signalAborted = false;

    const { result, unmount } = renderHook(() => usePipeline([
      async (signal) => {
        await Helpers.delay(100);

        signalAborted = signal?.aborted ?? false;
      },
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    unmount();

    await Helpers.advanceTime(150);

    expect(signalAborted).toBe(true);
  });

  it('prevents step completion after unmount', async () => {
    const tracker: string[] = [];

    const { result, unmount } = renderHook(() => usePipeline([
      Helpers.createAbortAwareStep(tracker, 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);
    expect(tracker).toContain('step:start');

    unmount();

    await Helpers.advanceTime(150);

    expect(tracker).toContain('step:aborted');
    expect(tracker).not.toContain('step:end');
  });

  it('prevents subsequent steps after unmount', async () => {
    const tracker: string[] = [];

    const { result, unmount } = renderHook(() => usePipeline([
      Helpers.createAbortAwareStep(tracker, 'step1', 50),
      Helpers.createSyncStep(tracker, 'step2'),
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    unmount();

    await Helpers.advanceTime(100);

    expect(tracker).not.toContain('step2');
  });

  it('handles unmount during idle state gracefully', () => {
    const { unmount } = renderHook(() => usePipeline([
      () => {},
    ]));

    expect(() => unmount()).not.toThrow();
  });

  it('handles unmount during completed state gracefully', async () => {
    const { result, unmount } = renderHook(() => usePipeline([
      Helpers.createSyncStep([], 'step'),
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    expect(() => unmount()).not.toThrow();
  });

  it('handles unmount during failed state gracefully', async () => {
    const { result, unmount } = renderHook(() => usePipeline([
      Helpers.createFailingStep([], 'step'),
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    expect(() => unmount()).not.toThrow();
  });

  it('does not cause state updates after unmount', async () => {
    const tracker: string[] = [];

    const { result, unmount } = renderHook(() => usePipeline([
      async () => {
        await Helpers.delay(50);
        tracker.push('step-completed');
      },
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    unmount();

    await Helpers.advanceTime(100);

    const reactWarnings = consoleSpy.mock.calls.filter(
      call => call[0]?.includes?.('unmounted component')
    );

    expect(reactWarnings).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
