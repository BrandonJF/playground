/**
 * SpiceJarOrganizer Component
 * 
 * This component helps organize spice jars alphabetically across multiple shelves.
 * It allows users to:
 * - Track specific spices added to the inventory
 * - Specify the number of shelves available
 * - See an optimal distribution of jars across shelves
 * - Visualize the distribution proportionally
 * - Search for and add specific spices using fuzzy search
 * - Save data to localStorage automatically
 * 
 * IMPORTANT: This component should ONLY handle:
 * - UI rendering
 * - User interactions
 * - Component-specific state management
 * 
 * All business logic should be delegated to the SpiceLogic class, including:
 * - Data fetching and parsing
 * - Data manipulation
 * - Storage operations
 * - Validation logic
 * 
 * If you need to implement functionality that doesn't directly relate to the UI,
 * add it to the SpiceLogic class instead of this component to maintain proper
 * separation of concerns and prevent errors like "fetchSpices is not defined".
 */
import { useEffect, useRef, useState } from 'react';

// Import the SpiceLogic class and interfaces from logic folder
import { InventoryItem, LetterCounts, ShelfInfo, Spice, SpiceLogic } from './logic/SpiceLogic';

// Interface for fuzzy search result with score
interface FuzzySearchResult extends Spice {
  score: number;
}

