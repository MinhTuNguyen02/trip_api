import "dotenv/config";
import app from "./app";
import mongoose from "mongoose";

const port = process.env.PORT || 4000;

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  app.listen(port, () => console.log(`API on http://localhost:${port}`));
}
main().catch(err => { console.error(err); process.exit(1); });
