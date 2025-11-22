# Hooks Directory

Custom React hooks for shared logic.

## Common Hooks

- **useAuth**: Authentication state and methods
- **useSupabase**: Supabase client access
- **useToast**: Toast notifications
- **useDebounce**: Input debouncing
- **useLocalStorage**: Persistent local storage
- **usePermissions**: Role-based permissions

## Guidelines

1. Prefix all hooks with `use`
2. Return objects, not arrays (better readability)
3. Handle loading and error states
4. Include TypeScript types
5. Add tests for complex logic