// Enhanced fuzzy search function with support for skipped characters
function fuzzySearch(items: Spice[], query: string): FuzzySearchResult[] {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  if (searchTerms.length === 0) return [];

  const results = items.map(item => {
    const nameLower = item.name.toLowerCase();
    
    // Initial score is 0
    let score = 0;
    let matchesAllTerms = true;
    
    // Check each search term
    for (const term of searchTerms) {
      // Check for exact substring match first
      const exactMatch = nameLower.includes(term);
      
      // If exact match, add points based on position and match quality
      if (exactMatch) {
        const position = nameLower.indexOf(term);
        
        // Exact match bonus
        if (nameLower === term) {
          score += 100;
        }
        
        // Start of name or after separator bonus
        if (position === 0 || nameLower[position-1] === ',' || nameLower[position-1] === ' ') {
          score += 50;
        }
        
        // Length bonus (percentage of name matched)
        score += (term.length / nameLower.length) * 25;
        
        // Position bonus (earlier is better)
        score += Math.max(0, 25 - position);
      } 
      // If no exact match, try fuzzy match (allows skipped characters)
      else {
        // Check if all characters in the search term appear in the right order in the name
        let termIndex = 0;
        let nameIndex = 0;
        let fuzzyMatched = false;
        
        // Try to match all characters in the search term
        while (termIndex < term.length && nameIndex < nameLower.length) {
          if (term[termIndex] === nameLower[nameIndex]) {
            termIndex++;
          }
          nameIndex++;
          
          // If we matched all characters in the term
          if (termIndex === term.length) {
            fuzzyMatched = true;
            break;
          }
        }
        
        if (fuzzyMatched) {
          // Calculate match quality - closer to 1.0 means fewer skipped characters
          const matchQuality = term.length / (nameIndex - 0); // How many characters we had to scan
          
          // Add score based on match quality
          score += 20 * matchQuality; // Less score than exact matches, but still counts
        } else {
          // This term didn't match at all
          matchesAllTerms = false;
          break;
        }
      }
    }
    
    if (matchesAllTerms) {
      return {
        ...item,
        score
      };
    }
    
    return { ...item, score: -1 };
  });
  
  // Filter out non-matches and sort by score (highest first)
  return results
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

const SpiceJarOrganizer = () => {
  // Create a ref for the SpiceLogic instance that persists across renders
  const spiceLogicRef = useRef<SpiceLogic | null>(null);
  
  // State to track the inventory of specific spices
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // State to track the count of jars for each letter
  const [letterCounts, setLetterCounts] = useState<LetterCounts>({});
  
  // Number of shelves available for organizing spices
  const [numShelves, setNumShelves] = useState(3);
  
  // Total count of all jars across all letters
  const [totalJars, setTotalJars] = useState(0);
  
  // State to track whether duplicates should be ignored in distribution
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
  
  // The calculated optimal distribution of letters across shelves
  const [optimalDistribution, setOptimalDistribution] = useState<string[][]>([]);

  // Autocomplete states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Spice[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Spice list state (loaded from markdown)
  const [spices, setSpices] = useState<Spice[]>([]);
  const [loadingSpices, setLoadingSpices] = useState(true);
  
  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'loading'>('saved');
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // State to track submitted custom spices
  const [submittedSpices, setSubmittedSpices] = useState<{[key: string]: 'pending' | 'approved' | 'rejected'}>({});

  // New state for user name
  const [userName, setUserName] = useState<string | null>(null);
  
  // State for tracking if user has set a name
  const [hasSetUserName, setHasSetUserName] = useState<boolean>(false);
  
  // Handler for setting user name
  const handleSetUserName = () => {
    if (!userName || !userName.trim() || !spiceLogicRef.current) return;
    spiceLogicRef.current.setUserName(userName);
    setHasSetUserName(true);
  };
  
  // Initialization of SpiceLogic
  useEffect(() => {
    if (!spiceLogicRef.current) {
      spiceLogicRef.current = new SpiceLogic();
      // In playground context, we're always setting a default username
      setUserName(spiceLogicRef.current.getUserNameValue() || "Playground User");
      setHasSetUserName(true);
    }
  }, []);

  /**
   * Initialize SpiceLogic instance and load data on component mount
   */
  useEffect(() => {
    // Initialize SpiceLogic if not already done
    if (!spiceLogicRef.current) {
      spiceLogicRef.current = new SpiceLogic();
    }
    
    // Load data from storage and server
    const spiceLogic = spiceLogicRef.current;
    
    // Use the loadData method that tries both server and localStorage
    const loadDataFromSources = async () => {
      setSaveStatus('loading');
      
      try {
        const loadResult = await spiceLogic.loadData();
        
        if (loadResult.success) {
          // Update component state with data from SpiceLogic
          setInventory(spiceLogic.getInventory());
          setLetterCounts(spiceLogic.getLetterCounts());
          setNumShelves(spiceLogic.getNumShelves());
          setTotalJars(spiceLogic.getTotalJars());
          
          // Set last updated timestamp
          setLastSaved(spiceLogic.getLastUpdated());
          setSaveStatus('saved');
          
          // Show a message about where data was loaded from
          console.log(`Data loaded from ${loadResult.source}`);
        } else {
          setSaveStatus('error');
          console.error('Failed to load data:', loadResult.error);
        }
      } catch (error) {
        setSaveStatus('error');
        console.error('Error loading data:', error);
      }
    };
    
    loadDataFromSources();
  }, []);

  /**
   * Save data to localStorage and server whenever inventory, letter counts, shelves, or total jars change
   */
  useEffect(() => {
    // Skip if SpiceLogic is not initialized or on first render
    if (!spiceLogicRef.current || Object.keys(letterCounts).length === 0) return;
    
    const saveData = async () => {
      try {
        setSaveStatus('saving');
        
        // Update SpiceLogic instance with current state
        const spiceLogic = spiceLogicRef.current!;
        
        // Save to both localStorage and server
        const saveResult = await spiceLogic.saveData();
        
        if (saveResult.localStorage && saveResult.server) {
          setLastSaved(spiceLogic.getLastUpdated());
          setSaveStatus('saved');
        } else {
          // At least one save method failed
          if (!saveResult.localStorage) {
            console.error('Failed to save to localStorage');
          }
          if (!saveResult.server) {
            console.error('Failed to save to server:', saveResult.error);
          }
          setSaveStatus('error');
        }
      } catch (error) {
        console.error('Failed to save data:', error);
        setSaveStatus('error');
      }
    };
    
    // Use a slight delay to batch rapid changes
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [inventory, letterCounts, numShelves, totalJars]);

  /**
   * Clear all data from localStorage
   */
  const clearSavedData = () => {
    if (!spiceLogicRef.current) return;
    
    const clearResult = spiceLogicRef.current.clearStorage();
    
    if (clearResult) {
      // Update component state
      setInventory([]);
      setLetterCounts(spiceLogicRef.current.getLetterCounts());
      setNumShelves(spiceLogicRef.current.getNumShelves());
      setTotalJars(0);
      setLastSaved(null);
      console.log('Cleared data from localStorage');
    } else {
      console.error('Failed to clear data from localStorage');
    }
  };

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
   * Fetch and parse spicelist.md on mount
   */
  useEffect(() => {
    const loadSpices = async () => {
      setLoadingSpices(true);
      
      if (!spiceLogicRef.current) return;
      
      try {
        // Use the SpiceLogic class method to fetch and update spices
        await spiceLogicRef.current.fetchAndUpdateSpices();
        
        // Get the updated spices from SpiceLogic
        setSpices(spiceLogicRef.current.getSpices());
      } catch (e) {
        console.error('Error loading spices:', e);
        setSpices([]);
      } finally {
        setLoadingSpices(false);
      }
    };
    
    loadSpices();
  }, []);

  /**
   * Perform enhanced fuzzy search on spices based on the input term
   */
  useEffect(() => {
    if (searchTerm.trim() === '' || loadingSpices) {
      setSearchResults([]);
      return;
    }

    // Use the enhanced fuzzy search algorithm
    const results = fuzzySearch(spices, searchTerm)
      .slice(0, 10) // Limit to 10 results
      .map(result => ({ name: result.name, category: result.category }));
      
    setSearchResults(results);
  }, [searchTerm, spices, loadingSpices]);

  /**
   * Add a spice to the inventory and update letter counts
   * @param {Spice} spice - The spice to add
   */
  const addSpice = (spice: Spice) => {
    if (!spiceLogicRef.current) return;
    
    const spiceLogic = spiceLogicRef.current;
    
    // Add the spice using SpiceLogic
    spiceLogic.addSpice(spice);
    
    // Update component state
    setInventory(spiceLogic.getInventory());
    setLetterCounts(spiceLogic.getLetterCounts());
    setTotalJars(spiceLogic.getTotalJars());
    
    // Clear search after adding
    setSearchTerm('');
    setShowResults(false);
    
    // Get the first letter for logging
    const firstLetter = spice.name.charAt(0).toUpperCase();
    console.log(`Added ${spice.name}: Count is now ${spiceLogic.getLetterCounts()[firstLetter] || 0}`);
    console.log(`Total jars: ${spiceLogic.getTotalJars()}`);
  };

  /**
   * Remove a specific spice from the inventory
   * @param {string} id - The ID of the inventory item to remove
   */
  const removeSpice = (id: string) => {
    if (!spiceLogicRef.current) return;
    
    const spiceLogic = spiceLogicRef.current;
    
    // Find the item to remove (for logging)
    const itemToRemove = inventory.find(item => item.id === id);
    if (!itemToRemove) return;
    
    // Remove the spice using SpiceLogic
    spiceLogic.removeSpice(id);
    
    // Update component state
    setInventory(spiceLogic.getInventory());
    setLetterCounts(spiceLogic.getLetterCounts());
    setTotalJars(spiceLogic.getTotalJars());
    
    // Get the first letter for logging
    const firstLetter = itemToRemove.name.charAt(0).toUpperCase();
    console.log(`Removed ${itemToRemove.name}: Count is now ${spiceLogic.getLetterCounts()[firstLetter] || 0}`);
    console.log(`Total jars: ${spiceLogic.getTotalJars()}`);
  };

  /**
   * Reset the entire inventory and letter counts
   */
  const resetInventory = () => {
    if (!spiceLogicRef.current) return;
    
    // Reset inventory using SpiceLogic
    spiceLogicRef.current.resetInventory();
    
    // Update component state
    setInventory([]);
    setLetterCounts(spiceLogicRef.current.getLetterCounts());
    setTotalJars(0);
  };

  /**
   * Calculate display information for each shelf
   * @returns {Array} Array of objects with range (e.g., "A-D") and count of jars
   */
  const calculateItemsPerShelf = (): ShelfInfo[] => {
    if (!optimalDistribution.length || !spiceLogicRef.current) return [];
    
    // Get effective letter counts that respect the "ignoreDuplicates" setting
    const effectiveLetterCounts = spiceLogicRef.current.getEffectiveLetterCounts();
    
    return optimalDistribution.map(shelf => {
      // Calculate total jars on this shelf using the effective counts
      const count = shelf.reduce((sum: number, letter: string) => sum + (effectiveLetterCounts[letter] || 0), 0);
      
      // Create a range string (e.g., "A-D") for display
      // If it's just one letter, only show that letter
      const range = shelf.length === 1 
        ? shelf[0] 
        : `${shelf[0]}-${shelf[shelf.length - 1]}`;
        
      return { range, count };
    });
  };
  
  /**
   * Calculate the optimal distribution of spice jars across shelves
   * This runs whenever the letter counts, total jars, or number of shelves changes
   */
  useEffect(() => {
    if (!spiceLogicRef.current) return;
    
    // Get the optimal distribution from SpiceLogic
    const distribution = spiceLogicRef.current.calculateOptimalDistribution();
    setOptimalDistribution(distribution);
  }, [letterCounts, totalJars, numShelves]);
  
  const itemsPerShelf = calculateItemsPerShelf();

  if (loadingSpices) {
    return <div className="p-8 text-center text-lg">Loading spices...</div>;
  }

  /**
   * Handle keyboard shortcuts for selecting autocomplete items
   * @param {KeyboardEvent} event - The keyboard event
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Only process if autocomplete is showing and we have a search term
    if (!showResults || !searchTerm.trim()) return;
    
    // Check if the key pressed is a number between 0-9
    const keyNum = parseInt(event.key);
    if (!isNaN(keyNum)) {
      // Prevent default action (like typing the number)
      event.preventDefault();
      
      // Key "0" - Add custom spice
      if (keyNum === 0) {
        // Create custom spice from the search term using SpiceLogic's method
        const customSpice = spiceLogicRef.current?.createCustomSpice(searchTerm) || {
          name: SpiceLogic.properlyCapitalizeName(searchTerm),
          category: searchTerm.trim().charAt(0).toUpperCase(),
        };
        addSpice(customSpice);
        return;
      }
      
      // Keys "1-9" - Add from search results
      if (keyNum >= 1 && keyNum <= 9) {
        // Make sure we have a result at this index (0-based, so subtract 1)
        const index = keyNum - 1;
        if (index < searchResults.length) {
          // Add the selected spice
          addSpice(searchResults[index]);
        }
      }
    } else if (event.key === 'Escape') {
      // Close the dropdown on Escape
      setShowResults(false);
    }
  };

  /**
   * Submit a custom spice to be added to the canonical list
   * @param spice The spice to submit
   */
  const submitCustomSpice = async (spice: Spice) => {
    try {
      if (!spiceLogicRef.current) return;
      
      // First check if the spice already exists in the list using the business logic
      if (spiceLogicRef.current.spiceExistsInList(spice.name)) {
        alert(`"${spice.name}" already exists in the spice database.`);
        return false;
      }
      
      // Update UI state to show pending
      setSubmittedSpices(prev => ({
        ...prev,
        [spice.name]: 'pending'
      }));
      
      // Submit to server through SpiceLogic
      const result = await spiceLogicRef.current.submitSpice(spice);
      
      if (result.success) {
        if (result.status === 'approved') {
          // Update UI state to show approved status
          setSubmittedSpices(prev => ({
            ...prev,
            [spice.name]: 'approved'
          }));
          
          // Reload spices to include the newly added one
          // Use the loadSpices function instead of fetchSpices which doesn't exist
          const loadSpices = async () => {
            setLoadingSpices(true);
            
            try {
              // Use the SpiceLogic class method to fetch and update spices
              await spiceLogicRef.current?.fetchAndUpdateSpices();
              
              // Get the updated spices from SpiceLogic
              setSpices(spiceLogicRef.current?.getSpices() || []);
            } catch (e) {
              console.error('Error loading spices:', e);
              setSpices([]);
            } finally {
              setLoadingSpices(false);
            }
          };
          
          await loadSpices();
          
          alert(`Success! "${spice.name}" has been added to the spice database.`);
        } else if (result.status === 'exists') {
          // Update UI state
          setSubmittedSpices(prev => {
            const newState = {...prev};
            delete newState[spice.name];
            return newState;
          });
          
          alert(`"${spice.name}" already exists in the spice database.`);
        } else {
          alert(`Thank you for submitting "${spice.name}" to the spice database!`);
        }
      } else {
        // If failed, revert UI state
        setSubmittedSpices(prev => {
          const newState = {...prev};
          delete newState[spice.name];
          return newState;
        });
        
        // Show a more specific error message if available
        if (result.error) {
          alert(`Error: ${result.error}`);
        } else {
          alert(`Failed to submit "${spice.name}". Please try again later.`);
        }
      }
      
      return result.success;
    } catch (error) {
      console.error('Failed to submit custom spice:', error);
      // Revert UI state
      setSubmittedSpices(prev => {
        const newState = {...prev};
        delete newState[spice.name];
        return newState;
      });
      alert(`Error: Failed to submit "${spice.name}". ${error instanceof Error ? error.message : ''}`);
      return false;
    }
  };

  /**
   * Check if a spice has been submitted already
   * @param name The name of the spice to check
   * @returns Whether the spice has been submitted
   */
  const hasBeenSubmitted = (name: string): boolean => {
    return !!submittedSpices[name];
  };

  /**
   * Get the submission status for a spice
   * @param name The name of the spice to check
   * @returns The submission status or null if not submitted
   */
  const getSubmissionStatus = (name: string): 'pending' | 'approved' | 'rejected' | null => {
    return submittedSpices[name] || null;
  };

  return (
    <div className="flex flex-col p-4 max-w-3xl mx-auto bg-gray-50 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-center mb-6">Spice Jar Organizer</h2>
      
      {/* Username setup screen - shown when no username is set */}
      {!hasSetUserName ? (
        <div className="mb-6 p-8 bg-white rounded shadow text-center">
          <h3 className="font-medium text-xl mb-4">Welcome to Spice Jar Organizer</h3>
          <p className="mb-4">Please enter your name to get started. Your inventory will be associated with this name.</p>
          
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center w-full max-w-md">
              <label className="font-medium mr-2">
                Your Name:
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={userName || ''}
                  onChange={(e) => setUserName(e.target.value)}
                  className="ml-2 p-2 border rounded w-full"
                />
              </label>
            </div>
            <button 
              onClick={handleSetUserName}
              disabled={!userName || !userName.trim()}
              className={`px-4 py-2 rounded text-white ${
                !userName || !userName.trim() ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Get Started
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Configuration section for shelves and reset/clear buttons */}
          <div className="mb-6 p-4 bg-white rounded shadow">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex items-center gap-4">
                <label className="block font-medium">
                  Number of Shelves:
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numShelves}
                    onChange={(e) => {
                      const newValue = Math.max(1, parseInt(e.target.value) || 1);
                      if (spiceLogicRef.current) {
                        // First update SpiceLogic
                        spiceLogicRef.current.setNumShelves(newValue);
                        
                        // Force recalculation of distribution
                        const distribution = spiceLogicRef.current.calculateOptimalDistribution();
                        
                        // Then update component state in a batch to ensure synchronization
                        setNumShelves(newValue);
                        setOptimalDistribution(distribution);
                        
                        console.log(`Shelves updated to ${newValue}, distribution recalculated:`, distribution);
                      }
                    }}
                    className="ml-2 p-1 border rounded"
                  />
                </label>
                
                {/* Add toggle for ignoring duplicates */}
                <div className="flex items-center">
                  <label className="flex items-center font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ignoreDuplicates}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        if (spiceLogicRef.current) {
                          // Update SpiceLogic setting
                          spiceLogicRef.current.setIgnoreDuplicates(newValue);
                          
                          // Force recalculation of distribution
                          const distribution = spiceLogicRef.current.calculateOptimalDistribution();
                          
                          // Update component state
                          setIgnoreDuplicates(newValue);
                          setOptimalDistribution(distribution);
                        }
                      }}
                      className="mr-2"
                    />
                    Ignore Duplicates
                    <span className="ml-1 text-xs text-gray-500 italic">(Ideal)</span>
                  </label>
                </div>
                
                {/* Add user name input */}
                <div className="flex items-center">
                  <label className="font-medium">
                    Session Name:
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={userName || ''}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        if (spiceLogicRef.current && e.target.value.trim()) {
                          spiceLogicRef.current.setUserName(e.target.value);
                        }
                      }}
                      className="ml-2 p-1 border rounded"
                    />
                  </label>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Total Jars: {totalJars}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={resetInventory}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    title="Reset inventory but keep in localStorage"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={clearSavedData}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Clear all data including from localStorage"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
            
            {/* Save status indicator */}
            <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
              <div className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  saveStatus === 'saved' ? 'bg-green-500' : 
                  saveStatus === 'saving' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                <span>
                  {saveStatus === 'saved' ? 'All changes saved' : 
                   saveStatus === 'saving' ? 'Saving...' : 'Error saving'}
                </span>
              </div>
              {lastSaved && (
                <span>Last saved: {lastSaved}</span>
              )}
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
                  onKeyDown={handleKeyDown}
                  className="p-2 border rounded flex-grow"
                />
              </div>
              
              {/* Autocomplete results dropdown */}
              {showResults && searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                  {/* Option to add a custom spice if search term is not empty */}
                  <div
                    className="p-2 bg-green-50 hover:bg-green-100 cursor-pointer flex justify-between items-center border-b"
                    onClick={() => {
                      // Create custom spice from the search term using SpiceLogic's method
                      const customSpice = spiceLogicRef.current?.createCustomSpice(searchTerm) || {
                        name: SpiceLogic.properlyCapitalizeName(searchTerm),
                        category: searchTerm.trim().charAt(0).toUpperCase(),
                      };
                      addSpice(customSpice);
                    }}
                  >
                    <span className="flex items-center">
                      <span className="inline-block w-5 h-5 bg-green-500 text-white rounded-full text-center mr-2 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>Add "<strong>{SpiceLogic.properlyCapitalizeName(searchTerm.trim())}</strong>"</span>
                    </span>
                    <button 
                      className="px-3 py-1 bg-green-500 text-white rounded text-xs font-bold min-w-[32px]"
                      title="Press 0 to add custom spice"
                    >
                      0
                    </button>
                  </div>
                  
                  {/* Display search results if any */}
                  {searchResults.length > 0 ? (
                    <>
                      {searchResults.slice(0, 9).map((spice, idx) => (
                        <div
                          key={idx}
                          className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                          onClick={() => addSpice(spice)}
                        >
                          <span>{spice.name}</span>
                          <button 
                            className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-bold min-w-[32px]"
                            title={`Press ${idx + 1} to add`}
                          >
                            {idx + 1}
                          </button>
                        </div>
                      ))}
                      {searchResults.slice(9).map((spice, idx) => (
                        <div
                          key={idx + 9}
                          className="p-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                          onClick={() => addSpice(spice)}
                        >
                          <span>{spice.name}</span>
                          <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs">
                            Add
                          </button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-2 text-gray-500 border-t">
                      No matching spices found in database
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Summary of jar counts by letter */}
          <div className="mb-6 p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">Jar Count by Letter:</h3>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
              {Object.keys(letterCounts).sort().map(letter => (
                <div key={letter} className="flex flex-col items-center">
                  <div className="flex flex-col items-center">
                    <span className={`font-medium ${letterCounts[letter] > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {letter}
                    </span>
                    <span className="text-sm">{letterCounts[letter] || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Results section showing the calculated optimal distribution */}
          <div className="mb-6 p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">Optimal Shelf Distribution:</h3>
            {optimalDistribution.length > 0 ? (
              <div className="space-y-2">
                {itemsPerShelf.map((shelf, idx) => {
                  // Get the effective letter counts that respect the "ignoreDuplicates" setting
                  const effectiveLetterCounts = spiceLogicRef.current?.getEffectiveLetterCounts() || letterCounts;
                  
                  return (
                    <div key={idx} className="flex justify-between p-2 bg-blue-50 rounded">
                      <div>
                        <span className="font-bold">Shelf {idx + 1}:</span>{" "}
                        <span className="font-medium">{shelf.range}</span>
                      </div>
                      <span className="text-gray-600">{shelf.count} jars</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Add spices to your inventory to see the optimal distribution
              </p>
            )}
          </div>
          
          {/* Visual bar chart of the distribution */}
          {optimalDistribution.length > 0 && (
            <div className="mb-6 p-4 bg-white rounded shadow">
              <h3 className="font-medium mb-2">Distribution Visualization:</h3>
              <div className="h-12 flex rounded overflow-hidden">
                {itemsPerShelf.map((shelf, idx) => {
                  // Calculate the percentage width for this shelf based on effective counts
                  const totalEffectiveJars = itemsPerShelf.reduce((sum, s) => sum + s.count, 0);
                  const percentage = (shelf.count / totalEffectiveJars) * 100;
                  
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
          
          {/* Inventory list showing exact spices added */}
          <div className="p-4 bg-white rounded shadow">
            <h3 className="font-medium mb-2">Current Inventory ({inventory.length} jars):</h3>
            {inventory.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {inventory.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-center p-2 bg-blue-50 rounded hover:bg-blue-100"
                  >
                    <div className="flex items-center">
                      <span className="text-sm font-medium w-7 text-center bg-blue-200 rounded-full mr-2">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                      <span>{item.name}</span>
                      
                      {/* Show submission badge if the spice has been submitted */}
                      {hasBeenSubmitted(item.name) && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">
                          {getSubmissionStatus(item.name) === 'pending' ? 'Pending review' : 
                           getSubmissionStatus(item.name) === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {/* Only show submit button for custom spices not in the official list */}
                      {!spices.some(s => s.name === item.name) && !hasBeenSubmitted(item.name) && (
                        <button
                          onClick={() => submitCustomSpice(item)}
                          className="text-green-500 hover:text-green-700 p-1 mr-2 text-xs flex items-center"
                          title="Submit to spice database"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                          Submit
                        </button>
                      )}
                      <button
                        onClick={() => removeSpice(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove from inventory"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">
                Your inventory is empty. Search and add spices above.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SpiceJarOrganizer;