import React, { useState } from "react";

// Interface for the data structure of search results.
interface DataEntry {
  time: string;
  flags: string;
  identifier: string;
  length: number;
  reserved: number;
  data: string;
  type: string;
}

// Props interface for the SearchBar component.
interface SearchBarProps {
  onSearchResults: (results: DataEntry[]) => void; // Callback function to pass the search results up.
  style: React.CSSProperties; // Custom styles passed down to the component.
}

// SearchBar component.
const SearchBar: React.FC<SearchBarProps> = ({ onSearchResults, style }) => {
  // State for the search query.
  const [query, setQuery] = useState("");
  // State to indicate if a search is currently in progress.
  const [isSearching, setIsSearching] = useState(false);
  // State for any error message.
  const [error, setError] = useState("");

  // Handler for when the search is triggered.
  const handleSearch = async () => {
    setIsSearching(true);
    setError("");
    try {
      // Split the query string by comma and trim whitespace to get individual search parameters.
      const [searchType, searchLength] = query.split(",").map((s) => s.trim());

      // Create URL search parameters for the API call.
      let queryParams = new URLSearchParams();

      // Append the search type and length to the query parameters, if present.
      if (searchType) {
        queryParams.append("type", searchType);
      }
      if (searchLength && !isNaN(parseInt(searchLength))) {
        queryParams.append("length", parseInt(searchLength).toString());
      }

      // Perform the search using the constructed query parameters.
      const response = await fetch(
        `http://localhost:8000/api/search/search_logs/?${queryParams.toString()}`
      );

      // Handle non-success responses.
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      // Parse the results and pass them to the callback.
      const results = await response.json();
      onSearchResults(results);
    } catch (err: any) {
      // Handle any errors that occur during the fetch.
      console.error("Error during search:", err);
      setError(err.message);
    } finally {
      // Reset searching state after search is complete or if an error occurs.
      setIsSearching(false);
    }
  };

  // Handler for changes to the search input field.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Render the search input, button, and any error message.
  return (
    <div style={style}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Enter search query..."
        disabled={isSearching}
      />
      <button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? "Searching..." : "Search"}
      </button>
      {error && <div>Error: {error}</div>}
    </div>
  );
};

export default SearchBar;
