import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,

  jewelryTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JewelryType",
  },

  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
  },

  stoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stone",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Product ||
  mongoose.model("Product", productSchema);