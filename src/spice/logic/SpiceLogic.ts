import { API_CONFIG, getApiUrl } from '../../utils/config';

// Interface definitions for the spice organizer
export interface Spice {
  name: string;
  category: string; // First letter
}

// Interface for inventory items - tracks actual spices added
export interface InventoryItem extends Spice {
  id: string; // Unique identifier
  addedAt: string; // Timestamp
}

// Interface for letter counts object
export interface LetterCounts {
  [key: string]: number;
}

// Interface for shelf distribution visualization
export interface ShelfInfo {
  range: string;
  count: number;
}

// Interface for submission status tracking
export interface SpiceSubmission {
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

// Interface for saved data in localStorage
export interface SavedData {
  inventory: InventoryItem[];
  letterCounts: LetterCounts;
  numShelves: number;
  totalJars: number;
  lastUpdated: string;
  submissions: SpiceSubmission[]; // Required property
}

// Interface for fuzzy search result with score
export interface FuzzySearchResult extends Spice {
  score: number;
}

/**
 * SpiceLogic - Core business logic for the spice jar organizer
 * Handles all data manipulation, search, and organization algorithms without UI dependencies
 * 
 * IMPORTANT: This class should contain ALL business logic, including:
 * - Data fetching and parsing
 * - Data manipulation (adding/removing spices, calculations)
 * - Storage operations (loading/saving)
 * - Validation logic
 * 
 * The React components should ONLY handle:
 * - UI rendering
 * - User interactions
 * - State management specific to the UI
 * 
 * Any operation that could potentially be used outside of a specific UI component
 * should be implemented here instead of in the component.
 */
export class SpiceLogic {
  // Constants
  private static readonly STORAGE_KEY = 'spice-organizer-data';
  private static readonly ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // State properties
  private inventory: InventoryItem[] = [];
  private letterCounts: LetterCounts = {};
  private numShelves: number = 3;
  private totalJars: number = 0;
  private spices: Spice[] = [];
  private lastUpdated: string | null = null;
  private submissions: SpiceSubmission[] = []; // Track submissions

  constructor(initialSpices: Spice[] = []) {
    // Initialize letter counts with zeros
    SpiceLogic.ALPHABET.forEach(letter => {
      this.letterCounts[letter] = 0;
    });
    
    this.spices = initialSpices;
  }

