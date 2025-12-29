# CI/CD Pipeline Documentation

## Overview

Takumi uses GitHub Actions for continuous integration and deployment. The pipeline automates testing, building, deployment, and release management across frontend, backend, and smart contracts.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger:** Push to `main`/`develop`, Pull Requests

**Jobs:**
- **Frontend Lint & Test**
  - ESLint code quality checks
  - TypeScript type checking
  - Vitest unit and integration tests
  - Coverage report generation
  - Upload to Codecov

- **Contract Lint & Test**
  - Forge format checking
  - Contract compilation
  - Comprehensive test suite
  - Coverage report with lcov
  - Upload to Codecov

- **Backend Lint & Test**
  - TypeScript type checking
  - Jest test suite
  - Coverage report generation
  - Upload to Codecov

- **Security Scan**
  - Trivy vulnerability scanning
  - SARIF report upload to GitHub Security

- **Build Frontend**
  - Production build verification
  - Artifact upload for deployment

### 2. Frontend Deployment (`.github/workflows/deploy-frontend.yml`)

**Trigger:** Push to `main`, Manual dispatch

**Process:**
1. Checkout code
2. Install dependencies with pnpm
3. Pull Vercel environment configuration
4. Build production artifacts
5. Deploy to Vercel production
6. Comment deployment URL on PR

**Environment Variables Required:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `VITE_WALLETCONNECT_PROJECT_ID` - WalletConnect project ID

### 3. Preview Deployment (`.github/workflows/preview-deploy.yml`)

**Trigger:** Pull Request opened/updated

**Process:**
1. Deploy to Vercel preview environment
2. Comment preview URL on PR
3. Enable testing before merge

### 4. Contract Deployment (`.github/workflows/deploy-contracts.yml`)

**Trigger:** Version tags (`v*.*.*`), Manual dispatch

**Process:**
1. Run full test suite
2. Deploy contracts using Forge script
3. Verify contracts on Etherscan
4. Save deployment artifacts
5. Create deployment summary
6. Comment contract addresses on commit

**Supported Networks:**
- Sepolia (testnet)
- Ethereum Mainnet
- Base Sepolia (testnet)
- Base Mainnet

**Environment Variables Required:**
- `DEPLOYER_PRIVATE_KEY` - Deployer wallet private key
- `RPC_URL_SEPOLIA` - Sepolia RPC endpoint
- `RPC_URL_MAINNET` - Mainnet RPC endpoint
- `RPC_URL_BASE_SEPOLIA` - Base Sepolia RPC endpoint
- `RPC_URL_BASE` - Base RPC endpoint
- `ETHERSCAN_API_KEY_SEPOLIA` - Etherscan API key for Sepolia
- `ETHERSCAN_API_KEY_MAINNET` - Etherscan API key for Mainnet
- `ETHERSCAN_API_KEY_BASE_SEPOLIA` - Basescan API key for Sepolia
- `ETHERSCAN_API_KEY_BASE` - Basescan API key for Base

### 5. Release Automation (`.github/workflows/release.yml`)

**Trigger:** Version tags (`v*.*.*`)

**Process:**
1. Extract version from tag
2. Generate changelog from commits
3. Create formatted release notes
4. Attach deployment artifacts
5. Create GitHub release
6. Update CHANGELOG.md
7. Commit changelog updates

**Release Notes Include:**
- What's new (from commits)
- Deployment information
- Installation instructions
- Documentation links
- Security audit reference
- Full changelog link

### 6. CodeQL Security Scan (`.github/workflows/codeql.yml`)

**Trigger:** Push, PR, Weekly schedule

**Process:**
- Static code analysis for JavaScript/TypeScript
- Security vulnerability detection
- Code quality checks
- SARIF report to GitHub Security tab

### 7. Stale Issue Management (`.github/workflows/stale.yml`)

**Trigger:** Daily schedule

**Process:**
- Mark issues/PRs stale after 30 days of inactivity
- Close stale items after 7 additional days
- Exempt pinned, security, and critical items

## Setup Instructions

### 1. GitHub Secrets Configuration

Navigate to **Settings → Secrets and variables → Actions** and add:

#### Vercel Deployment
```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>
VITE_WALLETCONNECT_PROJECT_ID=<your-walletconnect-id>
```

#### Contract Deployment
```
DEPLOYER_PRIVATE_KEY=<deployer-private-key>
RPC_URL_SEPOLIA=<sepolia-rpc-url>
RPC_URL_MAINNET=<mainnet-rpc-url>
RPC_URL_BASE_SEPOLIA=<base-sepolia-rpc-url>
RPC_URL_BASE=<base-rpc-url>
ETHERSCAN_API_KEY_SEPOLIA=<etherscan-api-key>
ETHERSCAN_API_KEY_MAINNET=<etherscan-api-key>
ETHERSCAN_API_KEY_BASE_SEPOLIA=<basescan-api-key>
ETHERSCAN_API_KEY_BASE=<basescan-api-key>
```

