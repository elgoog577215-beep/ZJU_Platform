import { useState, useEffect } from 'react';
import axios from 'axios';
import { POPULAR_CITIES } from '../data/cities';

export const useWeather = (initialCity = '杭州', initialCoords = { lat: 30.27, lon: 120.15 }) => {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState(localStorage.getItem('weather_city') || initialCity);
  const [coords, setCoords] = useState(JSON.parse(localStorage.getItem('weather_coords')) || initialCoords);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!coords) return;
    
    axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`)
      .then(res => {
        setWeather(res.data.current_weather);
      })
      .catch(err => console.error("Weather fetch failed", err));
  }, [coords]);

  const handleCitySearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    
    const query = searchQuery.toLowerCase().trim();
    const localResults = POPULAR_CITIES.filter(city => 
        city.name.includes(query) || 
        city.name_en.toLowerCase().includes(query) ||
        (city.admin1 && city.admin1.toLowerCase().includes(query))
    ).map(city => ({
        id: `local-${city.id}`,
        name: city.name,
        country: city.country,
        admin1: city.admin1,
        latitude: city.lat,
        longitude: city.lon,
        isLocal: true
    }));

    try {
        const res = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=10&language=zh&format=json`);
        
        let apiResults = [];
        if (res.data.results && res.data.results.length > 0) {
            apiResults = res.data.results;
        } else {
             const fallbackRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=10&format=json`);
             if (fallbackRes.data.results && fallbackRes.data.results.length > 0) {
                  apiResults = fallbackRes.data.results;
             }
        }
        
        const filteredApiResults = apiResults.filter(apiCity => {
            const isDuplicate = localResults.some(localCity => localCity.name === apiCity.name);
            if (isDuplicate) return false;
            return true;
        });

        setSearchResults([...localResults, ...filteredApiResults]);
    } catch (error) {
        console.error("City search failed", error);
        setSearchResults(localResults);
    } finally {
        setIsSearching(false);
    }
  };

  const selectCity = (selectedCity) => {
    const newCityName = selectedCity.name;
    const newCoords = { lat: selectedCity.latitude, lon: selectedCity.longitude };
    
    setCity(newCityName);
    setCoords(newCoords);
    localStorage.setItem('weather_city', newCityName);
    localStorage.setItem('weather_coords', JSON.stringify(newCoords));
    
    setIsWeatherModalOpen(false);
    setSearchQuery('');
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
    selectCity
  };
};
