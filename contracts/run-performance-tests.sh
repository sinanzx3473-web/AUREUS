#!/bin/bash

echo "Running Smart Contract Performance Tests..."
echo "=============================================="

forge test --match-contract PerformanceTest --gas-report > performance-results.txt 2>&1

echo ""
echo "Performance test results saved to performance-results.txt"
echo ""
echo "Summary:"
grep -A 20 "Gas Metrics" performance-results.txt || echo "Tests completed - check performance-results.txt for details"