### 2. Vercel Project Setup

1. Create Vercel project linked to GitHub repository
2. Configure build settings:
   - **Framework Preset:** Vite
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`

3. Add environment variables in Vercel dashboard:
   - `VITE_CHAIN=sepolia`
   - `VITE_WALLETCONNECT_PROJECT_ID=<your-id>`

### 3. Codecov Integration

1. Sign up at [codecov.io](https://codecov.io)
2. Link GitHub repository
3. No token needed for public repos
4. For private repos, add `CODECOV_TOKEN` to GitHub secrets

### 4. Branch Protection Rules

Configure in **Settings → Branches → Branch protection rules** for `main`:

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - `Frontend Lint & Test`
  - `Contract Lint & Test`
  - `Backend Lint & Test`
  - `Security Scan`
  - `Build Frontend`
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Include administrators

### 5. CODEOWNERS Setup

The `.github/CODEOWNERS` file defines review requirements:

```
/contracts/ @takumi-team @contract-reviewers
/src/ @takumi-team @frontend-reviewers
/backend/ @takumi-team @backend-reviewers
/.github/ @takumi-team @devops-reviewers
```

Update team handles to match your GitHub organization.

## Release Process

### Creating a Release

1. **Update version in relevant files**
   ```bash
   # Update package.json, contracts/package.json, etc.
   git add .
   git commit -m "chore: bump version to 1.2.0"
   ```

2. **Create and push tag**
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

3. **Automated process triggers:**
   - Contract deployment workflow
   - Release creation workflow
   - Changelog generation
   - GitHub release with notes

### Release Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (v2.0.0): Breaking changes
- **MINOR** (v1.1.0): New features, backward compatible
- **PATCH** (v1.0.1): Bug fixes, backward compatible

### Pre-release Tags

- `v1.0.0-alpha.1` - Alpha release
- `v1.0.0-beta.1` - Beta release
- `v1.0.0-rc.1` - Release candidate

Pre-releases are automatically marked in GitHub releases.

## Monitoring & Notifications

### Status Badges

README displays real-time status:
- CI workflow status
- Frontend deployment status
- Contract deployment status
- Code coverage percentage
- Security scan status

### GitHub Notifications

Configure in **Settings → Notifications**:
- Workflow failures
- Deployment status
- Security alerts
- Dependabot updates

### Slack Integration (Optional)

Add to workflows for Slack notifications:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ CI Failed: ${{ github.workflow }}"
      }
```

## Troubleshooting

### Common Issues

**1. Vercel Deployment Fails**
- Verify `VERCEL_TOKEN` is valid
- Check build logs in Vercel dashboard
- Ensure environment variables are set

**2. Contract Deployment Fails**
- Verify deployer has sufficient funds
- Check RPC endpoint is accessible
- Validate Etherscan API key

**3. Tests Fail in CI but Pass Locally**
- Check Node.js version matches
- Verify all dependencies are in package.json
- Review environment variable requirements

**4. Coverage Upload Fails**
- Ensure coverage files are generated
- Check Codecov token for private repos
- Verify file paths in upload action

### Debug Mode

Enable debug logging in workflows:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## Best Practices

1. **Always run tests locally before pushing**
   ```bash
   pnpm test
   cd contracts && forge test
   cd backend && npm test
   ```

2. **Use conventional commits**
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation
   - `chore:` - Maintenance
   - `test:` - Tests
   - `refactor:` - Code refactoring

3. **Keep workflows fast**
   - Use caching for dependencies
   - Run jobs in parallel when possible
   - Only run necessary checks

4. **Security first**
   - Never commit secrets
   - Use GitHub secrets for sensitive data
   - Regularly update dependencies
   - Review Dependabot PRs promptly

5. **Monitor coverage trends**
   - Aim for >95% coverage
   - Review coverage reports in PRs
   - Don't merge if coverage drops significantly

## Maintenance

### Weekly Tasks
- Review Dependabot PRs
- Check workflow run times
- Monitor coverage trends

### Monthly Tasks
- Audit GitHub secrets
- Review and update workflows
- Check for workflow deprecations
- Update action versions

### Quarterly Tasks
- Review branch protection rules
- Audit CODEOWNERS
- Update CI/CD documentation
- Performance optimization review

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Foundry Deployment Guide](https://book.getfoundry.sh/reference/forge/forge-script)
- [Codecov Documentation](https://docs.codecov.com/)
