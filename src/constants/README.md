# Constants Directory

**SINGLE SOURCE OF TRUTH (SSOT)**

This directory contains all application constants. NO hardcoded values allowed elsewhere.

## Files

1. **status.ts**: All status values (Virtual Code, Organization, Shipment, Return)
2. **roles.ts**: User roles and permissions
3. **routes.ts**: All application routes
4. **messages.ts**: Error, success, and confirmation messages
5. **validation.ts**: Regex patterns, file limits, password policy, business rules
6. **terminology.ts**: UI terminology (Korean/English mappings)
7. **database.ts**: Table names, column names, function names, RLS policies
8. **business-logic.ts**: FIFO rules, Virtual Code format, Recall rules
9. **locks.ts**: Concurrency control configuration
10. **notifications.ts**: KakaoTalk message templates
11. **index.ts**: Central export point

## Rules

- NO magic numbers
- NO hardcoded strings
- ALL constants must be typed
- Export from index.ts for centralized access
