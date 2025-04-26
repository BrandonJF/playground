/**
 * SpiceJarOrganizer Component
 * 
 * This component helps organize spice jars alphabetically across multiple shelves.
 * It allows users to:
 * - Track the count of jars for each letter of the alphabet
 * - Specify the number of shelves available
 * - See an optimal distribution of jars across shelves
 * - Visualize the distribution proportionally
 * - Search for and add specific spices using fuzzy search
 */
import { useEffect, useRef, useState } from 'react';
import spices, { Spice } from './data/spices';

// Interface for letter counts object
interface LetterCounts {
  [key: string]: number;
}

// Interface for shelf distribution visualization
interface ShelfInfo {
  range: string;
  count: number;
}

// Move alphabet outside the component to avoid re-creation on every render
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const SpiceJarOrganizer = () => {
  // State to track the count of jars for each letter
  const [letterCounts, setLetterCounts] = useState<LetterCounts>({});
  
  // Number of shelves available for organizing spices
  const [numShelves, setNumShelves] = useState(3);
  
  // Total count of all jars across all letters
  const [totalJars, setTotalJars] = useState(0);
  
  // The calculated optimal distribution of letters across shelves
  const [optimalDistribution, setOptimalDistribution] = useState<string[][]>([]);

  // Autocomplete states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Spice[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  /**
   * Initialize the letter counts to zero on component mount
   */
  useEffect(() => {
    const initialCounts: LetterCounts = {};
    alphabet.forEach(letter => {
      initialCounts[letter] = 0;
    });
    setLetterCounts(initialCounts);
  }, []);

  /**
   * Handle clicks outside the autocomplete results to close the dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Perform fuzzy search on spices based on the input term
   */
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    // Simple fuzzy search implementation
    const results = spices.filter(spice => 
      spice.name.toLowerCase().includes(term)
    ).slice(0, 10); // Limit to 10 results

    setSearchResults(results);
  }, [searchTerm]);

  /**
   * Add a spice to the inventory and update letter counts
   * @param {Spice} spice - The spice to add
   */
  const addSpice = (spice: Spice) => {
    // Extract the first letter from the spice name and ensure it's uppercase
    const firstLetter = spice.name.charAt(0).toUpperCase();
    
    // Create a direct reference to the updated counts to ensure consistency
    const updatedCounts = { ...letterCounts };
    updatedCounts[firstLetter] = (updatedCounts[firstLetter] || 0) + 1;
    
    // Update letter counts directly
    setLetterCounts(updatedCounts);
    
    // Increment total jar count
    const newTotalCount = totalJars + 1;
    setTotalJars(newTotalCount);
    
    // Add debug info to console
    console.log(`Added ${spice.name} (${firstLetter}): Count is now ${updatedCounts[firstLetter]}`);
    console.log(`Total jars: ${newTotalCount}`);
    
    // Clear search after adding
    setSearchTerm('');
    setShowResults(false);
  };

  /**
   * Increment the count for a specific letter by one
   * @param {string} letter - The letter to increment
   */
  const incrementLetter = (letter: string) => {
    // Make sure the letter is uppercase for consistency
    const upperLetter = letter.toUpperCase();
    
    // Create a direct reference to the updated counts
    const updatedCounts = { ...letterCounts };
    updatedCounts[upperLetter] = (updatedCounts[upperLetter] || 0) + 1;
    
    // Update letter counts directly
    setLetterCounts(updatedCounts);
    
    // Increment total jar count
    const newTotalCount = totalJars + 1;
    setTotalJars(newTotalCount);
    
    // Add debug info to console to match addSpice behavior
    console.log(`Incremented ${upperLetter}: Count is now ${updatedCounts[upperLetter]}`);
    console.log(`Total jars: ${newTotalCount}`);
  };

  /**
   * Decrement the count for a specific letter by one, but not below zero
   * @param {string} letter - The letter to decrement
   */
  const decrementLetter = (letter: string) => {
    // Make sure the letter is uppercase for consistency
    const upperLetter = letter.toUpperCase();
    
    if (letterCounts[upperLetter] > 0) {
      // Create a direct reference to the updated counts
      const updatedCounts = { ...letterCounts };
      updatedCounts[upperLetter] = updatedCounts[upperLetter] - 1;
      
      // Update letter counts directly
      setLetterCounts(updatedCounts);
      
      // Decrement total jar count
      const newTotalCount = totalJars - 1;
      setTotalJars(newTotalCount);
      
      // Add debug info to console
      console.log(`Decremented ${upperLetter}: Count is now ${updatedCounts[upperLetter]}`);
      console.log(`Total jars: ${newTotalCount}`);
    }
  };

  /**
   * Reset all letter counts to zero
   */
  const resetCounts = () => {
    const resetCounts: LetterCounts = {};
    alphabet.forEach(letter => {
      resetCounts[letter] = 0;
    });
    setLetterCounts(resetCounts);
    setTotalJars(0);
  };

  // Linear partition algorithm for optimal shelf distribution
  function linearPartition(seq: number[], k: number): number[][] {
    const n = seq.length;
    if (k <= 0) return [];
    if (k > n) k = n;
    const table: number[][] = Array.from({ length: n }, () => Array(k).fill(0));
    const solution: number[][] = Array.from({ length: n - 1 }, () => Array(k - 1).fill(0));

    // Fill in the first column of the table (one shelf)
    table[0][0] = seq[0];
    for (let i = 1; i < n; ++i) {
      table[i][0] = seq[i] + table[i - 1][0];
    }
    // Fill in the first row of the table (one item per shelf)
    for (let j = 1; j < k; ++j) {
      table[0][j] = seq[0];
    }
    // DP to fill the rest
    for (let i = 1; i < n; ++i) {
      for (let j = 1; j < k; ++j) {
        let min = Infinity;
        let minX = -1;
        for (let x = 0; x < i; ++x) {
          const cost = Math.max(table[x][j - 1], table[i][0] - table[x][0]);
          if (cost < min) {
            min = cost;
            minX = x;
          }
        }
        table[i][j] = min;
        solution[i - 1][j - 1] = minX;
      }
    }
    // Reconstruct partition
    const ans: number[][] = [];
    let nItems = n;
    let kShelves = k;
    let idx = n - 1;
    while (kShelves > 1) {
      const s = solution[idx - 1][kShelves - 2];
      ans.unshift([s + 1, idx]);
      idx = s;
      kShelves--;
    }
    ans.unshift([0, idx]);
    return ans;
  }

  /**
   * Calculate the optimal distribution of spice jars across shelves
   * This runs whenever the letter counts, total jars, or number of shelves changes
   */
  useEffect(() => {
    // Don't calculate if there are no jars or no shelves
    if (totalJars === 0 || numShelves <= 0) {
      setOptimalDistribution([]);
      return;
    }
    // Get jar counts for each letter
    const letterArray = alphabet.map(letter => ({
      letter,
      count: letterCounts[letter] || 0
    }));
    // Only consider letters with jars
    const filtered = letterArray.filter(item => item.count > 0);
    if (filtered.length === 0) {
      setOptimalDistribution([]);
      return;
    }
    // Partition the counts
    const counts = filtered.map(item => item.count);
    const partitions = linearPartition(counts, Math.min(numShelves, filtered.length));
    // Map partitions to letter groups
    const groups: string[][] = [];
    for (const [start, end] of partitions) {
      const group = filtered.slice(start, end + 1).map(item => item.letter);
      groups.push(group);
    }
    setOptimalDistribution(groups);
  }, [letterCounts, totalJars, numShelves]);

  /**
   * Calculate display information for each shelf
   * @returns {Array} Array of objects with range (e.g., "A-D") and count of jars
   */
  const calculateItemsPerShelf = (): ShelfInfo[] => {
    if (!optimalDistribution.length) return [];
    
    return optimalDistribution.map(shelf => {
      // Calculate total jars on this shelf
      const count = shelf.reduce((sum: number, letter: string) => sum + (letterCounts[letter] || 0), 0);
      // Create a range string (e.g., "A-D") for display
      const range = `${shelf[0]}-${shelf[shelf.length - 1]}`;
      return { range, count };
    });
  };
  
  const itemsPerShelf = calculateItemsPerShelf();

  return (
    <div className="flex flex-col p-4 max-w-3xl mx-auto bg-gray-50 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-center mb-6">Spice Jar Organizer</h2>
      
      {/* Configuration section for shelves and reset button */}
      <div className="mb-6 p-4 bg-white rounded shadow">
        <label className="block mb-2 font-medium">
          Number of Shelves:
          <input
            type="number"
            min="1"
            max="10"
            value={numShelves}
            onChange={(e) => setNumShelves(Math.max(1, parseInt(e.target.value) || 1))}
            className="ml-2 p-1 border rounded"
          />
        </label>
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Jars: {totalJars}</span>
          <button 
            onClick={resetCounts}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Reset All
          </button>
        </div>
      </div>
      
      {/* Spice search autocomplete */}
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="font-medium mb-2">Find and add spices:</h3>
        <div ref={searchRef} className="relative">
          <div className="flex">
            <input
              type="text"
              placeholder="Type to search for spices..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="p-2 border rounded flex-grow"
            />
          </div>
          
          {/* Autocomplete results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((spice, idx) => (
                <div
                  key={idx}
                  className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                  onClick={() => addSpice(spice)}
                >
                  <span>{spice.name}</span>
                  <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs">
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {showResults && searchTerm && searchResults.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg p-2 text-gray-500">
              No spices found
            </div>
          )}
        </div>
      </div>
      
      {/* Interactive alphabet grid for counting jars by letter */}
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="font-medium mb-2">Tap letters to count jars:</h3>
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {alphabet.map(letter => (
            <div key={letter} className="flex flex-col items-center">
              <div className="flex space-x-2 mb-1">
                <button 
                  onClick={() => decrementLetter(letter)}
                  className="w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-700 rounded"
                >
                  -
                </button>
                <button 
                  onClick={() => incrementLetter(letter)}
                  className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded"
                >
                  +
                </button>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium">{letter}</span>
                <span className="text-sm">{letterCounts[letter] || 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Results section showing the calculated optimal distribution */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-medium mb-2">Optimal Shelf Distribution:</h3>
        {optimalDistribution.length > 0 ? (
          <div className="space-y-2">
            {optimalDistribution.map((shelf, idx) => {
              const itemCount = shelf.reduce((sum: number, letter: string) => sum + (letterCounts[letter] || 0), 0);
              return (
                <div key={idx} className="flex justify-between p-2 bg-blue-50 rounded">
                  <div>
                    <span className="font-bold">Shelf {idx + 1}:</span>{" "}
                    <span className="font-medium">{shelf.join(", ")}</span>
                  </div>
                  <span className="text-gray-600">{itemCount} jars</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 italic">
            Enter your jar counts to see the optimal distribution
          </p>
        )}
      </div>
      
      {/* Visual bar chart of the distribution */}
      {optimalDistribution.length > 0 && (
        <div className="mt-4 p-4 bg-white rounded shadow">
          <h3 className="font-medium mb-2">Distribution Visualization:</h3>
          <div className="h-12 flex rounded overflow-hidden">
            {itemsPerShelf.map((shelf, idx) => {
              // Calculate the percentage width for this shelf
              const percentage = (shelf.count / totalJars) * 100;
              return (
                <div 
                  key={idx}
                  className={`h-full ${idx % 2 === 0 ? 'bg-blue-400' : 'bg-blue-500'} flex items-center justify-center`}
                  style={{ width: `${percentage}%` }}
                >
                  <span className="text-white text-xs font-bold px-1">
                    {shelf.range}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpiceJarOrganizer;