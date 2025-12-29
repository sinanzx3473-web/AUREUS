# Smart Contract Pagination Guide

## Overview

All Takumi smart contracts now implement pagination for array-returning functions to prevent gas exhaustion attacks and improve performance with large datasets. This guide provides comprehensive documentation on using paginated contract functions.

## Why Pagination?

**Gas Optimization**: Unbounded loops can exceed block gas limits with large datasets (10,000+ records).

**DoS Prevention**: Prevents attackers from making contracts unusable by adding excessive data.

**Better UX**: Faster response times and lower gas costs for users.

## Pagination Pattern

All paginated functions follow this signature:

```solidity
function getData(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (DataType[] memory items, uint256 total)
```

**Parameters**:
- `offset`: Starting index (0-based)
- `limit`: Maximum number of items to return

**Returns**:
- `items`: Array of requested items
- `total`: Total count of all items

## Contract-Specific Functions

### SkillProfile Contract

#### getSkills (Paginated)
```solidity
function getSkills(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (Skill[] memory skills, uint256 total)
```

**Example**:
```javascript
// Get first 20 skills
const [skills, total] = await skillProfile.getSkills(userAddress, 0, 20);

// Get next 20 skills
const [moreSkills, _] = await skillProfile.getSkills(userAddress, 20, 20);
```

#### getExperience (Paginated)
```solidity
function getExperience(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (Experience[] memory experience, uint256 total)
```

#### getEducation (Paginated)
```solidity
function getEducation(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (Education[] memory education, uint256 total)
```

#### Helper Functions
```solidity
function getSkillsCount(address user) external view returns (uint256)
function getExperienceCount(address user) external view returns (uint256)
function getEducationCount(address user) external view returns (uint256)
```

### SkillClaim Contract

#### getUserClaims (Paginated)
```solidity
function getUserClaims(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory claimIds, uint256 total)
```

**Example**:
```javascript
// Get first 50 claims
const [claimIds, total] = await skillClaim.getUserClaims(userAddress, 0, 50);

// Fetch full claim details
const claims = await Promise.all(
    claimIds.map(id => skillClaim.getClaim(id))
);
```

#### getVerifierClaims (Paginated)
```solidity
function getVerifierClaims(
    address verifier,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory claimIds, uint256 total)
```

#### getClaimsByStatus (Paginated)
```solidity
function getClaimsByStatus(
    ClaimStatus status,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory claimIds, uint256 total)
```

**Example**:
```javascript
// Get pending claims (first page)
const ClaimStatus = { Pending: 0, Approved: 1, Rejected: 2, Disputed: 3 };
const [pendingIds, total] = await skillClaim.getClaimsByStatus(
    ClaimStatus.Pending,
    0,
    100
);
```

#### Helper Functions
```solidity
function getUserClaimsCount(address user) external view returns (uint256)
function getVerifierClaimsCount(address verifier) external view returns (uint256)
```

### Endorsement Contract

#### getReceivedEndorsements (Paginated)
```solidity
function getReceivedEndorsements(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory endorsementIds, uint256 total)
```

#### getGivenEndorsements (Paginated)
```solidity
function getGivenEndorsements(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory endorsementIds, uint256 total)
```

#### getReceivedReferences (Paginated)
```solidity
function getReceivedReferences(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory referenceIds, uint256 total)
```

#### getGivenReferences (Paginated)
```solidity
function getGivenReferences(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory referenceIds, uint256 total)
```

#### getActiveEndorsements (Paginated)
```solidity
function getActiveEndorsements(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory endorsementIds, uint256 total)
```

**Example**:
```javascript
// Get active endorsements (non-revoked only)
const [activeIds, total] = await endorsement.getActiveEndorsements(
    userAddress,
    0,
    50
);

// Fetch full endorsement details
const endorsements = await Promise.all(
    activeIds.map(id => endorsement.getEndorsement(id))
);
```

#### getActiveReferences (Paginated)
```solidity
function getActiveReferences(
    address user,
    uint256 offset,
    uint256 limit
) external view returns (uint256[] memory referenceIds, uint256 total)
```

