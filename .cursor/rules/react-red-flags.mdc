---
alwaysApply: false
globs:
  - "**/*.tsx"
---

Red flags in a React codebase

🚩 functions like <button onClick={handleClick}

- handleClick doesn't explain what it does
- you lose colocation
- need new names for each callback

Inline callbacks can call multiple functions with good names

onClick={() => {
analytics.event('this-button')
openModal()

🚩 useMemo

React devs are terrified of renders and often overuseMemo

- memoize things that you pass as props to components that may have expensive children
- it's ok for leaf components to over-render

useMemo does not fix bugs, it just makes them happen less often

🚩 <div onClick

divs are not interactive elements and adding onClick requires implementing keyboard control, screen reader announcement, etc

This is almost never the right move, and anyone capable of doing it right (the new tweet button) isn't going to be swayed by this tweet
