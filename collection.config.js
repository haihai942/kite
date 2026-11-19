// ============================================================
//  YOUR ARCHIVE STARTS HERE
//
//  This is the only file you edit in Lab 1.
//  Change the four values below, commit, and watch your
//  live site update itself.
// ============================================================

// Each field is bilingual: { en, km }. Use pick(field, language) to read the
// active language, falling back to English when a Khmer value is missing.
const collection = {
  // What does your archive collect? e.g. "Khmer Proverbs"
  name: { en: "Kite", km: "ខ្លែង" },

  // One sentence: what is this archive, and why does it matter?
  description: {
    en: "It is a fun activity that I grew up it but nowadays kids don't play it anymore. I want to preserve this activity for the future generation.",
    km: "វាជាសកម្មភាពកម្សាន្តមួយដែលខ្ញុំបានធំធាត់ជាមួយ ប៉ុន្តែសព្វថ្ងៃនេះកុមារមិនសូវលេងវាទៀតទេ។ ខ្ញុំចង់អភិរក្សសកម្មភាពនេះសម្រាប់មនុស្សជំនាន់ក្រោយ។",
  },

  // Who is building this archive? Your name, as you want it shown.
  curator: { en: "Songhai Im", km: "សុងហៃ អ៊ឺម" },

  // Where does your knowledge come from? A person, a place, a community.
  source: {
    en: "My siblings and friends.",
    km: "បងប្អូន និងមិត្តភក្តិរបស់ខ្ញុំ។",
  },
};

// Read a bilingual field for the active language, falling back to English.
export function pick(field, language) {
  if (field && typeof field === "object") {
    return field[language] || field.en || "";
  }
  return field || "";
}

export default collection;
