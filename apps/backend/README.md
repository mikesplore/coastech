<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/master/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

## Compatibility

This starter is compatible with versions >= 2 of `@medusajs/medusa`. 

## Getting Started

Visit the [Quickstart Guide](https://docs.medusajs.com/learn/installation) to set up a server.

Visit the [Docs](https://docs.medusajs.com/learn/installation#get-started) to learn more about our system requirements.

## Docker deployment

Build the backend image from the repository root:

```bash
docker build -f apps/backend/Dockerfile -t coastech-backend .
```

Run it against a PostgreSQL instance reachable from the container:

```bash
docker run --rm -p 9000:9000 --env-file apps/backend/.env coastech-backend
```

Set `DATABASE_URL` to a complete PostgreSQL connection string, or provide `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. `DATABASE_URL` takes precedence when both forms are present. Keep `.env` out of version control and provide Paystack, CORS, JWT, and cookie secrets through the deployment platform.

For Docker, set `REDIS_URL` to the Redis service name on the shared network, for example `redis://app-redis:6379`, not `localhost`. The backend now passes this value to Medusa's `projectConfig.redisUrl`.

Repeatable image build and deployment scripts are available at the repository root:

```bash
./scripts/build-backend.sh
./scripts/deploy-backend.sh
```

`deploy-backend.sh` expects `.env`, `app-postgres`, and `app-redis` by default on `coastech-net`. Override `POSTGRES_CONTAINER`, `REDIS_CONTAINER`, `DOCKER_NETWORK`, `ENV_FILE`, or `IMAGE_TAG` when the server uses different names. It runs schema migrations with migration scripts skipped; use `RUN_SEED=true ./scripts/deploy-backend.sh` for a fresh database.

## Hardware ingestion

The backend includes an autonomous hardware ingestion command. It discovers a product page from a query, parses JSON-LD and metadata, downloads and uploads the image through Medusa's public file workflow, then creates a published product, default variant, USD price set, and technical metadata.

```bash
cd apps/backend
HARDWARE_INGEST_QUERY="NVIDIA GeForce RTX 4090" \\
HARDWARE_INGEST_PRICE_USD=1599.99 \\
HARDWARE_INGEST_CATEGORY=graphics-cards-gpus \\
npm run ingest:hardware
```

Use `HARDWARE_INGEST_SOURCE_URL` to bypass search discovery. A price override is recommended when the source page does not expose a USD offer. The command is idempotent for an existing handle or source URL and refuses to persist local image paths or non-public file-provider URLs.

## What is Medusa

Medusa is a set of commerce modules and tools that allow you to build rich, reliable, and performant commerce applications without reinventing core commerce logic. The modules can be customized and used to build advanced ecommerce stores, marketplaces, or any product that needs foundational commerce primitives. All modules are open-source and freely available on npm.

Learn more about [Medusa’s architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the Docs.

## Community & Contributions

The community and core team are available in [GitHub Discussions](https://github.com/medusajs/medusa/discussions), where you can ask for support, discuss roadmap, and share ideas.

Join our [Discord server](https://discord.com/invite/medusajs) to meet other community members.

## Other channels

- [GitHub Issues](https://github.com/medusajs/medusa/issues)
- [Twitter](https://twitter.com/medusajs)
- [LinkedIn](https://www.linkedin.com/company/medusajs)
- [Medusa Blog](https://medusajs.com/blog/)
