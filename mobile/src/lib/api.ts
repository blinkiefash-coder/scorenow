import Constants from 'expo-constants'

// In development the API is assumed to run on the same machine that serves the Expo bundle.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0]
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (devHost ? `http://${devHost}:3000` : 'http://localhost:3000')

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

type Options = { method?: 'GET' | 'POST' | 'PATCH'; token?: string | null; body?: unknown; onUnauthorized?: () => void }

export async function api<T>(path: string, { method = 'GET', token, body, onUnauthorized }: Options = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Unable to reach Scorenow. Check your internet connection.', 0)
  }
  const data = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) {
    if (response.status === 401) onUnauthorized?.()
    throw new ApiError(data.message || 'Something went wrong. Please try again.', response.status)
  }
  return data as T
}
