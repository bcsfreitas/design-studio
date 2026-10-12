# Security

Design Studio is an early beta. Security fixes target the current development version on `main`; there are no separately supported release branches yet.

## Reporting a vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/itspatmorgan/design-studio/security/advisories/new) to contact the maintainer privately. Include affected versions or commits, reproduction steps, the expected and actual behavior, and the likely impact. Remove credentials and private company data from examples.

Please keep exploit details out of public issues while the report is being assessed. Ordinary bugs and feature requests belong in GitHub issues.

## Intended environment

Run the development server in a trusted local environment. Its file-editing features are designed for local development, not as a remotely exposed authenticated service.

Prototype code, design systems, and installed modules run as trusted code within the studio application. Contributor ownership checks, dependency rules, and scoped styles help organize work; they do not provide an execution sandbox for untrusted code. Review imported code and modules before running them.
