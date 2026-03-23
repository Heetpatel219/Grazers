const mongoose = require('mongoose');
const Product = require('./models/Product');
const Shop = require('./models/Shop');

const shopsToSeed = [
  {
    store_id: 's1',
    name: 'Dolllister',
    description: 'Fresh women\'s and men\'s tops, bottoms, and dresses designed for a flattering fit.',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
    hours: {
      monday: '8:00 AM - 10:00 PM', tuesday: '8:00 AM - 10:00 PM', wednesday: '8:00 AM - 10:00 PM',
      thursday: '8:00 AM - 10:00 PM', friday: '8:00 AM - 11:00 PM', saturday: '9:00 AM - 11:00 PM', sunday: '9:00 AM - 8:00 PM'
    }
  },
  {
    store_id: 's2',
    name: 'Tikes',
    description: 'Top quality shoes for men, women, and kids with styles for workouts to evenings out.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    hours: {
      monday: '10:00 AM - 9:00 PM', tuesday: '10:00 AM - 9:00 PM', wednesday: '10:00 AM - 9:00 PM',
      thursday: '10:00 AM - 9:00 PM', friday: '10:00 AM - 10:00 PM', saturday: '10:00 AM - 10:00 PM', sunday: '11:00 AM - 6:00 PM'
    }
  },
  {
    store_id: 's3',
    name: 'Sporty',
    description: 'Your destination for swimsuits, gym wear, and fitness equipment.',
    image: 'https://images.unsplash.com/photo-1518459031867-a89b944bffe4?auto=format&fit=crop&w=1200&q=80',
    hours: {
      monday: '7:00 AM - 9:00 PM', tuesday: '7:00 AM - 9:00 PM', wednesday: '7:00 AM - 9:00 PM',
      thursday: '7:00 AM - 9:00 PM', friday: '7:00 AM - 9:00 PM', saturday: '8:00 AM - 8:00 PM', sunday: '8:00 AM - 6:00 PM'
    }
  },
  {
    store_id: 's4',
    name: 'Gamer’s Stop',
    description: 'The ultimate stop for gaming clothing and premium gaming accessories.',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    hours: {
      monday: '11:00 AM - 9:00 PM', tuesday: '11:00 AM - 9:00 PM', wednesday: '11:00 AM - 9:00 PM',
      thursday: '11:00 AM - 9:00 PM', friday: '11:00 AM - 11:00 PM', saturday: '10:00 AM - 11:00 PM', sunday: '10:00 AM - 7:00 PM'
    }
  },
  {
    store_id: 's5',
    name: 'Jersey for Life',
    description: 'Authentic sports jerseys from football, basketball, baseball, and hockey.',
    image: '/jersey.png',
    hours: {
      monday: '9:00 AM - 8:00 PM', tuesday: '9:00 AM - 8:00 PM', wednesday: '9:00 AM - 8:00 PM',
      thursday: '9:00 AM - 8:00 PM', friday: '9:00 AM - 9:00 PM', saturday: '9:00 AM - 9:00 PM', sunday: '10:00 AM - 5:00 PM'
    }
  },
  {
    store_id: 's6',
    name: 'Kiddo',
    description: 'Fun, comfortable, and stylish kids clothing and hats for everyday play.',
    image: '/kiddo.png',
    hours: {
      monday: '9:00 AM - 7:00 PM', tuesday: '9:00 AM - 7:00 PM', wednesday: '9:00 AM - 7:00 PM',
      thursday: '9:00 AM - 7:00 PM', friday: '9:00 AM - 8:00 PM', saturday: '10:00 AM - 8:00 PM', sunday: '10:00 AM - 5:00 PM'
    }
  }
];

