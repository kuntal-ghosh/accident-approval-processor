// export interface Accident {
//     approveStatus: string;
//     contributoryFactors: string;
//     reporterName: string;
//     accidentSeverity: string;
//     location: string;
// }

// Common interface for entities with _localId
interface LocalEntity {
  _localId: string;
}

// Driver ARF
interface DriverARF extends LocalEntity {}

// Vehicle information
interface Vehicle extends LocalEntity {
  // Add vehicle properties when available
}

// Passenger information
interface Passenger extends LocalEntity {
  // Add passenger properties when available
}

// Pedestrian information
interface Pedestrian extends LocalEntity {
  // Add pedestrian properties when available
}

// Report approval
interface DriverRCFApprove extends LocalEntity {
  "APPROVE REPORT?": string[];
}

// Detailed accident report information
interface DriverRCFDetails extends LocalEntity {
  "BP NUMBER / বি পি নম্বর": string;
  "CONTRIBUTORY FACTOR / সহায়ক কারণ": string[];
  "LOCATION SKETCH / নকশা/ খসরা চিত্র": string;
  "NAME OF REPORTER / প্রতিবেদকের নাম": string;
  "ACCIDENT SEVERITY / দুর্ঘটনার মাত্রা": string;
  "TRAFFIC POLICE ZONE / ট্রাফিক পুলিশ জোন": string;
  "NUMBER OF BUS INVOLVED / জড়িত বাসের সংখ্যা": number;
  "NUMBER OF CAR INVOLVED / জড়িত কারের সংখ্যা": number;
  "NUMBER OF JEEP INVOLVED / জড়িত জীপের সংখ্যা": number;
  "LOCATION NAME OF ROAD / সড়কের অবস্থানের নাম": string;
  "NUMBER OF UNKNOWN INVOLVED / জড়িত অজানা সংখ্যা": number;
  "NUMBER OF RICKSHAW INVOLVED / জড়িত রিকশার সংখ্যা": number;
  "NUMBER OF TEMPO INVOLVED / জড়িত টেম্পোর সংখ্যা": number;
  "NUMBER OF OTHER INVOLVED / অন্যান্য জড়িত সংখ্যা": number;
  "NUMBER OF PEDESTRIANS INVOLVED / জড়িত পথচারীর সংখ্যা": number;
  "NUMBER OF PICK UP INVOLVED / জড়িত পিক আপের সংখ্যা": number;
  "NUMBER OF MINIBUS INVOLVED / জড়িত মিনিবাসের সংখ্যা": number;
  "NUMBER OF PUSHCART INVOLVED / জড়িত ঠেলাগাড়ির সংখ্যা": number;
  "NUMBER OF TRACTOR INVOLVED / জড়িত ট্রাক্টরের সংখ্যা": number;
  "NUMBER OF BICYCLE INVOLVED / জড়িত বাই সাইকেলের সংখ্যা": number;
  "NUMBER OF MICROBUS INVOLVED / জড়িত মাইক্রোবাসের সংখ্যা": number;
  "NUMBER OF HEAVY TRUCK INVOLVED / জড়িত ভারী ট্রাকের সংখ্যা": number;
  "NUMBER OF MOTOR CYCLE INVOLVED / জড়িত মোটর সাইকেলের সংখ্যা": number;
  "NUMBER OF TRUCK < 3POINT5T INVOLVED / ট্রাকের সংখ্যা < 3POINT5T জড়িত": number;
  "CASUALTIES NUMBER OF DEAD / দুর্ঘটনায় হতাহত মৃতের সংখ্যা": number;
  "NUMBER OF BABY TAXI INVOLVED / জড়িত বেবি ট্যাক্সির সংখ্যা": number;
  "NUMBER OF ANIMAL DRAWN INVOLVED / জড়িত পশু চালিত বাহনের সংখ্যা": number;
  "NUMBER OF OIL TANKER INVOLVED / জড়িত অয়েল ট্যাঙ্কারের সংখ্যা": number;
  "LOCATION NAME OF CITY/TOWN/VILLAGE / নগর/শহর/গ্রামের অবস্থানের নাম": string;
  "NUMBER OF ARTICULATED TRUCK INVOLVED / জড়িত আর্টিকুলেটেড ট্রাকের সংখ্যা": number;
  "COLLISION TYPE (MOST SEVERE) / সংঘর্ষের ধরন (বেশি মাত্রার টি গ্রহণযোগ্য)": string;
  "CASUALTIES NUMBER OF SIMPLY INJURED / দুর্ঘটনায় সাধারণ আঘাত প্রাপ্তের সংখ্যা": number;
  "CASUALTIES NUMBER OF GRIEVOUSLY INJURED / দুর্ঘটনায় মারাত্মক আঘাত প্রাপ্তের সংখ্যা": number;
  "LOCATION NEAREST ESTABLISHMENT/LANDMARK (ESTIMATE HOW MANY METERS AWAY FROM CRASH) / অবস্থান নিকটবর্তী স্থাপনা/চিহ্নিত স্থান (দুর্ঘটনা স্থল হইতে আনুমানিক দূরত্ব)": string;
}

// Contributory factor information
interface DriverContributoryFactor extends LocalEntity {}

// Main interface representing the entire accident report
export interface AccidentReport {
  driverARF: DriverARF;
  driverVEHICLE: Vehicle[];
  driverPASSENGER: Passenger[];
  driverPEDESTRIAN: Pedestrian[];
  driverRCFAPPROVE: DriverRCFApprove;
  driverRCFDetails: DriverRCFDetails;
  driverCONTRIBUTORYFACTOR: DriverContributoryFactor;
}