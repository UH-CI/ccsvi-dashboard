export interface SviIndicator {
  dataset: string;
  metric: string;
  label: string;
  description?: string; //description for UI
  mvColumn?: string; // present only when indicator has a cross-data filter
}

export interface SviCategory {
  id: string;
  label: string;
  description?: string; //category level description for UI
  indicators: SviIndicator[];
}

export const SVI_CATEGORIES: SviCategory[] = [
  {
    id: "higher_risk_housing",
    label: "Housing and living arrangements",
    description: "Housing and living arrangements that increase exposure to hazards, displacement risk, or limit control over mitigation and recovery.",
    indicators: [
      {
        dataset: "age_of_structure",
        metric: "Total Housing Built Before 1990 (calc.)",
        label: "Houses built before 1990",
        description: "Housing units built before 1990. Older housing can be less resilient to hazards and indicate higher displacement risk and maintenance burden for households.",
      },
      // TODO: Add when dataset available: Houses built before 1970
      // {
      //   dataset: "age_of_structure",
      //   metric: "Total Housing Built Before 1970 (calc.)",
      //   label: "Houses built before 1970",
      // },
      {
        dataset: "population_group_quarters",
        metric: "Institutionalized population",
        label: "Population in group quarters",
        description: "Number of people living in group quarters (e.g., correctional facilities, nursing homes, student housing). Group quarters populations may face constrained evacuation or shelter options and distinct care needs.",
      },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Correctional facilities for adults", label: "Group quarters: Correctional facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Juvenile facilities", label: "Group quarters: Juvenile facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Nursing facilities/Skilled-nursing facilities", label: "Group quarters: Nursing/skilled-nursing facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Other institutional facilities", label: "Group quarters: Other institutional facilities" },
      { dataset: "tenure", metric: "Renter occupied", label: "Renter occupied units", description: "Number of housing units occupied by renters. Renters often have less control over mitigation measures and may face greater displacement risk after events." },
    ],
  },
  {
    id: "socioeconomic_disadvantage",
    label: "Economic Stability & Resources",
    description: "Economic and housing conditions that influence households’ ability to prepare for, absorb, and recover from climate-related events.",
    indicators: [
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 100% FPL (calc.)",
        label: "Below 100% federal poverty line",
        description: "Percentage of population with income below 100% of the federal poverty level. Deep poverty constrains preparedness, recovery resources, and adaptive capacity.",
        mvColumn: "fpl_under_100_pct_calc",
      },
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 150% FPL (calc.)",
        label: "Below 150% federal poverty line",
        description: "Percentage of population with income below 150% of the federal poverty level. This threshold highlights households with constrained resources who remain vulnerable to shocks.",
      },
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 200% FPL (calc.)",
        label: "Below 200% federal poverty line",
        description: "Percentage of population with income below 200% of the federal poverty level. Captures a wider group of economically precarious households whose recovery capacity is limited.",
      },
      {
        dataset: "health_insurance",
        metric: "No Health Insurance Coverage (calc.)",
        label: "Without health insurance",
        description: "Share of the population lacking health insurance. Uninsured individuals may have reduced access to medical care during and after hazards, increasing health vulnerability.",
        mvColumn: "no_health_insurance_pct_calc",
      },
    ],
  },
  {
    id: "sensitive_populations",
    label: "Population and household structure",
    description: "Population age distribution and household composition relevant to climate preparedness, evacuation needs, and caregiving capacity.",
    indicators: [
      {
        dataset: "person_under_5_65_males",
        metric: "Males Under 5 (calc.)",
        label: "Aged 5 years and under (male)",
        description: "Number of male children aged 0-5. Young children have specific caregiving and evacuation needs and increase household vulnerability.",
      },
      {
        dataset: "person_under_5_65_males",
        metric: "Males Under 18 (calc.)",
        label: "Aged 17 years and under (male)",
        description: "Number of male children and adolescents under 18. These households may require child-focused support during emergencies.",
      },
      {
        dataset: "person_under_5_65_males",
        metric: "Males Over 65 (calc.)",
        label: "Aged 65 years and older (male)",
        description: "Number of older male adults (65+). Older adults often have mobility, health, and social care needs that affect resilience and evacuation.",
      },
      {
        dataset: "person_under_5_65_females",
        metric: "Females Under 5 (calc.)",
        label: "Aged 5 years and under (female)",
        description: "Number of female children aged 0-5. Young children have specific caregiving and evacuation needs and increase household vulnerability.",
      },
      {
        dataset: "person_under_5_65_females",
        metric: "Females Under 18 (calc.)",
        label: "Aged 17 years and under (female)",
        description: "Number of female children and adolescents under 18. These households may require child-focused support during emergencies.",
      },
      {
        dataset: "person_under_5_65_females",
        metric: "Females Over 65 (calc.)",
        label: "Aged 65 years and older (female)",
        description: "Number of older female adults (65+). Older adults often have mobility, health, and social care needs that affect resilience and evacuation.",
      },
      {
        dataset: "living_arrangements",
        metric: "Total Living alone (calc.)",
        label: "Living alone",
        description: "Number of people living alone. Single-occupant households may have reduced social support and face higher isolation during hazards.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Under 5 (calc.)",
        label: "Hawaiian homelands - aged 5 years and under",
        description: "Number of children under 5 living on Hawaiian homelands. Highlights young populations in culturally specific land contexts that affect preparedness and response.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Under 18 (calc.)",
        label: "Hawaiian homelands - aged 17 years and under",
        description: "Number of people under 18 living on Hawaiian homelands. Useful for planning youth-centered communication and services in these communities.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Over 65 (calc.)",
        label: "Hawaiian homelands - aged 65 years and older",
        description: "Number of older adults living on Hawaiian homelands. Identifies elders who may have specific health, mobility, and cultural needs during emergencies.",
      },
    ],
  },
  {
    id: "underserved_populations",
    label: "Social Context and Access",
    description: "Social and linguistic factors that can limit access to climate information, services, and recovery resources.",
    indicators: [
      { dataset: "race_origin", metric: "White alone", label: "White population", description: "Population identifying as white. Racial composition helps show differences in exposure and access to resources across places." },
      {
        dataset: "race_origin",
        metric: "Black or African American alone",
        label: "Black or African American population",
        description: "Population identifying as Black or African American. Understanding racial group distributions helps surface inequities in exposure and recovery capacity.",
      },
      {
        dataset: "race_origin",
        metric: "American Indian and Alaska Native alone",
        label: "American Indian and Alaska Native population",
        description: "Population identifying as American Indian or Alaska Native. Small population counts may indicate distinct vulnerabilities and the need for culturally appropriate outreach.",
      },
      { dataset: "race_origin", metric: "Asian alone", label: "Asian population", description: "Population identifying as Asian. Racial and ethnic context informs language access and service equity in emergencies." },
      {
        dataset: "race_origin",
        metric: "Native Hawaiian and Other Pacific Islander alone",
        label: "Native Hawaiian and Other Pacific Islander population",
        description: "Population identifying as Native Hawaiian and Other Pacific Islander. Place-based histories and land relationships shape vulnerability and local resource access.",
      },
      { dataset: "race_origin", metric: "Some Other Race alone", label: "Some other race alone", description: "Population identifying as some other race. Disaggregated race categories help reveal localized patterns of marginalization." },
      { dataset: "race_origin", metric: "Two or More Races", label: "Two or More Races", description: "Population identifying with two or more races. Multiracial composition can reflect diverse social networks and mixed access to resources." },
      {
        dataset: "limited_english_speaking",
        metric: "Total Limited English Speaking Households (calc.)",
        label: "Limited English proficiency",
        description: "Number or share of households with limited English proficiency. Language barriers can reduce access to warnings, assistance, and recovery information.",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Spanish: Limited English speaking household",
        label: "Limited English: Spanish",
        description: "Households where Spanish is spoken and English is spoken less than very well. Useful for targeted language access and outreach planning.",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Other Indo-European languages: Limited English speaking household",
        label: "Limited English: Other Indo-European languages",
        description: "Households speaking other Indo-European languages with limited English proficiency; informs multi-lingual communication strategies.",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Asian and Pacific Island languages: Limited English speaking household",
        label: "Limited English: Asian and Pacific Island languages",
        description: "Households speaking Asian and Pacific Island languages with limited English proficiency; highlights language groups needing accessible materials.",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Other languages: Limited English speaking household",
        label: "Limited English: Other languages",
        description: "Households speaking languages not otherwise classified with limited English proficiency; useful for inclusive outreach planning.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric:
          "LANGUAGE SPOKEN AT HOME AND ABILITY TO SPEAK ENGLISH Population 5 years and over Speak language other than English Speak English less than very well",
        label: "Hawaiian homelands: limited English proficiency",
        description: "Households on Hawaiian homelands where English is spoken less than very well. Captures language access needs within these land contexts.",
      },
    ],
  },
  {
    id: "access_to_critical_resources",
    label: "Access to critical resources",
    description: "Access to essential services and systems that support climate information, response, and recovery.",
    indicators: [
      {
        dataset: "internet_subscription",
        metric: "No Internet access",
        label: "Households without internet access",
        description: "Share of households without an internet subscription. Lack of connectivity limits access to warnings, online services, and recovery resources.",
        mvColumn: "no_internet_pct",
      },
      {
        dataset: "households_w_computer",
        metric: "No Computer",
        label: "Households without a computer or smartphone",
        description: "Households lacking a computer or smartphone. Device access affects ability to receive digital alerts and use online recovery services.",
      },
      {
        dataset: "aggregate_vehicles",
        metric: "Estimate Aggregate number of vehicles available",
        label: "Households without a vehicle",
        description: "Estimate of households lacking access to a vehicle. Vehicle access influences evacuation options and mobility during emergencies.",
      },
    ],
  },
  {
    id: "critical_infrastructure",
    label: "Critical Infrastructure",
    description: "Essential infrastructure and facilities that support emergency response, recovery, and community resilience.",
    indicators: [
      {
        dataset: "fire_stations",
        metric: "Fire stations",
        label: "Fire stations",
      },
      {
        dataset: "hospitals",
        metric: "Hospitals",
        label: "Hospitals",
      },
      {
        dataset: "police_stations",
        metric: "Police stations",
        label: "Police stations",
      },
      {
        dataset: "emergency_shelters",
        metric: "Emergency shelters",
        label: "Emergency shelters",
      },
      {
        dataset: "state_roads",
        metric: "State roads",
        label: "State roads",
      },
      {
        dataset: "sidewalks_paths",
        metric: "Sidewalks and paths",
        label: "Sidewalks and paths",
      },
      {
        dataset: "bridges",
        metric: "Bridges",
        label: "Bridges",
      },
      {
        dataset: "schools",
        metric: "Schools",
        label: "Schools",
      },
    ],
  },
  {
    id: "secondary_environmental_risk",
    label: "Secondary Environmental Risk Areas",
    description: "Areas with environmental hazards or risk-prone infrastructure that can worsen climate impacts.",
    indicators: [
      {
        dataset: "sewage_disposal",
        metric: "Sewage disposal systems",
        label: "Sewage disposal systems",
      },
    ],
  },
];
