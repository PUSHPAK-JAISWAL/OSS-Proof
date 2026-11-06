// GitHub's location field is free text that the user typed. We only map it to a country when the
// text clearly names one, and every consumer labels the result "self-declared".
const COUNTRIES = [
  ['India', 'IN', ['bharat', 'mumbai', 'pune', 'bengaluru', 'bangalore', 'delhi', 'new delhi', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad', 'aurangabad', 'noida', 'gurgaon', 'gurugram', 'jaipur', 'maharashtra', 'karnataka', 'kerala']],
  ['United States', 'US', ['usa', 'u.s.', 'america', 'san francisco', 'new york', 'seattle', 'austin', 'boston', 'chicago', 'los angeles', 'california', 'texas', 'portland', 'denver', 'brooklyn', 'silicon valley']],
  ['United Kingdom', 'GB', ['uk', 'u.k.', 'england', 'scotland', 'wales', 'london', 'manchester', 'edinburgh', 'bristol', 'cambridge, uk', 'great britain']],
  ['Germany', 'DE', ['deutschland', 'berlin', 'munich', 'münchen', 'hamburg', 'frankfurt', 'cologne', 'köln']],
  ['France', 'FR', ['paris', 'lyon', 'toulouse', 'marseille', 'nantes']],
  ['Canada', 'CA', ['toronto', 'vancouver', 'montreal', 'montréal', 'ottawa', 'calgary']],
  ['Brazil', 'BR', ['brasil', 'são paulo', 'sao paulo', 'rio de janeiro', 'belo horizonte']],
  ['China', 'CN', ['beijing', 'shanghai', 'shenzhen', 'hangzhou', 'guangzhou', 'chengdu']],
  ['Japan', 'JP', ['tokyo', 'osaka', 'kyoto', 'yokohama']],
  ['South Korea', 'KR', ['korea', 'seoul', 'busan']],
  ['Australia', 'AU', ['sydney', 'melbourne', 'brisbane', 'perth', 'canberra']],
  ['Netherlands', 'NL', ['amsterdam', 'rotterdam', 'utrecht', 'the netherlands', 'holland']],
  ['Spain', 'ES', ['españa', 'madrid', 'barcelona', 'valencia']],
  ['Italy', 'IT', ['italia', 'rome', 'roma', 'milan', 'milano', 'turin']],
  ['Poland', 'PL', ['polska', 'warsaw', 'kraków', 'krakow', 'wrocław', 'wroclaw']],
  ['Russia', 'RU', ['moscow', 'saint petersburg', 'st. petersburg']],
  ['Ukraine', 'UA', ['kyiv', 'kiev', 'lviv', 'kharkiv']],
  ['Sweden', 'SE', ['stockholm', 'gothenburg', 'malmö']],
  ['Norway', 'NO', ['oslo', 'bergen']],
  ['Denmark', 'DK', ['copenhagen', 'københavn', 'aarhus']],
  ['Finland', 'FI', ['helsinki', 'tampere']],
  ['Switzerland', 'CH', ['zurich', 'zürich', 'geneva', 'basel']],
  ['Austria', 'AT', ['vienna', 'wien', 'graz']],
  ['Ireland', 'IE', ['dublin', 'cork']],
  ['Portugal', 'PT', ['lisbon', 'lisboa', 'porto']],
  ['Belgium', 'BE', ['brussels', 'antwerp', 'ghent']],
  ['Czech Republic', 'CZ', ['czechia', 'prague', 'praha', 'brno']],
  ['Turkey', 'TR', ['türkiye', 'istanbul', 'ankara', 'izmir']],
  ['Israel', 'IL', ['tel aviv', 'jerusalem', 'haifa']],
  ['Singapore', 'SG', []],
  ['Indonesia', 'ID', ['jakarta', 'bandung', 'surabaya']],
  ['Vietnam', 'VN', ['hanoi', 'ho chi minh', 'saigon', 'da nang']],
  ['Pakistan', 'PK', ['karachi', 'lahore', 'islamabad']],
  ['Bangladesh', 'BD', ['dhaka', 'chittagong']],
  ['Nigeria', 'NG', ['lagos', 'abuja']],
  ['Kenya', 'KE', ['nairobi']],
  ['South Africa', 'ZA', ['cape town', 'johannesburg', 'pretoria']],
  ['Egypt', 'EG', ['cairo', 'alexandria']],
  ['Mexico', 'MX', ['méxico', 'mexico city', 'guadalajara', 'monterrey']],
  ['Argentina', 'AR', ['buenos aires', 'córdoba, argentina']],
  ['Chile', 'CL', ['santiago']],
  ['Colombia', 'CO', ['bogotá', 'bogota', 'medellín', 'medellin']],
  ['Sri Lanka', 'LK', ['colombo']],
  ['Nepal', 'NP', ['kathmandu']],
  ['Philippines', 'PH', ['manila', 'cebu']],
  ['Thailand', 'TH', ['bangkok', 'chiang mai']],
  ['Malaysia', 'MY', ['kuala lumpur']],
  ['Taiwan', 'TW', ['taipei']],
  ['Hong Kong', 'HK', []],
  ['New Zealand', 'NZ', ['auckland', 'wellington']],
  ['Romania', 'RO', ['bucharest', 'cluj']],
  ['Greece', 'GR', ['athens', 'thessaloniki']],
  ['Hungary', 'HU', ['budapest']],
  ['Iran', 'IR', ['tehran']],
  ['United Arab Emirates', 'AE', ['uae', 'dubai', 'abu dhabi']],
  ['Saudi Arabia', 'SA', ['riyadh', 'jeddah']],
]

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const matchers = COUNTRIES.map(([name, code, aliases]) => ({
  name,
  code,
  re: new RegExp(`(^|[^\\p{L}])(${[name.toLowerCase(), ...aliases].map(escape).join('|')})($|[^\\p{L}])`, 'u'),
}))

export function countryFromLocation(location) {
  const text = String(location || '').trim().toLowerCase()
  if (!text) return { country: null, code: null }
  for (const m of matchers) {
    if (m.re.test(text)) return { country: m.name, code: m.code }
  }
  // Two-letter codes only count at the end ("Pune, IN"), never inside a word.
  const tail = text.match(/,\s*([a-z]{2})$/)
  if (tail) {
    const hit = COUNTRIES.find(([, code]) => code.toLowerCase() === tail[1])
    if (hit) return { country: hit[0], code: hit[1] }
  }
  return { country: null, code: null }
}

export const COUNTRY_NAMES = COUNTRIES.map(([name]) => name).sort()
