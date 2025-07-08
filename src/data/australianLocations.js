// frontend/src/data/australianLocations.js
export const states = [
  'New South Wales',
  'Victoria',
  'Queensland',
  'Western Australia',
  'South Australia',
  'Tasmania',
  'Australian Capital Territory',
  'Northern Territory',
];

export const citiesByState = {
  'New South Wales': ['Sydney', 'Newcastle', 'Wollongong', 'Canberra'], // Canberra for ACT, but often associated with NSW regionally
  'Victoria': ['Melbourne', 'Geelong', 'Ballarat'],
  'Queensland': ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville'],
  'Western Australia': ['Perth', 'Fremantle', 'Mandurah'],
  'South Australia': ['Adelaide', 'Mount Gambier', 'Whyalla'],
  'Tasmania': ['Hobart', 'Launceston', 'Devonport'],
  'Australian Capital Territory': ['Canberra'],
  'Northern Territory': ['Darwin', 'Alice Springs'],
};
// Export all cities as a flat list for initial load, or if state isn't selected yet
export const allAustralianCities = Object.values(citiesByState).flat().sort();