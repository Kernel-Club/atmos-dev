const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export async function getWeather(city) {
  const response = await fetch(`${API_URL}/weather/${encodeURIComponent(city)}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch weather data')
  }

  return response.json()
}

export async function getHistory() {
  const response = await fetch(`${API_URL}/history`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch weather history')
  }

  return response.json()
}

export async function clearHistory() {
  const response = await fetch(`${API_URL}/history`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to clear weather history')
  }

  return response.json()
}
