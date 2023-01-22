# jamie

Welcome to the jamie repo - the place where we will be building the personal AI assistant for the future generating meeting summaries in business-writing quality within seconds 🪄

Overview: https://www.figma.com/file/h18qr6is04HhqLgPef2yfA/jamie-product?node-id=0%3A1

Design: https://www.figma.com/file/XVVllNyzANIYQm36Z0uedc/jamie-product?node-id=0%3A1

Linear: https://linear.app/wespond/project/jamie-mvp-d8e6cc34b944/WES

## Guidelines

- This project is a monorepo - all code lives in here
- The application is coded in Vue3 and will be wrapped in an electron app (as a menu bar app) to ship it natively to the platforms
- Firebase will be used for authentication, cloud functions, and temporary storage of audio
- Cloud functions will be written in typescript
- We are using yarn for the project; npm for the functions folder (due to incompability)

Run Strip locally
https://stripe.com/docs/stripe-cli
stripe listen --forward-to http://localhost:5001/jamie-core/europe-west3/stripe-stripeWebHook

## Automatic updates

electron-update is implemented and automatically deployes the latest version to a public repo. This is triggered by a change in the version of the package.json in the app directory. The published repo is https://github.com/louismorgner/jamie-release.

We follow [semantic versioning](https://semver.org/). Whenever breaking changes to the schema, cloud functions, or client, we need to release a new major version which triggers a hard update for users.

## Env keys

Added a .env.production file to the functions folder for automatically adjusting secrets during deployments
