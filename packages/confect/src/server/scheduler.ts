import type {
  OptionalRestArgs,
  SchedulableFunctionReference,
  Scheduler,
} from "convex/server";
import { Effect } from "effect";

export interface ConfectScheduler {
  runAfter<FuncRef extends SchedulableFunctionReference>(
    delayMs: number,
    functionReference: FuncRef,
    ...args: OptionalRestArgs<FuncRef>
  ): Effect.Effect<void>;
  runAt<FuncRef extends SchedulableFunctionReference>(
    timestamp: number | Date,
    functionReference: FuncRef,
    ...args: OptionalRestArgs<FuncRef>
  ): Effect.Effect<void>;
}

export class ConfectSchedulerImpl implements ConfectScheduler {
  constructor(private scheduler: Scheduler) {}

  runAfter<FuncRef extends SchedulableFunctionReference>(
    delayMs: number,
    functionReference: FuncRef,
    ...args: OptionalRestArgs<FuncRef>
  ): Effect.Effect<void> {
    return Effect.promise(() =>
      this.scheduler.runAfter(delayMs, functionReference, ...args),
    );
  }
  runAt<FuncRef extends SchedulableFunctionReference>(
    timestamp: number | Date,
    functionReference: FuncRef,
    ...args: OptionalRestArgs<FuncRef>
  ): Effect.Effect<void> {
    return Effect.promise(() =>
      this.scheduler.runAt(timestamp, functionReference, ...args),
    );
  }
}
