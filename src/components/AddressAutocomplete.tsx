/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AddressAutocompleteProps {
  onSelect: (address: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow dynamic callback names
  }
}

interface Prediction {
  place_id: string;
  description: string;
}

export function AddressAutocomplete({ onSelect, onChange, placeholder = "Enter Client's Property Address" }: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load Google Maps script dynamically
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is not configured');
      setLoadError('Address lookup is not configured. Please contact support.');
      return;
    }

    const initializeService = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        setIsLoaded(true);
        setLoadError(null);
        return true;
      }
      return false;
    };

    // Check if script already exists and API is ready
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      if (initializeService()) {
        return;
      }
      // Script exists but API not ready - wait and retry
      const retryInterval = setInterval(() => {
        if (initializeService()) {
          clearInterval(retryInterval);
        }
      }, 100);
      // Give up after 5 seconds
      setTimeout(() => {
        clearInterval(retryInterval);
        if (!isLoaded) {
          setLoadError('Address lookup failed to initialize. Please ensure the Places API is enabled.');
        }
      }, 5000);
      return;
    }

    // Create unique callback name
    const callbackName = `initGoogleMapsAutocomplete_${Date.now()}`;

    // Set up the callback BEFORE loading the script
    (window as Window)[callbackName] = () => {
      if (initializeService()) {
        // Success
      } else {
        setLoadError('Address lookup failed to initialize. Please ensure the Places API is enabled.');
      }
      // Clean up the global callback
      delete (window as Window)[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setLoadError('Failed to load address lookup. Please check your internet connection.');
      delete (window as Window)[callbackName];
    };
    document.head.appendChild(script);
  }, [isLoaded]);

  // Initialize service when Google is already loaded
  useEffect(() => {
    if (!isLoaded && window.google?.maps?.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      setIsLoaded(true);
    }
  }, [isLoaded]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteService.current || !input.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: 'us' },
        types: ['address'],
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results.map(r => ({
            place_id: r.place_id,
            description: r.description,
          })));
          setIsOpen(true);
          setHighlightedIndex(-1);
        } else {
          setPredictions([]);
          setIsOpen(false);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers as the first character
    if (value.length === 1 && !/^\d$/.test(value)) {
      return;
    }

    // If there's content, ensure it starts with a number (handles paste)
    if (value.length > 0 && !/^\d/.test(value)) {
      return;
    }

    setInputValue(value);

    // Notify parent of the change
    onChange?.(value);

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect(prediction.description);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < predictions.length) {
          handleSelect(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue && predictions.length > 0 && setIsOpen(true)}
        className="pl-12 h-14 bg-card border-0 text-foreground placeholder:text-muted-foreground text-base"
        autoComplete="off"
      />

      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl overflow-hidden z-[9999] isolate">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full px-4 py-3 text-left text-foreground transition-colors ${index === highlightedIndex
                ? 'bg-slate-100 dark:bg-slate-800'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}

      {loadError && (
        <div className="absolute top-full left-0 right-0 mt-2 px-4 py-3 bg-white dark:bg-slate-900 border border-destructive/20 rounded-lg text-destructive text-sm z-[9999] isolate">
          {loadError}
        </div>
      )}

      {!isLoaded && !loadError && inputValue.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 px-4 py-3 bg-white dark:bg-slate-900 border border-border rounded-lg text-muted-foreground text-sm z-[9999] isolate">
          Loading address suggestions...
        </div>
      )}
    </div>
  );
}
