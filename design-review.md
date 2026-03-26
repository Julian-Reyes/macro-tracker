# Mobile-First UI/UX Design Review

App: Food macro tracker with dark theme (background #0C0C0E), targeting mobile screens (max-width 480px).

---

## P0 — Breaks Usability

### 1. Delete button too small (24px)
**Location**: Daily log meal rows (`App.jsx:1715-1719`)
**Issue**: The meal delete button is only 24x24px — well under the 44px minimum. On a phone, users will struggle to tap it and may accidentally tap the meal row (opening detail view) instead.
**Suggestion**: Increase to 44x44px touch target. You can keep the visual circle small but add transparent padding:
```js
width: "44px", height: "44px", borderRadius: "50%",
background: "transparent", // transparent outer
display: "flex", alignItems: "center", justifyContent: "center",
// inner visible circle via a child span or box-shadow approach
```
Or simpler — use swipe-to-delete instead of an always-visible button.

### 2. No `prefers-reduced-motion` support
**Location**: CSS animations in `<style>` tag (`App.jsx:810-823`)
**Issue**: All animations (`fadeSlideIn`, `pulse`, `shimmer`) play regardless of user preference. Users with vestibular disorders or motion sensitivity will experience discomfort.
**Suggestion**: Add a media query:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## P1 — Noticeable Friction

### 3. ~~Header nav buttons are too small~~ ✅ FIXED
**Resolution**: Replaced top nav tabs with a fixed bottom tab bar (`BottomTabBar` component). 4 tabs (Scan/Log/Stats/Goals) with inline SVG icons, `minHeight: "44px"` touch targets, gold active state. Header simplified to logo + auth button only. iOS safe area padding via `env(safe-area-inset-bottom)`.

### 4. MealTypePicker buttons too small
**Location**: `MealTypePicker` (`App.jsx:105-121`)
**Issue**: `padding: "6px 14px"` with `fontSize: "12px"` — approximately 24px tall. Users picking Breakfast/Lunch/Dinner/Snack will mis-tap.
**Suggestion**: `padding: "10px 16px"` minimum to reach 44px height.

### 5. Portion multiplier +/- buttons too small
**Location**: `ItemRow` expanded controls (`App.jsx:300-327`)
**Issue**: `width: "36px", height: "36px"` — below 44px. Frequent interaction point during portion editing.
**Suggestion**: Increase to `width: "44px", height: "44px"`.

### 6. ItemRow remove button too small
**Location**: `ItemRow` (`App.jsx:243-248`)
**Issue**: `width: "20px", height: "20px"` — less than half the recommended size.
**Suggestion**: Increase to at least 32px visible, with 44px touch target padding.

### 7. Date/week navigation arrows too small
**Location**: Daily (`App.jsx:1550-1555`) and weekly (`App.jsx:1421-1426`) navigation
**Issue**: `width: "32px", height: "32px"` — below 44px. These are used frequently for browsing days.
**Suggestion**: `width: "44px", height: "44px"`.

### 8. Low contrast text — `rgba(255,255,255, 0.3)` and below
**Location**: Multiple places throughout:
- Portion text in ItemRow (`App.jsx:260`): `rgba(255,255,255,0.3)` — ~3.7:1 ratio
- Section headers "Breakdown", "Results" (`App.jsx:1027`): `rgba(255,255,255,0.25)` — ~3.0:1
- Time display in meal list (`App.jsx:1714`): `rgba(255,255,255,0.2)` — ~2.4:1
- "tap to adjust" hint (`App.jsx:1031`): `rgba(255,255,255,0.15)` — ~1.9:1
- Macro gram values in ItemRow (`App.jsx:278`): `rgba(255,255,255,0.4)` — ~3.9:1
- Macro values in daily log meal rows (`App.jsx:1707`): `rgba(255,255,255,0.35)` — ~3.3:1

**Issue**: All fail WCAG AA (4.5:1 for normal text). On phone screens in daylight, these will be nearly invisible.
**Suggestion**:
- Body/secondary text: raise to `rgba(255,255,255,0.6)` minimum (~5.9:1)
- Tertiary/hint text: raise to `rgba(255,255,255,0.5)` minimum (~4.9:1)
- Decorative labels like section headers can stay dimmer if paired with readable content nearby

### 9. ~~"or type it in" link is tiny and hard to tap~~ ✅ FIXED
**Resolution**: Increased padding from `4px` to `12px 24px` with `minHeight: "44px"`. Bumped color from `rgba(255,255,255,0.4)` to `0.45` for better contrast.

### 10. "Today"/"This Week" quick-jump button too small
**Location**: Daily (`App.jsx:1571-1577`) and weekly (`App.jsx:1442-1448`) nav
**Issue**: `padding: "4px 12px"` — only ~22px tall.
**Suggestion**: `padding: "8px 16px"` to reach ~36px minimum (acceptable for supplementary actions).

---

## P2 — Polish

### 11. Search result card styling inconsistency
**Location**: Manual view results (`App.jsx:1274-1297`) vs. inline extra-item results (`App.jsx:1104-1125`)
**Issue**: The same search results render with different padding, font sizes, and spacing depending on context. Manual view uses `padding: "12px 14px"`, `fontSize: "13px"` for names; inline uses `padding: "10px 12px"`, `fontSize: "12px"`. Users see a jarring difference.
**Suggestion**: Extract consistent styles or just use the same values in both places. The manual view's slightly larger sizing is better for touch.

### 12. Weekly chart bar tap targets are narrow
**Location**: `WeeklyBarChart` (`App.jsx:159-184`)
**Issue**: Bars are 40px wide with no hit-area padding. Tapping a specific day's bar on a phone is imprecise — especially bars with low values (short height).
**Suggestion**: Add an invisible `<rect>` behind each bar that spans the full chart height with the same x and width, giving a much larger tap area:
```jsx
<rect x={x} y={chartTop} width={barW} height={chartH + 30} fill="transparent" />
```

### 13. No empty state illustration or guidance for new users
**Location**: Daily log empty state (`App.jsx:1647-1657`), weekly empty state (`App.jsx:1528-1537`)
**Issue**: Just "No meals logged yet today" with a small button. For first-time users, this feels barren and doesn't communicate the app's value.
**Suggestion**: Add a brief one-liner about what they'll see once they start logging (e.g., "Your daily breakdown will appear here"), or show ghost/skeleton macro rings at 0% to preview the layout.

### 14. "Scan your first meal" CTA is styled as a weak ghost button
**Location**: Empty states (`App.jsx:1652-1656`, `App.jsx:1532-1536`)
**Issue**: `background: "rgba(232,200,114,0.1)"` — this is the most important CTA for new users but looks like a tertiary action. The main "Scan Meal" FAB at the bottom (`App.jsx:1730`) uses the bold gold gradient.
**Suggestion**: Use the same gradient treatment: `background: "linear-gradient(135deg, #E8C872, #D4A843)"`, `color: "#0C0C0E"`.

### 15. ~~Missing confirmation for meal deletion~~ ✅ FIXED
**Resolution**: Implemented 4-second undo toast. `handleDeleteMeal()` shows a "Meal deleted" toast with "Undo" button instead of deleting immediately. Pending delete finalized on timeout, navigation, or second delete. Toast repositioned above bottom tab bar via `calc(80px + env(safe-area-inset-bottom))`.

### 16. Loading state lacks skeleton structure
**Location**: Analysis loading (`App.jsx:972-983`), weekly loading (`App.jsx:1451-1459`)
**Issue**: Both just show a shimmer bar and text. The content area collapses to a small height, then suddenly expands when data arrives — a visual jump.
**Suggestion**: Show skeleton placeholders matching the shape of what will load (4 ring outlines for MacroRings, 3-4 grey bars for item rows).

### 17. Guest sign-up banner cramped on narrow screens
**Location**: Daily log guest prompt (`App.jsx:1629-1645`)
**Issue**: `display: "flex"` with long text and a button side by side. On 320px screens, the text and button will collide or overflow.
**Suggestion**: Use `flexWrap: "wrap"` or switch to a stacked layout below 360px. The text could be shorter: "Sign up to save across devices".

### 18. No visual feedback on meal row tap
**Location**: Daily log meal rows (`App.jsx:1678-1720`)
**Issue**: Rows have `cursor: "pointer"` but no `:active` state or touch feedback. Users don't know their tap registered.
**Suggestion**: Add an active/pressed state. With inline styles, you can use `onTouchStart`/`onTouchEnd` to toggle a `pressed` state, or add a CSS rule:
```css
[data-meal-row]:active { background: rgba(255,255,255,0.04); }
```

### 19. ~~Bottom "Scan Meal" button scrolls off-screen~~ ✅ FIXED
**Resolution**: The bottom tab bar is now always visible with a "Scan" tab, providing persistent access to the scan flow. The inline "+ Scan Meal" button at the bottom of the log remains as a contextual secondary action.

### 20. Auth overlay close button positioning
**Location**: Auth overlay (`App.jsx:833-838`)
**Issue**: Close button is at `top: "12px", right: "36px"` — this is relative to the modal container, not the viewport. On phones where the AuthScreen might not fill the exact expected width, the button may appear misaligned.
**Suggestion**: Position relative to the viewport: put the close button on the outer overlay `div` rather than inside the inner container, at `top: "16px", right: "16px"`.

---

## Summary by Priority

| Priority | Count | Fixed | Key Theme |
|----------|-------|-------|-----------|
| **P0** | 2 | 0 | Delete button too small; no reduced-motion support |
| **P1** | 8 | 2 | Most interactive elements under 44px; text contrast failures throughout. Fixed: header nav → bottom tab bar (#3), "or type it in" tap target (#9) |
| **P2** | 10 | 3 | Inconsistencies, missing feedback states, layout polish. Fixed: delete undo toast (#15), scan always accessible via tab bar (#19) |

## Biggest Wins for Least Effort

1. **Global touch target pass** — bump all buttons/tappable elements to 44px minimum height
2. **Raise all text opacity to 0.5+ minimum** — one pass through the file
3. **Add the `prefers-reduced-motion` media query** — 3 lines of CSS
4. **Make the daily "Scan Meal" button fixed/floating** — ~5 style properties
