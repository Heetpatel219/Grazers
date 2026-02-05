const mongoose = require('mongoose');
const Product = require('./models/Product');

// Seed script for the Grazers database: define initial products and insert them into MongoDB
const products = [
  {
    id: 101,
    store_id: "s1",
    store_name: "Dolllister",
    title: "Women's Tops",
    category: "tops",
    keywords: ["women tops", "ladies tops", "tops"],
    images: "https://img.hollisterco.com/is/image/anf/KIC_352-6037-00382-610_prod1?policy=product-extra-large",
    price: 24.95,
    quantity: 50,
    description: "Stylish and comfortable oversized hoodie, perfect for everyday wear.",
    is_featured: true,
    is_best_seller: false
  },
  {
    id: 102,
    store_id: "s1",
    store_name: "Dolllister",
    title: "Men's Tops",
    category: "tops",
    keywords: ["men tops", "tops"],
    images: "https://img.hollisterco.com/is/image/anf/KIC_324-6080-00476-210_prod1?policy=product-large",
    price: 19.95,
    quantity: 40,
    description: "Classic crew neck t-shirt made from premium soft cotton.",
    is_featured: false,
    is_best_seller: true
  },
  {
    id: 103,
    store_id: "s1",
    store_name: "Dolllister",
    title: "Women's Bottoms",
    category: "bottoms",
    keywords: ["women bottoms", "ladies bottoms", "bottoms"],
    images: "https://img.hollisterco.com/is/image/anf/KIC_347-6055-00357-610_prod1?policy=product-extra-large",
    price: 34.95,
    quantity: 30,
    description: "Baggy sweatpants designed for maximum comfort and style.",
    is_featured: false,
    is_best_seller: false
  },
  {
    id: 104,
    store_id: "s1",
    store_name: "Dolllister",
    title: "Men's Bottoms",
    category: "bottoms",
    keywords: ["men bottom", "bottoms"],
    images: "https://img.hollisterco.com/is/image/anf/KIC_313-5013-00090-110_prod1?policy=product-extra-large",
    price: 29.95,
    quantity: 25,
    description: "Relaxed fit lounge pants suitable for home or gym.",
    is_featured: false,
    is_best_seller: false
  },
  {
    id: 105,
    store_id: "s1",
    store_name: "Dolllister",
    title: "Women's Dresses",
    category: "dresses",
    keywords: ["women dresses", "ladies dresses", "dresses"],
    images: "https://img.hollisterco.com/is/image/anf/KIC_359-6021-00357-601_prod1?policy=product-large",
    price: 44.95,
    quantity: 15,
    description: "Elegant lace ruffle dress for special occasions.",
    is_featured: true,
    is_best_seller: true
  }
];

async function seedDatabase() {
  try {
    // Connect to the local Grazers database (separate from the Users DB)
    await mongoose.connect('mongodb://127.0.0.1:27017/Grazers');
    console.log("Connected to MongoDB...");



    // Bulk-insert the seed products into the Product collection
    const insertResult = await Product.insertMany(products);
    console.log(`Successfully inserted ${insertResult.length} products!`);

    // Cleanly close the connection once seeding is complete
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Error populating database:", error);
    process.exit(1);
  }
}

// 3. Execute the function
seedDatabase();