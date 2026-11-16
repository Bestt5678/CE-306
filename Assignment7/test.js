// ทดสอบ API อัตโนมัติด้วย MongoDB ในหน่วยความจำ (ไม่ต้องติดตั้ง MongoDB)
// รัน: npm test
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const { start } = require("./server");

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`, detail !== undefined ? JSON.stringify(detail) : "");
  }
}

(async () => {
  const mongo = await MongoMemoryServer.create();
  const server = await start(mongo.getUri(), PORT);

  try {
    // POST
    const kb = await call("POST", "/products", {
      name: "Mechanical Keyboard", price: 1890, description: "Red switch keyboard",
      category: "Computer", stock: 10,
    });
    check("POST /products -> 201", kb.status === 201 && kb.data.stock === 10, kb);
    const id = kb.data._id;

    await call("POST", "/products", { name: "Gaming Keyboard", price: 2500, category: "Computer", stock: 0 });
    await call("POST", "/products", { name: "Wireless Mouse", price: 590, category: "Computer", stock: 3 });
    await call("POST", "/products", { name: "Coffee Mug", price: 150, category: "Kitchen" });

    const noCat = await call("POST", "/products", { name: "X", price: 10 });
    check("POST ไม่มี category -> 400", noCat.status === 400, noCat);
    const neg = await call("POST", "/products", { name: "X", price: 10, category: "A", stock: -1 });
    check("POST stock ติดลบ -> 400", neg.status === 400, neg);

    // GET all / by id
    const all = await call("GET", "/products");
    check("GET /products -> 4 รายการ", all.status === 200 && all.data.length === 4, all.data.length);
    const mug = all.data.find((p) => p.name === "Coffee Mug");
    check("stock default = 0", mug.stock === 0, mug);

    const one = await call("GET", `/products/${id}`);
    check("GET /products/:id -> 200", one.status === 200 && one.data.name === "Mechanical Keyboard", one);

    // PATCH
    const upd = await call("PATCH", `/products/${id}`, { price: 1790 });
    check("PATCH /products/:id -> 200", upd.status === 200 && upd.data.price === 1790, upd);
    const updNeg = await call("PATCH", `/products/${id}`, { stock: -5 });
    check("PATCH stock ติดลบ -> 400", updNeg.status === 400, updNeg);

    // Search
    const s = await call("GET", "/products/search/KEYBOARD");
    const names = s.data.map((p) => p.name).sort();
    check("search/KEYBOARD เจอ 2 keyboard (ไม่สนตัวเล็กใหญ่)",
      JSON.stringify(names) === JSON.stringify(["Gaming Keyboard", "Mechanical Keyboard"]), names);

    // Category
    const c = await call("GET", "/products/category/computer");
    check("category/computer -> 3 รายการ", c.data.length === 3, c.data.length);
    const k = await call("GET", "/products/category/Kitchen");
    check("category/Kitchen -> 1 รายการ", k.data.length === 1, k.data.length);

    // Available
    const av = await call("GET", "/products/available");
    check("available -> เฉพาะ stock > 0 (2 รายการ)",
      av.data.length === 2 && av.data.every((p) => p.stock > 0), av.data);

    // add-stock
    const add = await call("PATCH", `/products/${id}/add-stock`, { amount: 5 });
    check("add-stock 10 + 5 = 15", add.status === 200 && add.data.stock === 15, add);
    const add0 = await call("PATCH", `/products/${id}/add-stock`, { amount: 0 });
    check("add-stock amount=0 -> 400", add0.status === 400, add0);
    const addNeg = await call("PATCH", `/products/${id}/add-stock`, { amount: -3 });
    check("add-stock amount<0 -> 400", addNeg.status === 400, addNeg);
    const missingId = new mongoose.Types.ObjectId().toString();
    const add404 = await call("PATCH", `/products/${missingId}/add-stock`, { amount: 5 });
    check("add-stock id ไม่มี -> 404", add404.status === 404, add404);

    // Delete
    const del = await call("DELETE", `/products/${id}`);
    check("DELETE -> 200 Product deleted", del.status === 200 && del.data.message === "Product deleted", del);
    const del2 = await call("DELETE", `/products/${id}`);
    check("DELETE ซ้ำ -> 404", del2.status === 404 && del2.data.message === "Product not found", del2);
    const bad = await call("GET", "/products/not-an-id");
    check("GET id ผิดรูปแบบ -> 400", bad.status === 400, bad);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
