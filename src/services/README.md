# Services Directory

API services and business logic.

## Structure

Services are organized by domain:

- **auth.service.ts**: Authentication (login, register, logout)
- **product.service.ts**: Product management
- **lot.service.ts**: Lot production
- **shipment.service.ts**: Shipment operations
- **inventory.service.ts**: Inventory queries
- **treatment.service.ts**: Hospital treatment registration
- **notification.service.ts**: KakaoTalk notifications

## Guidelines

1. Use TanStack Query for data fetching
2. Handle errors consistently
3. Return typed responses
4. Keep services focused (single responsibility)
5. Use Supabase RPC for complex queries
