// Agronomic data module with static advice
export const agronomicData = {
  "Sunflower": {
    weather: "20°C - 28°C",
    timeToSow: "Late Spring / Early Summer",
    soil: "pH 6.0 - 7.5, well-drained loam",
    advice: "Ensure full sun exposure for at least 6-8 hours daily."
  },
  "Maize": {
    weather: "18°C - 30°C",
    timeToSow: "Spring (after frost)",
    soil: "pH 5.8 - 7.0, fertile, well-drained",
    advice: "Needs nitrogen-rich soil. Water regularly during pollination."
  },
  "Wheat": {
    weather: "15°C - 24°C",
    timeToSow: "Autumn (Winter Wheat) or Spring",
    soil: "pH 6.0 - 7.0, loamy to clay soil",
    advice: "Avoid waterlogging. Harvest when grain moisture is below 20%."
  },
  "Rice": {
    weather: "20°C - 35°C",
    timeToSow: "Summer / Monsoon",
    soil: "pH 5.5 - 7.0, clay/silt loam (water-retentive)",
    advice: "Maintain standing water of 2-5 cm during early growth."
  },
  "Soybean": {
    weather: "20°C - 30°C",
    timeToSow: "Late Spring",
    soil: "pH 6.0 - 6.8, loose loam",
    advice: "Inoculate seeds with Rhizobium bacteria for better nitrogen fixation."
  },
  "Potato": {
    weather: "15°C - 20°C",
    timeToSow: "Early Spring",
    soil: "pH 5.0 - 6.0, sandy loam",
    advice: "Hill soil around stems as they grow to prevent greening of tubers."
  },
  "Cotton": {
    weather: "25°C - 35°C",
    timeToSow: "Spring (warm soil)",
    soil: "pH 5.8 - 8.0, deep sandy loam",
    advice: "Requires a long frost-free growing season (160+ days)."
  },
  "Tomato": {
    weather: "20°C - 27°C",
    timeToSow: "Spring (after frost)",
    soil: "pH 6.0 - 6.8, well-drained, organic-rich",
    advice: "Stake plants early to support heavy fruit loads."
  },
  "Onion": {
    weather: "13°C - 24°C",
    timeToSow: "Late Winter / Early Spring",
    soil: "pH 6.0 - 7.0, loose, fertile soil",
    advice: "Keep weed-free as onions have poor competition ability."
  },
  "Carrot": {
    weather: "16°C - 21°C",
    timeToSow: "Spring to Autumn",
    soil: "pH 6.0 - 6.8, deep, sandy, stone-free",
    advice: "Keep soil consistently moist for uniform root development."
  },
  "Default": {
    weather: "Dependent on local climate",
    timeToSow: "Check local planting calendar",
    soil: "pH 6.0 - 7.0, well-drained soil",
    advice: "Consult your local agricultural extension for specific guidance."
  }
};

export const getAgronomicAdvice = (seedType) => {
  return agronomicData[seedType] || agronomicData["Default"];
};
