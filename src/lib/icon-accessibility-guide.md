# Icon Accessibility Guide

## Overview

This guide explains how to make icons accessible using ARIA attributes in the Smart Parking Management System.

## Rules for Icons

### 1. Decorative Icons (with text labels)
When an icon appears alongside text that describes its purpose, the icon is decorative and should be hidden from screen readers.

**Example:**
```tsx
<button>
  <LogOut className="w-4 h-4" aria-hidden="true" />
  <span>Logout</span>
</button>
```

### 2. Icon-Only Buttons
When a button contains only an icon with no visible text, add an `aria-label` to the button.

**Example:**
```tsx
<button aria-label="Close dialog">
  <X className="w-5 h-5" aria-hidden="true" />
</button>
```

### 3. Informational Icons
When an icon conveys information (like status indicators), ensure the information is also available as text or via aria-label.

**Example:**
```tsx
<div>
  <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
  <span className="sr-only">Success</span>
  <span>Operation completed</span>
</div>
```

## Implementation Status

### Components Updated
- ✅ Navbar - Added aria-labels to icon-only buttons
- ✅ AlertBanner - Added aria-hidden to decorative icons, aria-labels to buttons
- ✅ Toast - Added aria-hidden to close button icon
- ✅ FormField - Added aria-hidden to decorative icons

### Components Needing Updates
The following components use icons and should be audited:
- Button component (Loader2 icon)
- EmptyState component (various icons)
- DashboardStats component (stat icons)
- ParkingLotCard component (MapPin, Users, Activity icons)
- All page components with icon-only buttons

## Best Practices

1. **Always add aria-hidden="true" to decorative icons** - This prevents screen readers from announcing "image" or the icon name
2. **Add aria-label to icon-only interactive elements** - Buttons, links, and other interactive elements need descriptive labels
3. **Don't rely on icons alone for critical information** - Always provide text alternatives
4. **Use semantic HTML** - Prefer `<button>` over `<div onClick>` for interactive elements
5. **Test with screen readers** - Verify that all interactive elements are announced correctly

## Screen Reader Classes

Use these utility classes for text that should only be visible to screen readers:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## Examples from Codebase

### Good Example - Button with Icon and Text
```tsx
<button onClick={handleLogout} aria-label="Logout">
  <LogOut className="w-4 h-4" aria-hidden="true" />
  <span>Logout</span>
</button>
```

### Good Example - Icon-Only Button
```tsx
<button 
  onClick={() => handleDismiss(alert._id)}
  aria-label="Dismiss alert"
>
  <X className="w-5 h-5" aria-hidden="true" />
</button>
```

### Good Example - Status Icon with Text
```tsx
<div role="status">
  <CheckCircle className="w-5 h-5" aria-hidden="true" />
  <span>Connected</span>
</div>
```

## Testing

To test icon accessibility:

1. **Keyboard Navigation**: Tab through all interactive elements
2. **Screen Reader**: Use NVDA, JAWS, or VoiceOver to verify announcements
3. **Automated Tools**: Run axe-core or Lighthouse accessibility audits
4. **Manual Inspection**: Check that all icons have appropriate ARIA attributes

## Resources

- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM: Accessible Icon Buttons](https://webaim.org/techniques/css/invisiblecontent/)
- [MDN: aria-hidden](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-hidden)
- [MDN: aria-label](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label)
