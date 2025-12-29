#!/bin/bash

# CSRF Protection Test Script
# Tests CSRF token validation on backend endpoints

API_URL="http://localhost:3001/api/v1"

echo "=== CSRF Protection Test Suite ==="
echo ""

# Test 1: Get CSRF token
echo "Test 1: Fetching CSRF token..."
CSRF_RESPONSE=$(curl -s -c cookies.txt "${API_URL}/csrf-token")
CSRF_TOKEN=$(echo $CSRF_RESPONSE | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CSRF_TOKEN" ]; then
  echo "✓ CSRF token obtained: ${CSRF_TOKEN:0:20}..."
else
  echo "✗ Failed to get CSRF token"
  exit 1
fi

echo ""

# Test 2: POST without CSRF token (should fail)
echo "Test 2: POST request without CSRF token (should fail)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  "${API_URL}/profiles")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
  echo "✓ Request correctly rejected (403)"
else
  echo "✗ Expected 403, got $HTTP_CODE"
fi

echo ""

# Test 3: POST with valid CSRF token (should succeed or return proper error)
echo "Test 3: POST request with valid CSRF token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"test":"data"}' \
  "${API_URL}/profiles")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "403" ]; then
  echo "✓ Request not rejected by CSRF (HTTP $HTTP_CODE)"
else
  echo "✗ Request rejected despite valid token"
fi

echo ""

# Test 4: PUT without CSRF token (should fail)
echo "Test 4: PUT request without CSRF token (should fail)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  "${API_URL}/profiles/1")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
  echo "✓ Request correctly rejected (403)"
else
  echo "✗ Expected 403, got $HTTP_CODE"
fi

echo ""

# Test 5: DELETE without CSRF token (should fail)
echo "Test 5: DELETE request without CSRF token (should fail)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
  "${API_URL}/profiles/1")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
  echo "✓ Request correctly rejected (403)"
else
  echo "✗ Expected 403, got $HTTP_CODE"
fi

echo ""

# Cleanup
rm -f cookies.txt

echo "=== CSRF Protection Tests Complete ==="
