---
alwaysApply: false
globs:
  - "**/*.tsx"
---

# Prefer useEffectEvent for Effect Callbacks

When you need to call a function inside a `useEffect` that accesses props/state but shouldn't trigger the effect to re-run, use `useEffectEvent` instead of adding the function to the dependency array.

## When to Use

Use `useEffectEvent` when:
- You need to call a callback inside an effect
- The callback accesses reactive values (props, state, other functions)
- You don't want changes to those values to re-trigger the effect

## Example

### ❌ Avoid

```typescript
const [count, setCount] = useState(0);

const handleChange = useCallback(() => {
  console.log('Count is:', count);
  doSomething();
}, [count, doSomething]);

useEffect(() => {
  if (someCondition) {
    handleChange();
  }
}, [someCondition, handleChange]); // handleChange in deps causes unnecessary re-runs
```

### ✅ Prefer

```typescript
const [count, setCount] = useState(0);

const handleChange = useEffectEvent(() => {
  console.log('Count is:', count);
  doSomething();
});

useEffect(() => {
  if (someCondition) {
    handleChange();
  }
}, [someCondition]); // Only re-runs when someCondition changes
```

## Key Points

- `useEffectEvent` always reads the latest values of props and state
- Effect Events should only be called from inside Effects
- Don't pass Effect Events to other components or hooks
- Available in React 19+
