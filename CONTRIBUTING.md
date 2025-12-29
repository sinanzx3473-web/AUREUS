# Contributing to Takumi

Thank you for your interest in contributing to Takumi! This guide will help you get started with development and submitting contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We expect:

- Respectful and constructive communication
- Acceptance of diverse perspectives
- Focus on what's best for the community
- Empathy towards other contributors

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting, or derogatory remarks
- Publishing others' private information
- Any conduct inappropriate in a professional setting

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18+ and pnpm
- Foundry (for smart contract development)
- PostgreSQL 14+ and Redis 7+
- Git and GitHub account
- Code editor (VS Code recommended)

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/takumi.git
cd takumi

# Add upstream remote
git remote add upstream https://github.com/takumi-platform/takumi.git
```

### Install Dependencies

```bash
# Frontend
pnpm install

# Backend
cd backend
npm install
cd ..

# Smart Contracts
cd contracts
forge install
cd ..
```

### Environment Setup

```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp contracts/.env.example contracts/.env

# Edit with your local configuration
```

### Run Development Environment

```bash
# Start backend services
cd backend
docker-compose up -d
npm run migrate
npm run dev

# In another terminal, start frontend
cd ..
pnpm run dev
```

Visit `http://localhost:5173` to see the application.

## Development Workflow

### Branch Naming Convention

Use descriptive branch names:

- `feature/add-skill-categories` - New features
- `fix/profile-update-bug` - Bug fixes
- `docs/api-examples` - Documentation updates
- `refactor/indexer-service` - Code refactoring
- `test/endorsement-validation` - Test additions

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
feat(contracts): add skill category filtering

Implement category-based filtering for skill claims to improve
discoverability and organization.

Closes #123
```

```bash
fix(backend): resolve indexer block sync issue

Fix race condition in indexer service that caused missed events
during high block production periods.

Fixes #456
```

### Keep Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream main into your branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

## Pull Request Process

### Before Submitting

1. **Test thoroughly**: All tests must pass
2. **Update documentation**: Reflect your changes in docs
3. **Follow coding standards**: Run linters and formatters
4. **Write clear commits**: Use conventional commit format
5. **Rebase if needed**: Keep history clean

### Submission Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass (`pnpm test`, `npm test`, `forge test`)
- [ ] New tests added for new features
- [ ] Documentation updated (README, API docs, etc.)
- [ ] No console.log or debugging code
- [ ] Commit messages follow convention
- [ ] PR description is clear and detailed

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
Describe testing performed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code follows style guidelines
```

### Review Process

1. **Automated checks**: CI/CD runs tests and linters
2. **Code review**: Maintainers review your code
3. **Feedback**: Address review comments
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainer merges your PR

### After Merge

- Delete your feature branch
- Pull latest main
- Celebrate! 🎉

## Coding Standards

### TypeScript/JavaScript

**Style Guide:**
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer `const` over `let`, avoid `var`
- Use async/await over promises
- Descriptive variable names

**Example:**

```typescript
// Good
const getUserProfile = async (address: string): Promise<Profile> => {
  const profile = await db.query('SELECT * FROM profiles WHERE address = $1', [address]);
  return profile.rows[0];
};

// Avoid
var getProfile = function(addr) {
  return db.query('SELECT * FROM profiles WHERE address = $1', [addr]).then(r => r.rows[0]);
};
```

**Formatting:**

```bash
# Run Prettier
pnpm run format

# Run ESLint
pnpm run lint
```

### Solidity

**Style Guide:**
- Follow Solidity style guide
- Use NatSpec comments
- Prefer explicit over implicit
- Gas optimization where reasonable
- Security first

**Example:**

```solidity
/// @notice Creates a new skill claim
/// @param metadata IPFS CID containing claim details
/// @return claimId The ID of the created claim
function createClaim(string calldata metadata) 
    external 
    whenNotPaused 
    returns (uint256 claimId) 
{
    require(bytes(metadata).length > 0, "Empty metadata");
    
    claimId = _claimIdCounter++;
    claims[claimId] = Claim({
        claimer: msg.sender,
        metadata: metadata,
        verified: false,
        timestamp: block.timestamp
    });
    
    emit ClaimCreated(claimId, msg.sender, metadata);
}
```

**Testing:**

```bash
# Run tests
forge test -vvv

# Check coverage
forge coverage

# Gas report
forge test --gas-report
```

