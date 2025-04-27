# Spice Organizer Learning Journal

---

## CONTEXT & INSTRUCTIONS

- **What this is:**
  - A chronological, running log of insights, problems, solutions, and design decisions encountered during the development of the spice organizer project.
  - Written from the perspective of a product engineer, but intended for both human and AI readers.

- **How it's organized:**
  - Entries are grouped by date and topic, in reverse chronological order.
  - Each section documents a specific phase, challenge, or learning.

- **How to use this file:**
  - Read from the top for the latest context and project philosophy.
  - Use as a reference for design decisions, rationale, and lessons learned.
  - Both humans and AI systems should use this as the canonical source of project history and intent.

- **How to add to it:**
  - Add new entries under the appropriate date heading, using clear, concise bullet points or short paragraphs.
  - When documenting a new problem, solution, or insight, be explicit about the context and reasoning.
  - Maintain the tone and perspective of a product engineer reflecting on real-world product and data design.
  - If adding new sections, use clear headings and keep the structure consistent.

- **Markers for tools:**
  - The main content begins after the line: `---`
  - Tools or scripts that load this file should skip everything before the first `---` marker.
  - Each major section should be clearly headed with a date and topic for easy parsing.

---

## April 26, 2025

### Project Kickoff
- As a product engineer working on a personal weekend side project, I set out to optimally organize my seasoning cabinets, which have many jars and limited shelf space.
- The goal is to distribute jars alphabetically across multiple shelves, but the distribution of jars by letter is highly uneven (e.g., A–H has 70% of jars).

### Initial Approach
- Implemented a React component to track jar counts by letter and distribute them across shelves.
- The first version grouped consecutive letters, but this led to very uneven shelves when some letters were much more common.
- Added a fuzzy search/autocomplete field to quickly add spices by name, using a structured data source generated from a markdown list.

### Problems Faced
- The initial shelf distribution logic did not account for uneven jar counts, resulting in overloaded shelves for common letters.
- Encountered a React warning: "Maximum update depth exceeded" due to including a non-stable array in useEffect dependencies. Fixed by moving the array outside the component.
- State updates for letter counts were inconsistent between search and button-based additions. Refactored to use a consistent state update pattern.

### Key Learnings
- For optimal shelf balancing, a linear partition algorithm is needed to split the alphabet into contiguous groups that minimize the largest shelf's jar count.
- React state dependencies and array stability are important to avoid infinite render loops.
- Consistent state update patterns help prevent subtle bugs when multiple UI elements can update the same state.
- As a product engineer, I found that collaborating with AI on data operations and organization is most effective when I provide clear intent and context, allowing the AI to make accurate inferences while I ensure the solution fits real-world needs.

### Next Steps
- Continue to document new problems, solutions, and insights as the project evolves.
- Consider writing a retrospective or guide based on this journal at the end of the project.

## April 26, 2025 (continued)

### List Normalization and User-Friendly Naming
- Decided to use a "head noun first" format for all spice names (e.g., "Salt, Onion" instead of "Onion Salt") to make searching and organization more intuitive, both digitally and physically.
- Removed duplicates and ensured only one canonical form for each spice or blend remains in the markdown data source.
- Realized that some forms (like "Powder") should be treated as a descriptor, not the main identity, so items like "Miso Powder" are filed under "Miso" rather than "Powder".
- Updated the spice list to reflect these conventions, making it more natural for both digital search and physical organization.
- As a product engineer (even on a weekend side project), I noted the importance of nuance and context when collaborating with AI on data operations and organization—AI can make accurate inferences, but clear intent and human perspective are crucial for optimal results.

## April 26, 2025 (final update)

### Data Persistence & Public Asset Configuration
- Encountered a critical issue with our spicelist.md file not loading properly - when fetching from `/spicelist.md`, we were getting back HTML content instead.
- Realized the issue was that static assets need to be in the public directory for Vite to serve them correctly at the root path.
- Created a proper `public/` directory and moved the spicelist.md file there to resolve the 404 issue.
- Updated Vite configuration to include better path aliases and improved developer experience settings.
- Learned that understanding build tool conventions for static assets is critical for React/Vite applications.

### Implementing Persistent Storage
- Added complete localStorage functionality to automatically save and restore user data.
- Implemented a save status indicator showing when data is being saved, saved successfully, or if there was an error.
- Added a 500ms debounce to prevent excessive storage operations during rapid changes.
- Created separate UI controls: Reset to clear counters but keep data, and Clear All to remove from localStorage.
- Added last saved timestamp for better user feedback.

### Inventory Tracking Redesign
- Completely redesigned the app to track specific spices in the inventory rather than abstract letter counts.
- Removed the plus/minus buttons in favor of an explicit inventory system that shows exactly what was added.
- Stored unique identifiers and timestamps for each added spice to support proper removal functionality.
- Created a scrollable inventory view that clearly shows which spices are in the collection.
- Reordered the interface components to prioritize distribution information over inventory details.

### UI Refinements
- Improved the distribution visualization to display single letters properly when a shelf only contains one letter (e.g., "A" instead of "A-A").
- Created a clearer visual hierarchy with the configuration at top, distribution information in the middle, and detailed inventory at the bottom.
- Added color-coding for letters with spices (blue) versus empty letters (gray) for better visual scanning.
- Used consistent UI patterns for interactive elements to improve usability.

### Lessons Learned
- Static assets like data files should be placed in the public directory for proper serving in Vite applications.
- For real user value, tracking specific items rather than abstract counters provides much better utility.
- The localStorage API provides a straightforward way to add persistence without server infrastructure.
- When working with ranges in UI, treating edge cases (like single-item ranges) improves clarity.
- Breaking components into logical sections with consistent visual styling helps users navigate complex interfaces.
