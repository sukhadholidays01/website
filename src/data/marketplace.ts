import type { TravelImage } from "@/types";

export type MarketplaceDestination = TravelImage & { note: string; region: "india" | "world" };
export const marketplaceDestinations: MarketplaceDestination[] = [
 {title:"Ayodhya",src:"/images/destinations/ayodhya.webp",alt:"Ayodhya temple and riverfront in warm evening light",location:"Uttar Pradesh",category:"Spiritual",note:"A journey closer to yourself",region:"india"},
 {title:"Varanasi",src:"/images/destinations/varanasi.webp",alt:"Boats and historic ghats along the Ganges in Varanasi",location:"Uttar Pradesh",category:"Spiritual",note:"Timeless ghats. Unforgettable evenings.",region:"india"},
 {title:"Jaipur",src:"/images/destinations/jaipur.webp",alt:"The intricate pink sandstone architecture of Jaipur",location:"Rajasthan",category:"Heritage",note:"A little royal, a lot unforgettable",region:"india"},
 {title:"Goa",src:"/images/domestic/goa.webp",alt:"Palm trees beside the sunny Goa coastline",location:"Western India",category:"Beach",note:"Leave the everyday behind",region:"india"},
 {title:"Kerala",src:"/images/domestic/kerala.jpg",alt:"Lush palm-lined waterways in Kerala",location:"Southern India",category:"Nature",note:"Slow days, greener horizons",region:"india"},
 {title:"Rishikesh",src:"/images/domestic/rishikesh.webp",alt:"River and mountain scenery around Rishikesh",location:"Uttarakhand",category:"Adventure",note:"Follow the river. Find your adventure.",region:"india"},
 {title:"Dubai",src:"/images/international/dubai.webp",alt:"Dubai skyline reflected in the waterfront at dusk",location:"United Arab Emirates",category:"City escape",note:"Big skies. Bigger possibilities.",region:"world"},
 {title:"Bali",src:"/images/international/bali.webp",alt:"Tropical greenery and island scenery in Bali",location:"Indonesia",category:"Island",note:"Your own little island escape",region:"world"},
 {title:"Singapore",src:"/images/international/singapore.webp",alt:"Singapore Marina Bay skyline at sunset",location:"Southeast Asia",category:"Family",note:"Small island, endless discoveries",region:"world"},
 {title:"Maldives",src:"/images/international/maldives.webp",alt:"Turquoise lagoon and white sand in the Maldives",location:"Indian Ocean",category:"Beach",note:"A thousand shades of blue",region:"world"},
 {title:"Thailand",src:"/images/international/thailand.jpg",alt:"Limestone cliffs above turquoise coastal waters in Thailand",location:"Southeast Asia",category:"Adventure",note:"A change of pace, a world of colour",region:"world"},
 {title:"Switzerland",src:"/images/international/switzerland.jpg",alt:"Swiss alpine mountains and green valley",location:"Europe",category:"Mountains",note:"Postcard views, real memories",region:"world"},
 {title:"Udaipur",src:"/images/holidays/udaipur.webp",alt:"Lakeside architecture in Udaipur",location:"Rajasthan",category:"Heritage",note:"Lakes and palace-lined streets",region:"india"},
 {title:"Paris",src:"/images/holidays/paris.webp",alt:"Historic Paris cityscape",location:"France",category:"Heritage",note:"Museums and Seine riverfront walks",region:"world"},
 {"title":"Kashmir","src":"/images/holidays/kashmir.jpg","alt":"Boats on Dal Lake beneath snow-covered mountains in Srinagar","location":"Northern India","category":"Mountain","note":"Lakes, gardens and Himalayan landscapes.","region":"india"},
 {"title":"Darjeeling","src":"/images/holidays/darjeeling.jpg","alt":"Darjeeling Himalayan Railway train beside a fruit shop","location":"West Bengal","category":"Mountain","note":"Tea gardens and a heritage mountain railway.","region":"india"},
 {"title":"Meghalaya","src":"/images/holidays/meghalaya.jpg","alt":"Nohkalikai Falls descending into a forested gorge in Meghalaya","location":"Northeast India","category":"Adventure","note":"Waterfalls, forested hills and living root bridges.","region":"india"},
];
export const moodDestinations: Record<string,string[]> = {
 Couple:["Maldives","Bali","Goa","Dubai"],Family:["Singapore","Kerala","Jaipur","Dubai"],Adventure:["Rishikesh","Thailand","Switzerland","Bali"],Spiritual:["Ayodhya","Varanasi","Rishikesh"],Beach:["Goa","Maldives","Bali","Thailand"],Heritage:["Jaipur","Varanasi","Ayodhya"],Weekend:["Rishikesh","Jaipur","Goa"],Mountain:["Kashmir","Darjeeling","Switzerland","Meghalaya"],Romantic:["Udaipur","Paris","Bali"],Luxury:["Dubai","Maldives","Udaipur"],Wildlife:["Kerala","Bali","Thailand"],Wellness:["Rishikesh","Kerala","Bali"],International:["Singapore","Thailand","Switzerland"],"Road Trip":["Udaipur","Jaipur","Rishikesh"],Honeymoon:["Maldives","Bali","Paris"]
};
export const marketplaceServices = [
 {title:"Flights",line:"Fly further.",note:"Domestic + International",href:"/flights",image:"/images/hero/flight.jpg",alt:"Airplane wing above clouds at sunrise",icon:"flight"},
 {title:"Holiday Packages",line:"Make time for memories.",note:"Journeys around you",href:"/holidays",image:"/images/international/bali.webp",alt:"Lush green island escape in Bali",icon:"holiday"},
 {title:"Bus",line:"The road is yours.",note:"City to city, comfortably",href:"/bus",image:"/images/hero/bus.jpg",alt:"Coach bus on a road journey",icon:"bus"},
 {title:"Cabs",line:"Take the scenic route.",note:"Local · Airport · Outstation",href:"/cabs",image:"/images/vehicles/suv.webp",alt:"SUV for a comfortable road trip",icon:"cab"},
];

