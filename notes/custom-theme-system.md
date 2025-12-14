# Custom Theme System Design Document

## Overview

This document outlines the design for a custom theme system that allows tenant sites (custom domains) to customize their visual appearance through a floating editor widget with real-time preview.

## Goals

- **MVP Scope**: Single "primary color" input that auto-derives a complete theme palette
- **Live Preview**: Changes apply immediately to the page without saving
- **Persistence**: Drafts stored in localStorage, published themes stored in Convex
- **Dark/Light Sync**: Auto-derive dark mode from light mode primary color
- **Minimal UI**: Floating button (hidden on mobile) that opens a simple editor panel

---

## Dark/Light Mode Sync Strategy

### Decision: Auto-Derive Dark Mode from Light Mode Primary

**Rationale:**
1. **Simpler UX** - Users only need to pick one color
2. **Consistent branding** - Same brand color works across both modes
3. **Fewer decisions** - Reduces cognitive load for non-designers
4. **Good defaults** - Most users just want their brand color applied consistently

**How it works:**

When user selects a primary color (e.g., `#7033ff` violet):

1. **Light Mode Derivation:**
   - `primary`: User's chosen color
   - `primary-foreground`: Auto-calculated for contrast (white or black)
   - `background`: White/near-white
   - `foreground`: Dark gray/black
   - `accent`: Lighter tint of primary (higher L in OKLCH)
   - `muted`: Very light gray with slight primary hue
   - `border`: Light gray with slight primary hue

2. **Dark Mode Derivation:**
   - `primary`: Slightly lighter/more saturated version of user's color (for visibility on dark bg)
   - `primary-foreground`: Auto-calculated for contrast
   - `background`: Near-black
   - `foreground`: Light gray/white
   - `accent`: Darker shade of primary
   - `muted`: Dark gray with slight primary hue
   - `border`: Dark gray with slight primary hue

**Algorithm (using OKLCH color space):**

```typescript
function deriveThemeFromPrimary(primaryHex: string): ThemeStyles {
  const primary = toOklch(primaryHex);
  
  // Light mode
  const light = {
    primary: primaryHex,
    "primary-foreground": primary.l > 0.6 ? "#000000" : "#ffffff",
    background: "oklch(1 0 0)",           // Pure white
    foreground: "oklch(0.145 0 0)",       // Near black
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    accent: formatOklch({ l: 0.95, c: primary.c * 0.3, h: primary.h }),
    "accent-foreground": formatOklch({ l: 0.2, c: primary.c * 0.5, h: primary.h }),
    muted: formatOklch({ l: 0.97, c: 0.01, h: primary.h }),
    "muted-foreground": "oklch(0.556 0 0)",
    secondary: formatOklch({ l: 0.95, c: primary.c * 0.2, h: primary.h }),
    "secondary-foreground": formatOklch({ l: 0.2, c: primary.c * 0.3, h: primary.h }),
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: primaryHex,
    // ... etc
  };
  
  // Dark mode - shift primary lighter for visibility
  const darkPrimary = { l: Math.min(primary.l + 0.15, 0.85), c: primary.c, h: primary.h };
  
  const dark = {
    primary: formatOklch(darkPrimary),
    "primary-foreground": darkPrimary.l > 0.6 ? "#000000" : "#ffffff",
    background: "oklch(0.145 0 0)",       // Near black
    foreground: "oklch(0.985 0 0)",       // Near white
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    accent: formatOklch({ l: 0.35, c: primary.c * 0.4, h: primary.h }),
    "accent-foreground": formatOklch({ l: 0.9, c: primary.c * 0.3, h: primary.h }),
    muted: formatOklch({ l: 0.269, c: 0.01, h: primary.h }),
    "muted-foreground": "oklch(0.708 0 0)",
    secondary: formatOklch({ l: 0.3, c: primary.c * 0.2, h: primary.h }),
    "secondary-foreground": "oklch(0.985 0 0)",
    border: "oklch(0.269 0 0)",
    input: "oklch(0.269 0 0)",
    ring: formatOklch(darkPrimary),
    // ... etc
  };
  
  return { light, dark };
}
```