#### Helper Functions
```solidity
function getReceivedEndorsementsCount(address user) external view returns (uint256)
function getGivenEndorsementsCount(address user) external view returns (uint256)
function getReceivedReferencesCount(address user) external view returns (uint256)
function getGivenReferencesCount(address user) external view returns (uint256)
```

### VerifierRegistry Contract

#### getActiveVerifiers (Paginated)
```solidity
function getActiveVerifiers(
    uint256 offset,
    uint256 limit
) external view returns (address[] memory verifierAddresses, uint256 total)
```

**Example**:
```javascript
// Get first 20 active verifiers
const [verifiers, total] = await verifierRegistry.getActiveVerifiers(0, 20);

// Fetch full verifier details
const verifierDetails = await Promise.all(
    verifiers.map(addr => verifierRegistry.getVerifier(addr))
);
```

#### getAllVerifiers (Paginated)
```solidity
function getAllVerifiers(
    uint256 offset,
    uint256 limit
) external view returns (address[] memory verifierAddresses, uint256 total)
```

#### Helper Functions
```solidity
function getAllVerifiersCount() external view returns (uint256)
```

## Frontend Integration Examples

### React Hook for Paginated Data

```typescript
import { useState, useEffect } from 'react';
import { Contract } from 'ethers';

interface PaginatedResult<T> {
    items: T[];
    total: number;
    loading: boolean;
    error: Error | null;
}

function usePaginatedContractData<T>(
    contract: Contract,
    method: string,
    args: any[],
    offset: number,
    limit: number
): PaginatedResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [items, totalCount] = await contract[method](...args, offset, limit);
                setData(items);
                setTotal(totalCount.toNumber());
                setError(null);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [contract, method, offset, limit, ...args]);

    return { items: data, total, loading, error };
}

// Usage
function UserSkills({ userAddress }: { userAddress: string }) {
    const [page, setPage] = useState(0);
    const pageSize = 20;
    
    const { items: skills, total, loading } = usePaginatedContractData(
        skillProfileContract,
        'getSkills',
        [userAddress],
        page * pageSize,
        pageSize
    );

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div>
            {loading ? <Spinner /> : (
                <>
                    <SkillList skills={skills} />
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
}
```

### Infinite Scroll Pattern

```typescript
function InfiniteSkillList({ userAddress }: { userAddress: string }) {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 20;

    const loadMore = async () => {
        const [newSkills, total] = await skillProfile.getSkills(
            userAddress,
            offset,
            pageSize
        );
        
        setSkills(prev => [...prev, ...newSkills]);
        setOffset(prev => prev + pageSize);
        setHasMore(offset + pageSize < total);
    };

    return (
        <InfiniteScroll
            dataLength={skills.length}
            next={loadMore}
            hasMore={hasMore}
            loader={<Spinner />}
        >
            {skills.map(skill => <SkillCard key={skill.name} skill={skill} />)}
        </InfiniteScroll>
    );
}
```

### Batch Loading All Data

```typescript
async function loadAllUserSkills(
    contract: Contract,
    userAddress: string
): Promise<Skill[]> {
    const pageSize = 50;
    let offset = 0;
    let allSkills: Skill[] = [];
    let total = 0;

    do {
        const [skills, totalCount] = await contract.getSkills(
            userAddress,
            offset,
            pageSize
        );
        
        allSkills = [...allSkills, ...skills];
        total = totalCount.toNumber();
        offset += pageSize;
    } while (offset < total);

    return allSkills;
}
```

## Performance Recommendations

### Optimal Page Sizes

| Data Type | Recommended Limit | Max Limit |
|-----------|------------------|-----------|
| Skills | 20-50 | 100 |
| Experience | 10-20 | 50 |
| Education | 10-20 | 50 |
| Claims | 50-100 | 200 |
| Endorsements | 50-100 | 200 |
| References | 20-50 | 100 |
| Verifiers | 20-50 | 100 |

### Gas Optimization Tips

1. **Use Count Functions First**: Call `getSkillsCount()` before pagination to calculate total pages
2. **Batch Requests**: Use multicall for fetching multiple pages in parallel
3. **Cache Results**: Cache paginated results client-side to avoid redundant calls
4. **Lazy Loading**: Only load data when needed (infinite scroll, on-demand)

