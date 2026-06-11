/** Seed catalog — main Egyptian grocery categories + everyday items (EN/AR). */

export type SeedCategory = {
  slug: string;
  en: string;
  ar: string;
  sortOrder: number;
};

export type SeedItem = {
  categorySlug: string;
  en: string;
  ar: string;
  unit: "piece" | "kg" | "gram" | "liter" | "pack";
};

export const seedCategories: SeedCategory[] = [
  { slug: "groceries", en: "Groceries", ar: "بقالة", sortOrder: 1 },
  { slug: "vegetables", en: "Vegetables", ar: "خضار", sortOrder: 2 },
  { slug: "fruits", en: "Fruits", ar: "فاكهة", sortOrder: 3 },
  { slug: "dairy-eggs", en: "Dairy & Eggs", ar: "ألبان وبيض", sortOrder: 4 },
  { slug: "bakery", en: "Bakery", ar: "مخبوزات", sortOrder: 5 },
  { slug: "meat", en: "Meat", ar: "لحوم", sortOrder: 6 },
  { slug: "poultry", en: "Poultry", ar: "دواجن", sortOrder: 7 },
  { slug: "fish", en: "Fish & Seafood", ar: "أسماك", sortOrder: 8 },
  { slug: "beverages", en: "Beverages", ar: "مشروبات", sortOrder: 9 },
  { slug: "snacks", en: "Snacks & Sweets", ar: "سناكس وحلويات", sortOrder: 10 },
  { slug: "canned-frozen", en: "Canned & Frozen", ar: "معلبات ومجمدات", sortOrder: 11 },
  { slug: "cleaning", en: "Cleaning Supplies", ar: "منظفات", sortOrder: 12 },
  { slug: "personal-care", en: "Personal Care", ar: "عناية شخصية", sortOrder: 13 },
  { slug: "baby", en: "Baby Care", ar: "مستلزمات أطفال", sortOrder: 14 },
];

