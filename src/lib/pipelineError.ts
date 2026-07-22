/**
 * Centralized error logger for data pipeline issues.
 * Supports multiple signatures:
 * logPipelineError(contextString, error)
 * logPipelineError(error, contextObject)
 */
export function logPipelineError(arg1: unknown, arg2?: unknown): void {
  let context: string | object = 'UnknownContext';
  let error: unknown = null;

  if (typeof arg1 === 'string') {
    // Signature: logPipelineError(context: string, error: unknown)
    context = arg1;
    error = arg2;
  } else if (arg1 instanceof Error || (arg1 && typeof arg1 === 'object')) {
    // Signature: logPipelineError(error: unknown, context: object)
    error = arg1;
    context = arg2 as object;
  } else {
    error = arg1;
  }

  // Formatting the output for the console
  const timestamp = new Date().toISOString();
  console.group(`[PipelineError] ${timestamp}`);

  if (typeof context === 'string') {
    console.error(`Context: ${context}`);
  } else {
    console.error('Context:', context);
  }

  console.error('Error:', error);
  console.groupEnd();
}

export function isAbortError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError';
}
