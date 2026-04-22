import { useEffect, useState } from "react";
import axios from "axios";
import { POPULAR_CITIES } from "../data/cities";

const DEFAULT_CITY = "杭州";
const DEFAULT_COORDS = { lat: 30.27, lon: 120.15 };
const WEATHER_CACHE_TTL = 15 * 60 * 1000;

const buildWeatherCacheKey = (coords) =>
  `weather_cache:${coords.lat.toFixed(2)}:${coords.lon.toFixed(2)}`;

const buildFallbackWeather = () => ({
  temperature: "--",
  weathercode: 0,
  windspeed: 0,
  winddirection: 0,
  is_day: 1,
  time: new Date().toISOString(),
});

const readWeatherCache = (coords) => {
  try {
    const rawValue = localStorage.getItem(buildWeatherCacheKey(coords));
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    const isExpired = Date.now() - parsed.timestamp > WEATHER_CACHE_TTL;
    return isExpired ? null : parsed.data;
  } catch {
    return null;
  }
};

const writeWeatherCache = (coords, data) => {
  try {
    localStorage.setItem(
      buildWeatherCacheKey(coords),
      JSON.stringify({
        timestamp: Date.now(),
        data,
      }),
    );
  } catch {
    // Ignore storage failures in private mode or quota pressure.
  }
};

export const useWeather = (
  initialCity = DEFAULT_CITY,
  initialCoords = DEFAULT_COORDS,
  options = {},
) => {
  const { enabled = true } = options;
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState(
    localStorage.getItem("weather_city") || initialCity,
  );
  const [coords, setCoords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("weather_coords")) || initialCoords;
    } catch {
      return initialCoords;
    }
  });
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    if (!coords) {
      return undefined;
    }

    const cachedWeather = readWeatherCache(coords);
    if (cachedWeather) {
      setWeather(cachedWeather);
      return undefined;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`,
          { signal: abortController.signal },
        );

        if (abortController.signal.aborted) {
          return;
        }

        const nextWeather = response.data.current_weather;
        setWeather(nextWeather);
        writeWeatherCache(coords, nextWeather);
      } catch {
        if (!abortController.signal.aborted) {
          setWeather(buildFallbackWeather());
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [coords, enabled]);

  const handleCitySearch = async (event) => {
    event?.preventDefault();
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    const query = searchQuery.toLowerCase().trim();
    const localResults = POPULAR_CITIES.filter(
      (item) =>
        item.name.includes(query) ||
        item.name_en.toLowerCase().includes(query) ||
        item.admin1.toLowerCase().includes(query),
    ).map((item) => ({
      id: `local-${item.id}`,
      name: item.name,
      country: item.country,
      admin1: item.admin1,
      latitude: item.lat,
      longitude: item.lon,
      isLocal: true,
    }));

    try {
      const primaryResponse = await axios.get(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=10&language=zh&format=json`,
      );

      let apiResults = primaryResponse.data.results || [];
      if (apiResults.length === 0) {
        const fallbackResponse = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=10&format=json`,
        );
        apiResults = fallbackResponse.data.results || [];
      }

      const dedupedApiResults = apiResults.filter(
        (apiCity) =>
          !localResults.some(
            (localCity) =>
              localCity.name === apiCity.name &&
              localCity.admin1 === apiCity.admin1,
          ),
      );

      setSearchResults([...localResults, ...dedupedApiResults]);
    } catch {
      setSearchResults(localResults);
    } finally {
      setIsSearching(false);
    }
  };

  const selectCity = (selectedCity) => {
    const nextCityName = selectedCity.name;
    const nextCoords = {
      lat: selectedCity.latitude,
      lon: selectedCity.longitude,
    };

    setCity(nextCityName);
    setCoords(nextCoords);
    localStorage.setItem("weather_city", nextCityName);
    localStorage.setItem("weather_coords", JSON.stringify(nextCoords));

    const cachedWeather = readWeatherCache(nextCoords);
    if (cachedWeather) {
      setWeather(cachedWeather);
    }

    setIsWeatherModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return {
    weather,
    city,
    coords,
    isWeatherModalOpen,
    setIsWeatherModalOpen,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    handleCitySearch,
    selectCity,
  };
};
