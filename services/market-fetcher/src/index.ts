import { App } from './app'

const app = new App()

async function main() {
  await app.start()
}

main().catch((error) => {
  console.error('Failed to start application:', error)
  process.exit(1)
})
