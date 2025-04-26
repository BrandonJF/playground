# TypeScript Component Playground

A simple playground for testing TypeScript/React components without setting up a full project each time.

## Features

- Automatically discovers and loads components from subfolders
- No need to modify the main application when adding new components
- Just create a new folder and component, and it will appear in the UI
- Perfect for quickly testing code snippets from AI tools like Claude or ChatGPT

## How to Use

### Adding Components

There are two ways to add components:

1. **Folder with index.tsx**: Create a folder in the `src` directory and place an `index.tsx` file within it:
   ```
   src/
     my-component/
       index.tsx
   ```

2. **Component in a subfolder**: Create a folder in the `src` directory and place any `.tsx` file within it:
   ```
   src/
     my-folder/
       component.tsx
   ```

### Component Requirements

- Components must be the default export of the file
- Components must be self-contained (include all necessary CSS/styling)
- If your component requires external libraries, make sure to install them first

### Running the Playground

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

## Example

1. Create a new folder: `src/my-chart/`
2. Create `src/my-chart/chart.tsx` with your component code
3. It will automatically appear in the component list in the UI

## Tips

- Use inline styles or CSS modules for component styling to prevent conflicts
- For complex components, you can create multiple files in the same folder
- If your component isn't automatically detected, check the console for errors