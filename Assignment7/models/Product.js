const mongoose = require("mongoose");

// ข้อ 1: เพิ่ม field category และ stock
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: String,

    category: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
