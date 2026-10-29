import { closeSeedPool, migrateDatabase, seedDatabase } from "./index";

type Command = "migrate" | "seed" | "setup" | "reset";

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;

  switch (command) {
    case "migrate":
      await migrateDatabase();
      break;
    case "seed":
      await seedDatabase();
      break;
    case "setup":
      await migrateDatabase();
      await seedDatabase();
      break;
    case "reset":
      await migrateDatabase();
      await seedDatabase({ reset: true });
      break;
    default:
      throw new Error("Use migrate, seed, setup, or reset.");
  }
}

void main()
  .then(() => {
    console.info("Database command completed.");
  })
  .catch(() => {
    console.error("Database command failed. Check local database settings.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSeedPool();
  });
