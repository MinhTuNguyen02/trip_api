// seed/seed.ts
import "dotenv/config";
import mongoose from "mongoose";
import Destination from "../models/Destination";
import Tour from "../models/Tour";
import data from "./data.sample.json";

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  await Destination.deleteMany({});
  await Tour.deleteMany({});

  const destMap = new Map<string, any>();
  for (const d of (data as any).destinations) {
    const doc = await Destination.create(d);
    destMap.set(d.code, doc._id);
  }
  for (const t of (data as any).tours) {
    await Tour.create({ ...t, destination_id: destMap.get(t.dest) });
  }
  console.log("Seeded!");
  await mongoose.disconnect();
}
run();
