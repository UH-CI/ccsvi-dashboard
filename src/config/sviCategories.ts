export interface SviIndicator {
  dataset: string;
  metric: string;
  label: string;
}

export interface SviCategory {
  id: string;
  label: string;
  indicators: SviIndicator[];
}

export const SVI_CATEGORIES: SviCategory[] = [
  {
    id: "higher_risk_housing",
    label: "Housing and living arrangements",
    indicators: [
      {
        dataset: "age_of_structure",
        metric: "Total Housing Built Before 1990 (calc.)",
        label: "Houses built before 1990",
      },
      {
        dataset: "population_group_quarters",
        metric: "Institutionalized population",
        label: "Population in group quarters",
      },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Correctional facilities for adults", label: "Group quarters: Correctional facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Juvenile facilities", label: "Group quarters: Juvenile facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Nursing facilities/Skilled-nursing facilities", label: "Group quarters: Nursing/skilled-nursing facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Other institutional facilities", label: "Group quarters: Other institutional facilities" },
      { dataset: "tenure", metric: "Renter occupied", label: "Renter occupied units" },
    ],
  },
  {
    id: "socioeconomic_disadvantage",
    label: "Economic Stability & Resources",
    indicators: [
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 100% FPL (calc.)",
        label: "Below 100% federal poverty line",
      },
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 150% FPL (calc.)",
        label: "Below 150% federal poverty line",
      },
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 200% FPL (calc.)",
        label: "Below 200% federal poverty line",
      },
      {
        dataset: "health_insurance",
        metric: "No Health Insurance Coverage (calc.)",
        label: "Without health insurance",
      },
    ],
  },
  {
    id: "sensitive_populations",
    label: "Population and household structure",
    indicators: [
      {
        dataset: "person_under_5_65_males",
        metric: "Males Under 5 (calc.)",
        label: "Aged 5 years and under (male)",
      },
      {
        dataset: "person_under_5_65_females",
        metric: "Females Under 5 (calc.)",
        label: "Aged 5 years and under (female)",
      },
      {
        dataset: "person_under_5_65_males",
        metric: "Males Under 18 (calc.)",
        label: "Aged 17 years and under (male)",
      },
      {
        dataset: "person_under_5_65_females",
        metric: "Females Under 18 (calc.)",
        label: "Aged 17 years and under (female)",
      },
      {
        dataset: "person_under_5_65_males",
        metric: "Males Over 65 (calc.)",
        label: "Aged 65 years and older (male)",
      },
      {
        dataset: "person_under_5_65_females",
        metric: "Females Over 65 (calc.)",
        label: "Aged 65 years and older (female)",
      },
      {
        dataset: "living_arrangements",
        metric: "Total Living alone (calc.)",
        label: "Living alone",
      },
      {
        dataset: "living_arrangements",
        metric: "In households: Householder: Male: Living alone",
        label: "Living alone (male)",
      },
      {
        dataset: "living_arrangements",
        metric: "In households: Householder: Female: Living alone",
        label: "Living alone (female)",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Under 5 (calc.)",
        label: "Hawaiian homelands - aged 5 years and under",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Under 18 (calc.)",
        label: "Hawaiian homelands - aged 17 years and under",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Over 65 (calc.)",
        label: "Hawaiian homelands - aged 65 years and older",
      },
    ],
  },
  {
    id: "underserved_populations",
    label: "Social and demographic context",
    indicators: [
      { dataset: "race_origin", metric: "White alone", label: "White alone" },
      {
        dataset: "race_origin",
        metric: "Black or African American alone",
        label: "Black or African American alone",
      },
      {
        dataset: "race_origin",
        metric: "American Indian and Alaska Native alone",
        label: "American Indian and Alaska Native alone",
      },
      { dataset: "race_origin", metric: "Asian alone", label: "Asian alone" },
      {
        dataset: "race_origin",
        metric: "Native Hawaiian and Other Pacific Islander alone",
        label: "Native Hawaiian and Other Pacific Islander alone",
      },
      { dataset: "race_origin", metric: "Some Other Race alone", label: "Some other race alone" },
      { dataset: "race_origin", metric: "Two or More Races", label: "Two or more races" },
      {
        dataset: "limited_english_speaking",
        metric: "Total Limited English Speaking Households (calc.)",
        label: "Speaking English less than well",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Spanish: Limited English speaking household",
        label: "Limited English: Spanish",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Other Indo-European languages: Limited English speaking household",
        label: "Limited English: Other Indo-European languages",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Asian and Pacific Island languages: Limited English speaking household",
        label: "Limited English: Asian and Pacific Island languages",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Other languages: Limited English speaking household",
        label: "Limited English: Other languages",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric:
          "LANGUAGE SPOKEN AT HOME AND ABILITY TO SPEAK ENGLISH Population 5 years and over Speak language other than English Speak English less than very well",
        label: "Hawaiian Homelands: speaking English less than well",
      },
    ],
  },
  {
    id: "access_to_critical_resources",
    label: "Access to critical resources",
    indicators: [
      {
        dataset: "internet_subscription",
        metric: "No Internet access",
        label: "Households without internet access",
      },
      {
        dataset: "households_w_computer",
        metric: "No Computer",
        label: "Households without a computer or smartphone",
      },
      {
        dataset: "aggregate_vehicles",
        metric: "Aggregate number of vehicles available",
        label: "Households without a vehicle",
      },
    ],
  },
];
