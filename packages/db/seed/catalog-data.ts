/** Seed catalog — main Egyptian grocery categories + everyday items (EN/AR). */

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&auto=format&fit=crop&q=60`;

export type SeedCategory = {
  slug: string;
  en: string;
  ar: string;
  sortOrder: number;
  imageUrl?: string;
};

export type SeedItem = {
  categorySlug: string;
  en: string;
  ar: string;
  unit: "piece" | "kg" | "gram" | "liter" | "pack";
  imageUrl?: string;
};

export const seedCategories: SeedCategory[] = [
  { slug: "groceries",     en: "Groceries",         ar: "بقالة",               sortOrder: 1,  imageUrl: U("1542838132-92c53300491e") },
  { slug: "vegetables",    en: "Vegetables",         ar: "خضار",                sortOrder: 2,  imageUrl: U("1518977956812-cd3dbadaaf31") },
  { slug: "fruits",        en: "Fruits",             ar: "فاكهة",               sortOrder: 3,  imageUrl: U("1619566636858-adf3ef46400b") },
  { slug: "dairy-eggs",    en: "Dairy & Eggs",       ar: "ألبان وبيض",          sortOrder: 4,  imageUrl: U("1550583724-b2692b85b150") },
  { slug: "bakery",        en: "Bakery",             ar: "مخبوزات",             sortOrder: 5,  imageUrl: U("1509440159596-0249088772ff") },
  { slug: "meat",          en: "Meat",               ar: "لحوم",                sortOrder: 6,  imageUrl: U("1607623814075-e51df1bdc82f") },
  { slug: "poultry",       en: "Poultry",            ar: "دواجن",               sortOrder: 7,  imageUrl: U("1604503468506-a8da13d82791") },
  { slug: "fish",          en: "Fish & Seafood",     ar: "أسماك",               sortOrder: 8,  imageUrl: U("1570042225831-d98fa7577f1e") },
  { slug: "beverages",     en: "Beverages",          ar: "مشروبات",             sortOrder: 9,  imageUrl: U("1544145945-f90425340c7e") },
  { slug: "snacks",        en: "Snacks & Sweets",    ar: "سناكس وحلويات",       sortOrder: 10, imageUrl: U("1566478989037-eec170784d0b") },
  { slug: "canned-frozen", en: "Canned & Frozen",    ar: "معلبات ومجمدات",      sortOrder: 11, imageUrl: U("1584473457406-6240486418e9") },
  { slug: "cleaning",      en: "Cleaning Supplies",  ar: "منظفات",              sortOrder: 12, imageUrl: U("1563453392212-326f5e854473") },
  { slug: "personal-care", en: "Personal Care",      ar: "عناية شخصية",         sortOrder: 13, imageUrl: U("1571781926291-c477ebfd024b") },
  { slug: "baby",          en: "Baby Care",          ar: "مستلزمات أطفال",      sortOrder: 14, imageUrl: U("1515488042361-ee00e0ddd4e4") },
];

export const seedItems: SeedItem[] = [
  // Groceries
  { categorySlug: "groceries", en: "Sugar",        ar: "سكر",               unit: "kg",    imageUrl: U("1589367920969-ab8e050bbb04") },
  { categorySlug: "groceries", en: "Rice",         ar: "أرز",               unit: "kg",    imageUrl: U("1536304993831-9b45fc4f7f90") },
  { categorySlug: "groceries", en: "Pasta",        ar: "مكرونة",            unit: "pack",  imageUrl: U("1551462147-ff29053bfc14") },
  { categorySlug: "groceries", en: "Vermicelli",   ar: "شعرية",             unit: "pack",  imageUrl: U("1551462147-ff29053bfc14") },
  { categorySlug: "groceries", en: "White Flour",  ar: "دقيق أبيض",         unit: "kg",    imageUrl: U("1559329007-7f2d4c17e9ae") },
  { categorySlug: "groceries", en: "Sunflower Oil",ar: "زيت عباد الشمس",    unit: "liter", imageUrl: U("1474979266404-7eaacbcd87c5") },
  { categorySlug: "groceries", en: "Corn Oil",     ar: "زيت ذرة",           unit: "liter", imageUrl: U("1474979266404-7eaacbcd87c5") },
  { categorySlug: "groceries", en: "Olive Oil",    ar: "زيت زيتون",         unit: "liter", imageUrl: U("1474979266404-7eaacbcd87c5") },
  { categorySlug: "groceries", en: "Ghee",         ar: "سمنة",              unit: "kg",    imageUrl: U("1563865436668-30b5a7d8e8a6") },
  { categorySlug: "groceries", en: "Black Tea",    ar: "شاي أسود",          unit: "pack",  imageUrl: U("1571934811356-5cc061b6821f") },
  { categorySlug: "groceries", en: "Coffee",       ar: "قهوة",              unit: "pack",  imageUrl: U("1495474472287-4d71bcdd2085") },
  { categorySlug: "groceries", en: "Table Salt",   ar: "ملح طعام",          unit: "pack",  imageUrl: U("1536416618370-a9fe4c74b4b3") },
  { categorySlug: "groceries", en: "Black Pepper", ar: "فلفل أسود",         unit: "gram",  imageUrl: U("1599909341091-48c5bcce25c6") },
  { categorySlug: "groceries", en: "Cumin",        ar: "كمون",              unit: "gram",  imageUrl: U("1599909341091-48c5bcce25c6") },
  { categorySlug: "groceries", en: "Lentils",      ar: "عدس",               unit: "kg",    imageUrl: U("1559648390-1e4e3e7e3a92") },
  { categorySlug: "groceries", en: "Fava Beans",   ar: "فول",               unit: "kg",    imageUrl: U("1559648390-1e4e3e7e3a92") },
  { categorySlug: "groceries", en: "Chickpeas",    ar: "حمص",               unit: "kg",    imageUrl: U("1593813617-debb46564752") },
  { categorySlug: "groceries", en: "White Beans",  ar: "فاصوليا بيضاء",     unit: "kg",    imageUrl: U("1559648390-1e4e3e7e3a92") },
  { categorySlug: "groceries", en: "Tomato Paste", ar: "صلصة طماطم",        unit: "piece", imageUrl: U("1558818373-be2d78a8e43f") },
  { categorySlug: "groceries", en: "White Vinegar",ar: "خل أبيض",           unit: "piece", imageUrl: U("1532372576444-dda954194ad0") },

  // Vegetables
  { categorySlug: "vegetables", en: "Tomatoes",      ar: "طماطم",            unit: "kg",    imageUrl: U("1558818373-be2d78a8e43f") },
  { categorySlug: "vegetables", en: "Potatoes",      ar: "بطاطس",            unit: "kg",    imageUrl: U("1518977676865-e5267dd927a8") },
  { categorySlug: "vegetables", en: "Onions",        ar: "بصل",              unit: "kg",    imageUrl: U("1618512496125-7f8a4a6e3d31") },
  { categorySlug: "vegetables", en: "Garlic",        ar: "ثوم",              unit: "kg",    imageUrl: U("1548047452-ee2b2f55c4af") },
  { categorySlug: "vegetables", en: "Cucumbers",     ar: "خيار",             unit: "kg",    imageUrl: U("1568584711271-3d9d3e5c8e75") },
  { categorySlug: "vegetables", en: "Carrots",       ar: "جزر",              unit: "kg",    imageUrl: U("1598170845058-32b9d6a5da37") },
  { categorySlug: "vegetables", en: "Zucchini",      ar: "كوسة",             unit: "kg",    imageUrl: U("1562517742-ac5b4cbf3c73") },
  { categorySlug: "vegetables", en: "Eggplant",      ar: "باذنجان",          unit: "kg",    imageUrl: U("1563565652-a90b9e9d3be8") },
  { categorySlug: "vegetables", en: "Green Peppers", ar: "فلفل أخضر",        unit: "kg",    imageUrl: U("1563565652-a90b9e9d3be8") },
  { categorySlug: "vegetables", en: "Okra",          ar: "بامية",            unit: "kg",    imageUrl: U("1617482832513-8e77c1b26b12") },
  { categorySlug: "vegetables", en: "Molokhia",      ar: "ملوخية",           unit: "kg",    imageUrl: U("1576045057995-568f588f82fb") },
  { categorySlug: "vegetables", en: "Spinach",       ar: "سبانخ",            unit: "kg",    imageUrl: U("1576045057995-568f588f82fb") },
  { categorySlug: "vegetables", en: "Lettuce",       ar: "خس",               unit: "piece", imageUrl: U("1598030343241-8b6e2a2be7c7") },
  { categorySlug: "vegetables", en: "Cabbage",       ar: "كرنب",             unit: "piece", imageUrl: U("1506807803488-8eafc15316c7") },
  { categorySlug: "vegetables", en: "Cauliflower",   ar: "قرنبيط",           unit: "piece", imageUrl: U("1512621776951-a57141f2eefd") },
  { categorySlug: "vegetables", en: "Green Beans",   ar: "فاصوليا خضراء",    unit: "kg",    imageUrl: U("1601352453442-54f3e8e0be44") },
  { categorySlug: "vegetables", en: "Peas",          ar: "بسلة",             unit: "kg",    imageUrl: U("1548041148-fdbe9242f0be") },
  { categorySlug: "vegetables", en: "Lemons",        ar: "ليمون",            unit: "kg",    imageUrl: U("1587334274328-64186a80aeee") },
  { categorySlug: "vegetables", en: "Parsley",       ar: "بقدونس",           unit: "piece", imageUrl: U("1564149504-f5edd3bdb5d8") },
  { categorySlug: "vegetables", en: "Coriander",     ar: "كزبرة",            unit: "piece", imageUrl: U("1564149504-f5edd3bdb5d8") },
  { categorySlug: "vegetables", en: "Dill",          ar: "شبت",              unit: "piece", imageUrl: U("1564149504-f5edd3bdb5d8") },

  // Fruits
  { categorySlug: "fruits", en: "Bananas",      ar: "موز",       unit: "kg",    imageUrl: U("1571771894821-ce9b6c11b08e") },
  { categorySlug: "fruits", en: "Apples",       ar: "تفاح",      unit: "kg",    imageUrl: U("1560806887-1e4cd0b6cbd6") },
  { categorySlug: "fruits", en: "Oranges",      ar: "برتقال",    unit: "kg",    imageUrl: U("1547514701-42782101795e") },
  { categorySlug: "fruits", en: "Tangerines",   ar: "يوسفي",     unit: "kg",    imageUrl: U("1547514701-42782101795e") },
  { categorySlug: "fruits", en: "Grapes",       ar: "عنب",       unit: "kg",    imageUrl: U("1537640538966-79f369143f8f") },
  { categorySlug: "fruits", en: "Watermelon",   ar: "بطيخ",      unit: "piece", imageUrl: U("1589927986089-35812388d1f4") },
  { categorySlug: "fruits", en: "Cantaloupe",   ar: "كانتالوب",  unit: "piece", imageUrl: U("1589927986089-35812388d1f4") },
  { categorySlug: "fruits", en: "Mangoes",      ar: "مانجو",     unit: "kg",    imageUrl: U("1553279768-865429fa0078") },
  { categorySlug: "fruits", en: "Guava",        ar: "جوافة",     unit: "kg",    imageUrl: U("1619566636858-adf3ef46400b") },
  { categorySlug: "fruits", en: "Strawberries", ar: "فراولة",    unit: "kg",    imageUrl: U("1464965911861-746a04b4bca6") },
  { categorySlug: "fruits", en: "Dates",        ar: "بلح",       unit: "kg",    imageUrl: U("1571154996090-70b2f92b3a3f") },
  { categorySlug: "fruits", en: "Pomegranate",  ar: "رمان",      unit: "kg",    imageUrl: U("1549298222-6b99ce5adc97") },

  // Dairy & Eggs
  { categorySlug: "dairy-eggs", en: "Milk",         ar: "لبن",          unit: "liter", imageUrl: U("1550583724-b2692b85b150") },
  { categorySlug: "dairy-eggs", en: "Eggs",         ar: "بيض",          unit: "pack",  imageUrl: U("1582722872445-44dc5f7e3c8f") },
  { categorySlug: "dairy-eggs", en: "White Cheese", ar: "جبنة بيضاء",   unit: "kg",    imageUrl: U("1486297745267-1018e685d4c7") },
  { categorySlug: "dairy-eggs", en: "Roumy Cheese", ar: "جبنة رومي",    unit: "kg",    imageUrl: U("1486297745267-1018e685d4c7") },
  { categorySlug: "dairy-eggs", en: "Mozzarella",   ar: "موتزاريلا",    unit: "gram",  imageUrl: U("1486297745267-1018e685d4c7") },
  { categorySlug: "dairy-eggs", en: "Cream Cheese", ar: "جبنة كريمي",   unit: "piece", imageUrl: U("1486297745267-1018e685d4c7") },
  { categorySlug: "dairy-eggs", en: "Yogurt",       ar: "زبادي",        unit: "piece", imageUrl: U("1571748982800-fa51082c2224") },
  { categorySlug: "dairy-eggs", en: "Butter",       ar: "زبدة",         unit: "gram",  imageUrl: U("1589985024645-c9679a0e3c1d") },
  { categorySlug: "dairy-eggs", en: "Cream",        ar: "قشطة",         unit: "piece", imageUrl: U("1579697208326-b82be5a8c82b") },

  // Bakery
  { categorySlug: "bakery", en: "Baladi Bread",  ar: "عيش بلدي",  unit: "piece", imageUrl: U("1509440159596-0249088772ff") },
  { categorySlug: "bakery", en: "Fino Bread",    ar: "عيش فينو",  unit: "piece", imageUrl: U("1509440159596-0249088772ff") },
  { categorySlug: "bakery", en: "Toast Bread",   ar: "توست",      unit: "pack",  imageUrl: U("1509440159596-0249088772ff") },
  { categorySlug: "bakery", en: "Croissant",     ar: "كرواسون",   unit: "piece", imageUrl: U("1555507036-ab794f3d5cac") },
  { categorySlug: "bakery", en: "Breadsticks",   ar: "بقسماط",    unit: "pack",  imageUrl: U("1509440159596-0249088772ff") },

  // Meat
  { categorySlug: "meat", en: "Minced Beef", ar: "لحمة مفرومة",   unit: "kg", imageUrl: U("1607623814075-e51df1bdc82f") },
  { categorySlug: "meat", en: "Beef Cubes",  ar: "لحمة مكعبات",   unit: "kg", imageUrl: U("1607623814075-e51df1bdc82f") },
  { categorySlug: "meat", en: "Liver",       ar: "كبدة",           unit: "kg", imageUrl: U("1607623814075-e51df1bdc82f") },
  { categorySlug: "meat", en: "Sausage",     ar: "سجق",            unit: "kg", imageUrl: U("1579871494447-9e96d0ab56f4") },
  { categorySlug: "meat", en: "Lamb",        ar: "لحمة ضاني",      unit: "kg", imageUrl: U("1607623814075-e51df1bdc82f") },

  // Poultry
  { categorySlug: "poultry", en: "Whole Chicken",   ar: "فرخة كاملة",   unit: "piece", imageUrl: U("1604503468506-a8da13d82791") },
  { categorySlug: "poultry", en: "Chicken Breasts", ar: "صدور فراخ",    unit: "kg",    imageUrl: U("1604503468506-a8da13d82791") },
  { categorySlug: "poultry", en: "Chicken Thighs",  ar: "أوراك فراخ",   unit: "kg",    imageUrl: U("1604503468506-a8da13d82791") },
  { categorySlug: "poultry", en: "Chicken Wings",   ar: "أجنحة فراخ",   unit: "kg",    imageUrl: U("1604503468506-a8da13d82791") },
  { categorySlug: "poultry", en: "Turkey",          ar: "ديك رومي",     unit: "kg",    imageUrl: U("1604503468506-a8da13d82791") },

  // Fish
  { categorySlug: "fish", en: "Tilapia",     ar: "بلطي",        unit: "kg",    imageUrl: U("1570042225831-d98fa7577f1e") },
  { categorySlug: "fish", en: "Mullet",      ar: "بوري",        unit: "kg",    imageUrl: U("1570042225831-d98fa7577f1e") },
  { categorySlug: "fish", en: "Shrimp",      ar: "جمبري",       unit: "kg",    imageUrl: U("1565680018434-b513d5e5fd47") },
  { categorySlug: "fish", en: "Calamari",    ar: "كاليماري",    unit: "kg",    imageUrl: U("1565680018434-b513d5e5fd47") },
  { categorySlug: "fish", en: "Canned Tuna", ar: "تونة معلبة",  unit: "piece", imageUrl: U("1615361200341-6a02e014e4d9") },

  // Beverages
  { categorySlug: "beverages", en: "Mineral Water", ar: "مياه معدنية",   unit: "piece", imageUrl: U("1548839140-29a749e1cf4d") },
  { categorySlug: "beverages", en: "Cola",          ar: "كولا",           unit: "piece", imageUrl: U("1554866585-cd94860890b7") },
  { categorySlug: "beverages", en: "Orange Juice",  ar: "عصير برتقال",   unit: "liter", imageUrl: U("1600271886342-6ede79f24614") },
  { categorySlug: "beverages", en: "Mango Juice",   ar: "عصير مانجو",    unit: "liter", imageUrl: U("1600271886342-6ede79f24614") },
  { categorySlug: "beverages", en: "Hibiscus",      ar: "كركديه",         unit: "gram",  imageUrl: U("1571934811356-5cc061b6821f") },
  { categorySlug: "beverages", en: "Tamarind",      ar: "تمر هندي",       unit: "gram",  imageUrl: U("1571934811356-5cc061b6821f") },

  // Snacks & Sweets
  { categorySlug: "snacks", en: "Chips",     ar: "شيبسي",           unit: "piece", imageUrl: U("1566478989037-eec170784d0b") },
  { categorySlug: "snacks", en: "Biscuits",  ar: "بسكويت",          unit: "pack",  imageUrl: U("1558961363-fa8fdf82db35") },
  { categorySlug: "snacks", en: "Chocolate", ar: "شوكولاتة",        unit: "piece", imageUrl: U("1606312619070-d48b6b3c4b53") },
  { categorySlug: "snacks", en: "Halva",     ar: "حلاوة طحينية",    unit: "gram",  imageUrl: U("1620706857370-a37d040c5d20") },
  { categorySlug: "snacks", en: "Tahini",    ar: "طحينة",           unit: "piece", imageUrl: U("1620706857370-a37d040c5d20") },
  { categorySlug: "snacks", en: "Honey",     ar: "عسل نحل",         unit: "piece", imageUrl: U("1587049352846-c14e79fe5ef0") },
  { categorySlug: "snacks", en: "Jam",       ar: "مربى",            unit: "piece", imageUrl: U("1584271854559-3e4a23e10e4b") },
  { categorySlug: "snacks", en: "Peanuts",   ar: "فول سوداني",      unit: "gram",  imageUrl: U("1609170994001-1b4ff8434ae6") },

  // Canned & Frozen
  { categorySlug: "canned-frozen", en: "Frozen Mixed Vegetables", ar: "خضار مشكل مجمد",  unit: "pack",  imageUrl: U("1584473457406-6240486418e9") },
  { categorySlug: "canned-frozen", en: "Frozen Peas",             ar: "بسلة مجمدة",       unit: "pack",  imageUrl: U("1548041148-fdbe9242f0be") },
  { categorySlug: "canned-frozen", en: "Frozen Okra",             ar: "بامية مجمدة",      unit: "pack",  imageUrl: U("1617482832513-8e77c1b26b12") },
  { categorySlug: "canned-frozen", en: "Frozen Spinach",          ar: "سبانخ مجمدة",      unit: "pack",  imageUrl: U("1576045057995-568f588f82fb") },
  { categorySlug: "canned-frozen", en: "Canned Fava Beans",       ar: "فول معلب",         unit: "piece", imageUrl: U("1584473457406-6240486418e9") },
  { categorySlug: "canned-frozen", en: "Canned Corn",             ar: "ذرة معلبة",        unit: "piece", imageUrl: U("1584473457406-6240486418e9") },

  // Cleaning
  { categorySlug: "cleaning", en: "Dish Soap",          ar: "صابون مواعين",  unit: "piece", imageUrl: U("1563453392212-326f5e854473") },
  { categorySlug: "cleaning", en: "Laundry Detergent",  ar: "مسحوق غسيل",   unit: "pack",  imageUrl: U("1563453392212-326f5e854473") },
  { categorySlug: "cleaning", en: "Bleach",             ar: "كلور",          unit: "liter", imageUrl: U("1563453392212-326f5e854473") },
  { categorySlug: "cleaning", en: "Floor Cleaner",      ar: "منظف أرضيات",  unit: "liter", imageUrl: U("1563453392212-326f5e854473") },
  { categorySlug: "cleaning", en: "Sponges",            ar: "سفنج",          unit: "pack",  imageUrl: U("1563453392212-326f5e854473") },
  { categorySlug: "cleaning", en: "Garbage Bags",       ar: "أكياس قمامة",  unit: "pack",  imageUrl: U("1563453392212-326f5e854473") },
  { categorySlug: "cleaning", en: "Tissues",            ar: "مناديل",        unit: "pack",  imageUrl: U("1584316547893-c8d1b7c97b4e") },

  // Personal Care
  { categorySlug: "personal-care", en: "Shampoo",     ar: "شامبو",         unit: "piece", imageUrl: U("1571781926291-c477ebfd024b") },
  { categorySlug: "personal-care", en: "Soap",        ar: "صابون",         unit: "piece", imageUrl: U("1584305574647-0cc949a2bb9f") },
  { categorySlug: "personal-care", en: "Toothpaste",  ar: "معجون أسنان",   unit: "piece", imageUrl: U("1571781926291-c477ebfd024b") },
  { categorySlug: "personal-care", en: "Toothbrush",  ar: "فرشة أسنان",    unit: "piece", imageUrl: U("1571781926291-c477ebfd024b") },
  { categorySlug: "personal-care", en: "Deodorant",   ar: "مزيل عرق",      unit: "piece", imageUrl: U("1571781926291-c477ebfd024b") },

  // Baby
  { categorySlug: "baby", en: "Diapers",       ar: "حفاضات",        unit: "pack",  imageUrl: U("1515488042361-ee00e0ddd4e4") },
  { categorySlug: "baby", en: "Baby Formula",  ar: "لبن أطفال",     unit: "piece", imageUrl: U("1515488042361-ee00e0ddd4e4") },
  { categorySlug: "baby", en: "Baby Wipes",    ar: "مناديل مبللة",  unit: "pack",  imageUrl: U("1515488042361-ee00e0ddd4e4") },
];
