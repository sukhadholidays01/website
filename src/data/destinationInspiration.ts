import type { TravelMoodId } from "@/data/travelMoods";
export interface DestinationInspiration { id: string; name: string; country: string; region: string; scope: "domestic" | "international"; shortDescription: string; travelThemes: readonly TravelMoodId[]; }
export const destinationInspiration: readonly DestinationInspiration[] = [
  {
    "id": "delhi",
    "name": "Delhi",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Historic monuments, museums and neighbourhoods around India’s capital.",
    "travelThemes": [
      "heritage",
      "family",
      "weekend"
    ]
  },
  {
    "id": "agra",
    "name": "Agra",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Mughal heritage on the Yamuna, including the Taj Mahal and Agra Fort.",
    "travelThemes": [
      "heritage",
      "couple"
    ]
  },
  {
    "id": "jaipur",
    "name": "Jaipur",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Historic forts, palaces and distinctive Rajasthani architecture.",
    "travelThemes": [
      "heritage",
      "family"
    ]
  },
  {
    "id": "udaipur",
    "name": "Udaipur",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Lakes, palaces and old-city streets in Rajasthan.",
    "travelThemes": [
      "heritage",
      "couple"
    ]
  },
  {
    "id": "jodhpur",
    "name": "Jodhpur",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Mehrangarh Fort and the blue-painted streets of the old city.",
    "travelThemes": [
      "heritage"
    ]
  },
  {
    "id": "rishikesh",
    "name": "Rishikesh",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Ganga riverfront walks, yoga traditions and outdoor experiences in Uttarakhand.",
    "travelThemes": [
      "spiritual",
      "adventure",
      "wellness"
    ]
  },
  {
    "id": "haridwar",
    "name": "Haridwar",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "A pilgrimage city known for the Ganga ghats and evening rituals.",
    "travelThemes": [
      "spiritual"
    ]
  },
  {
    "id": "amritsar",
    "name": "Amritsar",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Sikh heritage, the Golden Temple and the historic city centre.",
    "travelThemes": [
      "spiritual",
      "heritage"
    ]
  },
  {
    "id": "manali",
    "name": "Manali",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "A Himalayan town in the Kullu Valley with mountain scenery and outdoor excursions.",
    "travelThemes": [
      "mountain",
      "adventure"
    ]
  },
  {
    "id": "shimla",
    "name": "Shimla",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Hillside walks and colonial-era architecture in Himachal Pradesh.",
    "travelThemes": [
      "mountain",
      "family"
    ]
  },
  {
    "id": "kashmir",
    "name": "Kashmir",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Lakes, gardens and mountain landscapes around Srinagar, Gulmarg and Pahalgam.",
    "travelThemes": [
      "mountain",
      "couple"
    ]
  },
  {
    "id": "mumbai",
    "name": "Mumbai",
    "country": "India",
    "region": "West India",
    "scope": "domestic",
    "shortDescription": "Arabian Sea waterfronts, historic architecture and diverse city neighbourhoods.",
    "travelThemes": [
      "heritage",
      "weekend"
    ]
  },
  {
    "id": "goa",
    "name": "Goa",
    "country": "India",
    "region": "West India",
    "scope": "domestic",
    "shortDescription": "Arabian Sea beaches, Portuguese-era churches and coastal villages.",
    "travelThemes": [
      "beach",
      "family"
    ]
  },
  {
    "id": "ahmedabad",
    "name": "Ahmedabad",
    "country": "India",
    "region": "West India",
    "scope": "domestic",
    "shortDescription": "Historic pols, textile traditions and architecture along the Sabarmati.",
    "travelThemes": [
      "heritage"
    ]
  },
  {
    "id": "rann-of-kutch",
    "name": "Rann of Kutch",
    "country": "India",
    "region": "West India",
    "scope": "domestic",
    "shortDescription": "A seasonal salt landscape and villages known for regional crafts in Gujarat.",
    "travelThemes": [
      "adventure",
      "heritage"
    ]
  },
  {
    "id": "kerala",
    "name": "Kerala",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Backwaters, coastlines and Western Ghats landscapes across southern India.",
    "travelThemes": [
      "family",
      "wellness"
    ]
  },
  {
    "id": "munnar",
    "name": "Munnar",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Tea plantations and rolling hills in Kerala’s Western Ghats.",
    "travelThemes": [
      "mountain",
      "couple"
    ]
  },
  {
    "id": "alleppey",
    "name": "Alleppey",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Canals, backwaters and coastal life around Alappuzha in Kerala.",
    "travelThemes": [
      "family",
      "couple"
    ]
  },
  {
    "id": "kochi",
    "name": "Kochi",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "A port city with Fort Kochi streets, waterfronts and layered trading history.",
    "travelThemes": [
      "heritage"
    ]
  },
  {
    "id": "bangalore",
    "name": "Bangalore",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Gardens, museums and neighbourhoods in Karnataka’s capital.",
    "travelThemes": [
      "family",
      "weekend"
    ]
  },
  {
    "id": "mysore",
    "name": "Mysore",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Palace architecture, markets and cultural traditions in Karnataka.",
    "travelThemes": [
      "heritage"
    ]
  },
  {
    "id": "ooty",
    "name": "Ooty",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Nilgiri hill landscapes, gardens and heritage railway journeys.",
    "travelThemes": [
      "mountain",
      "family"
    ]
  },
  {
    "id": "coorg",
    "name": "Coorg",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Coffee-growing landscapes and wooded hills in Karnataka.",
    "travelThemes": [
      "wellness",
      "adventure"
    ]
  },
  {
    "id": "hyderabad",
    "name": "Hyderabad",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Charminar, Golconda Fort and Deccan cultural heritage.",
    "travelThemes": [
      "heritage",
      "family"
    ]
  },
  {
    "id": "chennai",
    "name": "Chennai",
    "country": "India",
    "region": "South India",
    "scope": "domestic",
    "shortDescription": "Bay of Bengal beaches, temples and South Indian cultural traditions.",
    "travelThemes": [
      "heritage",
      "beach"
    ]
  },
  {
    "id": "kolkata",
    "name": "Kolkata",
    "country": "India",
    "region": "East India",
    "scope": "domestic",
    "shortDescription": "Historic neighbourhoods, museums and riverfront life beside the Hooghly.",
    "travelThemes": [
      "heritage"
    ]
  },
  {
    "id": "darjeeling",
    "name": "Darjeeling",
    "country": "India",
    "region": "East India",
    "scope": "domestic",
    "shortDescription": "Tea gardens, Himalayan views and the Darjeeling Himalayan Railway.",
    "travelThemes": [
      "mountain",
      "heritage"
    ]
  },
  {
    "id": "sikkim",
    "name": "Sikkim",
    "country": "India",
    "region": "Northeast India",
    "scope": "domestic",
    "shortDescription": "Himalayan landscapes, monasteries and mountain communities.",
    "travelThemes": [
      "mountain",
      "adventure"
    ]
  },
  {
    "id": "meghalaya",
    "name": "Meghalaya",
    "country": "India",
    "region": "Northeast India",
    "scope": "domestic",
    "shortDescription": "Waterfalls, forested hills and living root bridge traditions.",
    "travelThemes": [
      "adventure",
      "family"
    ]
  },
  {
    "id": "gangtok",
    "name": "Gangtok",
    "country": "India",
    "region": "Northeast India",
    "scope": "domestic",
    "shortDescription": "Sikkim’s hillside capital with monasteries and mountain viewpoints.",
    "travelThemes": [
      "mountain",
      "family"
    ]
  },
  {
    "id": "ayodhya",
    "name": "Ayodhya",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Temples, riverfront experiences and cultural sites in a major pilgrimage city.",
    "travelThemes": [
      "spiritual",
      "heritage"
    ]
  },
  {
    "id": "varanasi",
    "name": "Varanasi",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Ganga ghats, evening rituals and historic old-city experiences.",
    "travelThemes": [
      "spiritual",
      "heritage"
    ]
  },
  {
    "id": "prayagraj",
    "name": "Prayagraj",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "A pilgrimage and heritage city at the confluence of the Ganga and Yamuna.",
    "travelThemes": [
      "spiritual"
    ]
  },
  {
    "id": "mathura",
    "name": "Mathura",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Temples and cultural traditions associated with Krishna along the Yamuna.",
    "travelThemes": [
      "spiritual"
    ]
  },
  {
    "id": "vrindavan",
    "name": "Vrindavan",
    "country": "India",
    "region": "North India",
    "scope": "domestic",
    "shortDescription": "Temple walks and devotional traditions in the Braj region.",
    "travelThemes": [
      "spiritual"
    ]
  },
  {
    "id": "bodh-gaya",
    "name": "Bodh Gaya",
    "country": "India",
    "region": "East India",
    "scope": "domestic",
    "shortDescription": "Buddhist pilgrimage centred on the Mahabodhi Temple complex.",
    "travelThemes": [
      "spiritual",
      "heritage"
    ]
  },
  {
    "id": "dubai",
    "name": "Dubai",
    "country": "United Arab Emirates",
    "region": "United Arab Emirates",
    "scope": "international",
    "shortDescription": "Creek-side heritage, contemporary architecture and desert excursions.",
    "travelThemes": [
      "family",
      "luxury"
    ]
  },
  {
    "id": "abu-dhabi",
    "name": "Abu Dhabi",
    "country": "United Arab Emirates",
    "region": "United Arab Emirates",
    "scope": "international",
    "shortDescription": "Island waterfronts, cultural museums and the Sheikh Zayed Grand Mosque.",
    "travelThemes": [
      "family",
      "heritage"
    ]
  },
  {
    "id": "bali",
    "name": "Bali",
    "country": "Indonesia",
    "region": "Indonesia",
    "scope": "international",
    "shortDescription": "Temple traditions, rice terraces and tropical coastlines.",
    "travelThemes": [
      "beach",
      "couple"
    ]
  },
  {
    "id": "singapore",
    "name": "Singapore",
    "country": "Singapore",
    "region": "Singapore",
    "scope": "international",
    "shortDescription": "Urban gardens, waterfront architecture and multicultural neighbourhoods.",
    "travelThemes": [
      "family"
    ]
  },
  {
    "id": "thailand",
    "name": "Thailand",
    "country": "Thailand",
    "region": "Thailand",
    "scope": "international",
    "shortDescription": "Historic temples, tropical coastlines and varied regional cuisines.",
    "travelThemes": [
      "beach",
      "adventure"
    ]
  },
  {
    "id": "malaysia",
    "name": "Malaysia",
    "country": "Malaysia",
    "region": "Malaysia",
    "scope": "international",
    "shortDescription": "City landmarks, rainforest landscapes and diverse cultural traditions.",
    "travelThemes": [
      "family",
      "adventure"
    ]
  },
  {
    "id": "maldives",
    "name": "Maldives",
    "country": "Maldives",
    "region": "Maldives",
    "scope": "international",
    "shortDescription": "Coral islands and lagoons across an Indian Ocean archipelago.",
    "travelThemes": [
      "beach",
      "honeymoon"
    ]
  },
  {
    "id": "sri-lanka",
    "name": "Sri Lanka",
    "country": "Sri Lanka",
    "region": "Sri Lanka",
    "scope": "international",
    "shortDescription": "Historic sites, tea-growing hills and Indian Ocean coastlines.",
    "travelThemes": [
      "heritage",
      "beach"
    ]
  },
  {
    "id": "nepal",
    "name": "Nepal",
    "country": "Nepal",
    "region": "Nepal",
    "scope": "international",
    "shortDescription": "Himalayan landscapes and temple heritage in the Kathmandu Valley.",
    "travelThemes": [
      "mountain",
      "adventure"
    ]
  },
  {
    "id": "bhutan",
    "name": "Bhutan",
    "country": "Bhutan",
    "region": "Bhutan",
    "scope": "international",
    "shortDescription": "Himalayan valleys, monasteries and traditional dzong architecture.",
    "travelThemes": [
      "mountain",
      "wellness"
    ]
  },
  {
    "id": "mauritius",
    "name": "Mauritius",
    "country": "Mauritius",
    "region": "Mauritius",
    "scope": "international",
    "shortDescription": "Indian Ocean beaches, volcanic landscapes and multicultural island heritage.",
    "travelThemes": [
      "beach",
      "couple"
    ]
  },
  {
    "id": "vietnam",
    "name": "Vietnam",
    "country": "Vietnam",
    "region": "Vietnam",
    "scope": "international",
    "shortDescription": "Historic towns, limestone landscapes and regional food traditions.",
    "travelThemes": [
      "heritage",
      "adventure"
    ]
  },
  {
    "id": "switzerland",
    "name": "Switzerland",
    "country": "Switzerland",
    "region": "Switzerland",
    "scope": "international",
    "shortDescription": "Alpine landscapes, lakes and historic towns.",
    "travelThemes": [
      "mountain",
      "couple"
    ]
  },
  {
    "id": "paris",
    "name": "Paris",
    "country": "France",
    "region": "France",
    "scope": "international",
    "shortDescription": "Museums, Seine riverfront walks and historic architecture.",
    "travelThemes": [
      "couple",
      "heritage"
    ]
  },
  {
    "id": "london",
    "name": "London",
    "country": "United Kingdom",
    "region": "United Kingdom",
    "scope": "international",
    "shortDescription": "Museums, royal landmarks and diverse neighbourhoods along the Thames.",
    "travelThemes": [
      "heritage",
      "family"
    ]
  },
  {
    "id": "italy",
    "name": "Italy",
    "country": "Italy",
    "region": "Italy",
    "scope": "international",
    "shortDescription": "Historic cities, regional cuisines and Mediterranean landscapes.",
    "travelThemes": [
      "heritage",
      "couple"
    ]
  },
  {
    "id": "turkey",
    "name": "Turkey",
    "country": "Turkey",
    "region": "Turkey",
    "scope": "international",
    "shortDescription": "Historic architecture, Aegean coastlines and Cappadocia landscapes.",
    "travelThemes": [
      "heritage",
      "adventure"
    ]
  },
  {
    "id": "australia",
    "name": "Australia",
    "country": "Australia",
    "region": "Australia",
    "scope": "international",
    "shortDescription": "Coastal cities, varied landscapes and distinctive wildlife.",
    "travelThemes": [
      "wildlife",
      "adventure"
    ]
  }
];
export const destinationContentSources = ["https://www.incredibleindia.gov.in/en", "https://www.visitdubai.com/en", "https://vietnam.travel/places-to-go"];
