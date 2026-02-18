const fs = require('fs');
let db = fs.readFileSync('C:/Users/cazix/pokevault/src/types/database.ts', 'utf8');

// Update tier types to new metal tiers
db = db.replace(/"trainer" \| "gym_leader" \| "elite_four" \| "champion" \| "professor"/g, '"bronze" | "silver" | "gold" | "platinum" | "diamond"');

// Update grading_company to include new values
db = db.replace(/"psa" \| "beckett" \| "cgc"/g, '"psa" | "beckett" | "cgc" | "sgc" | "tag" | "other"');

// Make consignment_id nullable in Row
db = db.replace(
  /listings: \{\s*Row: \{[\s\S]*?consignment_id: string;/,
  (match) => match.replace('consignment_id: string;', 'consignment_id: string | null;')
);

// Add new fields to Row - after 'featured: boolean;' before 'created_at'
db = db.replace(
  /(featured: boolean;\s*\n\s*)(created_at: string;\s*\n\s*updated_at: string;\s*\n\s*\};\s*\n\s*Insert:)/,
  '$1listing_source: string;\n          contact_method: string | null;\n          contact_info: string | null;\n          $2'
);

// Make consignment_id optional in Insert
db = db.replace(
  /(Insert: \{\s*\n\s*id\?: string;\s*\n\s*)consignment_id: string;/,
  '$1consignment_id?: string | null;'
);

// Add new fields to Insert - after 'featured?: boolean;'
db = db.replace(
  /(featured\?: boolean;\s*\n\s*)(created_at\?: string;\s*\n\s*updated_at\?: string;\s*\n\s*\};\s*\n\s*Update:)/,
  '$1listing_source?: string;\n          contact_method?: string | null;\n          contact_info?: string | null;\n          $2'
);

// Add new fields to Update - after 'featured?: boolean;' before 'created_at'
db = db.replace(
  /(featured\?: boolean;\s*\n\s*)(created_at\?: string;\s*\n\s*updated_at\?: string;\s*\n\s*\};\s*\n\s*Relationships:)/,
  '$1listing_source?: string;\n          contact_method?: string | null;\n          contact_info?: string | null;\n          $2'
);

fs.writeFileSync('C:/Users/cazix/pokevault/src/types/database.ts', db);
console.log('Updated database.ts');
