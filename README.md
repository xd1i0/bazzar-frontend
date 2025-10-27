# Bazzar — Ionic + Angular Frontend

A frontend application built with Ionic and Angular. This repository contains the Ionic/Angular client app (Capacitor-ready) for the Bazzar project.

Minimal, focused README to get you up and running.

## Key technologies
- Angular 20
- Ionic 8
- Capacitor (Android / iOS)
- AngularFire (Firebase integration)
- TypeScript, RxJS
- ESLint, Jasmine/Karma for testing

## Table of contents
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Building for production](#building-for-production)
- [Capacitor (native) workflow](#capacitor-native-workflow)
- [Testing and linting](#testing-and-linting)
- [Environment & configuration](#environment--configuration)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Requirements
- Node.js (recommended: 18+)
- npm (or pnpm/yarn)
- For Android builds: Java JDK, Android SDK, Android Studio
- For iOS builds: Xcode (macOS)
- (Optional) Ionic CLI: npm install -g @ionic/cli
- Capacitor CLI is available in devDependencies; you can use it via npx

## Getting started
1. Clone the repo:
   git clone https://github.com/xd1i0/bazzar-frontend.git
2. Change into the project directory:
   cd bazzar-frontend
3. Install dependencies:
   npm install
4. Start the dev server:
   npm run start
   - This runs the Angular dev server (ng serve). Open http://localhost:4200.

## Development workflow
- Start a dev server:
  npm run start
- Rebuild automatically while developing:
  npm run watch
- Open the app in a browser and use Ionic dev tools or your browser devtools while developing.

Scripts available in package.json:
- ng — echo/forward to Angular CLI
- start — ng serve
- build — ng build
- watch — ng build --watch --configuration development
- test — ng test
- lint — ng lint

## Building for production
1. Build the Angular production bundle:
   npm run build
2. The output is in the `dist/` directory. Serve it via your preferred static host or integrate into your backend.

## Capacitor (native) workflow
This project includes Capacitor packages and can be deployed to native platforms.

1. Ensure the web assets are built:
   npm run build
2. Copy web assets to native project(s):
   npx cap copy
3. Add a platform (if not already added):
   npx cap add android
   npx cap add ios
4. Open the native IDE:
   npx cap open android
   npx cap open ios
5. After native changes, repeat:
   npm run build
   npx cap copy
   npx cap sync

Note: Use npx to run Capacitor CLI bundled with the project, or install @capacitor/cli globally if preferred.

## Testing and linting
- Run unit tests:
  npm run test
- Run lint:
  npm run lint

The project includes Jasmine/Karma configuration for tests and ESLint for linting.

## Environment & configuration
- Firebase / AngularFire is included as a dependency. Keep sensitive keys and environment-specific settings out of source control.
- Typical file locations:
  - src/environments/environment.ts
  - src/environments/environment.prod.ts
- Add your Firebase config and other API keys in environment files or use a secure secrets management approach for production.

## Contributing
- Open issues for bugs, feature requests, or improvements.
- Fork the repository and create PRs for proposed changes.
- Keep commits small and descriptive; follow an established commit message style if your team uses one.

## License
There is no license specified in this repository. Add a LICENSE file (for example, MIT) if you want to specify licensing terms.

## Contact
Repository owner: xd1i0

If you want changes or additional sections (architecture, deployment details, CI/CD), tell me what you'd like and I can expand this README.
