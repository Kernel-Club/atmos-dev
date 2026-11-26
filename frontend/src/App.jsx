import { useState } from 'react'
import './App.css'
import {
  getWeather,
  getForecast,
  getHistory,
  clearHistory,
} from './services/weatherApi'

function App() {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState(null)
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
      // The forecast is optional: the current weather still shows if it fails.
      const [data, forecastData] = await Promise.all([
        getWeather(searchCity),
        getForecast(searchCity).catch(() => null),
      ])

      setWeather(data)
      setForecast(forecastData)
      setCity(searchCity)
    } catch (err) {
      setWeather(null)
      setForecast(null)
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

    if (text.includes('thunderstorm')) {
      return 'condition-storm'
    }

    if (
      text.includes('squall') ||
      text.includes('tornado')
    ) {
      return 'condition-wind'
    }

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
      text.includes('mist') ||
      text.includes('fog') ||
      text.includes('haze') ||
      text.includes('smoke') ||
      text.includes('dust') ||
      text.includes('sand') ||
      text.includes('ash')
    ) {
      return 'condition-fog'
    }

    if (
      text.includes('cloud') ||
      text.includes('overcast')
    ) {
      return 'condition-cloudy'
    }

    return 'condition-clear'
  }

  // Thin line icons for the forecast strips; the colour comes from CSS.
  const CLOUD = 'M7.5 15.5h9a3.5 3.5 0 0 0 .4-6.98 5.5 5.5 0 0 0-10.6 1.2A2.9 2.9 0 0 0 7.5 15.5z'

  const forecastIconPaths = {
    'condition-clear': (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </>
    ),
    'condition-cloudy': <path d={CLOUD} transform="translate(0 2)" />,
    'condition-rain': (
      <>
        <path d={CLOUD} />
        <path d="M9 18.5l-1 2M12.5 18.5l-1 2M16 18.5l-1 2" />
      </>
    ),
    'condition-snow': (
      <>
        <path d={CLOUD} />
        <path d="M8.5 19.5h.01M12 18.5h.01M15.5 19.5h.01M10.2 21.5h.01M13.8 21.5h.01" />
      </>
    ),
    'condition-storm': (
      <>
        <path d={CLOUD} />
        <path d="M12.5 16.5 10.5 19.5h3l-2 3" />
      </>
    ),
    'condition-fog': <path d="M4 9h16M6 13h12M4 17h16" />,
    'condition-wind': (
      <path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7" />
    ),
  }

  function renderWeatherIcon(description) {
    const condition = getWeatherCondition(description)

    return (
      <svg
        className={`forecast-icon icon-${condition}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {forecastIconPaths[condition]}
      </svg>
    )
  }

  // The free forecast has a 3-hour step: 8 points cover the next 24 hours.
  const HOURLY_POINTS = 8

  // All forecast times are shown in the time zone of the user's browser.
  function toDate(timestamp) {
    return new Date(timestamp * 1000)
  }

  function formatForecastHour(timestamp) {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(toDate(timestamp))
  }

  function getLocalDateKey(date) {
    // en-CA formats a date as YYYY-MM-DD in the local time zone.
    return new Intl.DateTimeFormat('en-CA').format(date)
  }

  function buildDailyForecast(points) {
    const days = new Map()

    for (const point of points) {
      const key = getLocalDateKey(toDate(point.timestamp))

      if (!days.has(key)) {
        days.set(key, {
          date: key,
          timestamp: point.timestamp,
          temperatures: [],
          descriptions: {},
        })
      }

      const day = days.get(key)
      day.temperatures.push(point.temperature)
      day.descriptions[point.description] =
        (day.descriptions[point.description] || 0) + 1
    }

    return Array.from(days.values()).map((day) => ({
      date: day.date,
      timestamp: day.timestamp,
      tempMin: Math.min(...day.temperatures),
      tempMax: Math.max(...day.temperatures),
      description: Object.entries(day.descriptions)
        .sort((a, b) => b[1] - a[1])[0][0],
    }))
  }

  function formatForecastDay(day) {
    if (day.date === getLocalDateKey(new Date())) {
      return 'Today'
    }

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(toDate(day.timestamp))
  }

  // Ghost (skeleton) layout: the same blocks are shown before a city is
  // chosen, while loading and on errors, so the page does not jump.
  const GHOST_DAYS = 6
  const showWeather = !loading && !error && weather
  const showForecast = showWeather && forecast

  let ghostTitle = 'Select a city'
  let ghostText = 'Search for a city above to view the weather.'

  if (loading) {
    ghostTitle = 'Loading weather...'
    ghostText = ''
  } else if (error) {
    ghostTitle = 'Unable to load weather'
    ghostText = error
  }

  function renderGhostItems(count) {
    return Array.from({ length: count }, (_, index) => (
      <div className="forecast-item ghost-item" key={index}>
        <span className="ghost-bar ghost-bar-short" />
        <span className="ghost-dot" />
        <span className="ghost-bar" />
        <span className="ghost-bar ghost-bar-long" />
      </div>
    ))
  }

  const hourlyForecast = forecast ? forecast.points.slice(0, HOURLY_POINTS) : []
  const dailyForecast = forecast ? buildDailyForecast(forecast.points) : []

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

    {!showWeather && (
      <div className={`weather-content is-ghost ${loading ? 'is-loading' : ''}`}>
        <div className="weather-main">
          <div className="weather-heading">
            <p className="weather-label">CURRENT CONDITIONS</p>

            <h2 className="ghost-title">{ghostTitle}</h2>

            {ghostText && (
              <p className="ghost-text">{ghostText}</p>
            )}
          </div>

          <div className="temperature">
            <span>--</span>
            <sup>°</sup>
          </div>
        </div>

        <div className="weather-details">
          <div className="weather-detail">
            <span>Humidity</span>
            <strong>—</strong>
          </div>

          <div className="weather-detail">
            <span>Condition</span>
            <strong>—</strong>
          </div>
        </div>
      </div>
    )}

              {showWeather && (
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

              {showForecast && (
                <div className="today-strip">
                  <p className="weather-label">TODAY · NEXT 24 HOURS</p>

                  <div className="forecast-list">
                    {hourlyForecast.map((point) => (
                      <div className="forecast-item" key={point.timestamp}>
                        <span className="forecast-time">
                          {formatForecastHour(point.timestamp)}
                        </span>

                        {renderWeatherIcon(point.description)}

                        <strong>{point.temperature}°</strong>

                        <span className="forecast-description">
                          {point.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showForecast && (
                <div className={`today-strip is-ghost ${loading ? 'is-loading' : ''}`}>
                  <p className="weather-label">TODAY · NEXT 24 HOURS</p>

                  <div className="forecast-list">
                    {renderGhostItems(HOURLY_POINTS)}
                  </div>
                </div>
              )}

            </div>

            {showForecast && (
              <div className="forecast-grid">
                <div className="forecast-card">
                  <p className="weather-label">
                    {dailyForecast.length}-DAY FORECAST
                  </p>

                  <div className="forecast-list">
                    {dailyForecast.map((day) => (
                      <div className="forecast-item" key={day.date}>
                        <span className="forecast-time">
                          {formatForecastDay(day)}
                        </span>

                        {renderWeatherIcon(day.description)}

                        <span className="forecast-temps">
                          <strong>{day.tempMax}°</strong>
                          <span>{day.tempMin}°</span>
                        </span>

                        <span className="forecast-description">
                          {day.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!showForecast && (
              <div className="forecast-grid">
                <div className={`forecast-card is-ghost ${loading ? 'is-loading' : ''}`}>
                  <p className="weather-label">DAILY FORECAST</p>

                  <div className="forecast-list">
                    {renderGhostItems(GHOST_DAYS)}
                  </div>
                </div>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  )
}

export default App