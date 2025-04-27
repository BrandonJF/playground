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
      
      const result = spiceLogic.saveToStorage();
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      expect(spiceLogic.getLastUpdated()).not.toBeNull();
      
      // Verify saved data format
      const savedData = JSON.parse(localStorageMock.getStore()['spice-organizer-data']);
      expect(savedData.inventory).toHaveLength(1);
      expect(savedData.numShelves).toBe(4);
      expect(savedData.totalJars).toBe(1);
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
      
      expect(distribution.length).toBeLessThanOrEqual(4);
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
});