const products = [
  {
    "id": 101,
    "store_id": "s1",
    "store_name": "Dolllister",
    "title": "Women's Top",
    "category": "tops",
    "keywords": ["women tops", "ladies tops", "tops"],
    "images": "https://img.hollisterco.com/is/image/anf/KIC_352-6037-00382-610_prod1?policy=product-extra-large",
    "price": 29.95,
    "quantity": 25,
    "description": "Refresh your wardrobe with a women’s top designed for a flattering fit and all-day comfort—easy to style, easy to love.",
    "is_featured": true,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 102,
    "store_id": "s1",
    "store_name": "Dolllister",
    "title": "Men's Top",
    "category": "tops",
    "keywords": ["men tops", "tops"],
    "images": "https://img.hollisterco.com/is/image/anf/KIC_324-6080-00476-210_prod1?policy=product-large",
    "price": 34.95,
    "quantity": 18,
    "description": "Upgrade your everyday rotation with a men’s tee or casual shirt—clean, versatile styles with a comfortable feel.",
    "is_featured": false,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 103,
    "store_id": "s1",
    "store_name": "Dolllister",
    "title": "Women's Bottom",
    "category": "bottoms",
    "keywords": ["women bottoms", "ladies bottoms", "bottoms"],
    "images": "https://img.hollisterco.com/is/image/anf/KIC_347-6055-00357-610_prod1?policy=product-extra-large",
    "price": 49.95,
    "quantity": 15,
    "description": "Find your perfect fit with a great pair of women’s jeans or trousers—comfortable, confidence-boosting styles made to wear on repeat.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 104,
    "store_id": "s1",
    "store_name": "Dolllister",
    "title": "Men's Bottom",
    "category": "bottoms",
    "keywords": ["men bottom", "bottoms"],
    "images": "https://img.hollisterco.com/is/image/anf/KIC_313-5013-00090-110_prod1?policy=product-extra-large",
    "price": 54.95,
    "quantity": 20,
    "description": "A men’s bottom built for comfort and durability—classic styles that pair effortlessly with your favourite tops.",
    "is_featured": false,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 105,
    "store_id": "s1",
    "store_name": "Dolllister",
    "title": "Women's Dress",
    "category": "dresses",
    "keywords": ["women dresses", "ladies dresses", "dresses"],
    "images": "https://img.hollisterco.com/is/image/anf/KIC_359-6021-00357-601_prod1?policy=product-large",
    "price": 44.95,
    "quantity": 12,
    "description": "Make a statement with a dressy women’s dress featuring a polished, feminine finish—perfect when you want to stand out.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 201,
    "store_id": "s2",
    "store_name": "Tikes",
    "title": "Children Shoe",
    "category": "shoes",
    "keywords": ["sports shoes", "gym shoes", "running shoes", "sneakers", "childrens shoes"],
    "images": "https://assets.designerbrands.com/match/Site_Name/897102125_160_ss_01/?quality=85&io=transform:fit,width:1280",
    "price": 39.99,
    "quantity": 30,
    "description": "Active kids need comfy shoes—with an everyday sneaker that is lightweight, supportive, and ready for nonstop play.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 202,
    "store_id": "s2",
    "store_name": "Tikes",
    "title": "Women's Sports Shoe",
    "category": "shoes",
    "keywords": ["sports shoes women", "gym shoes", "women shoes"],
    "images": "https://assets.designerbrands.com/match/Site_Name/199681236_660_ss_05/?quality=85&io=transform:fit,width:1280",
    "price": 65.00,
    "quantity": 10,
    "description": "Power your training with a women’s athletic shoe that delivers support, cushioning, and a secure fit step after step.",
    "is_featured": false,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 203,
    "store_id": "s2",
    "store_name": "Tikes",
    "title": "Women's Evening Shoe",
    "category": "shoes",
    "keywords": ["running shoes", "gym shoes", "women running shoes"],
    "images": "https://assets.designerbrands.com/match/Site_Name/112381634_320_ss_01/?quality=85&io=transform:fit,width:1280",
    "price": 85.00,
    "quantity": 8,
    "description": "Add instant elegance with a women’s evening shoe—sleek, stylish options that elevate any outfit.",
    "is_featured": true,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 204,
    "store_id": "s2",
    "store_name": "Tikes",
    "title": "Men's Sports Shoe",
    "category": "shoes",
    "keywords": ["sports shoes", "gym shoes", "men shoes", "sneakers", "running shoes"],
    "images": "https://assets.designerbrands.com/match/Site_Name/236112175_110_ss_01/?quality=85&io=transform:fit,width:1280",
    "price": 70.00,
    "quantity": 14,
    "description": "A men’s sports shoe made for performance and comfort—great support for training, walking, and daily wear.",
    "is_featured": false,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 205,
    "store_id": "s2",
    "store_name": "Tikes",
    "title": "Men's Evening Shoe",
    "category": "shoes",
    "keywords": ["running shoes", "gym shoes", "men running shoes"],
    "images": "https://assets.designerbrands.com/match/Site_Name/214101408_120_ss_01/?quality=85&io=transform:fit,width:1280",
    "price": 95.00,
    "quantity": 5,
    "description": "Finish your look with a men’s dress shoe featuring a sharp, sophisticated style—ideal for formal outfits.",
    "is_featured": true,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 301,
    "store_id": "s3",
    "store_name": "Sporty",
    "title": "Women’s Swimsuit",
    "category": "swimsuits",
    "keywords": ["swim wear", "swimsuits", "women beach wear"],
    "images": "https://s7d2.scene7.com/is/image/aeo/0751_6358_368_f?$pdp-mdg-opt$&fmt=webp",
    "price": 35.50,
    "quantity": 22,
    "description": "Feel confident in women’s swimwear with flattering cuts and comfortable coverage—made for pool days and beach getaways.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 302,
    "store_id": "s3",
    "store_name": "Sporty",
    "title": "Men’s Swimsuit",
    "category": "swimsuits",
    "keywords": ["swim wear", "swimsuits", "men beach wear"],
    "images": "https://img.abercrombie.com/is/image/anf/KIC_133-6054-00246-229_prod1?policy=product-medium",
    "price": 30.00,
    "quantity": 25,
    "description": "A men’s swim trunk with a comfortable fit—built for swimming, lounging, and warm-weather style.",
    "is_featured": false,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 303,
    "store_id": "s3",
    "store_name": "Sporty",
    "title": "Women’s workout wear",
    "category": "sportswear",
    "keywords": ["gym wear", "fitness", "women workout clothes"],
    "images": "https://assets.aritzia.com/image/upload/c_crop,ar_1920:2623,g_south/q_auto,f_auto,dpr_auto/f25_a06_124704_30193_off_a",
    "price": 45.00,
    "quantity": 40,
    "description": "Women’s workout wear designed to move with you—breathable, comfortable pieces for training, stretching, and active days.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 304,
    "store_id": "s3",
    "store_name": "Sporty",
    "title": "Men's Workout Clothes",
    "category": "sportswear",
    "keywords": ["gym wear", "fitness", "men workout clothes"],
    "images": "https://img.abercrombie.com/is/image/anf/KIC_116-6007-00096-105_prod1?policy=product-medium",
    "price": 40.00,
    "quantity": 35,
    "description": "Men’s performance workout clothes with a comfortable fit—built to handle tough sessions and keep you moving.",
    "is_featured": false,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 305,
    "store_id": "s3",
    "store_name": "Sporty",
    "title": "Basketball",
    "category": "equipment",
    "keywords": ["fitness equipments", "equipments"],
    "images": "https://contents.mediadecathlon.com/p2480641/k$755502e0123e983c81a684ad5f32e6bc/picture.jpg?format=auto",
    "price": 120.00,
    "quantity": 5,
    "description": "Build your home workout setup with a classic basketball—great for strength training, conditioning, and daily routines.",
    "is_featured": true,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 401,
    "store_id": "s4",
    "store_name": "Gamer’s Stop",
    "title": "T-shirt",
    "category": "t-shirts",
    "keywords": ["shirts", "t-shirts", "mens tshirt"],
    "images": "https://media.gamestop.com/i/gamestop/20023776/Fallout-New-Vegas-Unisex-Short-Sleeve-Graphic-T-Shirt-GameStop-Exclusive?w=1256&h=664&fmt=auto",
    "price": 19.99,
    "quantity": 50,
    "description": "Show off your fandom with a bold graphic gaming tee—comfortable, eye-catching styles you’ll want to wear everywhere.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 402,
    "store_id": "s4",
    "store_name": "Gamer’s Stop",
    "title": "Sock",
    "category": "socks",
    "keywords": ["socks", "mens socks", "womens socks"],
    "images": "https://media.gamestop.com/i/gamestop/20005334?w=1256&h=664&fmt=auto",
    "price": 9.99,
    "quantity": 100,
    "description": "Level up your sock drawer with a fun themed design—soft, comfortable, and perfect for everyday wear.",
    "is_featured": false,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 403,
    "store_id": "s4",
    "store_name": "Gamer’s Stop",
    "title": "Scarf",
    "category": "scarfs",
    "keywords": ["scarfs", "womens scarfs", "mens scarfs", "children scarfs"],
    "images": "https://i5.walmartimages.com/asr/a911d271-644d-4b64-803b-9b2d17801583.6498fc301f46b40bb23416a55869737e.jpeg?odnHeight=640&odnWidth=640&odnBg=FFFFFF",
    "price": 15.00,
    "quantity": 20,
    "description": "Stay warm in style with a cozy scarf made for comfort—an easy finishing touch for cold-weather outfits.",
    "is_featured": false,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 404,
    "store_id": "s4",
    "store_name": "Gamer’s Stop",
    "title": "Hat",
    "category": "hats",
    "keywords": ["hats", "womens hats", "mens hats", "children hats"],
    "images": "https://media.gamestop.com/i/gamestop/20014306/Super-Mario-Bros-Mario-Cosplay-Hat?w=1256&h=664&fmt=auto",
    "price": 25.00,
    "quantity": 15,
    "description": "An iconic cosplay-inspired hat that turns heads—perfect for fans, costumes, and standout street style.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 405,
    "store_id": "s4",
    "store_name": "Gamer’s Stop",
    "title": "Mario Cube Keychain",
    "category": "accessories",
    "keywords": ["gaming", "accessories"],
    "images": "https://media.gamestop.com/i/gamestop/20020060/Super-Mario-Bros-Question-Block-3D-Rubber-Keychain?w=1256&h=664&fmt=auto",
    "price": 12.00,
    "quantity": 60,
    "description": "Collectible Mario Cube Keychain—perfect for customizing bags, keys, and display setups.",
    "is_featured": true,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 501,
    "store_id": "s5",
    "store_name": "Jersey for Life",
    "title": "Soccer Jersey",
    "category": "jerseys",
    "keywords": ["soccer jersey", "football jersey"],
    "images": "https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/f54b24394dfd494d9bab2bdc5d3703e8_9366/Toronto_FC_25-26_Home_Authentic_Jersey_Red_JJ3896_01_laydown.jpg",
    "price": 89.99,
    "quantity": 25,
    "description": "Authentic-style soccer jersey with a bold team look—perfect for fans who want game-day energy.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 502,
    "store_id": "s5",
    "store_name": "Jersey for Life",
    "title": "Basketball Jersey",
    "category": "jerseys",
    "keywords": ["basketball jersey", "jersey"],
    "images": "https://m.media-amazon.com/images/I/81FRZ3d6PdL._AC_UY1000_.jpg",
    "price": 75.00,
    "quantity": 15,
    "description": "Basketball jersey with a classic court-inspired style—great for fans, collectors, and sporty streetwear looks.",
    "is_featured": false,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 503,
    "store_id": "s5",
    "store_name": "Jersey for Life",
    "title": "Baseball Jersey",
    "category": "jerseys",
    "keywords": ["baseball jersey", "jersey"],
    "images": "https://m.media-amazon.com/images/I/81zsV4keQoS._AC_UF894,1000_QL80_.jpg",
    "price": 80.00,
    "quantity": 12,
    "description": "Baseball jersey with a timeless look—classic style that’s perfect for fans and casual outfits.",
    "is_featured": false,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 504,
    "store_id": "s5",
    "store_name": "Jersey for Life",
    "title": "Hockey Jersey",
    "category": "jerseys",
    "keywords": ["hockey jersey", "ice hockey jersey"],
    "images": "https://shop.realsports.ca/cdn/shop/products/YTH-ADI-LF-jersey-front_5d7c12c9-10b9-436f-adfc-ce2161525393.jpg?v=1504126234",
    "price": 110.00,
    "quantity": 10,
    "description": "Premium hockey jersey with a bold, authentic look—built for true fans and standout team style.",
    "is_featured": true,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 505,
    "store_id": "s5",
    "store_name": "Jersey for Life",
    "title": "Cricket Jersey",
    "category": "jerseys",
    "keywords": ["cricket jersey", "jersey"],
    "images": "https://www.montrealcricketstore.com/images/thumbs/0009006_team-india-t20-shirt-2022-replica_600.png",
    "price": 65.00,
    "quantity": 18,
    "description": "Lightweight, breathable cricket jersey designed for comfort—perfect for players and proud supporters.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 601,
    "store_id": "s6",
    "store_name": "Kiddo",
    "title": "Boy's Top",
    "category": "tops",
    "keywords": ["kids tops", "boys clothing", "boys tops"],
    "images": "https://i5.walmartimages.com/asr/b88717d8-fdda-4f7b-b4bd-7e3eaf0a2938.dec019aa22b5c280f9e4649cab09f97b.jpeg",
    "price": 14.99,
    "quantity": 45,
    "description": "A boys’ top made for comfort and easy style—soft, fun, and ready for everyday wear.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 602,
    "store_id": "s6",
    "store_name": "Kiddo",
    "title": "Boy's Bottom",
    "category": "bottoms",
    "keywords": ["kids bottoms", "boys clothing", "boys bottoms"],
    "images": "https://mdtextile.com/wp-content/uploads/2023/08/MD-TEXTILE-Kids-Short-Pants-100-Cotton-%E2%80%93-Royal-Blue.jpg",
    "price": 18.00,
    "quantity": 40,
    "description": "A pair of boys’ pants or shorts built to last—durable, comfortable essentials for active days.",
    "is_featured": false,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 603,
    "store_id": "s6",
    "store_name": "Kiddo",
    "title": "Girl's Top",
    "category": "tops",
    "keywords": ["kids tops", "girl clothing", "girls tops"],
    "images": "https://i5.walmartimages.com/asr/59be4bf2-5c33-4edd-bea1-4d96448c2977.fb827d6a13040fe6cd3d1592fc29bb7b.jpeg?odnHeight=2000&odnWidth=2000&odnBg=FFFFFF",
    "price": 14.99,
    "quantity": 45,
    "description": "A girls’ top with a soft feel and cute style—easy to match and made for everyday comfort.",
    "is_featured": true,
    "is_best_seller": true,
    "__v": 0
  },
  {
    "id": 604,
    "store_id": "s6",
    "store_name": "Kiddo",
    "title": "Girl's Bottom",
    "category": "bottoms",
    "keywords": ["kids bottoms", "girl clothing", "girls bottoms"],
    "images": "https://assets.theplace.com/image/upload/d_pdp_img_d,f_auto,q_auto/v1/ecom/assets/products/gym/3031244/3031244_32PP.png",
    "price": 18.00,
    "quantity": 38,
    "description": "A pair of girls’ leggings or skirt designed for comfort and movement—easy favourites for any outfit.",
    "is_featured": false,
    "is_best_seller": false,
    "__v": 0
  },
  {
    "id": 605,
    "store_id": "s6",
    "store_name": "Kiddo",
    "title": "Hat",
    "category": "hays",
    "keywords": ["kids hats", "girls hats", "boys hats"],
    "images": "https://i5.walmartimages.com/asr/346edeb4-70e0-4e16-bd51-8d1fb0478418.d85ec834a13bc88b211521f1a40ec026.jpeg",
    "price": 12.00,
    "quantity": 25,
    "description": "A kids’ hat that looks great and feel comfortable—perfect for everyday protection and easy style.",
    "is_featured": false,
    "is_best_seller": true,
    "__v": 0
  }
];

/**
 * Core Client Function: seedDatabase
 * Standardizes layout handling and logical rendering parameters natively.
 */
async function seedDatabase() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/Grazers');
    console.log("Connected to MongoDB...");

    for (const p of products) {
      await Product.findOneAndUpdate(
        { id: p.id }, p,             {
          upsert: true,
          new: true,
          runValidators: true
        }
      );
    }

    const usersDb = await mongoose.createConnection('mongodb://127.0.0.1:27017/Users');
    const ShopModel = usersDb.model('Shop', Shop.schema);
    
    console.log("Connected to MongoDB Users DB to update shops...");
    for (const shop of shopsToSeed) {
      await ShopModel.findOneAndUpdate(
        { store_id: shop.store_id },
        shop,
        { upsert: true, new: true, runValidators: true }
      );
    }
    console.log(`Successfully perfectly synchronized ${shopsToSeed.length} shops!`);
    
    await usersDb.close();
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Error populating database:", error);
    process.exit(1);
  }
}

seedDatabase();