import { useState } from 'react'
import './App.css'
import {
  getWeather,
  getHistory,
  clearHistory,
} from './services/weatherApi'

function App() {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  async function handleSearch(cityName = city) {
    const searchCity = cityName.trim()

    if (!searchCity) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await getWeather(searchCity)

      setWeather(data)
      setCity(searchCity)
    } catch (err) {
      setWeather(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleHistoryOpen() {
    setHistoryOpen(true)
    loadHistory()
  }

  async function loadHistory() {
    setHistoryLoading(true)
    setHistoryError('')

    try {
      const data = await getHistory()
      setHistory(data)
    } catch (err) {
      setHistoryError(err.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  function handleHistoryClose() {
    setHistoryOpen(false)
  }

  async function handleClearHistory() {
    try {
      await clearHistory()
      setHistory([])
    } catch (err) {
      setHistoryError(err.message)
    }
  }
  
  function handleSubmit(event) {
    event.preventDefault()
    handleSearch()
  }

  function formatHistoryTimestamp(timestamp) {
    const normalizedTimestamp =
      timestamp.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(timestamp)
        ? timestamp
        : `${timestamp}Z`

    const date = new Date(normalizedTimestamp)

    const day = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
    }).format(date)

    const month = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
    }).format(date)

    const weekday = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
    }).format(date)

    const year = new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
    }).format(date)

    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)

    return {
      date: `${day} ${month} · ${weekday}`,
      year,
      time,
    }
  }

  function handleQuickCity(cityName) {
    setCity(cityName)
    handleSearch(cityName)
  }

  function handleHistorySelect(cityName) {
    handleHistoryClose()
    handleQuickCity(cityName)
  }

  function getWeatherCondition(description) {
    const text = description.toLowerCase()

    if (
      text.includes('snow') ||
      text.includes('sleet')
    ) {
      return 'condition-snow'
    }

    if (
      text.includes('rain') ||
      text.includes('drizzle') ||
      text.includes('shower')
    ) {
      return 'condition-rain'
    }

    if (
      text.includes('cloud') ||
      text.includes('overcast')
    ) {
      return 'condition-cloudy'
    }

    return 'condition-clear'
  }

  return (
    <div className="app">
      <div className="app-shell">

        <header className="header">
          <div className="brand">
            <div className="brand-logo" aria-hidden="true">
              <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 30C12 19.507 20.507 11 31 11C42.046 11 51 19.954 51 31"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                <path
                  d="M13.5 36.5C13.5 31.806 17.306 28 22 28C23.335 28 24.602 28.307 25.73 28.853C27.363 24.84 31.31 22 35.92 22C42.03 22 47 26.97 47 33.08C47 33.42 46.985 33.756 46.955 34.087C48.058 33.39 49.36 33 50.75 33C54.755 33 58 36.245 58 40.25C58 44.255 54.755 47.5 50.75 47.5H21C15.201 47.5 10.5 42.799 10.5 37C10.5 36.832 10.504 36.665 10.512 36.5H13.5Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <div className="brand-name">
              <span>Project</span>
              <strong>Atmos</strong>
            </div>
          </div>
          <nav className="nav">
            <button
              className={`nav-item ${!historyOpen ? 'active' : ''}`}
              onClick={handleHistoryClose}
            >
              Weather
            </button>

            <button
              className={`nav-item ${historyOpen ? 'active' : ''}`}
              onClick={handleHistoryOpen}
            >
              History
            </button>
          </nav>
        </header>

                {historyOpen && (
          <aside className="history-drawer">
            <div className="history-header">
              <button
                className="history-back"
                onClick={handleHistoryClose}
                aria-label="Back to weather"
              >
                ←
              </button>

              <h2>WEATHER HISTORY</h2>

              <button
                className={`history-refresh ${historyLoading ? 'is-loading' : ''}`}
                onClick={loadHistory}
                disabled={historyLoading}
                aria-label="Refresh history"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L21 10" />
                </svg>
              </button>

              <button
                className="history-clear"
                onClick={handleClearHistory}
              >
                CLEAR
              </button>
            </div>

            <div className="history-content">
              {historyLoading && (
                <div className="history-state">
                  Loading history...
                </div>
              )}

              {historyError && (
                <div className="history-state history-error">
                  {historyError}
                </div>
              )}

              {!historyLoading && !historyError && history.length === 0 && (
                <div className="history-state">
                  <strong>No weather history</strong>
                  <span>
                    Search for a city to start building history.
                  </span>
                </div>
              )}

              {!historyLoading && !historyError && history.length > 0 && (
                <div className="history-list">
                  {history.map((item, index) => (
                    <div
                      className="history-card"
                      key={`${item.city}-${item.timestamp}-${index}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleHistorySelect(item.city)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleHistorySelect(item.city)
                        }
                      }}
                    >
                      <div className="history-card-top">
                        <strong>{item.city}</strong>
                        <span>{item.temperature}°</span>
                      </div>

                      <div className="history-description">
                        {item.description}
                      </div>

                      <div className="history-card-bottom">
                        <span>{item.humidity}% humidity</span>

                        <span>
                          {formatHistoryTimestamp(item.timestamp).date}
                        </span>

                        <span>
                          {formatHistoryTimestamp(item.timestamp).year}
                        </span>

                        <span>
                          {formatHistoryTimestamp(item.timestamp).time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="dashboard">

          <section className="hero">
            <h1>
              Real-time weather
              <br />
              for <span>everywhere.</span>
            </h1>

            <form
              className="search"
              onSubmit={handleSubmit}
            >
              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Search a city..."
                disabled={loading}
              />

              <button
                className="search-button"
                type="submit"
                aria-label="Search weather"
                disabled={loading}
              >
                →
              </button>
            </form>

            <div className="quick-cities">
              <span>Try:</span>

              <button
                type="button"
                onClick={() => handleQuickCity('Seoul')}
                disabled={loading}
              >
                Seoul
              </button>

              <button
                type="button"
                onClick={() => handleQuickCity('New York')}
                disabled={loading}
              >
                New York
              </button>

              <button
                type="button"
                onClick={() => handleQuickCity('Tokyo')}
                disabled={loading}
              >
                Tokyo
              </button>

              <button
                type="button"
                onClick={() => handleQuickCity('London')}
                disabled={loading}
              >
                London
              </button>

              <button
                type="button"
                onClick={() => handleQuickCity('Dubai')}
                disabled={loading}
              >
                Dubai
              </button>
            </div>
          </section>
<section className="weather-section">
  <div className="weather-card">

    {loading && (
      <div className="empty-weather">
        <div className="empty-weather-icon">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              transform="translate(8 8) scale(2)"
              d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2>Loading weather...</h2>
      </div>
    )}

    {!loading && error && (
      <div className="empty-weather">
        <div className="empty-weather-icon">
          !
        </div>

        <h2>Unable to load weather</h2>

        <p>{error}</p>
      </div>
    )}

    {!loading && !error && !weather && (
      <div className="empty-weather">
        <div className="empty-weather-icon">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              transform="translate(8 8) scale(2)"
              d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2>
          Select a city to display weather
        </h2>

        <p>
          Search for a city above to view current conditions.
        </p>
      </div>
    )}


              {!loading && !error && weather && (
                <div className="weather-content">

                  <div
                    className={`weather-main ${getWeatherCondition(weather.description)}`}
                  >

                    <div className="weather-heading">
                      <p className="weather-label">
                        CURRENT CONDITIONS
                      </p>

                      <h2>
                        {weather.city}
                      </h2>
                    </div>

                    <div className="temperature">
                      <span>
                        {weather.temperature}
                      </span>

                      <sup>°</sup>
                    </div>

                   

                  </div>

                  <div className="weather-details">

                    <div className="weather-detail">
                      <span>
                        Humidity
                      </span>

                      <strong>
                        {weather.humidity}%
                      </strong>
                    </div>

                    <div className="weather-detail">
                      <span>
                        Condition
                      </span>

                      <strong>
                        {weather.description}
                      </strong>
                    </div>

                  </div>

                </div>
              )}

            </div>
          </section>

        </main>
      </div>
    </div>
  )
}

export default App