### Example: Efficient Data Loading

```typescript
// Step 1: Get total count
const total = await skillProfile.getSkillsCount(userAddress);

// Step 2: Calculate pages needed
const pageSize = 50;
const totalPages = Math.ceil(total / pageSize);

// Step 3: Load pages in parallel (if needed)
const pagePromises = [];
for (let page = 0; page < totalPages; page++) {
    pagePromises.push(
        skillProfile.getSkills(userAddress, page * pageSize, pageSize)
    );
}

const results = await Promise.all(pagePromises);
const allSkills = results.flatMap(([skills, _]) => skills);
```

## Testing Large Datasets

### Test Scenario: 10,000+ Records

```solidity
// Test file: contracts/test/SkillProfile.pagination.t.sol
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/SkillProfile.sol";

contract SkillProfilePaginationTest is Test {
    SkillProfile public profile;
    address public user = address(0x1);

    function setUp() public {
        profile = new SkillProfile(address(this));
        
        // Create profile
        vm.prank(user);
        profile.createProfile("Test User", "Bio", "ipfs://hash");
    }

    function testPaginationWith10000Skills() public {
        // Add 10,000 skills
        vm.startPrank(user);
        for (uint256 i = 0; i < 10000; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Test pagination
        (SkillProfile.Skill[] memory skills, uint256 total) = 
            profile.getSkills(user, 0, 100);
        
        assertEq(total, 10000, "Total should be 10000");
        assertEq(skills.length, 100, "Should return 100 skills");
        
        // Test middle page
        (skills, total) = profile.getSkills(user, 5000, 100);
        assertEq(skills.length, 100, "Should return 100 skills from middle");
        
        // Test last page
        (skills, total) = profile.getSkills(user, 9900, 100);
        assertEq(skills.length, 100, "Should return last 100 skills");
        
        // Test beyond total
        (skills, total) = profile.getSkills(user, 10000, 100);
        assertEq(skills.length, 0, "Should return empty array");
    }

    function testPaginationEdgeCases() public {
        vm.startPrank(user);
        for (uint256 i = 0; i < 5; i++) {
            profile.addSkill(
                string(abi.encodePacked("Skill", vm.toString(i))),
                50,
                "ipfs://hash"
            );
        }
        vm.stopPrank();

        // Test limit > total
        (SkillProfile.Skill[] memory skills, uint256 total) = 
            profile.getSkills(user, 0, 100);
        assertEq(skills.length, 5, "Should return all 5 skills");
        
        // Test offset at boundary
        (skills, total) = profile.getSkills(user, 5, 10);
        assertEq(skills.length, 0, "Should return empty array");
        
        // Test partial page
        (skills, total) = profile.getSkills(user, 3, 10);
        assertEq(skills.length, 2, "Should return remaining 2 skills");
    }
}
```

## Migration Guide

### Updating Frontend Code

**Before (Unbounded)**:
```typescript
// Old code - loads all data at once
const skills = await skillProfile.getSkills(userAddress);
```

**After (Paginated)**:
```typescript
// New code - paginated loading
const [skills, total] = await skillProfile.getSkills(userAddress, 0, 20);

// Or load all with batching
const allSkills = await loadAllUserSkills(skillProfile, userAddress);
```

### Backward Compatibility

The new paginated functions are **not backward compatible** with the old unbounded functions. You must update all frontend code that calls these functions.

**Breaking Changes**:
- All array-returning functions now require `offset` and `limit` parameters
- Return type changed from `Type[]` to `(Type[], uint256)`
- Must destructure return values: `const [items, total] = await contract.method(...)`

## Security Considerations

1. **Input Validation**: Contracts validate offset/limit parameters
2. **Gas Limits**: Recommended limits prevent gas exhaustion
3. **DoS Prevention**: Pagination prevents unbounded iteration attacks
4. **Data Integrity**: Total count always reflects current state

## Support

For questions or issues with pagination:
- GitHub Issues: https://github.com/your-org/takumi/issues
- Documentation: https://docs.takumi.example
- Discord: https://discord.gg/takumi
