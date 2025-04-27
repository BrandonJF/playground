import { Suspense, useEffect, useState } from 'react';
import { loadComponents } from './utils/componentLoader';

function App() {
  const [components, setComponents] = useState<Record<string, any>>({});
  const [additionalComponents, setAdditionalComponents] = useState<Record<string, any>>({});
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all components from subfolders
  useEffect(() => {
    async function load() {
      try {
        const mainComponents = await loadComponents();
        
        setComponents(mainComponents);
        // For Docker build, we're not using additional components
        setAdditionalComponents({});
        
        // Auto-select first component if available
        const allComponentKeys = Object.keys(mainComponents);
        if (allComponentKeys.length > 0 && !selectedComponent) {
          setSelectedComponent(allComponentKeys[0]);
        }
      } catch (error) {
        console.error("Failed to load components:", error);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, []);

  // Direct import for specific components
  // This is a fallback for components that might not be discovered
  useEffect(() => {
    // Check if we already have the spice component, if not add it manually
    if (!components['spice'] && !loading) {
      import('./spice/spice').then(module => {
        setAdditionalComponents(prev => ({
          ...prev,
          'spice': module.default
        }));
        
        // Auto-select if no component is selected
        if (!selectedComponent) {
          setSelectedComponent('spice');
        }
      }).catch(error => {
        console.error("Failed to load spice component:", error);
      });
    }
  }, [components, loading, selectedComponent]);

  // Get all component keys for navigation
  const allComponentKeys = [
    ...Object.keys(components),
    ...Object.keys(additionalComponents)
  ].sort();

  // Render the selected component
  const renderComponent = () => {
    if (!selectedComponent) return <p className="text-gray-500">No component selected</p>;
    
    // Look for component in both collections
    const Component = components[selectedComponent] || additionalComponents[selectedComponent];
    
    if (!Component) {
      return <p className="text-gray-500">Component not found: {selectedComponent}</p>;
    }
    
    return (
      <Suspense fallback={<div className="text-gray-500">Loading component...</div>}>
        <Component />
      </Suspense>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">TypeScript Playground</h1>
      
      {loading ? (
        <p className="text-center text-gray-500">Loading components...</p>
      ) : (
        <>
          <div className="bg-gray-100 p-4 rounded-lg shadow-sm mb-6">
            <h2 className="text-xl font-semibold mb-3">Available Components</h2>
            {allComponentKeys.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {allComponentKeys.map(key => (
                  <button
                    key={key}
                    className={`px-3 py-2 rounded font-medium text-sm transition-colors ${
                      selectedComponent === key 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => setSelectedComponent(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">
                No components found. Add .tsx files in subfolders of src/
              </p>
            )}
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-3">
              Component Preview: <span className="text-blue-600">{selectedComponent}</span>
            </h2>
            <div className="bg-white p-6 rounded-lg border border-gray-200 min-h-[400px]">
              {renderComponent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App