import { App } from './app'

const app = new App()

async function main() {
  await app.start()
}

main().catch((error) => {
  process.exit(1)
}) 