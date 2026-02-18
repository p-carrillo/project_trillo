export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export function createApiError(error: ApiErrorShape): { error: ApiErrorShape } {
  return { error };
}