**Key OKLCH principles:**
- **L (Lightness)**: 0 = black, 1 = white
- **C (Chroma)**: 0 = grayscale, higher = more saturated
- **H (Hue)**: 0-360 degrees, preserved from primary color

---

## UI/UX Design

### Floating Action Button (FAB)

- **Position**: Fixed bottom-right corner (`bottom-4 right-4`)
- **Visibility**: Hidden on mobile (`hidden md:flex`)
- **Icon**: Palette icon (Lucide `Palette`)
- **Size**: 48x48px circular
- **Behavior**: Opens Sheet panel on click

### Editor Panel (Sheet)

```
┌─────────────────────────────────┐
│ Theme Editor              [X]  │
├─────────────────────────────────┤
│                                 │
│  Preset                         │
│  ┌───────────────────────────┐  │
│  │ Default (AnswerOverflow) ▼│  │
│  └───────────────────────────┘  │
│                                 │
│  Primary Color                  │
│  ┌────┬──────────────────────┐  │
│  │ ■  │ #7033ff              │  │
│  └────┴──────────────────────┘  │
│                                 │
│  Preview:                       │
│  ┌───────────────────────────┐  │
│  │ ┌─────────────────────┐   │  │
│  │ │ Sample Card         │   │  │
│  │ │ With text content   │   │  │
│  │ │ [Primary Button]    │   │  │
│  │ └─────────────────────┘   │  │
│  └───────────────────────────┘  │
│                                 │
│  [Reset]           [Save Theme] │
│                                 │
└─────────────────────────────────┘
```

### Workflow

1. **Open Editor**: Click FAB → Sheet slides in from right
2. **Change Color**: Pick preset OR enter custom primary color
3. **Live Preview**: Theme applies to page immediately (draft mode)
4. **Save**: Click "Save Theme" → Convex mutation → Success toast
5. **Reset**: Click "Reset" → Revert to published theme (or default)
6. **Close**: Click X or outside → Sheet closes, draft persists in localStorage

---

## Data Model

### Database Schema Addition

```typescript
// packages/database/convex/schema.ts

const themeStylePropsValidator = v.object({
  background: v.string(),
  foreground: v.string(),
  card: v.string(),
  "card-foreground": v.string(),
  popover: v.string(),
  "popover-foreground": v.string(),
  primary: v.string(),
  "primary-foreground": v.string(),
  secondary: v.string(),
  "secondary-foreground": v.string(),
  muted: v.string(),
  "muted-foreground": v.string(),
  accent: v.string(),
  "accent-foreground": v.string(),
  destructive: v.string(),
  "destructive-foreground": v.string(),
  border: v.string(),
  input: v.string(),
  ring: v.string(),
  radius: v.string(),
});

const themeValidator = v.object({
  primaryColor: v.string(),  // User's chosen primary (stored for re-derivation)
  light: themeStylePropsValidator,
  dark: themeStylePropsValidator,
});

// Add to serverPreferencesSchema:
theme: v.optional(themeValidator),
```

### Tenant Context Extension

```typescript
export type Tenant = {
  name?: string | null;
  icon?: string | null;
  customDomain?: string | null;
  subpath?: string | null;
  discordId?: bigint;
  theme?: {
    primaryColor: string;
    light: ThemeStyleProps;
    dark: ThemeStyleProps;
  } | null;
  canEditTheme?: boolean;
};
```

### Zustand Store (localStorage)

```typescript
interface ThemeEditorStore {
  // Draft state
  draftPrimaryColor: string | null;
  draftTheme: ThemeStyles | null;
  
  // Published state (from server)
  publishedPrimaryColor: string | null;
  publishedTheme: ThemeStyles | null;
  
  // UI state
  isEditorOpen: boolean;
  isSaving: boolean;
  
  // Actions
  setDraftPrimaryColor: (color: string) => void;
  openEditor: () => void;
  closeEditor: () => void;
  resetDraft: () => void;
  initFromPublished: (theme: TenantTheme | null) => void;
  saveTheme: () => Promise<void>;
}
```

