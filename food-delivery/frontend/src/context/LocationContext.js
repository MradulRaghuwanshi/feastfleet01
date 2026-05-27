import React, { createContext, useContext, useState } from 'react';

const LocationContext = createContext();
export const DEFAULT_DELIVERY_LOCATION = {
  lat: 31.253,
  lng: 75.706,
  address: 'Law Gate, LPU, Jalandhar, Punjab, India',
  city: 'Law Gate',
  postcode: '',
};

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(DEFAULT_DELIVERY_LOCATION);
  // location: { lat, lng, address, city, postcode }

  const detectLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            const addr = data.address || {};
            const formatted = [
              addr.house_number,
              addr.road,
              addr.suburb || addr.neighbourhood,
              addr.city || addr.town || addr.village,
              addr.state,
              addr.postcode
            ].filter(Boolean).join(', ');

            const loc = {
              lat,
              lng,
              address: formatted || data.display_name,
              city: addr.city || addr.town || addr.village || '',
              postcode: addr.postcode || ''
            };
            setLocation(loc);
            resolve(loc);
          } catch {
            reject(new Error('Failed to fetch address'));
          }
        },
        (err) => reject(new Error(err.message)),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const setManualLocation = (loc) => setLocation(loc);
  const clearLocation = () => setLocation(DEFAULT_DELIVERY_LOCATION);

  return (
    <LocationContext.Provider value={{ location, detectLocation, setManualLocation, clearLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useDeliveryLocation = () => useContext(LocationContext);
