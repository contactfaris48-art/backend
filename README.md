# Express.js User Data API

A production-grade Express.js API built with TypeScript featuring advanced caching strategies, sophisticated rate limiting, and asynchronous processing to handle high traffic efficiently.

## Features

- **Custom LRU Cache**: In-memory cache with 60-second TTL and automatic stale entry cleanup
- **Request Coalescing**: Prevents duplicate database calls for concurrent requests
- **Rate Limiting**: 10 requests/minute with burst capacity of 5 requests per 10-second window
- **Async Processing Queue**: Array-based queue with worker pool for non-blocking database operations
- **TypeScript**: Full type safety throughout the application
- **Comprehensive Error Handling**: Meaningful error messages and proper HTTP status codes

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

## API Endpoints

### Get User by ID
```http
GET /users/:id
```

Retrieves user data by ID. Returns cached data immediately if available, otherwise fetches from database (simulated 200ms delay).

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Error Responses:**
- `404`: User not found
- `429`: Rate limit exceeded

### Create User
```http
POST /users
Content-Type: application/json

{
  "name": "Bob Wilson",
  "email": "bob@example.com"
}
```

Creates a new user and adds it to the mock data store and cache.

**Response:**
```json
{
  "id": 4,
  "name": "Bob Wilson",
  "email": "bob@example.com"
}
```

### Get Cache Status
```http
GET /cache/status
```

Returns cache statistics including size, hits, misses, and average response time.

**Response:**
```json
{
  "hits": 45,
  "misses": 12,
  "size": 3,
  "totalResponseTime": 2450,
  "requestCount": 57,
  "averageResponseTime": 42.98
}
```

### Clear Cache
```http
DELETE /cache
```

Clears the entire cache.

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

### Health Check
```http
GET /health
```

Returns server health status.

## Architecture

### Caching Strategy

The application implements a custom **Least Recently Used (LRU) cache** using a doubly linked list and hash map for O(1) operations:

- **Cache Hit**: Data is returned immediately from cache
- **Cache Miss**: Data is fetched from database (simulated) and cached
- **TTL**: 60 seconds per entry
- **Background Cleanup**: Automatic removal of expired entries every 10 seconds
- **Request Coalescing**: Concurrent requests for the same user ID share a single database fetch

### Rate Limiting Implementation

The rate limiter uses a **sliding window counter with burst bucket**:

- **Main Limit**: 10 requests per 60-second window
- **Burst Limit**: 5 requests per 10-second window
- **Tracking**: Per-IP address using in-memory map
- **Response**: Returns `429 Too Many Requests` with `Retry-After` header

### Asynchronous Processing

The application uses an **array-based queue with worker pool**:

- **Queue**: Simple array storing tasks with resolve/reject callbacks
- **Workers**: Configurable concurrent workers (default: 3)
- **Database Simulation**: 200ms delay per request
- **Non-blocking**: Multiple requests can be processed simultaneously

### Request Flow

1. Request arrives → Rate limiter checks limits
2. Response time tracking starts
3. Route handler processes request
4. User service checks cache:
   - **Cache hit**: Return immediately
   - **Cache miss**: Check for in-flight request
     - **In-flight exists**: Wait for existing promise
     - **No in-flight**: Create new promise, enqueue to async queue
5. Queue worker processes task (200ms delay)
6. Data fetched from mock database
7. Cache updated (if not already cached)
8. Response sent, response time recorded

## Testing

### Using Postman or cURL

1. **Test Cache Hit/Miss:**
```bash
# First request (cache miss - ~200ms)
curl http://localhost:3000/users/1

# Second request (cache hit - immediate)
curl http://localhost:3000/users/1
```

2. **Test Rate Limiting:**
```bash
# Send 6 rapid requests to trigger burst limit
for i in {1..6}; do curl http://localhost:3000/users/1; done
```

3. **Test Concurrent Requests:**
```bash
# Send 10 concurrent requests
for i in {1..10}; do curl http://localhost:3000/users/1 & done; wait
```

4. **Test Cache Status:**
```bash
curl http://localhost:3000/cache/status
```

5. **Test User Creation:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'
```

6. **Test Cache Clear:**
```bash
curl -X DELETE http://localhost:3000/cache
```

## Configuration

Configuration is centralized in `src/config/index.ts`:

```typescript
{
  cache: {
    ttl: 60000,              // 60 seconds
    cleanupInterval: 10000,  // 10 seconds
  },
  rateLimit: {
    windowMs: 60000,         // 60 seconds
    maxRequests: 10,         // 10 requests per minute
    burstWindowMs: 10000,    // 10 seconds
    burstMaxRequests: 5,     // 5 requests in burst window
  },
  queue: {
    concurrency: 3,          // 3 concurrent workers
    dbDelay: 200,            // 200ms database delay
  },
}
```

## Project Structure

```
src/
├── index.ts                 # Entry point
├── app.ts                   # Express app configuration
├── config/
│   └── index.ts             # Configuration
├── types/
│   └── index.ts             # TypeScript interfaces
├── data/
│   └── mockUsers.ts         # Mock user data store
├── lib/
│   ├── LRUCache.ts          # Custom LRU cache
│   └── AsyncQueue.ts        # Async processing queue
├── middleware/
│   ├── rateLimiter.ts       # Rate limiting
│   ├── responseTime.ts      # Response time tracking
│   └── errorHandler.ts      # Error handling
├── services/
│   └── userService.ts       # User service with coalescing
└── routes/
    ├── users.ts             # User endpoints
    └── cache.ts             # Cache endpoints
```

## Performance Optimizations

1. **O(1) Cache Operations**: Doubly linked list + hash map for constant-time access
2. **Request Coalescing**: Prevents cache stampede under concurrent load
3. **Background Cleanup**: Non-blocking stale entry removal
4. **Worker Pool**: Parallel processing of database operations
5. **Efficient Rate Limiting**: In-memory tracking with automatic cleanup

## Error Handling

- **400 Bad Request**: Invalid input (e.g., invalid user ID)
- **404 Not Found**: User does not exist
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Unexpected server errors

All errors return meaningful messages in JSON format.

