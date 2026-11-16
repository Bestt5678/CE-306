const express = require("express");
const mongoose = require("mongoose");
const Product = require("./models/Product");

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/productdb";
const PORT = process.env.PORT || 3000;

// escape อักขระพิเศษของ regex เพื่อให้ค้นหาเป็นข้อความธรรมดา (กัน regex injection)
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// แปลง error ของ Mongoose เป็น HTTP status ที่เหมาะสม
function handleError(res, err) {
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Validation failed", error: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid product id" });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}

/* ---------------- CRUD เดิม ---------------- */

// POST /products — สร้างสินค้าใหม่
app.post("/products", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /products — ดูสินค้าทั้งหมด
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    handleError(res, err);
  }
});

/* ---------------- ข้อ 2–4: Search / Filter ----------------
   ต้องประกาศก่อน /products/:id ไม่เช่นนั้น Express จะมองคำว่า
   "search", "category", "available" เป็นค่า :id */

// ข้อ 2: GET /products/search/:keyword — ค้นหาจากชื่อ ไม่สนตัวเล็ก/ใหญ่
app.get("/products/search/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const products = await Product.find({
      name: { $regex: escapeRegex(keyword), $options: "i" },
    });
    res.json(products);
  } catch (err) {
    handleError(res, err);
  }
});

// ข้อ 3: GET /products/category/:category — กรองตามหมวดหมู่ (ตรงทั้งคำ ไม่สนตัวเล็ก/ใหญ่)
app.get("/products/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({
      category: { $regex: `^${escapeRegex(category)}$`, $options: "i" },
    });
    res.json(products);
  } catch (err) {
    handleError(res, err);
  }
});

// ข้อ 4: GET /products/available — เฉพาะสินค้าที่ stock > 0
app.get("/products/available", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } });
    res.json(products);
  } catch (err) {
    handleError(res, err);
  }
});

/* ---------------- CRUD เดิม (ตาม id) ---------------- */

// GET /products/:id — ดูสินค้าตาม id
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    handleError(res, err);
  }
});

// PATCH /products/:id — แก้ไขสินค้า (รัน validation ด้วย เช่น stock ห้ามติดลบ)
app.patch("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    handleError(res, err);
  }
});

// ข้อ 5: PATCH /products/:id/add-stock — เพิ่ม stock ตาม amount
app.patch("/products/:id/add-stock", async (req, res) => {
  try {
    const { id } = req.params;
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "amount must be a number greater than 0" });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { stock: amount } },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    handleError(res, err);
  }
});

// ข้อ 6: DELETE /products/:id — ตรวจสอบก่อนว่ามีสินค้าจริง
app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted" });
  } catch (err) {
    handleError(res, err);
  }
});

/* ---------------- Start server ---------------- */

async function start(uri = MONGO_URI, port = PORT) {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  return app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start:", err.message);
    process.exit(1);
  });
}

module.exports = { app, start };
