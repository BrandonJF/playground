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

// Interface for saved data in localStorage
export interface SavedData {
  inventory: InventoryItem[];
  letterCounts: LetterCounts;
  numShelves: number;
  totalJars: number;
  lastUpdated: string;
}

// Interface for fuzzy search result with score
export interface FuzzySearchResult extends Spice {
  score: number;
}

/**
 * SpiceLogic - Core business logic for the spice jar organizer
 * Handles all data manipulation, search, and organization algorithms without UI dependencies
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

  constructor(initialSpices: Spice[] = []) {
    // Initialize letter counts with zeros
    SpiceLogic.ALPHABET.forEach(letter => {
      this.letterCounts[letter] = 0;
    });
    
    this.spices = initialSpices;
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
        lastUpdated: now
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
    // Extract the first letter from the spice name and ensure it's uppercase
    const firstLetter = spice.name.charAt(0).toUpperCase();
    
    // Create a unique ID for this inventory item
    const newItem: InventoryItem = {
      ...spice,
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
   * Create a custom spice from a search term
   * @param searchTerm The term to create a custom spice from
   * @returns The created spice object
   */
  public createCustomSpice(searchTerm: string): Spice {
    const trimmedTerm = searchTerm.trim();
    return {
      name: trimmedTerm,
      category: trimmedTerm.charAt(0).toUpperCase(),
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
   * Calculate the optimal distribution of spices across shelves
   * @returns Array of letter groups, one per shelf
   */
  public calculateOptimalDistribution(): string[][] {
    // Don't calculate if there are no jars or no shelves
    if (this.totalJars === 0 || this.numShelves <= 0) {
      return [];
    }

    // Get jar counts for each letter
    const letterArray = SpiceLogic.ALPHABET.map(letter => ({
      letter,
      count: this.letterCounts[letter] || 0
    }));

    // Only consider letters with jars
    const filtered = letterArray.filter(item => item.count > 0);
    if (filtered.length === 0) {
      return [];
    }

    // Partition the counts
    const counts = filtered.map(item => item.count);
    const partitions = this.linearPartition(counts, Math.min(this.numShelves, filtered.length));

    // Map partitions to letter groups
    const groups: string[][] = [];
    for (const [start, end] of partitions) {
      const group = filtered.slice(start, end + 1).map(item => item.letter);
      groups.push(group);
    }

    return groups;
  }

  /**
   * Calculate items per shelf based on the optimal distribution
   * @returns Array of shelf info objects with range and count
   */
  public calculateItemsPerShelf(): ShelfInfo[] {
    // First check if there are no jars or no shelves
    if (this.totalJars === 0 || this.numShelves <= 0) {
      return [];
    }
    
    const distribution = this.calculateOptimalDistribution();
    if (distribution.length === 0) return [];
    
    return distribution.map(shelf => {
      // Calculate total jars on this shelf
      const count = shelf.reduce((sum: number, letter: string) => sum + (this.letterCounts[letter] || 0), 0);
      
      // Create a range string (e.g., "A-D") for display
      // If it's just one letter, only show that letter
      const range = shelf.length === 1 
        ? shelf[0] 
        : `${shelf[0]}-${shelf[shelf.length - 1]}`;
        
      return { range, count };
    });
  }

  /**
   * Linear partition algorithm for optimal shelf distribution
   * @param seq Array of values to partition
   * @param k Number of partitions
   * @returns Array of partition ranges [start, end]
   */
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
}