import { lazy } from 'react';

/**
 * Load components dynamically for the web playground
 */
export function loadComponents() {
  // In a production build, use direct imports instead of import.meta.glob
  // This avoids TypeScript errors in the Docker build
  const components: Record<string, any> = {};
  
  // Manually define the components we know exist
  components['counter'] = lazy(() => import('../counter/index.tsx'));
  components['spice'] = lazy(() => import('../spice/spice.tsx'));
  
  return components;
}