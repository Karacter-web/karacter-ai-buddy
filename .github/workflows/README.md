# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the Karacter AI Buddy project. These workflows automate CI/CD, security auditing, code quality checks, dependency management, and pre-deployment validation.

## Workflows Overview

### 1. CI/CD Pipeline (`ci-cd.yml`)
- **Trigger**: Push/PR to `main` or `develop` branches
- **Jobs**:
  - `test`: Runs typecheck, lint, and tests
  - `build`: Builds the application and uploads artifacts
  - `deploy-staging`: Deploys to Cloudflare staging environment
  - `deploy-production`: Deploys to Cloudflare production (main branch only)

### 2. Security Audit (`security-audit.yml`)
- **Trigger**: Push/PR to `main` or `develop`, daily at midnight UTC
- **Jobs**:
  - `secret-scanning`: Uses TruffleHog and Gitleaks to detect committed secrets
  - `vulnerability-scan`: Runs npm audit and Snyk for dependency vulnerabilities
  - `code-security`: Runs ESLint and CodeQL analysis
  - `security-report`: Aggregates all security findings

### 3. Code Quality Checks (`code-quality.yml`)
- **Trigger**: Push/PR to `main` or `develop`
- **Jobs**:
  - `lint`: Runs ESLint
  - `format`: Runs Prettier checks
  - `typecheck`: Runs TypeScript compiler
  - `code-review`: Runs SonarCloud analysis (main/develop only)
  - `quality-gate`: Aggregates all quality checks

### 4. Dependency Management (`dependency-check.yml`)
- **Trigger**: Push/PR to `main` or `develop`, every Monday at 6 AM UTC
- **Jobs**:
  - `dependency-audit`: Runs npm audit for vulnerabilities
  - `unused-dependencies`: Detects potentially unused packages
  - `dependency-updates`: Creates PRs for updates (via Renovate)
  - `license-check`: Verifies license compliance
  - `dependency-graph`: Updates dependency graph
  - `validation-gate`: Aggregates all dependency checks

### 5. Pre-Deployment Validation (`pre-deploy-validation.yml`)
- **Trigger**: Push/PR to `main`, or when other workflows complete
- **Jobs**:
  - `gather-reports`: Collects results from all workflows
  - `build-validation`: Verifies build integrity and bundle sizes
  - `performance-check`: Runs performance checks (Lighthouse placeholder)
  - `environment-validation`: Verifies required secrets are set
  - `pre-deploy-summary`: Generates comprehensive report
  - `notify`: Notifies team of validation results

## Required GitHub Secrets

The following secrets must be configured in GitHub repository settings:

### Cloudflare
- `CF_ACCOUNT_ID`: Cloudflare account ID
- `CF_API_TOKEN`: Cloudflare API token for deployments

### Supabase
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY`: Client-side Supabase key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side Supabase key (service role)

### AI Providers
- `GEMINI_API_KEY`: Google Gemini API key
- `MISTRAL_API_KEY`: Mistral API key

### Security & Monitoring
- `SNYK_TOKEN`: Snyk API token for vulnerability scanning
- `SONAR_TOKEN`: SonarCloud API token for code analysis
- `RENOVATE_TOKEN`: Renovate API token for dependency updates (classic PAT with repo scope)

## Required GitHub Environments

Configure the following environments in GitHub repository settings:

### `staging`
- Environment URL: `https://staging.karacterhub.xyz`
- Deployment branch: `develop` or `main`

### `production`
- Environment URL: `https://karacterhub.xyz`
- Deployment branch: `main`
- Protection rules: Require approval, require all checks to pass

## Setup Instructions

1. **Create `.github/workflows/` directory** (already done)
2. **Add workflow files** (already done)
3. **Configure Gitleaks** (config file at `.github/gitleaks.toml`)
4. **Set up GitHub Secrets**
   - Go to Repository Settings > Secrets and variables > Actions
   - Add all required secrets listed above
5. **Set up GitHub Environments**
   - Go to Repository Settings > Environments
   - Create `staging` and `production` environments
6. **Enable Required Features**
   - Enable GitHub CodeQL for advanced security analysis
   - Enable Dependency Graph for supply chain security

## Customization

### Modifying Workflows
- Edit YAML files in `.github/workflows/`
- Use GitHub Actions documentation: https://docs.github.com/en/actions

### Adding New Checks
- Add new jobs to existing workflows or create new workflow files
- Ensure new checks are included in the pre-deployment validation

### Adjusting Thresholds
- Modify severity levels in `npm audit` commands
- Adjust bundle size limits in `build-validation` job
- Customize Gitleaks rules in `.github/gitleaks.toml`

## Troubleshooting

### Workflow Failures
1. Check Actions tab in GitHub repository
2. Review logs for each job step
3. Verify all required secrets are configured
4. Ensure Node.js version matches project requirements

### Permission Issues
1. Verify workflow permissions in repository settings
2. Check that secrets are accessible to workflows
3. Ensure environments have correct access controls

### Dependency Issues
1. Run `npm ci` locally to verify lockfile integrity
2. Check for version conflicts in `package.json`
3. Review npm audit results for vulnerabilities

## Best Practices

1. **Always test workflows locally** before pushing to main
2. **Use pull requests** for workflow changes
3. **Monitor workflow runs** in the Actions tab
4. **Review security reports** regularly
5. **Update dependencies** frequently to get security patches
6. **Customize rules** based on your project's specific needs

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Snyk](https://snyk.io/)
- [SonarCloud](https://sonarcloud.io/)
- [CodeQL](https://codeql.github.com/)
- [Renovate](https://www.whitesourcesoftware.com/free-developer-tools/renovate/)
