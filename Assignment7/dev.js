// รันเซิร์ฟเวอร์โดยไม่ต้องติดตั้ง MongoDB เอง
// ใช้ mongodb-memory-server เก็บข้อมูลไว้ที่โฟลเดอร์ .mongo-data (ข้อมูลยังอยู่หลังปิด-เปิดใหม่)
// รัน: npm run dev
const fs = require("fs");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { start } = require("./server");

(async () => {
  const dbPath = path.join(__dirname, ".mongo-data");
  fs.mkdirSync(dbPath, { recursive: true });

  const mongo = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger", port: 27017 },
  });
  await start(mongo.getUri("productdb"), process.env.PORT || 3000);

  const stop = async () => {
    await mongo.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})().catch((err) => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
