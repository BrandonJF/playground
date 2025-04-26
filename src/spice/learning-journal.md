# Spice Organizer Learning Journal

## April 26, 2025

### Project Kickoff
- Started a project to optimally organize my seasoning cabinets, which have many jars and limited shelf space.
- The goal is to distribute jars alphabetically across multiple shelves, but the distribution of jars by letter is highly uneven (e.g., A–H has 70% of jars).

### Initial Approach
- Implemented a React component to track jar counts by letter and distribute them across shelves.
- The first version grouped consecutive letters, but this led to very uneven shelves when some letters were much more common.
- Added a fuzzy search/autocomplete field to quickly add spices by name, using a structured data source generated from a markdown list.

### Problems Faced
- The initial shelf distribution logic did not account for uneven jar counts, resulting in overloaded shelves for common letters.
- Encountered a React warning: "Maximum update depth exceeded" due to including a non-stable array (`alphabet`) in useEffect dependencies. Fixed by moving the array outside the component.
- State updates for letter counts were inconsistent between search and button-based additions. Refactored to use a consistent state update pattern.

### Key Learnings
- For optimal shelf balancing, a linear partition algorithm is needed to split the alphabet into contiguous groups that minimize the largest shelf's jar count.
- React state dependencies and array stability are important to avoid infinite render loops.
- Consistent state update patterns help prevent subtle bugs when multiple UI elements can update the same state.

### Next Steps
- Continue to document new problems, solutions, and insights as the project evolves.
- Consider writing a retrospective or guide based on this journal at the end of the project.
