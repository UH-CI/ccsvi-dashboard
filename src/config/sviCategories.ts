export interface SviIndicator {
  dataset: string;
  metric: string;
  label: string;
  description?: string; //description for UI
  mvColumn?: string; //column name if applicable
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
    label: "Housing and Living Arrangements",
    description: "Housing and living arrangements that increase exposure to hazards, displacement risk, or limit control over mitigation and recovery.",
    indicators: [
      {
        dataset: "age_of_structure",
        metric: "Total Housing Built Before 1990 (calc.)",
        label: "Houses Built Before 1990",
        description: "Older housing can increase displacement risk and recovery cost.",
      },
      {
        dataset: "age_of_structure",
        metric: "Total Housing Built Before 1970 (calc.)",
        label: "Houses Built Before 1970",
        description: "Older housing can increase displacement risk and recovery cost.",
      },
      {
        dataset: "population_group_quarters",
        metric: "Institutionalized population",
        label: "Population in Group Quarters",
        description: "Shared or institutional settings can create greater challenges during evacuation and sheltering due to facility-specific procedures, living arrangements, and support needs.",
      },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Correctional facilities for adults", label: "Group quarters: Correctional facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Juvenile facilities", label: "Group quarters: Juvenile facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Nursing facilities/Skilled-nursing facilities", label: "Group quarters: Nursing/skilled-nursing facilities" },
      // { dataset: "population_group_quarters", metric: "Institutionalized population: Other institutional facilities", label: "Group quarters: Other institutional facilities" },
      { dataset: "tenure", metric: "Renter occupied", label: "Renter Occupied Units", description: "Renters may have less control over mitigation measures and face greater displacement risk after events." },
      {
        dataset: "tenure_by_occupants_per_room",
        metric: "Total Overcrowded Housing Units (calc.)",
        label: "Overcrowded Units",
        description: "Crowded housing can make it harder to shelter safely during hazards and to find suitable alternative housing.",
      },
    ],
  },
  {
    id: "socioeconomic_disadvantage",
    label: "Economic Stability & Resources",
    description: "Economic and housing conditions that influence the ability to prepare for, absorb, and recover from climate-related events.",
    indicators: [
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 100% FPL (calc.)",
        label: "Below 100% Federal Poverty Line",
        description: "Income constraints can limit access to resources needed to prepare for, respond to, and recover from disasters.",
        mvColumn: "fpl_under_100_pct_calc",
      },
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 150% FPL (calc.)",
        label: "Below 150% Federal Poverty Line",
        description: "Income constraints can limit access to resources needed to prepare for, respond to, and recover from disasters.",
      },
      {
        dataset: "income_share_of_fpl",
        metric: "Total Under 200% FPL (calc.)",
        label: "Below 200% Federal Poverty Line",
        description: "Income constraints can limit access to resources needed to prepare for, respond to, and recover from disasters.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric:
          "POVERTY STATUS IN THE PAST 12 MONTHS Population for whom poverty status is determined Below 100 percent of the poverty level",
        label: "Hawaiian Homelands - Below 100% Federal Poverty Line",
        description: "Income constraints can limit access to resources needed to prepare for, respond to, and recover from disasters.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Under 150% FPL (calc.)",
        label: "Hawaiian Homelands - Below 150% Federal Poverty Line",
        description: "Income constraints can limit access to resources needed to prepare for, respond to, and recover from disasters.",
      },
      {
        dataset: "health_insurance",
        metric: "No Health Insurance Coverage (calc.)",
        label: "Without Health Insurance",
        description: "Uninsured individuals may have reduced access to medical care during and after hazards.",
        mvColumn: "no_health_insurance_pct_calc",
      },
    ],
  },
  {
    id: "sensitive_populations",
    label: "Population and Household Structure",
    description: "Population age distribution and household composition relevant to climate preparedness, evacuation needs, and caregiving capacity.",
    indicators: [
      // Age-range indicators are consolidated below (male + female combined).
      // The segregated male/female data still exists in the database
      // (datasets person_under_5_65_males / person_under_5_65_females) and
      // these entries work if uncommented — just no longer shown in the menu.
      // {
      //   dataset: "person_under_5_65_males",
      //   metric: "Males Under 5 (calc.)",
      //   label: "Aged 5 years and under (male)",
      // },
      // {
      //   dataset: "person_under_5_65_females",
      //   metric: "Females Under 5 (calc.)",
      //   label: "Aged 5 years and under (female)",
      // },
      // {
      //   dataset: "person_under_5_65_males",
      //   metric: "Males Under 18 (calc.)",
      //   label: "Aged 17 years and under (male)",
      // },
      // {
      //   dataset: "person_under_5_65_females",
      //   metric: "Females Under 18 (calc.)",
      //   label: "Aged 17 years and under (female)",
      // },
      // {
      //   dataset: "person_under_5_65_males",
      //   metric: "Males Over 65 (calc.)",
      //   label: "Aged 65 years and older (male)",
      // },
      // {
      //   dataset: "person_under_5_65_females",
      //   metric: "Females Over 65 (calc.)",
      //   label: "Aged 65 years and older (female)",
      // },
      {
        dataset: "person_under_5_65_total",
        metric: "Total Under 5 (calc.)",
        label: "Aged 5 Years and Under",
        description:
          "Young children have specific caregiving and evacuation needs that increase household vulnerability.",
      },
      {
        dataset: "person_under_5_65_total",
        metric: "Total Under 18 (calc.)",
        label: "Aged 17 Years and Under",
        description:
          "Children and adolescents may require additional support during evacuation, sheltering, and recovery, which can increase household vulnerability.",
      },
      {
        dataset: "person_under_5_65_total",
        metric: "Total Over 65 (calc.)",
        label: "Aged 65 Years and Older",
        description:
          "Older adults can have mobility, health, and social care needs that affect hazard preparedness, evacuation, and recovery.",
      },
      {
        dataset: "living_arrangements",
        metric: "Total Living alone (calc.)",
        label: "Living Alone",
        description:
          "Single-occupant households may have reduced social support and face higher isolation during hazards.",
      },
      {
        dataset: "family_type_by_children",
        metric: "Total Single-Parent Households With Children (calc.)",
        label: "Single Parent Households",
        description: "Single caregivers may face additional challenges managing evacuation, childcare, and recovery.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Under 5 (calc.)",
        label: "Hawaiian Homelands - Aged 5 Years and Under",
        description: "Young children have specific caregiving and evacuation needs that increase household vulnerability.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Under 18 (calc.)",
        label: "Hawaiian Homelands - Aged 17 Years and Under",
        description: "Children and adolescents may require additional support during evacuation, sheltering, and recovery, which can increase household vulnerability.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric: "Total Population Over 65 (calc.)",
        label: "Hawaiian Homelands - Aged 65 Years and Older",
        description: "Older adults can have mobility, health, and social care needs that affect hazard preparedness, evacuation, and recovery.",
      },
    ],
  },
  {
    id: "underserved_populations",
    label: "Social Context and Access",
    description: "Social and linguistic factors that can limit access to climate information, services, and recovery resources.",
    indicators: [
      {
        dataset: "race_origin",
        metric: "Native Hawaiian and Other Pacific Islander alone",
        label: "Native Hawaiian and Other Pacific Islander Population",
        description: "Historical and structural inequities can contribute to differences in exposure to hazards and access to resources needed for preparedness and recovery.",
      },
      {
        dataset: "race_origin",
        metric: "Asian alone",
        label: "Asian Population",
        description: "Historical and structural inequities can contribute to differences in exposure to hazards and access to resources needed for preparedness and recovery.",
      },
      {
        dataset: "race_origin",
        metric: "Black or African American alone",
        label: "Black or African American Population",
        description: "Historical and structural inequities can contribute to differences in exposure to hazards and access to resources needed for preparedness and recovery.",
      },
      {
        dataset: "race_origin",
        metric: "White alone",
        label: "White Population",
        description: "Historical and structural inequities can contribute to differences in exposure to hazards and access to resources needed for preparedness and recovery.",
      },
      {
        dataset: "race_origin",
        metric: "Two or More Races",
        label: "Two or More Races",
        description: "Historical and structural inequities can contribute to differences in exposure to hazards and access to resources needed for preparedness and recovery.",
      },
      {
        dataset: "limited_english_speaking",
        metric: "Total Limited English Speaking Households (calc.)",
        label: "Limited English Proficiency",
        description: "Language barriers can reduce access to warnings, assistance, and recovery information.",
      },
      {
        dataset: "2022_census_hawaiian_homelands",
        metric:
          "LANGUAGE SPOKEN AT HOME AND ABILITY TO SPEAK ENGLISH Population 5 years and over Speak language other than English Speak English less than very well",
        label: "Hawaiian Homelands: Limited English Proficiency",
        description: "Language barriers can reduce access to warnings, assistance, and recovery information.",
      },
    ],
  },
  {
    id: "access_to_critical_resources",
    label: "Access to Critical Resources",
    description: "Access to essential services and systems that support climate information, response, and recovery.",
    indicators: [
      {
        dataset: "internet_subscription",
        metric: "No Internet access",
        label: "Households Without Internet Access",
        description: "Lack of internet access can reduce access to information and resources for hazard preparedness, response, and recovery.",
        mvColumn: "no_internet_pct",
      },
      {
        dataset: "households_w_computer",
        metric: "No Computer",
        label: "Households Without a Computer or Smartphone",
        description: "Limited access to digital devices can reduce access to information and resources for hazard preparedness, response, and recovery.",
      },
      {
        dataset: "aggregate_vehicles",
        metric: "Aggregate number of vehicles available",
        label: "Households Without a Vehicle",
        description: "Lack of vehicle access can create barriers to preparedness, evacuation, access to essential services, and recovery during hazards.",
      },
    ],
  },
];

// The SVI menu's name for a metric, or the raw metric name if the menu doesn't list it
export const sviLabel = (dataset: string | undefined, metric: string): string =>
  SVI_CATEGORIES.flatMap((c) => c.indicators).find(
    (i) => i.dataset === dataset && i.metric === metric,
  )?.label ?? metric;
