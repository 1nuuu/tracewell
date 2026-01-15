# Contributing to Oracast Markets

Thank you for your interest in contributing to Oracast Markets! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and professional in all interactions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) (recommended)
- Git
- A code editor (VS Code, Cursor, etc.)

### Local Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/oracast-markets.git
   cd oracast-markets
   ```

3. **Install dependencies**:
   ```bash
   bun install
   # or
   npm install
   ```

4. **Start the development server**:
   ```bash
   bun dev
   # or
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000) in your browser

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/RitualChain/oracast-markets/issues) to avoid duplicates
2. Use the bug report template
3. Include:
   - Clear description of the issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, browser, Node version)
   - Screenshots if applicable

### Suggesting Features

1. Search [existing issues](https://github.com/RitualChain/oracast-markets/issues) for similar suggestions
2. Use the feature request template
3. Explain:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions you've considered

### Submitting Pull Requests

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**:
   - Follow the existing code style
   - Add/update tests if applicable
   - Update documentation if needed

3. **Test your changes**:
   ```bash
   bun run lint
   bun run build
   ```

4. **Commit with a descriptive message**:
   ```bash
   git commit -m "feat: add new cryptocurrency to token list"
   # or
   git commit -m "fix: handle API timeout gracefully"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Formatting, no code change
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvement
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add support for new cryptocurrency
fix: resolve cache invalidation issue
docs: update API endpoint documentation
style: format code with prettier
refactor: simplify token mapping logic
perf: optimize API response caching
test: add unit tests for price formatting
chore: update dependencies
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define interfaces for data structures
- Avoid `any` type when possible

### React

- Use functional components with hooks
- Follow the existing component patterns
- Keep components focused and reusable

### Styling

- Use Tailwind CSS for styling
- Follow the existing design system
- Maintain responsive design

### API Routes

- Use Hono.js patterns
- Include proper error handling
- Add input validation
- Document new endpoints

## Project Structure

```
oracast-markets/
├── app/                    # Next.js App Router
│   ├── api/[...route]/    # Hono API routes
│   ├── features/          # Features page
│   └── ...
├── components/ui/         # Reusable UI components
├── lib/                   # Utilities and constants
├── docs/                  # Documentation
├── public/                # Static assets
└── styles/               # Global styles
```

## Adding New Cryptocurrencies

To add a new cryptocurrency to the default list:

1. Edit `lib/constants.ts`:
   ```typescript
   export const TOKEN_LIST_DEFAULT: Token[] = [
     // ... existing tokens
     {
       id: 'new-coin-id',        // CoinGecko ID
       name: 'New Coin',
       symbol: 'NEW',
       logo: 'https://...',      // CoinGecko logo URL
       brandColor: '#HEXCODE',
       brandBgColor: '#HEXCODE',
     },
   ];
   ```

2. Add mapping in `lib/token-mappings.ts`:
   ```typescript
   export const TOKEN_MAPPINGS: Record<string, TokenMapping> = {
     // ... existing mappings
     NEW: { cg: 'new-coin-id', cb: 'NEW' },
   };
   ```

## Questions?

- Open a [GitHub Discussion](https://github.com/RitualChain/oracast-markets/discussions)
- Check existing [documentation](./docs/)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
