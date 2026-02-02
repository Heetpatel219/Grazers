const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const Category = require('./models/Category');
const Product = require('./models/Product');

mongoose.connect('mongodb://127.0.0.1:27017/Users')
  .then(() => console.log('Connected for data'))
  .catch(err => console.error(err));


const storeData = [
  {
    name: "Dolllister",
    categories: [
      {
        name: "Women’s tops",
        products: [
          "Pink Oversized hoodie",
          "Lime Oversized hoodie",
          "Long sleeve top",
          "Baby tee",
          "Cardigan",
          "Black tube top",
          "Full zip",
          "Black Boho Cami",
          "Pink Boho Cami",
          "Babydoll top"
        ]
      },
      {
        name: "Men’s tops",
        products: [
          "Blue Crew T-Shirt",
          "Camo Crew T-Shirt",
          "White Crew T-Shirt",
          "Brown Boxy hoodie",
          "Gray Boxy hoodie",
          "Camo Boxy hoodie",
          "Long sleeve T-Shirt",
          "Sweatshirt",
          "V-neck T-Shirt",
          "Pink Crew T-Shirt"
        ]
      },
      {
        name: "Women’s bottoms",
        products: [
          "Pink Baggy Sweatpants",
          "Blue Baggy Sweatpants",
          "Black Baggy Sweatpants",
          "Lilac Bootcut sweatpants",
          "Blue Bootcut sweatpants",
          "Gray Bootcut sweatpants",
          "Mini Skort",
          "Black shorts",
          "Blue shorts",
          "Foldover pants"
        ]
      },
      {
        name: "Men’s bottoms",
        products: [
          "Gray Lounge pants",
          "Black Lounge Pants",
          "Black Track Pants",
          "Gray Striped shorts",
          "Green Striped shorts",
          "Blue Striped shorts",
          "Pink Striped Shorts",
          "Red Track pants",
          "Green Track pants",
          "Swim Trunks"
        ]
      },
      {
        name: "Women’s dresses",
        products: [
          "Pink Lace ruffle dress",
          "Floral Lace ruffle dress",
          "Blue Mini dress",
          "Floral Mini Dress",
          "Red Button dress",
          "White Button dress",
          "Red Knit dress",
          "Blue Knit dress",
          "Pink Knit dress",
          "Slimmer mini dress"
        ]
      }
    ]
  },
  {
    name: "Tikes",
    categories: [
      {
        name: "Children’s shoes (0-12)",
        products: [
          "Black Flex Snickers",
          "Gold Flex Snickers",
          "Red Winter Boots",
          "Brown Winter Boots",
          "Black Waterproof boot",
          "Ballet flat",
          "Pink Bow Boot",
          "Sneaker Boot",
          "Hiking Boot",
          "Multicolor Sandal"
        ]
      },
      {
        name: "Women’s sports shoes",
        products: [
          "Purple Running shoe",
          "Pink Running shoes",
          "Lavender Running shoe",
          "Black sneaker",
          "Mint sneaker",
          "White sneaker",
          "Tennis court sneaker",
          "Court sneaker",
          "Black and white sneaker",
          "Green sneaker"
        ]
      },
      {
        name: "Women’s evening shoes",
        products: [
          "Beige pump heel",
          "White pump heel",
          "Leopard sandal",
          "Black sandal",
          "Red sandal",
          "Stiletto heel",
          "Gold pump heel",
          "Bow heel",
          "Silver block heel",
          "Evening wide sandal"
        ]
      },
      {
        name: "Men’s sports shoes",
        products: [
          "Square sneaker",
          "Gray sneaker",
          "Black Slip on sneaker",
          "Gray slip on sneaker",
          "Dark brown sneaker",
          "Black chunky sneaker",
          "Brown chunky sneaker",
          "Grey mix sneaker",
          "Blue running shoe",
          "Blue basketball shoe"
        ]
      },
      {
        name: "Men’s evening shoes",
        products: [
          "Black loafer",
          "Wide width loafer",
          "Brown dress shoe",
          "Tan dress shoe",
          "Black dress shoe",
          "Shiny dress shoe",
          "Brown business boot",
          "Black business boot",
          "Sand boot",
          "Leather wide width boot"
        ]
      }
    ]
  },

  {
    name: "Sporty",
    categories: [
      {
        name: "Women’s swimsuits",
        products: [
          "Green one piece swimsuit",
          "White mesh one piece swimsuit",
          "Black one piece swimsuit",
          "Pink one piece swimsuit",
          "Flower swim suit",
          "Green bikini top",
          "Green bikini bottom",
          "Palm string bikini top",
          "Palm bikini bottom",
          "Bright Pink one piece swimsuit"
        ]
      },
      {
        name: "Men’s swimsuits",
        products: [
          "Blue pattern swim trunk",
          "Yellow pattern swim trunk",
          "Chocolate brown swim trunk",
          "Pink pattern swim trunk",
          "Light green pattern swim trunk",
          "Pink stripe swim trunk",
          "Green Palm pattern swim trunks",
          "Black Palm pattern swim trunks",
          "Purple Palm pattern swim trunks",
          "Taupe stripped swim trunks"
        ]
      },
      {
        name: "Women’s work out clothes",
        products: [
          "Pink high rise legging",
          "Light blue high rise legging",
          "Dark blue high rise legging",
          "Black high rise legging",
          "Pink sports top",
          "Light blue sports top",
          "Brown sports top",
          "Black sports top",
          "Pink sports sweatpants",
          "Black sports sweatpants"
        ]
      },
      {
        name: "Men’s work out clothes",
        products: [
          "Gray sweatpants",
          "Black sweatpants",
          "Blue sweatpants",
          "White sweatpants",
          "Olive retro shorts",
          "Black retro shorts",
          "Green retro shorts",
          "Red retro shorts",
          "Red workout sweatshirt",
          "Black workout sweatshirt"
        ]
      },
      {
        name: "Equipment",
        products: [
          "Basketball ball",
          "Badminton set",
          "Small badminton set",
          "Beach tennis set",
          "Gray Swimming goggle",
          "Black Swimming goggle",
          "Red Swimming goggle",
          "Swimming nose clip",
          "Swimming ear plugs",
          "Microfiber towel"
        ]
      }
    ]
  },
  {
  name: "Gamer’s stop",
  categories: [
    {
      name: "T-shirts",
      products: [
        "Fallout t-shirt",
        "KPop Demon Hunters t-shirt",
        "Doom t-shirt",
        "Venom t-shirt",
        "Alien t-shirt"
      ]
    },
    {
      name: "Socks",
      products: [
        "Hello Kitty socks",
        "CultureFly Pusheen Cat socks",
        "Mario and Luigi socks",
        "Lilo and Stitch socks",
        "Pokemon socks"
      ]
    },
    {
      name: "Scarf",
      products: [
        "Bear scarf",
        "One Piece scarf",
        "Dragonball scarf",
        "Naruto scarf",
        "Jujutsu Kaisen scarf"
      ]
    },
    {
      name: "Hats",
      products: [
        "Mario hat",
        "Luigi hat",
        "Legend of Zelda hat",
        "Kirby hat",
        "Pokemon beanie"
      ]
    },
    {
      name: "Accessories",
      products: [
        "Super Mario Bros. keychain",
        "One Piece wallet",
        "Sonic the Hedgehog Pin",
        "Hello Kitty and friends pin",
        "Marvel Pin"
      ]
    }
  ]
},
{
  name: "Jersey for life",
  categories: [
    {
      name: "Soccer jersey",
      products: [
        "Toronto FC jersey",
        "Manchester United jersey",
        "Manchester City jersey",
        "Liverpool jersey",
        "Arsenal jersey"
      ]
    },
    {
      name: "Basketball jersey",
      products: [
        "Toronto Raptors jersey",
        "LA Lakers jersey",
        "Golden State Warriors jersey",
        "Boston Celtics jersey",
        "Chicago Bulls jersey",
        "Miami Heat jersey"
      ]
    },
    {
      name: "Baseball jersey",
      products: [
        "Toronto Blue Jays jersey",
        "New York Yankees jersey",
        "Boston Red Sox jersey",
        "LA Dodgers jersey",
        "Chicago Cubs jersey"
      ]
    },
    {
      name: "Hockey jersey",
      products: [
        "Toronto Maple Leafs jersey",
        "Montreal Canadiens jersey",
        "Edmonton Oilers jersey",
        "Pittsburgh Penguins jersey",
        "New York Rangers jersey"
      ]
    },
    {
      name: "Cricket jersey",
      products: [
        "India jersey",
        "Australia jersey",
        "England jersey",
        "New Zealand jersey",
        "Canada jersey"
      ]
    }
  ]
},
{
  name: "Kiddo",
  categories: [
    {
      name: "Boy tops",
      products: [
        "Dinosaur t-shirt",
        "Spider-Man hoodie",
        "Paw Patrol shirt",
        "Lego t-shirt",
        "Minecraft Creeper shirt"
      ]
    },
    {
      name: "Boy bottoms",
      products: [
        "Dinosaur shorts",
        "Denim jeans",
        "Camo pants",
        "Athletic pants",
        "Grey sweatpants"
      ]
    },
    {
      name: "Girl tops",
      products: [
        "Unicorn shirt",
        "Tie-dye hooded sweatshirt",
        "Frozen Elsa t-shirt",
        "Ruffle sleeve blouse",
        "Smiley face tank top"
      ]
    },
    {
      name: "Girl bottoms",
      products: [
        "Bike shorts",
        "Butterfly leggings",
        "Pull-on denim shorts",
        "Sequin skirt",
        "Ruffle hem capris"
      ]
    },
    {
      name: "Hats",
      products: [
        "Dinosaur baseball cap (boy)",
        "Flower sun hat (girl)",
        "Shark bucket hat (unisex)",
        "Pom pom knit beanie (girl)",
        "Trucker hat (boy)"
      ]
    }
  ]
}


];
async function storeDatabase() {
  try {
    await Shop.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    for (const store of storeData) {
      const shop = await Shop.create({
        name: store.name,
        description: `${store.name} store`
      });
      for (const categoryData of store.categories) {
        const category = await Category.create({
          name: categoryData.name,
          shop: shop._id
        });
        const products = categoryData.products.map(productName => ({
          name: productName,
          shop: shop._id,
          category: category._id,
          price: Math.floor(Math.random() * 50) + 10
        }));

        await Product.insertMany(products);
      }
    }
    process.exit();
  } catch (error) {
    process.exit(1);
  }
}

storeDatabase();

