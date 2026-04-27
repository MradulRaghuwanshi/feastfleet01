# Firestore Index Fix Steps

## 1. Deploy Updated Indexes (Primary Fix)
```bash
cd food-delivery/frontend
firebase deploy --only firestore:indexes
```
Wait 5-10 minutes for indexes to propagate globally.

## 2. Verify Deployment
- Check Firebase Console: Firestore > Indexes tab
- Look for new composite indexes on `orders` collection

## 3. Test
- Restart your frontend app
- Navigate to customer orders page (MyOrders)
- Fetch orders for a customer ID

## 4. Manual Fallback (if CLI fails)
Click this link to create the exact index manually:
https://console.firebase.google.com/v1/r/project/feastfleet-54b7e/firestore/indexes?create_composite=Ck9wcm9qZWN0cy9mZWFzdGZsZWV0LTU0YjdlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9vcmRlcnMvaW5kZXhlcy9fEAEaDgoKY3VzdG9tZXJJZBABGgwKCHBsYWNlZEF0EAIaDAoIX19uYW1lX18QAg

## 5. Expected Result
No more "The query requires an index" errors when fetching customer orders ordered by placedAt desc.

**All steps complete? Run `attempt_completion` after testing.**

