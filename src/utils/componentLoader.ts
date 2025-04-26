import { lazy } from 'react';

// This function dynamically imports components from subfolders
export async function loadComponents() {
  // Get all modules in the src directory that match pattern
  const modules = import.meta.glob('/src/*/index.tsx');
  const components: Record<string, any> = {};

  for (const path in modules) {
    const folderName = path.split('/')[2]; // Extract folder name from path
    if (folderName) {
      try {
        // Dynamically import the component
        components[folderName] = lazy(() => import(/* @vite-ignore */ path));
      } catch (error) {
        console.error(`Failed to load component from ${path}:`, error);
      }
    }
  }

  return components;
}

// This second function handles components that don't use index.tsx pattern
export async function loadAdditionalComponents() {
  // Get all tsx files that match pattern but not index files
  const modules = import.meta.glob('/src/*/*.tsx');
  const components: Record<string, any> = {};

  for (const path in modules) {
    // Skip index files as they're handled by the other function
    if (path.endsWith('/index.tsx')) continue;
    
    const parts = path.split('/');
    const folderName = parts[2]; // Extract folder name from path
    const fileName = parts[3].replace('.tsx', ''); // Extract file name without extension
    
    if (folderName && fileName) {
      const componentKey = `${folderName}/${fileName}`;
      try {
        // Dynamically import the component
        components[componentKey] = lazy(() => import(/* @vite-ignore */ path));
      } catch (error) {
        console.error(`Failed to load component from ${path}:`, error);
      }
    }
  }

  return components;
}