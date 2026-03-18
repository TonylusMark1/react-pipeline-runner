import * as React from 'react'

import type * as Types from './types'
import * as Utils from './utils'

//

function isStepWithId(step: Types.PipelineStep): step is Types.PipelineStepWithId {
  return typeof step === 'object' && step !== null && 'action' in step;
}

function getStepAction(step: Types.PipelineStep): Types.PipelineAction {
  if (isStepWithId(step))
    return step.action;

  return step;
}

function getStepId<T extends Types.PipelineStep>(step: T): Types.ExtractStepId<T> {
  if (isStepWithId(step))
    return step.id as Types.ExtractStepId<T>;

  return undefined as Types.ExtractStepId<T>;
}

//

/**
 * Runs a list of actions sequentially with support for abort, resume, and error handling.
 */
export function usePipeline<const T extends readonly Types.PipelineStep[]>(
  steps: T,
  options?: Types.PipelineOptions
): Types.PipelineResult<Types.ExtractAllIds<T>> {
  type TIds = Types.ExtractAllIds<T>

  const [state, stateRef, setState] = Utils.useStateRef<Types.PipelineState>('idle');
  const [current, setCurrent] = React.useState<Types.CurrentStatus<TIds> | undefined>(undefined);

  const currentIndexRef = React.useRef<number>(0);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  //

  const runFromIndex = React.useCallback(async (startIndex: number) => {
    setState('running');

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    for (let i = startIndex; i < steps.length; i++) {
      if (signal.aborted)
        return;

      const step = steps[i];
      const action = getStepAction(step);
      const id = getStepId(step) as TIds;

      currentIndexRef.current = i;
      setCurrent({ index: i, id, state: 'running', error: undefined });

      try {
        await action(signal);
      }
      catch (error) {
        if (signal.aborted)
          return;

        setState('failed');
        setCurrent({ index: i, id, state: 'failed', error });
        return;
      }
    }

    if (signal.aborted)
      return;

    setState('completed');
    setCurrent(undefined);
  }, [steps]);

  //

  const start = React.useCallback(() => {
    if (stateRef.current === 'running' || stateRef.current === 'failed')
      return false;

    runFromIndex(0);
    return true;
  }, [runFromIndex]);

  const stop = React.useCallback(() => {
    if (stateRef.current !== 'running' && stateRef.current !== 'failed')
      return false;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setState('idle');
    setCurrent(undefined);

    return true;
  }, []);

  const resume = React.useCallback(() => {
    if (stateRef.current !== 'failed')
      return false;

    runFromIndex(currentIndexRef.current);
    return true;
  }, [runFromIndex]);

  //

  React.useEffect(() => {
    if (options?.autostart)
      start();

    return () => {
      stop();
    };
  }, []);

  //

  return React.useMemo(
    () => ({ state, current, start, stop, resume }),
    [state, current, start, stop, resume]
  ) as Types.PipelineResult<TIds>;
}
