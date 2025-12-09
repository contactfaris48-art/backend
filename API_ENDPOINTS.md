# API Endpoints Testing Guide

Base URL: `http://localhost:3000`

---

## 1. Health Check

**GET** `/health`

Check if the server is running.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## 2. Get User by ID

**GET** `/users/:id`

Retrieve user data by ID. Returns cached data immediately if available, otherwise fetches from database (200ms delay).

**Request:**
```bash
# Get user with ID 1
curl http://localhost:3000/users/1

# Get user with ID 2
curl http://localhost:3000/users/2

# Get user with ID 3
curl http://localhost:3000/users/3
```

**Success Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Error Response (404):**
```json
{
  "error": "User with ID 999 not found",
  "statusCode": 404
}
```

**Error Response (400):**
```json
{
  "error": "Invalid user ID",
  "statusCode": 400
}
```

**Testing Tips:**
- First request: ~200ms (cache miss, includes DB delay)
- Second request: ~5ms (cache hit, immediate)
- Test with non-existent ID (e.g., 999) to verify 404

---

## 3. Create User

**POST** `/users`

Create a new user. The user is added to mock data and cached immediately.

**Request:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Wilson",
    "email": "bob@example.com"
  }'
```

**Success Response (201):**
```json
{
  "id": 4,
  "name": "Bob Wilson",
  "email": "bob@example.com"
}
```

**Error Response (400):**
```json
{
  "error": "Name and email are required",
  "statusCode": 400
}
```

**Testing Tips:**
- User ID is auto-incremented
- New user is immediately cached
- Try creating user without name or email to test validation

---

## 4. Get Cache Status

**GET** `/cache-status`

Returns cache statistics including size, hits, misses, and average response time.

**Request:**
```bash
curl http://localhost:3000/cache-status
```

**Response:**
```json
{
  "hits": 5,
  "misses": 3,
  "size": 3,
  "totalResponseTime": 650,
  "requestCount": 8,
  "averageResponseTime": 81.25
}
```

**Fields:**
- `hits`: Number of cache hits
- `misses`: Number of cache misses
- `size`: Current number of cached entries
- `totalResponseTime`: Cumulative response time in milliseconds
- `requestCount`: Total requests processed
- `averageResponseTime`: Average response time in milliseconds

---

## 5. Clear Cache

**DELETE** `/cache`

Clears the entire cache. Statistics are preserved.

**Request:**
```bash
curl -X DELETE http://localhost:3000/cache
```

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

**Testing Tips:**
- After clearing, cache size becomes 0
- Statistics (hits, misses) are preserved
- Next request for a user will be a cache miss

---

## Rate Limiting

All endpoints are protected by rate limiting:
- **10 requests per minute** (main limit)
- **5 requests per 10-second window** (burst limit)

**Rate Limit Exceeded Response (429):**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Maximum requests per minute reached. Please try again later.",
  "retryAfter": 45
}
```

or

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Burst capacity reached. Please try again later.",
  "retryAfter": 8
}
```

**Testing Rate Limiting:**
```bash
# Send 6 rapid requests to trigger burst limit
for i in {1..6}; do
  curl http://localhost:3000/users/1
  echo ""
done
```

---

## Complete Testing Workflow

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Check Initial Cache Status
```bash
curl http://localhost:3000/cache-status
```

### 3. Test Cache Miss (First Request)
```bash
time curl http://localhost:3000/users/1
# Should take ~200ms
```

### 4. Test Cache Hit (Second Request)
```bash
time curl http://localhost:3000/users/1
# Should take ~5ms (much faster)
```

### 5. Test 404 Error
```bash
curl http://localhost:3000/users/999
# Should return 404
```

### 6. Create New User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'
```

### 7. Get Newly Created User
```bash
curl http://localhost:3000/users/4
```

### 8. Check Cache Status After Operations
```bash
curl http://localhost:3000/cache-status
```

### 9. Test Concurrent Requests (Request Coalescing)
```bash
# Send 5 simultaneous requests for same user
for i in {1..5}; do
  curl http://localhost:3000/users/2 &
done
wait
```

### 10. Clear Cache
```bash
curl -X DELETE http://localhost:3000/cache
```

### 11. Verify Cache Cleared
```bash
curl http://localhost:3000/cache-status
# size should be 0
```

### 12. Test Rate Limiting
```bash
# Wait for rate limit to reset, then:
for i in {1..11}; do
  echo "Request $i:"
  curl -s -w " Status: %{http_code}\n" http://localhost:3000/users/1
done
```

---

## Postman Collection

### Collection Variables
- `baseUrl`: `http://localhost:3000`

### Requests

1. **Health Check**
   - Method: GET
   - URL: `{{baseUrl}}/health`

2. **Get User by ID**
   - Method: GET
   - URL: `{{baseUrl}}/users/1`

3. **Create User**
   - Method: POST
   - URL: `{{baseUrl}}/users`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):
     ```json
     {
       "name": "New User",
       "email": "newuser@example.com"
     }
     ```

4. **Get Cache Status**
   - Method: GET
   - URL: `{{baseUrl}}/cache-status`

5. **Clear Cache**
   - Method: DELETE
   - URL: `{{baseUrl}}/cache`

---

## Expected Behavior

### Caching
- First request to `/users/1`: ~200ms (cache miss)
- Second request to `/users/1`: ~5ms (cache hit)
- Cache expires after 60 seconds

### Request Coalescing
- Multiple concurrent requests for the same user ID share one database call
- All requests receive the same cached result

### Rate Limiting
- Maximum 10 requests per minute
- Burst capacity: 5 requests per 10 seconds
- Returns 429 with `Retry-After` header when exceeded

### Error Handling
- 400: Invalid input (e.g., invalid user ID, missing required fields)
- 404: Resource not found (e.g., user doesn't exist)
- 429: Rate limit exceeded
- 500: Internal server error

---

## Quick Test Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== 1. Health Check ==="
curl -s $BASE_URL/health | jq

echo -e "\n=== 2. Get User 1 (Cache Miss) ==="
time curl -s $BASE_URL/users/1 | jq

echo -e "\n=== 3. Get User 1 (Cache Hit) ==="
time curl -s $BASE_URL/users/1 | jq

echo -e "\n=== 4. Get User 999 (404) ==="
curl -s $BASE_URL/users/999 | jq

echo -e "\n=== 5. Create User ==="
curl -s -X POST $BASE_URL/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}' | jq

echo -e "\n=== 6. Cache Status ==="
curl -s $BASE_URL/cache-status | jq

echo -e "\n=== 7. Clear Cache ==="
curl -s -X DELETE $BASE_URL/cache | jq

echo -e "\n=== 8. Cache Status After Clear ==="
curl -s $BASE_URL/cache-status | jq
```

Make it executable and run:
```bash
chmod +x test-api.sh
./test-api.sh
```

