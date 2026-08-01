# Contributing to SmartNotes

Thank you for your interest in contributing to SmartNotes! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js ≥ 22.17 (required by `@qvac/sdk`)
- MySQL 8.0+
- npm or yarn package manager
- Git

### Development Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/smart_notes.git
   cd smart_notes
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

4. **Database setup**
   ```bash
   npm run db:push
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:5000](http://localhost:5000) in your browser

## Contributing Guidelines

### What to Contribute

We welcome contributions in the following areas:

- **Bug fixes** - Help us squash bugs!
- **New features** - Propose new features via issues first
- **Documentation** - Improve docs, fix typos, add examples
- **AI features** - Enhance AI-powered learning tools
- **UI/UX improvements** - Improve the user interface
- **Performance** - Optimize code for better performance
- **Accessibility** - Improve accessibility features

### Reporting Issues

Before creating an issue, please:

1. Search existing issues to avoid duplicates
2. Check if the issue is resolved in the latest version
3. Use the issue template and provide:
   - Clear description of the problem
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (OS, Node.js version, MySQL version)
   - Screenshots if applicable

### Feature Requests

For feature requests:

1. Open an issue describing the feature
2. Explain the use case and why it's valuable
3. Discuss implementation approaches
4. Wait for maintainer approval before starting work

## Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Follow the coding standards
   - Add tests for new functionality
   - Update documentation
   - Commit frequently with clear messages

3. **Test your changes**
   ```bash
   npm run check      # TypeScript type checking
   npm run build     # Build verification
   # Run manual tests for your changes
   ```

4. **Submit your PR**
   - Fill out the PR template
   - Link related issues
   - Describe your changes clearly
   - Ensure CI checks pass

## Coding Standards

### TypeScript/React (Frontend & Backend)

- Follow ESLint configuration
- Use functional components with hooks
- Keep components small and focused
- Use TypeScript strictly (no `any`)
- Follow React best practices
- Use Radix UI components when possible

```typescript
// Good
interface NoteProps {
  id: string;
  title: string;
  content: string;
  onUpdate: (id: string, content: string) => void;
}

export const NoteEditor: React.FC<NoteProps> = ({ id, title, content, onUpdate }) => {
  return <div>{title}</div>;
};

// Bad
export const NoteEditor = (props: any) => {
  return <div>{props.title}</div>;
};
```

### Database (Drizzle ORM)

- Use Drizzle ORM for database operations
- Write TypeScript queries with type safety
- Use migrations for schema changes
- Document complex queries in comments

```typescript
// Good
const notes = await db.select().from(notesTable).where(eq(notesTable.userId, userId));

// Bad
const notes = await db.query('SELECT * FROM notes WHERE user_id = ?', [userId]);
```

### LLM Provider Abstraction

When working with LLM features, follow the provider abstraction pattern:

- Never call LLM APIs directly from the frontend
- Use the `server/services/llm-provider.ts` abstraction
- Support both cloud and local providers
- Document provider-specific behavior

```typescript
// Good - Use the abstraction
const llmProvider = getLLMProvider();
const response = await llmProvider.generate(prompt, options);

// Bad - Direct API call
const response = await fetch('https://api.openai.com/v1/chat/completions', ...);
```

### Git Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(ai): add voice input support for learning assistant`
- `fix(study): resolve flashcard spacing repetition bug`
- `docs(readme): update QVAC installation instructions`

## Testing

### Type Checking

```bash
npm run check          # TypeScript type checking
```

### Build Verification

```bash
npm run build         # Build for production
```

### Manual Testing

- Test all modified features manually
- Test on different browsers (Chrome, Firefox, Safari)
- Test mobile responsiveness
- Test accessibility features

### Test Requirements

- New features must include manual testing
- Bug fixes should include regression testing
- Type checking must pass
- Build must succeed without errors
- All LLM provider switches should work

## Documentation

### Code Documentation

- Add JSDoc comments to complex functions
- Comment complex logic
- Keep documentation up to date with code changes
- Use TypeScript interfaces as documentation

### Project Documentation

- Update README.md for user-facing changes
- Update CHANGELOG.md for all changes
- Update API documentation for endpoint changes
- Add inline comments for AI/ML logic

### LLM Provider Documentation

When modifying LLM-related code:

- Document provider-specific behavior
- Update environment variable documentation
- Note any breaking changes in provider interface
- Document performance characteristics

## Architecture Decisions

This project follows a specific architecture:

- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- Database: MySQL with Drizzle ORM
- AI: LLM provider abstraction (cloud + local via QVAC)
- Authentication: Passport.js

Before making architectural changes, please discuss them in an issue first.

## QVAC (Local LLM) Specific Guidelines

When working with QVAC integration:

- Note the Node.js version requirement (≥ 22.17)
- Document P2P model download behavior
- Handle model cache directory (~/.qvac/models)
- Consider disk space requirements (5-10 GB)
- Test both cloud and local provider switching

## Questions?

- Open an issue for questions
- Check existing documentation
- Review the architecture in README.md

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SmartNotes! 🎉
