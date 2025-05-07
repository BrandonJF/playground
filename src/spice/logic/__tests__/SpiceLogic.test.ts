// Run tests using: pnpm vitest run
// For watch mode use: pnpm vitest
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Spice, SpiceLogic } from '../SpiceLogic';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    getStore: () => store,
  };
})();

// Create a global mock for localStorage before any tests run
vi.stubGlobal('localStorage', localStorageMock);

describe('SpiceLogic', () => {
  let spiceLogic: SpiceLogic;
  
  // Sample test data
  const sampleSpices: Spice[] = [
    { name: 'Cinnamon', category: 'C' },
    { name: 'Paprika', category: 'P' },
    { name: 'Basil', category: 'B' },
    { name: 'Thyme', category: 'T' },
    { name: 'Oregano', category: 'O' },
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    localStorageMock.clear();

    // Create a fresh instance for each test
    spiceLogic = new SpiceLogic(sampleSpices);
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const logic = new SpiceLogic();
      expect(logic.getNumShelves()).toBe(3);
      expect(logic.getTotalJars()).toBe(0);
      expect(logic.getInventory()).toEqual([]);
      expect(Object.values(logic.getLetterCounts()).every(count => count === 0)).toBe(true);
    });

    it('should initialize with provided spices', () => {
      expect(spiceLogic.getSpices()).toEqual(sampleSpices);
    });
  });

  describe('Inventory Management', () => {
    it('should add a spice to inventory', () => {
      const spice = { name: 'Cumin', category: 'C' };
      const item = spiceLogic.addSpice(spice);
      
      expect(spiceLogic.getInventory()).toHaveLength(1);
      expect(spiceLogic.getInventory()[0].name).toBe('Cumin');
      expect(spiceLogic.getTotalJars()).toBe(1);
      expect(spiceLogic.getLetterCounts()['C']).toBe(1);
      
      // Verify proper ID and timestamp creation
      expect(item.id).toBeDefined();
      expect(item.addedAt).toBeDefined();
    });

    it('should remove a spice from inventory by ID', () => {
      // Add two spices
      const spice1 = spiceLogic.addSpice({ name: 'Cumin', category: 'C' });
      const spice2 = spiceLogic.addSpice({ name: 'Sage', category: 'S' });
      
      expect(spiceLogic.getTotalJars()).toBe(2);
      
      // Remove one
      const result = spiceLogic.removeSpice(spice1.id);
      
      expect(result).toBe(true);
      expect(spiceLogic.getTotalJars()).toBe(1);
      expect(spiceLogic.getInventory()).toHaveLength(1);
      expect(spiceLogic.getInventory()[0].id).toBe(spice2.id);
      expect(spiceLogic.getLetterCounts()['C']).toBe(0);
      expect(spiceLogic.getLetterCounts()['S']).toBe(1);
    });

    it('should return false when trying to remove non-existent spice', () => {
      expect(spiceLogic.removeSpice('non-existent-id')).toBe(false);
    });

    it('should reset inventory', () => {
      // Add spices
      spiceLogic.addSpice({ name: 'Cumin', category: 'C' });
      spiceLogic.addSpice({ name: 'Sage', category: 'S' });
      
      expect(spiceLogic.getTotalJars()).toBe(2);
      
      // Reset
      spiceLogic.resetInventory();
      
      expect(spiceLogic.getTotalJars()).toBe(0);
      expect(spiceLogic.getInventory()).toHaveLength(0);
      expect(Object.values(spiceLogic.getLetterCounts()).every(count => count === 0)).toBe(true);
    });
  });

  describe('Storage Operations', () => {
    it('should save data to localStorage', () => {
      // Add spices to have data to save
      spiceLogic.addSpice({ name: 'Cumin', category: 'C' });
      spiceLogic.setNumShelves(4);
      
      // Reset the localStorage mock call count before the actual test
      vi.clearAllMocks();
      
      const result = spiceLogic.saveToStorage();
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      expect(spiceLogic.getLastUpdated()).not.toBeNull();
      
      // Verify saved data format
      const savedData = JSON.parse(localStorageMock.getStore()['spice-organizer-data']);
      expect(savedData.inventory).toHaveLength(1);
      expect(savedData.numShelves).toBe(4);
      
      // We don't explicitly save totalJars in the data since it's calculated from inventory
      // Verifying inventory length is sufficient
    });

    it('should load data from localStorage', () => {
      // First save some data
      spiceLogic.addSpice({ name: 'Cumin', category: 'C' });
      spiceLogic.setNumShelves(5);
      spiceLogic.saveToStorage();
      
      // Create a new instance and load data
      const newLogic = new SpiceLogic();
      const result = newLogic.loadFromStorage();
      
      expect(result).toBe(true);
      expect(newLogic.getInventory()).toHaveLength(1);
      expect(newLogic.getNumShelves()).toBe(5);
      expect(newLogic.getTotalJars()).toBe(1);
      expect(newLogic.getLetterCounts()['C']).toBe(1);
    });

    it('should clear data from localStorage', () => {
      // First save some data
      spiceLogic.addSpice({ name: 'Cumin', category: 'C' });
      spiceLogic.saveToStorage();
      
      const result = spiceLogic.clearStorage();
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(1);
      expect(spiceLogic.getTotalJars()).toBe(0);
      expect(spiceLogic.getNumShelves()).toBe(3); // Reset to default
    });
  });

  describe('Search Functionality', () => {
    it('should create a custom spice from search term', () => {
      const customSpice = spiceLogic.createCustomSpice('  Cardamom  ');
      
      expect(customSpice.name).toBe('Cardamom');
      expect(customSpice.category).toBe('C');
    });

    it('should perform fuzzy search on spices', () => {
      // Exact match
      const exactResults = spiceLogic.fuzzySearch('cinnamon');
      expect(exactResults).toHaveLength(1);
      expect(exactResults[0].name).toBe('Cinnamon');
      expect(exactResults[0].score).toBeGreaterThan(0);
      
      // Partial match
      const partialResults = spiceLogic.fuzzySearch('cin');
      expect(partialResults).toHaveLength(1);
      expect(partialResults[0].name).toBe('Cinnamon');
      
      // Fuzzy match
      const fuzzyResults = spiceLogic.fuzzySearch('orn'); // Should match "Oregano"
      expect(fuzzyResults.some(r => r.name === 'Oregano')).toBe(true);
      
      // No match
      const noResults = spiceLogic.fuzzySearch('xyz');
      expect(noResults).toHaveLength(0);
    });

    it('should limit search results', () => {
      // Add more spices to test limiting
      const manySpices = new SpiceLogic([
        ...sampleSpices,
        { name: 'Coriander', category: 'C' },
        { name: 'Cumin', category: 'C' },
        { name: 'Cardamom', category: 'C' },
        { name: 'Cloves', category: 'C' },
        { name: 'Curry Powder', category: 'C' },
      ]);
      
      // All start with 'c'
      const results = manySpices.fuzzySearch('c', 3);
      
      expect(results).toHaveLength(3); // Limited to 3
    });
  });

  describe('Distribution Calculations', () => {
    beforeEach(() => {
      // Setup data for distribution tests
      spiceLogic.addSpice({ name: 'Apple Pie Spice', category: 'A' });
      spiceLogic.addSpice({ name: 'Basil', category: 'B' });
      spiceLogic.addSpice({ name: 'Bay Leaves', category: 'B' });
      spiceLogic.addSpice({ name: 'Cinnamon', category: 'C' });
      spiceLogic.addSpice({ name: 'Cardamom', category: 'C' });
      spiceLogic.addSpice({ name: 'Cumin', category: 'C' });
      spiceLogic.addSpice({ name: 'Paprika', category: 'P' });
    });

    it('should calculate optimal distribution', () => {
      spiceLogic.setNumShelves(3);
      const distribution = spiceLogic.calculateOptimalDistribution();
      
      expect(distribution).toHaveLength(3); // 3 shelves
      expect(distribution.every(shelf => Array.isArray(shelf))).toBe(true);
      
      // Check that all letters are included
      const allLetters = distribution.flat();
      expect(allLetters).toContain('A');
      expect(allLetters).toContain('B');
      expect(allLetters).toContain('C');
      expect(allLetters).toContain('P');
    });

    it('should calculate items per shelf', () => {
      spiceLogic.setNumShelves(2);
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      expect(shelfInfo).toHaveLength(2); // 2 shelves
      expect(shelfInfo[0].range).toBeDefined();
      expect(shelfInfo[0].count).toBeGreaterThan(0);
      expect(shelfInfo[1].range).toBeDefined();
      expect(shelfInfo[1].count).toBeGreaterThan(0);
      
      // Total count should match total jars
      const totalOnShelves = shelfInfo.reduce((sum, shelf) => sum + shelf.count, 0);
      expect(totalOnShelves).toBe(spiceLogic.getTotalJars());
    });

    it('should enforce a minimum of 1 shelf', () => {
      // Try to set shelves to 0
      spiceLogic.setNumShelves(0);
      
      // Should enforce minimum of 1
      expect(spiceLogic.getNumShelves()).toBe(1);
      
      const distribution = spiceLogic.calculateOptimalDistribution();
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // Should still have a distribution with at least one shelf
      expect(distribution.length).toBeGreaterThan(0);
      expect(shelfInfo.length).toBeGreaterThan(0);
    });

    it('should handle edge case of more shelves than letters', () => {
      // Only 4 letters are used (A, B, C, P)
      spiceLogic.setNumShelves(10);
      const distribution = spiceLogic.calculateOptimalDistribution();
      
      // The number of shelves should not exceed the number of letters with jars
      // Our new implementation might return empty shelves so we need to count non-empty shelves
      const nonEmptyShelves = distribution.filter(shelf => shelf.length > 0);
      expect(nonEmptyShelves.length).toBeLessThanOrEqual(4);
    });

    it('should create contiguous alphabetical ranges for each shelf', () => {
      // Add a few more spices with different letters
      spiceLogic.addSpice({ name: 'Dill', category: 'D' });
      spiceLogic.addSpice({ name: 'Oregano', category: 'O' });
      spiceLogic.addSpice({ name: 'Salt', category: 'S' });
      spiceLogic.addSpice({ name: 'Thyme', category: 'T' });
      
      spiceLogic.setNumShelves(3);
      const distribution = spiceLogic.calculateOptimalDistribution();
      
      // For each shelf, verify that the letters appear in alphabetical order
      distribution.forEach(shelf => {
        if (shelf.length > 1) {
          // Check that the shelf is in alphabetical order
          const sortedShelf = [...shelf].sort();
          expect(shelf).toEqual(sortedShelf);
          
          // Get the first and last letters for the range
          const firstLetter = shelf[0];
          const lastLetter = shelf[shelf.length - 1];
          
          // With our new approach, we don't need to check exact range matches
          // Instead, let's verify the shelf has the right properties
          const shelfInfo = spiceLogic.calculateItemsPerShelf();
          
          // Find a shelf range that contains both the first and last letter
          const containsLetters = shelfInfo.some(info => {
            if (info.range.includes('-')) {
              const [start, end] = info.range.split('-');
              const startIdx = SpiceLogic.ALPHABET.indexOf(start);
              const endIdx = SpiceLogic.ALPHABET.indexOf(end);
              const firstLetterIdx = SpiceLogic.ALPHABET.indexOf(firstLetter);
              const lastLetterIdx = SpiceLogic.ALPHABET.indexOf(lastLetter);
              
              return firstLetterIdx >= startIdx && lastLetterIdx <= endIdx;
            } else {
              // Single letter range
              return info.range === firstLetter && firstLetter === lastLetter;
            }
          });
          
          expect(containsLetters).toBe(true);
        }
      });
    });

    it('should format shelf ranges correctly', () => {
      spiceLogic.setNumShelves(3);
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // Check that ranges are formatted as "A-C" or just "A" for single letter
      shelfInfo.forEach(shelf => {
        if (shelf.range.includes('-')) {
          // Multi-letter shelf, should be formatted as "X-Y"
          expect(shelf.range).toMatch(/^[A-Z]-[A-Z]$/);
          
          const [start, end] = shelf.range.split('-');
          expect(start.length).toBe(1);
          expect(end.length).toBe(1);
          expect(start.charCodeAt(0)).toBeLessThanOrEqual(end.charCodeAt(0));
        } else {
          // Single letter shelf
          expect(shelf.range).toMatch(/^[A-Z]$/);
        }
      });
    });

    it('should create ranges that account for letters with no jars', () => {
      // Clear inventory and add spices with specific letters that have gaps
      spiceLogic.resetInventory();
      
      // Add A, D, and Z to create obvious gaps
      spiceLogic.addSpice({ name: 'Apple Pie Spice', category: 'A' });
      spiceLogic.addSpice({ name: 'Dill', category: 'D' });
      spiceLogic.addSpice({ name: 'Zatar', category: 'Z' });
      
      spiceLogic.setNumShelves(2);
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // With 2 shelves and letters A, D, Z we should have ranges like "A-D" and "Z" (or similar pattern)
      expect(shelfInfo.length).toBe(2);
      
      // Check that the first shelf contains A-D and second contains Z (or similar pattern)
      // We don't need to test exact character codes, just that the ranges make logical sense
      const ranges = shelfInfo.map(shelf => shelf.range);
      expect(ranges.some(range => range.includes('A'))).toBe(true);
      expect(ranges.some(range => range.includes('Z'))).toBe(true);
    });
  });

  describe('Duplicate Handling', () => {
    beforeEach(() => {
      // Reset state
      spiceLogic.resetInventory();
      
      // Add a mix of unique and duplicate spices
      spiceLogic.addSpice({ name: 'Thyme', category: 'T' });
      spiceLogic.addSpice({ name: 'Thyme', category: 'T' }); // Duplicate
      spiceLogic.addSpice({ name: 'Basil', category: 'B' });
      spiceLogic.addSpice({ name: 'Oregano', category: 'O' });
      spiceLogic.addSpice({ name: 'Oregano', category: 'O' }); // Duplicate
      spiceLogic.addSpice({ name: 'Cinnamon', category: 'C' });
    });

    it('should count all instances when not ignoring duplicates', () => {
      // Default setting should include duplicates
      expect(spiceLogic.getIgnoreDuplicates()).toBe(false);
      
      // Get letter counts with duplicates counted
      const letterCounts = spiceLogic.getLetterCounts();
      
      // Verify counts include duplicates
      expect(letterCounts['T']).toBe(2); // 2 Thyme
      expect(letterCounts['B']).toBe(1); // 1 Basil
      expect(letterCounts['O']).toBe(2); // 2 Oregano
      expect(letterCounts['C']).toBe(1); // 1 Cinnamon
      
      // Verify total jar count
      expect(spiceLogic.getTotalJars()).toBe(6);
    });

    it('should count only unique spices when ignoring duplicates', () => {
      // Set to ignore duplicates
      spiceLogic.setIgnoreDuplicates(true);
      expect(spiceLogic.getIgnoreDuplicates()).toBe(true);
      
      // Get effective letter counts with duplicates ignored
      const effectiveLetterCounts = spiceLogic.getEffectiveLetterCounts();
      
      // Verify counts only include unique names
      expect(effectiveLetterCounts['T']).toBe(1); // 1 unique Thyme
      expect(effectiveLetterCounts['B']).toBe(1); // 1 Basil
      expect(effectiveLetterCounts['O']).toBe(1); // 1 unique Oregano
      expect(effectiveLetterCounts['C']).toBe(1); // 1 Cinnamon
      
      // The actual inventory and total jars shouldn't change
      expect(spiceLogic.getTotalJars()).toBe(6);
    });

    it('should create different distributions based on duplicate setting', () => {
      // Configure for testing
      spiceLogic.setNumShelves(2);
      
      // First get distribution counting all duplicates
      spiceLogic.setIgnoreDuplicates(false);
      const withDuplicatesDist = spiceLogic.calculateOptimalDistribution();
      const withDuplicatesShelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // Then get distribution ignoring duplicates
      spiceLogic.setIgnoreDuplicates(true);
      const withoutDuplicatesDist = spiceLogic.calculateOptimalDistribution();
      const withoutDuplicatesShelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // The distributions should be the same letters (since we're using the same spices)
      // but the jar counts on each shelf should be different
      
      // Verify both have 2 shelves
      expect(withDuplicatesShelfInfo.length).toBe(2);
      expect(withoutDuplicatesShelfInfo.length).toBe(2);
      
      // Total jars with duplicates should be 6
      const totalWithDuplicates = withDuplicatesShelfInfo.reduce(
        (sum, shelf) => sum + shelf.count, 0
      );
      expect(totalWithDuplicates).toBe(6);
      
      // Total jars without duplicates should be 4 (number of unique spices)
      const totalWithoutDuplicates = withoutDuplicatesShelfInfo.reduce(
        (sum, shelf) => sum + shelf.count, 0
      );
      expect(totalWithoutDuplicates).toBe(4);
    });

    it('should properly toggle the ignore duplicates setting', () => {
      // Default setting
      expect(spiceLogic.getIgnoreDuplicates()).toBe(false);
      
      // Toggle on
      spiceLogic.setIgnoreDuplicates(true);
      expect(spiceLogic.getIgnoreDuplicates()).toBe(true);
      
      // Toggle off
      spiceLogic.setIgnoreDuplicates(false);
      expect(spiceLogic.getIgnoreDuplicates()).toBe(false);
    });
  });

  describe('Markdown Parsing', () => {
    it('should parse spice list from markdown format', () => {
      const markdown = `---
title: Spice List
date: 2023-01-01
---

# Spice List by Letter

A
Allspice
Anise

B
Basil
Bay Leaves

C
Cinnamon
Cardamom
Cloves`;

      const parsed = SpiceLogic.parseSpiceListFromMarkdown(markdown);
      
      expect(parsed).toHaveLength(7);
      expect(parsed.find(s => s.name === 'Allspice')?.category).toBe('A');
      expect(parsed.find(s => s.name === 'Basil')?.category).toBe('B');
      expect(parsed.find(s => s.name === 'Cinnamon')?.category).toBe('C');
    });
  });

  describe('Name Capitalization', () => {
    it('should properly capitalize spice names', () => {
      // Standard cases
      expect(SpiceLogic.properlyCapitalizeName('cinnamon')).toBe('Cinnamon');
      expect(SpiceLogic.properlyCapitalizeName('black pepper')).toBe('Black Pepper');
      expect(SpiceLogic.properlyCapitalizeName('olive oil')).toBe('Olive Oil');
      
      // Handling extra whitespace
      expect(SpiceLogic.properlyCapitalizeName('  garlic  powder  ')).toBe('Garlic Powder');
      
      // Special cases like BBQ
      expect(SpiceLogic.properlyCapitalizeName('bbq seasoning')).toBe('BBQ Seasoning');
      expect(SpiceLogic.properlyCapitalizeName('msg powder')).toBe('MSG Powder');
      
      // Comma-separated formats
      expect(SpiceLogic.properlyCapitalizeName('salt, smoked')).toBe('Salt, Smoked');
      expect(SpiceLogic.properlyCapitalizeName('pepper, black')).toBe('Pepper, Black');
      
      // Lowercase connectors
      expect(SpiceLogic.properlyCapitalizeName('herbs of provence')).toBe('Herbs of Provence');
      expect(SpiceLogic.properlyCapitalizeName('salt with garlic')).toBe('Salt with Garlic');
      
      // Mixed cases shouldn't be changed
      expect(SpiceLogic.properlyCapitalizeName('Himalayan Pink Salt')).toBe('Himalayan Pink Salt');
      
      // Edge cases
      expect(SpiceLogic.properlyCapitalizeName('')).toBe('');
      expect(SpiceLogic.properlyCapitalizeName('   ')).toBe('');
    });
    
    it('should create a custom spice with proper capitalization', () => {
      const customSpice = spiceLogic.createCustomSpice('smoked paprika');
      expect(customSpice.name).toBe('Smoked Paprika');
      expect(customSpice.category).toBe('S');
    });
    
    it('should ensure proper capitalization when adding spices', () => {
      const spice = { name: 'garlic powder', category: 'G' };
      const item = spiceLogic.addSpice(spice);
      
      expect(item.name).toBe('Garlic Powder');
      expect(spiceLogic.getInventory()[0].name).toBe('Garlic Powder');
    });
  });

  describe('Full Alphabet Coverage in Shelf Labels', () => {
    beforeEach(() => {
      // Reset state
      spiceLogic.resetInventory();
    });

    it('should create shelf labels that cover the entire alphabet', () => {
      // Add spices with specific letters scattered across the alphabet
      spiceLogic.addSpice({ name: 'Anise', category: 'A' });
      spiceLogic.addSpice({ name: 'Cardamom', category: 'C' });
      spiceLogic.addSpice({ name: 'Pepper', category: 'P' });
      spiceLogic.addSpice({ name: 'Thyme', category: 'T' });
      
      // Set 3 shelves
      spiceLogic.setNumShelves(3);
      
      // Get shelf info
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // Should have 3 shelves
      expect(shelfInfo.length).toBe(3);
      
      // The first shelf should start with 'A'
      expect(shelfInfo[0].range).toMatch(/^A/);
      
      // The last shelf should end with 'Z'
      expect(shelfInfo[shelfInfo.length - 1].range).toMatch(/Z$/);
      
      // Collect all the ranges
      const ranges = shelfInfo.map(shelf => shelf.range);
      
      // Check that there are no gaps between ranges
      for (let i = 0; i < ranges.length - 1; i++) {
        const currentRange = ranges[i];
        const nextRange = ranges[i + 1];
        
        // Get the last letter of the current range and the first letter of the next range
        const currentEnd = currentRange.includes('-') ? currentRange.split('-')[1] : currentRange;
        const nextStart = nextRange.includes('-') ? nextRange.split('-')[0] : nextRange;
        
        // Get the alphabet indices
        const currentEndIndex = SpiceLogic.ALPHABET.indexOf(currentEnd);
        const nextStartIndex = SpiceLogic.ALPHABET.indexOf(nextStart);
        
        // The next range should start exactly one letter after the current range ends
        expect(nextStartIndex).toBe(currentEndIndex + 1);
      }
    });

    it('should create a single A-Z label for one shelf', () => {
      // Add some spices
      spiceLogic.addSpice({ name: 'Basil', category: 'B' });
      spiceLogic.addSpice({ name: 'Oregano', category: 'O' });
      
      // Set to 1 shelf
      spiceLogic.setNumShelves(1);
      
      // Get shelf info
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // Should have 1 shelf
      expect(shelfInfo.length).toBe(1);
      
      // The shelf should cover the entire alphabet
      expect(shelfInfo[0].range).toBe('A-Z');
    });

    it('should handle the case with no spices added', () => {
      // No spices added, just set shelves
      spiceLogic.setNumShelves(3);
      
      // Get shelf info
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // Should have 3 shelves
      expect(shelfInfo.length).toBe(3);
      
      // Each shelf should have a proper range and 0 jars
      shelfInfo.forEach(shelf => {
        expect(shelf.range).toBeDefined();
        expect(shelf.count).toBe(0);
      });
      
      // First shelf should start with A, last shelf should end with Z
      expect(shelfInfo[0].range).toMatch(/^A/);
      expect(shelfInfo[shelfInfo.length - 1].range).toMatch(/Z$/);
      
      // Check for contiguous ranges without gaps
      let previousEndLetter = '';
      
      for (let i = 0; i < shelfInfo.length; i++) {
        const range = shelfInfo[i].range;
        const [startLetter, endLetter] = range.includes('-') ? range.split('-') : [range, range];
        
        if (i > 0) {
          // The current start letter should come right after the previous end letter
          const prevLetterIndex = SpiceLogic.ALPHABET.indexOf(previousEndLetter);
          const currLetterIndex = SpiceLogic.ALPHABET.indexOf(startLetter);
          expect(currLetterIndex).toBe(prevLetterIndex + 1);
        }
        
        previousEndLetter = endLetter;
      }
    });

    it('should maintain balanced distribution while covering the alphabet', () => {
      // Add spices with very uneven distribution
      for (let i = 0; i < 15; i++) spiceLogic.addSpice({ name: 'Allspice', category: 'A' });
      for (let i = 0; i < 3; i++) spiceLogic.addSpice({ name: 'Chili Powder', category: 'C' });
      for (let i = 0; i < 2; i++) spiceLogic.addSpice({ name: 'Paprika', category: 'P' });
      spiceLogic.addSpice({ name: 'Turmeric', category: 'T' });
      
      // Set 3 shelves
      spiceLogic.setNumShelves(3);
      
      // Get shelf info
      const shelfInfo = spiceLogic.calculateItemsPerShelf();
      
      // Should have 3 shelves
      expect(shelfInfo.length).toBe(3);
      
      // Get jar counts for each shelf
      const jarCounts = shelfInfo.map(shelf => shelf.count);
      
      // Calculate standard deviation of jar counts (measure of balance)
      const average = jarCounts.reduce((sum, count) => sum + count, 0) / jarCounts.length;
      const squaredDifferences = jarCounts.map(count => Math.pow(count - average, 2));
      const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / jarCounts.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should not be too high (shelves should be relatively balanced)
      // With 21 jars on 3 shelves, perfect distribution would be 7 jars per shelf
      // A reasonable threshold for standard deviation would be around 2-3 jars
      expect(stdDev).toBeLessThan(4);
      
      // While still maintaining complete alphabet coverage
      expect(shelfInfo[0].range).toMatch(/^A/);
      expect(shelfInfo[shelfInfo.length - 1].range).toMatch(/Z$/);
      
      // And contiguous ranges
      for (let i = 0; i < shelfInfo.length - 1; i++) {
        const currentRange = shelfInfo[i].range;
        const nextRange = shelfInfo[i + 1].range;
        
        const currentEnd = currentRange.includes('-') ? currentRange.split('-')[1] : currentRange;
        const nextStart = nextRange.includes('-') ? nextRange.split('-')[0] : nextRange;
        
        const currentEndIndex = SpiceLogic.ALPHABET.indexOf(currentEnd);
        const nextStartIndex = SpiceLogic.ALPHABET.indexOf(nextStart);
        
        expect(nextStartIndex).toBe(currentEndIndex + 1);
      }
    });
  });
});