### React/Frontend

**Component Structure:**

```typescript
// Good component structure
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ProfileCardProps {
  address: string;
  name: string;
  onEdit?: () => void;
}

export const ProfileCard = ({ address, name, onEdit }: ProfileCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="profile-card">
      <h2>{name}</h2>
      <p>{address}</p>
      {onEdit && (
        <Button onClick={onEdit}>Edit</Button>
      )}
    </div>
  );
};
```

**Hooks:**

```typescript
// Custom hook example
export const useProfile = (address: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.getProfile(address);
        setProfile(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [address]);
  
  return { profile, loading, error };
};
```

## Testing Requirements

### Smart Contracts

**Coverage Target**: >95%

```bash
# Run all tests
forge test -vvv

# Run specific test
forge test --match-test testCreateProfile -vvv

# Coverage report
forge coverage --report lcov
```

**Test Structure:**

```solidity
contract SkillProfileTest is Test {
    SkillProfile public skillProfile;
    address public user = address(0x1);
    
    function setUp() public {
        skillProfile = new SkillProfile();
        skillProfile.initialize(address(this));
    }
    
    function testCreateProfile() public {
        vm.prank(user);
        uint256 profileId = skillProfile.createProfile("ipfs://QmTest");
        
        assertEq(profileId, 1);
        assertEq(skillProfile.ownerOf(profileId), user);
    }
    
    function testCannotCreateProfileWithEmptyMetadata() public {
        vm.prank(user);
        vm.expectRevert("Empty metadata");
        skillProfile.createProfile("");
    }
}
```

### Backend

**Coverage Target**: >90%

```bash
# Run tests
npm test

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Structure:**

```typescript
describe('ProfileController', () => {
  let app: Express;
  let token: string;
  
  beforeAll(async () => {
    app = await createTestApp();
    token = await getAuthToken(app, testAddress);
  });
  
  afterAll(async () => {
    await cleanupDatabase();
  });
  
  describe('GET /api/profiles/:address', () => {
    it('should return profile for valid address', async () => {
      const response = await request(app)
        .get(`/api/profiles/${testAddress}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.address).toBe(testAddress);
    });
    
    it('should return 404 for non-existent profile', async () => {
      const response = await request(app)
        .get('/api/profiles/0x0000000000000000000000000000000000000000');
      
      expect(response.status).toBe(404);
    });
  });
});
```

### Frontend

```bash
# Run tests
pnpm test

# Coverage
pnpm test:coverage
```

**Component Testing:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';

describe('ProfileCard', () => {
  it('renders profile information', () => {
    render(
      <ProfileCard 
        address="0x123..." 
        name="Test User" 
      />
    );
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('0x123...')).toBeInTheDocument();
  });
  
  it('calls onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(
      <ProfileCard 
        address="0x123..." 
        name="Test User" 
        onEdit={onEdit}
      />
    );
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalled();
  });
});
```

## Documentation

### Code Documentation

**TypeScript/JavaScript:**

```typescript
/**
 * Retrieves a user profile from the database
 * @param address - Ethereum address of the user
 * @returns Profile object or null if not found
 * @throws {DatabaseError} If database query fails
 */
export const getProfile = async (address: string): Promise<Profile | null> => {
  // Implementation
};
```

**Solidity:**

```solidity
/// @notice Creates a new skill claim with evidence
/// @dev Emits ClaimCreated event on success
/// @param metadata IPFS CID containing claim details
/// @return claimId The unique identifier for the created claim
function createClaim(string calldata metadata) external returns (uint256 claimId);
```

### Documentation Updates

When adding features, update:

- **README.md**: If adding major features
- **API.md**: For new API endpoints
- **ARCHITECTURE.md**: For architectural changes
- **DEPLOYMENT.md**: For deployment process changes
- **Inline comments**: For complex logic

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat and support
- **Twitter**: Announcements and updates

### Getting Help

- Check existing documentation
- Search GitHub issues
- Ask in Discord #dev-help channel
- Tag maintainers for urgent issues

### Recognition

Contributors are recognized in:
- CHANGELOG.md for each release
- GitHub contributors page
- Special mentions in release notes
- Community spotlight on Twitter

## License

By contributing to Takumi, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Takumi!** Your efforts help build a better decentralized skill verification platform for everyone.