export const seedItems: SeedItem[] = [
  // Groceries
  { categorySlug: "groceries", en: "Sugar", ar: "سكر", unit: "kg" },
  { categorySlug: "groceries", en: "Rice", ar: "أرز", unit: "kg" },
  { categorySlug: "groceries", en: "Pasta", ar: "مكرونة", unit: "pack" },
  { categorySlug: "groceries", en: "Vermicelli", ar: "شعرية", unit: "pack" },
  { categorySlug: "groceries", en: "White Flour", ar: "دقيق أبيض", unit: "kg" },
  { categorySlug: "groceries", en: "Sunflower Oil", ar: "زيت عباد الشمس", unit: "liter" },
  { categorySlug: "groceries", en: "Corn Oil", ar: "زيت ذرة", unit: "liter" },
  { categorySlug: "groceries", en: "Olive Oil", ar: "زيت زيتون", unit: "liter" },
  { categorySlug: "groceries", en: "Ghee", ar: "سمنة", unit: "kg" },
  { categorySlug: "groceries", en: "Black Tea", ar: "شاي أسود", unit: "pack" },
  { categorySlug: "groceries", en: "Coffee", ar: "قهوة", unit: "pack" },
  { categorySlug: "groceries", en: "Table Salt", ar: "ملح طعام", unit: "pack" },
  { categorySlug: "groceries", en: "Black Pepper", ar: "فلفل أسود", unit: "gram" },
  { categorySlug: "groceries", en: "Cumin", ar: "كمون", unit: "gram" },
  { categorySlug: "groceries", en: "Lentils", ar: "عدس", unit: "kg" },
  { categorySlug: "groceries", en: "Fava Beans", ar: "فول", unit: "kg" },
  { categorySlug: "groceries", en: "Chickpeas", ar: "حمص", unit: "kg" },
  { categorySlug: "groceries", en: "White Beans", ar: "فاصوليا بيضاء", unit: "kg" },
  { categorySlug: "groceries", en: "Tomato Paste", ar: "صلصة طماطم", unit: "piece" },
  { categorySlug: "groceries", en: "White Vinegar", ar: "خل أبيض", unit: "piece" },

  // Vegetables
  { categorySlug: "vegetables", en: "Tomatoes", ar: "طماطم", unit: "kg" },
  { categorySlug: "vegetables", en: "Potatoes", ar: "بطاطس", unit: "kg" },
  { categorySlug: "vegetables", en: "Onions", ar: "بصل", unit: "kg" },
  { categorySlug: "vegetables", en: "Garlic", ar: "ثوم", unit: "kg" },
  { categorySlug: "vegetables", en: "Cucumbers", ar: "خيار", unit: "kg" },
  { categorySlug: "vegetables", en: "Carrots", ar: "جزر", unit: "kg" },
  { categorySlug: "vegetables", en: "Zucchini", ar: "كوسة", unit: "kg" },
  { categorySlug: "vegetables", en: "Eggplant", ar: "باذنجان", unit: "kg" },
  { categorySlug: "vegetables", en: "Green Peppers", ar: "فلفل أخضر", unit: "kg" },
  { categorySlug: "vegetables", en: "Okra", ar: "بامية", unit: "kg" },
  { categorySlug: "vegetables", en: "Molokhia", ar: "ملوخية", unit: "kg" },
  { categorySlug: "vegetables", en: "Spinach", ar: "سبانخ", unit: "kg" },
  { categorySlug: "vegetables", en: "Lettuce", ar: "خس", unit: "piece" },
  { categorySlug: "vegetables", en: "Cabbage", ar: "كرنب", unit: "piece" },
  { categorySlug: "vegetables", en: "Cauliflower", ar: "قرنبيط", unit: "piece" },
  { categorySlug: "vegetables", en: "Green Beans", ar: "فاصوليا خضراء", unit: "kg" },
  { categorySlug: "vegetables", en: "Peas", ar: "بسلة", unit: "kg" },
  { categorySlug: "vegetables", en: "Lemons", ar: "ليمون", unit: "kg" },
  { categorySlug: "vegetables", en: "Parsley", ar: "بقدونس", unit: "piece" },
  { categorySlug: "vegetables", en: "Coriander", ar: "كزبرة", unit: "piece" },
  { categorySlug: "vegetables", en: "Dill", ar: "شبت", unit: "piece" },

  // Fruits
  { categorySlug: "fruits", en: "Bananas", ar: "موز", unit: "kg" },
  { categorySlug: "fruits", en: "Apples", ar: "تفاح", unit: "kg" },
  { categorySlug: "fruits", en: "Oranges", ar: "برتقال", unit: "kg" },
  { categorySlug: "fruits", en: "Tangerines", ar: "يوسفي", unit: "kg" },
  { categorySlug: "fruits", en: "Grapes", ar: "عنب", unit: "kg" },
  { categorySlug: "fruits", en: "Watermelon", ar: "بطيخ", unit: "piece" },
  { categorySlug: "fruits", en: "Cantaloupe", ar: "كانتالوب", unit: "piece" },
  { categorySlug: "fruits", en: "Mangoes", ar: "مانجو", unit: "kg" },
  { categorySlug: "fruits", en: "Guava", ar: "جوافة", unit: "kg" },
  { categorySlug: "fruits", en: "Strawberries", ar: "فراولة", unit: "kg" },
  { categorySlug: "fruits", en: "Dates", ar: "بلح", unit: "kg" },
  { categorySlug: "fruits", en: "Pomegranate", ar: "رمان", unit: "kg" },

  // Dairy & Eggs
  { categorySlug: "dairy-eggs", en: "Milk", ar: "لبن", unit: "liter" },
  { categorySlug: "dairy-eggs", en: "Eggs", ar: "بيض", unit: "pack" },
  { categorySlug: "dairy-eggs", en: "White Cheese", ar: "جبنة بيضاء", unit: "kg" },
  { categorySlug: "dairy-eggs", en: "Roumy Cheese", ar: "جبنة رومي", unit: "kg" },
  { categorySlug: "dairy-eggs", en: "Mozzarella", ar: "موتزاريلا", unit: "gram" },
  { categorySlug: "dairy-eggs", en: "Cream Cheese", ar: "جبنة كريمي", unit: "piece" },
  { categorySlug: "dairy-eggs", en: "Yogurt", ar: "زبادي", unit: "piece" },
  { categorySlug: "dairy-eggs", en: "Butter", ar: "زبدة", unit: "gram" },
  { categorySlug: "dairy-eggs", en: "Cream", ar: "قشطة", unit: "piece" },

  // Bakery
  { categorySlug: "bakery", en: "Baladi Bread", ar: "عيش بلدي", unit: "piece" },
  { categorySlug: "bakery", en: "Fino Bread", ar: "عيش فينو", unit: "piece" },
  { categorySlug: "bakery", en: "Toast Bread", ar: "توست", unit: "pack" },
  { categorySlug: "bakery", en: "Croissant", ar: "كرواسون", unit: "piece" },
  { categorySlug: "bakery", en: "Breadsticks", ar: "بقسماط", unit: "pack" },

  // Meat
  { categorySlug: "meat", en: "Minced Beef", ar: "لحمة مفرومة", unit: "kg" },
  { categorySlug: "meat", en: "Beef Cubes", ar: "لحمة مكعبات", unit: "kg" },
  { categorySlug: "meat", en: "Liver", ar: "كبدة", unit: "kg" },
  { categorySlug: "meat", en: "Sausage", ar: "سجق", unit: "kg" },
  { categorySlug: "meat", en: "Lamb", ar: "لحمة ضاني", unit: "kg" },

  // Poultry
  { categorySlug: "poultry", en: "Whole Chicken", ar: "فرخة كاملة", unit: "piece" },
  { categorySlug: "poultry", en: "Chicken Breasts", ar: "صدور فراخ", unit: "kg" },
  { categorySlug: "poultry", en: "Chicken Thighs", ar: "أوراك فراخ", unit: "kg" },
  { categorySlug: "poultry", en: "Chicken Wings", ar: "أجنحة فراخ", unit: "kg" },
  { categorySlug: "poultry", en: "Turkey", ar: "ديك رومي", unit: "kg" },

  // Fish
  { categorySlug: "fish", en: "Tilapia", ar: "بلطي", unit: "kg" },
  { categorySlug: "fish", en: "Mullet", ar: "بوري", unit: "kg" },
  { categorySlug: "fish", en: "Shrimp", ar: "جمبري", unit: "kg" },
  { categorySlug: "fish", en: "Calamari", ar: "كاليماري", unit: "kg" },
  { categorySlug: "fish", en: "Canned Tuna", ar: "تونة معلبة", unit: "piece" },

  // Beverages
  { categorySlug: "beverages", en: "Mineral Water", ar: "مياه معدنية", unit: "piece" },
  { categorySlug: "beverages", en: "Cola", ar: "كولا", unit: "piece" },
  { categorySlug: "beverages", en: "Orange Juice", ar: "عصير برتقال", unit: "liter" },
  { categorySlug: "beverages", en: "Mango Juice", ar: "عصير مانجو", unit: "liter" },
  { categorySlug: "beverages", en: "Hibiscus", ar: "كركديه", unit: "gram" },
  { categorySlug: "beverages", en: "Tamarind", ar: "تمر هندي", unit: "gram" },

  // Snacks & Sweets
  { categorySlug: "snacks", en: "Chips", ar: "شيبسي", unit: "piece" },
  { categorySlug: "snacks", en: "Biscuits", ar: "بسكويت", unit: "pack" },
  { categorySlug: "snacks", en: "Chocolate", ar: "شوكولاتة", unit: "piece" },
  { categorySlug: "snacks", en: "Halva", ar: "حلاوة طحينية", unit: "gram" },
  { categorySlug: "snacks", en: "Tahini", ar: "طحينة", unit: "piece" },
  { categorySlug: "snacks", en: "Honey", ar: "عسل نحل", unit: "piece" },
  { categorySlug: "snacks", en: "Jam", ar: "مربى", unit: "piece" },
  { categorySlug: "snacks", en: "Peanuts", ar: "فول سوداني", unit: "gram" },

  // Canned & Frozen
  { categorySlug: "canned-frozen", en: "Frozen Mixed Vegetables", ar: "خضار مشكل مجمد", unit: "pack" },
  { categorySlug: "canned-frozen", en: "Frozen Peas", ar: "بسلة مجمدة", unit: "pack" },
  { categorySlug: "canned-frozen", en: "Frozen Okra", ar: "بامية مجمدة", unit: "pack" },
  { categorySlug: "canned-frozen", en: "Frozen Spinach", ar: "سبانخ مجمدة", unit: "pack" },
  { categorySlug: "canned-frozen", en: "Canned Fava Beans", ar: "فول معلب", unit: "piece" },
  { categorySlug: "canned-frozen", en: "Canned Corn", ar: "ذرة معلبة", unit: "piece" },

  // Cleaning
  { categorySlug: "cleaning", en: "Dish Soap", ar: "صابون مواعين", unit: "piece" },
  { categorySlug: "cleaning", en: "Laundry Detergent", ar: "مسحوق غسيل", unit: "pack" },
  { categorySlug: "cleaning", en: "Bleach", ar: "كلور", unit: "liter" },
  { categorySlug: "cleaning", en: "Floor Cleaner", ar: "منظف أرضيات", unit: "liter" },
  { categorySlug: "cleaning", en: "Sponges", ar: "سفنج", unit: "pack" },
  { categorySlug: "cleaning", en: "Garbage Bags", ar: "أكياس قمامة", unit: "pack" },
  { categorySlug: "cleaning", en: "Tissues", ar: "مناديل", unit: "pack" },

  // Personal Care
  { categorySlug: "personal-care", en: "Shampoo", ar: "شامبو", unit: "piece" },
  { categorySlug: "personal-care", en: "Soap", ar: "صابون", unit: "piece" },
  { categorySlug: "personal-care", en: "Toothpaste", ar: "معجون أسنان", unit: "piece" },
  { categorySlug: "personal-care", en: "Toothbrush", ar: "فرشة أسنان", unit: "piece" },
  { categorySlug: "personal-care", en: "Deodorant", ar: "مزيل عرق", unit: "piece" },

  // Baby
  { categorySlug: "baby", en: "Diapers", ar: "حفاضات", unit: "pack" },
  { categorySlug: "baby", en: "Baby Formula", ar: "لبن أطفال", unit: "piece" },
  { categorySlug: "baby", en: "Baby Wipes", ar: "مناديل مبللة", unit: "pack" },
];