  /**
   * Properly capitalize a spice name according to standard conventions
   * @param name The raw spice name to capitalize
   * @returns The properly capitalized spice name
   */
  public static properlyCapitalizeName(name: string): string {
    if (!name) return '';
    
    // Trim the input and handle empty string
    const trimmed = name.trim();
    if (trimmed === '') return '';

    // Split by spaces to handle different words
    return trimmed.split(/\s+/).map((word, index) => {
      if (!word) return '';
      
      // Special cases like BBQ, MSG, etc.
      const knownAbbreviations = ['BBQ', 'MSG', 'CBD'];
      if (knownAbbreviations.includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      
      // Lowercase connectors when they're not the first word
      const lowercaseConnectors = ['and', 'or', 'the', 'in', 'of', 'with', 'for'];
      if (index > 0 && lowercaseConnectors.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      // Standard case: capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  /**
   * Load stored data from localStorage
   * @returns Whether data was successfully loaded
   */
  public loadFromStorage(): boolean {
    try {
      const savedData = localStorage.getItem(SpiceLogic.STORAGE_KEY);
      if (savedData) {
        const parsedData: SavedData = JSON.parse(savedData);
        this.inventory = parsedData.inventory || [];
        this.letterCounts = parsedData.letterCounts;
        this.numShelves = parsedData.numShelves;
        this.totalJars = parsedData.totalJars;
        this.lastUpdated = parsedData.lastUpdated;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      return false;
    }
  }

  /**
   * Save current state to localStorage
   * @returns Whether data was successfully saved
   */
  public saveToStorage(): boolean {
    try {
      const now = new Date().toLocaleString();
      const dataToSave: SavedData = {
        inventory: this.inventory,
        letterCounts: this.letterCounts,
        numShelves: this.numShelves,
        totalJars: this.totalJars,
        lastUpdated: now,
        submissions: this.submissions
      };

      localStorage.setItem(SpiceLogic.STORAGE_KEY, JSON.stringify(dataToSave));
      this.lastUpdated = now;
      return true;
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
      return false;
    }
  }

  /**
   * Clear all data from localStorage
   * @returns Whether data was successfully cleared
   */
  public clearStorage(): boolean {
    try {
      localStorage.removeItem(SpiceLogic.STORAGE_KEY);
      this.resetInventory();
      this.numShelves = 3;
      this.lastUpdated = null;
      return true;
    } catch (error) {
      console.error('Failed to clear data from localStorage:', error);
      return false;
    }
  }

  /**
   * Set the available spices list
   * @param spices Array of spices to use for search
   */
  public setSpices(spices: Spice[]): void {
    this.spices = spices;
  }

  /**
   * Get the current list of available spices
   * @returns The current spice list
   */
  public getSpices(): Spice[] {
    return this.spices;
  }

  /**
   * Get the current inventory
   * @returns Array of inventory items
   */
  public getInventory(): InventoryItem[] {
    return this.inventory;
  }

  /**
   * Get the current letter counts
   * @returns Letter counts object
   */
  public getLetterCounts(): LetterCounts {
    return this.letterCounts;
  }

  /**
   * Get the current number of shelves
   * @returns Number of shelves
   */
  public getNumShelves(): number {
    return this.numShelves;
  }

  /**
   * Set the number of shelves
   * @param num Number of shelves to set
   */
  public setNumShelves(num: number): void {
    this.numShelves = Math.max(1, num);
  }

  /**
   * Get the total jar count
   * @returns Total number of jars
   */
  public getTotalJars(): number {
    return this.totalJars;
  }

  /**
   * Get the timestamp of the last update
   * @returns Last updated timestamp or null
   */
  public getLastUpdated(): string | null {
    return this.lastUpdated;
  }

  /**
   * Add a spice to the inventory
   * @param spice The spice to add
   * @returns The created inventory item
   */
  public addSpice(spice: Spice): InventoryItem {
    // Make sure the name has proper capitalization
    const properlyCapitalizedName = SpiceLogic.properlyCapitalizeName(spice.name);
    
    // Create a new spice object with proper capitalization
    const properSpice: Spice = {
      name: properlyCapitalizedName,
      category: spice.category
    };
    
    // Extract the first letter from the spice name and ensure it's uppercase
    const firstLetter = properSpice.name.charAt(0).toUpperCase();
    
    // Create a unique ID for this inventory item
    const newItem: InventoryItem = {
      ...properSpice,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      addedAt: new Date().toLocaleString()
    };
    
    // Add to inventory
    this.inventory.push(newItem);
    
    // Update letter counts
    this.letterCounts[firstLetter] = (this.letterCounts[firstLetter] || 0) + 1;
    
    // Increment total jar count
    this.totalJars += 1;
    
    return newItem;
  }

  /**
   * Remove a spice from the inventory by ID
   * @param id ID of the inventory item to remove
   * @returns Whether the item was successfully removed
   */
  public removeSpice(id: string): boolean {
    // Find the item to remove
    const itemToRemove = this.inventory.find(item => item.id === id);
    if (!itemToRemove) return false;
    
    // Extract the first letter and update counts
    const firstLetter = itemToRemove.name.charAt(0).toUpperCase();
    
    // Remove from inventory
    this.inventory = this.inventory.filter(item => item.id !== id);
    
    // Update letter counts
    this.letterCounts[firstLetter] = Math.max(0, (this.letterCounts[firstLetter] || 0) - 1);
    
    // Decrement total jar count
    this.totalJars -= 1;
    
    return true;
  }

  /**
   * Reset the entire inventory and letter counts
   */
  public resetInventory(): void {
    this.inventory = [];
    
    // Reset all letter counts to zero
    SpiceLogic.ALPHABET.forEach(letter => {
      this.letterCounts[letter] = 0;
    });
    
    this.totalJars = 0;
  }

  /**
   * Calculate the optimal distribution of letters across shelves
   * @returns Array of letter arrays, each representing a shelf
   */
  public calculateOptimalDistribution(): string[][] {
    return this.calculateOptimalDistributionWithParams(this.letterCounts, this.totalJars, this.numShelves);
  }

  /**
   * Calculate items per shelf for display
   * @returns Array of shelf info objects
   */
  public calculateItemsPerShelf(): ShelfInfo[] {
    // Calculate shelf distribution
    const distribution = this.calculateOptimalDistributionWithParams(this.letterCounts, this.totalJars, this.numShelves);
    
    // Convert to shelf info objects
    const shelfInfo: ShelfInfo[] = [];
    
    for (const shelfLetters of distribution) {
      if (shelfLetters.length === 0) continue;
      
      // Create range string (e.g., "A-C")
      const range = `${shelfLetters[0]}-${shelfLetters[shelfLetters.length - 1]}`;
      
      // Calculate total count for this shelf
      let count = 0;
      for (const letter of shelfLetters) {
        count += this.letterCounts[letter] || 0;
      }
      
      shelfInfo.push({ range, count });
    }
    
    return shelfInfo;
  }

  /**
   * Calculate the optimal distribution of letters across shelves with provided parameters
   * @param letterCounts Object containing counts for each letter
   * @param totalJars Total number of jars
   * @param numShelves Number of shelves to distribute across
   * @returns Array of letter arrays, each representing a shelf
   */
  private calculateOptimalDistributionWithParams(letterCounts: LetterCounts, totalJars: number, numShelves: number): string[][] {
    // Default to empty array if no jars or shelves
    if (totalJars === 0 || numShelves === 0) {
      return [];
    }

    // Get all letters that have at least one jar
    const letters = SpiceLogic.ALPHABET.filter(letter => letterCounts[letter] && letterCounts[letter] > 0);
    
    // If no letters with jars, return empty array
    if (letters.length === 0) {
      return [];
    }
    
    // If only one shelf, put all letters on it
    if (numShelves === 1) {
      return [letters];
    }

    // Calculate the ideal number of jars per shelf
    const idealJarsPerShelf = totalJars / numShelves;
    
    // Initialize result array
    const distribution: string[][] = Array(numShelves).fill(null).map(() => []);
    
    // Track running counts for each shelf
    const shelfCounts: number[] = Array(numShelves).fill(0);
    
    // First pass: try to keep letters sequential while balancing
    let currentShelf = 0;
    let currentCount = 0;
    
    for (const letter of letters) {
      const letterCount = letterCounts[letter];
      
      // If adding this letter exceeds the ideal count AND we're not on the last shelf,
      // move to the next shelf
      if (currentCount + letterCount > idealJarsPerShelf && currentShelf < numShelves - 1) {
        currentShelf++;
        currentCount = 0;
      }
      
      // Add letter to current shelf
      distribution[currentShelf].push(letter);
      currentCount += letterCount;
      shelfCounts[currentShelf] += letterCount;
    }
    
    // Second pass: optimize by moving letters to balance shelves better
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    
    while (iterations < maxIterations) {
      iterations++;
      
      // Find the heaviest and lightest shelves
      let heaviestShelf = 0;
      let heaviestCount = shelfCounts[0];
      let lightestShelf = 0;
      let lightestCount = shelfCounts[0];
      
      for (let i = 1; i < shelfCounts.length; i++) {
        if (shelfCounts[i] > heaviestCount) {
          heaviestCount = shelfCounts[i];
          heaviestShelf = i;
        }
        if (shelfCounts[i] < lightestCount) {
          lightestCount = shelfCounts[i];
          lightestShelf = i;
        }
      }
      
      // If shelves are balanced enough, stop optimizing
      if (heaviestCount - lightestCount <= 1) {
        break;
      }
      
      // Try to move a letter from the heaviest to lightest shelf
      const heaviestLetters = distribution[heaviestShelf];
      
      // Try last letter first (to keep alphabetical order as much as possible)
      const lastLetter = heaviestLetters[heaviestLetters.length - 1];
      const lastLetterCount = letterCounts[lastLetter];
      
      // Move the letter if it improves balance
      if (lastLetterCount <= heaviestCount - lightestCount) {
        // Remove from heaviest shelf
        distribution[heaviestShelf].pop();
        shelfCounts[heaviestShelf] -= lastLetterCount;
        
        // Add to lightest shelf
        distribution[lightestShelf].push(lastLetter);
        shelfCounts[lightestShelf] += lastLetterCount;
        
        // Re-sort the lightest shelf to maintain alphabetical order
        distribution[lightestShelf].sort();
      } else {
        // No more optimization possible
        break;
      }
    }
    
    // Third pass: ensure alphabetical order within each shelf
    for (let i = 0; i < distribution.length; i++) {
      distribution[i].sort();
    }
    
    // Remove empty shelves (can happen if we have fewer letters than shelves)
    return distribution.filter(shelf => shelf.length > 0);
  }

  /**
   * Create a custom spice from a search term
   * @param searchTerm The term to create a custom spice from
   * @returns The created spice object
   */
  public createCustomSpice(searchTerm: string): Spice {
    const capitalizedName = SpiceLogic.properlyCapitalizeName(searchTerm);
    return {
      name: capitalizedName,
      category: capitalizedName.charAt(0).toUpperCase(),
    };
  }

  /**
   * Perform a fuzzy search on the spice list
   * @param query The search query
   * @param limit Maximum number of results to return
   * @returns Array of matching spices with scores
   */
  public fuzzySearch(query: string, limit: number = 10): FuzzySearchResult[] {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    if (searchTerms.length === 0) return [];

    const results = this.spices.map(item => {
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
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Linear partition algorithm for optimal shelf distribution
   * This method is left in the code as a placeholder for future optimization,
   * but commented out to avoid TypeScript errors in the build process.
   * 
   * @param seq Array of values to partition
   * @param k Number of partitions
   * @returns Array of partition ranges [start, end]
   */
  /*
  private linearPartition(seq: number[], k: number): number[][] {
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
    const nItems = n;
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
  */

  /**
   * Parse a markdown spice list format into an array of spices
   * @param markdownText The raw markdown text
   * @returns Array of parsed spices
   */
  public static parseSpiceListFromMarkdown(markdownText: string): Spice[] {
    const lines = markdownText.split(/\r?\n/);
    
    // Find the second '---' marker to locate where data begins
    let dataStart = 0;
    let dashCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        dashCount++;
        if (dashCount === 2) {
          dataStart = i + 1;
          break;
        }
      }
    }

    let currentCategory = '';
    const parsed: Spice[] = [];

    for (let i = dataStart; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('##')) continue;
      if (/^[A-Z]$/.test(trimmed)) {
        currentCategory = trimmed;
      } else {
        parsed.push({ name: trimmed, category: currentCategory });
      }
    }

    return parsed;
  }

  /**
   * Fetch spices from the spicelist.md file
   * @returns Promise resolving to an array of spices
   */
  public static async fetchSpicesFromMarkdown(url: string = '/spicelist.md'): Promise<Spice[]> {
    try {
      const res = await fetch(url);
      const text = await res.text();
      return SpiceLogic.parseSpiceListFromMarkdown(text);
    } catch (error) {
      console.error('Error fetching spice list:', error);
      return [];
    }
  }

  /**
   * Fetch and update the spices list
   * @returns Promise resolving to whether the operation was successful
   */
  public async fetchAndUpdateSpices(url: string = '/spicelist.md'): Promise<boolean> {
    try {
      // In Docker environment, we need to ensure we use the absolute URL
      const spiceListUrl = url.startsWith('http') ? url : (window.location.origin + url);
      console.log('Fetching spices from:', spiceListUrl);
      
      const spices = await SpiceLogic.fetchSpicesFromMarkdown(spiceListUrl);
      this.setSpices(spices);
      return true;
    } catch (error) {
      console.error('Error fetching and updating spices:', error);
      return false;
    }
  }

  /**
   * Submit a custom spice to be considered for the canonical list
   * @param spice The spice to submit
   * @returns Whether the submission was successful
   */
  public async submitSpice(spice: Spice): Promise<{success: boolean, status?: string, error?: string}> {
    try {
      // Create a submission record for local tracking
      const submission: SpiceSubmission = {
        name: spice.name,
        status: 'pending',
        submittedAt: new Date().toLocaleString()
      };
      
      // Check if this spice has already been submitted locally
      const existingIndex = this.submissions.findIndex(s => s.name === spice.name);
      if (existingIndex >= 0) {
        // Update existing submission if found
        this.submissions[existingIndex] = submission;
      } else {
        // Add new submission
        this.submissions.push(submission);
      }
      
      // Save to local storage
      this.saveToStorage();
      
      // Send to server API using the centralized config
      const response = await fetch(getApiUrl(API_CONFIG.endpoints.submitSpice), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: spice.name,
          category: spice.category
        }),
      });
      
      // Enhanced error handling - log the actual response for debugging
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server response (${response.status}): ${errorText}`);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      console.log('Server response:', data);
      
      // If the submission was successful and auto-approved
      if (data.success && data.status === 'approved') {
        // Update the local submission status to approved
        const updatedIndex = this.submissions.findIndex(s => s.name === spice.name);
        if (updatedIndex >= 0) {
          this.submissions[updatedIndex].status = 'approved';
          // Save the updated status
          this.saveToStorage();
        }
        
        return { success: true, status: 'approved' };
      } else if (data.success && data.status === 'exists') {
        // Spice already exists in the canonical list
        return { success: true, status: 'exists' };
      }
      
      return { success: data.success, status: data.status || 'pending' };
    } catch (error) {
      console.error('Failed to submit spice:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Load submissions from the server API
   * @returns Promise resolving to whether the operation was successful
   */
  public async loadSubmissionsFromServer(): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl(API_CONFIG.endpoints.submissions));
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions from server');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Merge server submissions with local submissions
        const serverSubmissions = data.data;
        
        // Create a map of existing submissions by name for quick lookup
        const existingSubmissions = new Map();
        this.submissions.forEach(sub => {
          existingSubmissions.set(sub.name, sub);
        });
        
        // Add or update submissions from server
        serverSubmissions.forEach((serverSub: SpiceSubmission) => {
          if (existingSubmissions.has(serverSub.name)) {
            // Update existing submission with server data (server is authoritative)
            const index = this.submissions.findIndex(s => s.name === serverSub.name);
            if (index >= 0) {
              this.submissions[index] = serverSub;
            }
          } else {
            // Add new submission from server
            this.submissions.push(serverSub);
          }
        });
        
        // Save the updated submissions to storage
        this.saveToStorage();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to load submissions from server:', error);
      return false;
    }
  }

  /**
   * Check if a spice already exists in the spice list
   * @param name The name of the spice to check
   * @returns True if the spice exists, false otherwise
   */
  public spiceExistsInList(name: string): boolean {
    if (!name || !this.spices.length) return false;
    
    const normalizedName = SpiceLogic.properlyCapitalizeName(name).trim();
    
    // Check for exact match
    return this.spices.some(spice => {
      const spiceName = spice.name.trim();
      return (
        spiceName === normalizedName || 
        spiceName === `${normalizedName},` || 
        spiceName.startsWith(`${normalizedName},`)
      );
    });
  }
}