---

## Presets

### Default (AnswerOverflow)
Current neutral theme - no primary color set, uses system defaults.

### Violet Bloom (from tweakcn)
```typescript
{
  primaryColor: "#7033ff",
  // Full palette auto-derived
}
```

### Future Presets (not in MVP)
- Modern Minimal (blue)
- Catppuccin (purple/pink)
- Nature (green)
- Solar Dusk (orange)

---

## Implementation Phases

### Phase 1: Foundation (Core utilities)
1. Install `culori` for color manipulation
2. Create theme types
3. Create color derivation utility
4. Create apply-theme utility
5. Add schema field

### Phase 2: State Management
1. Create Zustand store with localStorage
2. Create TenantTheme component (CSS injector)
3. Update tenant-context with theme fields

### Phase 3: UI Components
1. Create ColorPicker component
2. Create PresetSelector component  
3. Create ThemeEditorPanel
4. Create ThemeEditorWidget (FAB)

### Phase 4: Integration
1. Update providers.tsx
2. Update domain layout
3. Create save mutation
4. Test end-to-end

---

## File Structure

```
packages/ui/src/
├── types/
│   └── theme.ts                    # Theme type definitions
├── utils/
│   ├── color-converter.ts          # OKLCH/HSL/Hex conversion
│   ├── derive-theme.ts             # Primary → full palette derivation
│   ├── apply-theme.ts              # DOM CSS variable injection
│   └── preset-themes.ts            # Preset definitions
├── store/
│   └── theme-editor-store.ts       # Zustand + localStorage
└── components/
    ├── tenant-context.tsx          # Updated
    ├── tenant-theme.tsx            # NEW - CSS injector
    ├── providers.tsx               # Updated
    └── theme-editor/
        ├── color-picker.tsx        # Color input
        ├── preset-selector.tsx     # Preset dropdown
        ├── theme-preview.tsx       # Mini preview card
        ├── theme-editor-panel.tsx  # Main panel
        └── theme-editor-widget.tsx # FAB + Sheet
```

---

## Open Questions / Future Considerations

1. **Radius slider?** - Should MVP include border-radius customization or just colors?
   - **Recommendation**: Skip for MVP, add later

2. **Destructive color?** - Should red/destructive be customizable?
   - **Recommendation**: Keep fixed for consistency/accessibility

3. **Chart colors?** - Should chart colors derive from primary?
   - **Recommendation**: Skip for MVP, charts are rarely used

4. **Sidebar colors?** - Should sidebar have separate theming?
   - **Recommendation**: Skip for MVP, derive from main theme

5. **Font customization?** - Should fonts be customizable?
   - **Recommendation**: Skip for MVP, complex to implement well

---

## Success Criteria

- [ ] Floating button visible on desktop custom domain pages
- [ ] Clicking button opens theme editor panel
- [ ] Selecting a preset applies theme immediately
- [ ] Entering custom primary color derives and applies full theme
- [ ] Theme persists after page refresh (localStorage draft)
- [ ] Saving theme persists to database
- [ ] Closing and reopening editor retains draft state
- [ ] Both light and dark modes work correctly
- [ ] Page looks good with both default and Violet Bloom themes

---

## Reference Implementation

The tweakcn repository (`.context/tweakcn/`) contains excellent reference code:
- `utils/color-converter.ts` - Color format conversion using culori
- `utils/apply-theme.ts` - DOM CSS variable injection
- `utils/theme-presets.ts` - Preset theme definitions (Violet Bloom, etc.)
- `store/editor-store.ts` - Zustand store pattern with undo/redo
- `components/editor/color-picker.tsx` - Color input component
- `components/editor/theme-control-panel.tsx` - Full editor UI
