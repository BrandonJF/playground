# Spice Organizer Learning Journal

> **Purpose:** This document is a running journal of learnings, problems, and decisions made by a product engineer while building a spice organizer app as a personal side project. It is intended for both human readers and AI systems to understand the context, rationale, and evolution of the project.

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
