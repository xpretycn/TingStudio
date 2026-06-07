---
name: audit
description: 对前端代码进行系统性质量审计，覆盖无障碍、性能、主题、响应式和 AI 反模式五个维度，输出分级问题报告。当用户需要审查样式问题、检查设计一致性、审计前端质量时触发。
---

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the Context Gathering Protocol. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

Run systematic **technical** quality checks and generate a comprehensive report. Don't fix issues — document them for other commands to address.

This is a code-level audit, not a design critique. Check what's measurable and verifiable in the implementation.

## Diagnostic Scan

Run comprehensive checks across 5 dimensions. Score each dimension 0-4 using the criteria below.

### 1. Accessibility (A11y)

- **Contrast ratios**: Verify text meets WCAG 2.1 AA (4.5:1 normal, 3:1 large)
- **ARIA attributes**: Check for missing/incorrect roles, labels, live regions
- **Keyboard navigation**: Verify focus management, tab order, skip links
- **Semantic HTML**: Check heading hierarchy, landmark regions, list structures
- **Alt text**: Verify images have meaningful alt attributes
- **Form accessibility**: Labels, error messages, required indicators

### 2. Performance

- **Layout thrashing**: Forced reflows from reading/writing DOM in sequence
- **Expensive animations**: Layout-triggering properties (top/left/width/height) instead of transforms
- **Bundle size**: Large imports, unused dependencies, tree-shaking failures
- **Render efficiency**: Unnecessary re-renders, missing virtualization, heavy watchers
- **Resource loading**: Image optimization, lazy loading, critical path

### 3. Theming

- **Hard-coded colors**: Any color value not using CSS variables or design tokens
- **Dark mode**: Incomplete dark theme coverage, broken contrast in dark mode
- **Token consistency**: Using correct token names, no deprecated tokens
- **Brand compliance**: Colors match brand palette from DESIGN.md

### 4. Responsive Design

- **Fixed widths**: Hard-coded pixel widths that break on smaller screens
- **Touch targets**: Minimum 44x44px for interactive elements on mobile
- **Overflow issues**: Horizontal scroll, clipped content, truncated text
- **Text scaling**: Readable at 200% zoom

### 5. AI Anti-patterns

- **Generic placeholders**: Lorem ipsum, TODO comments in production
- **Over-engineering**: Unnecessary abstractions, premature optimization
- **Copy-paste patterns**: Duplicated code that should be shared components
- **Dead code**: Unused variables, unreachable branches, commented-out code

## Scoring Criteria

| Score | Level | Description |
|-------|-------|-------------|
| 0 | Critical | Systemic failures, blocking users |
| 1 | Poor | Multiple significant issues |
| 2 | Fair | Some issues, mostly functional |
| 3 | Good | Minor issues only |
| 4 | Excellent | Meets all best practices |

## Report Format

Generate a structured report with:

1. **Executive Summary**: Overall scores per dimension, total score
2. **Critical Issues**: Must fix immediately (blocking users, data loss risk)
3. **High Issues**: Should fix soon (degraded experience, accessibility barriers)
4. **Medium Issues**: Should fix eventually (inconsistencies, minor perf)
5. **Low Issues**: Nice to have (polish, optimization opportunities)
6. **Positive Practices**: Things done well, worth preserving
7. **Remediation Roadmap**: Prioritized fix plan with suggested commands

For each finding include:
- **Location**: File path and line number
- **Impact**: Who/what is affected
- **Standard**: Which rule/standard is violated
- **Recommendation**: Specific fix suggestion
- **Suggested command**: Which impeccable sub-command can address it (normalize, optimize, harden, adapt, etc.)
