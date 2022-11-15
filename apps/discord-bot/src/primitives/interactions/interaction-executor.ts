export class InteractionExecuteError extends Error {}

export interface InteractionExecutor<T> {
  execute(): Promise<T>;
}
