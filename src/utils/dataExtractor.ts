// import * as json from 'json';
// import { AccidentData } from '../types/accident';

export function extractData(results: any[]): any[] {
    const extractedData: any[] = [];

    for (const row of results) {
        const jsonString = row[0]; // Assuming JSON data is in the first column

        // Parse JSON string
        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (e) {
            console.error(`Error decoding JSON: ${e}`);
            continue; // Skip this record if parsing fails
        }

        // Extract Relevant Information
        const approveStatus = data.driverRCFAPPROVE?.["APPROVE REPORT?"]?.[0] || "";
        const contributoryFactors = data.driverRCFDetails?.["CONTRIBUTORY FACTOR / সহায়ক কারণ"]?.join(", ") || "";
        const reporterName = data.driverRCFDetails?.["NAME OF REPORTER / প্রতিবেদকের নাম"] || "";
        const accidentSeverity = data.driverRCFDetails?.["ACCIDENT SEVERITY / দুর্ঘটনার মাত্রা"] || "";
        const location = data.driverRCFDetails?.["LOCATION NAME OF CITY/TOWN/VILLAGE / নগর/শহর/গ্রামের অবস্থানের নাম"] || "";

        extractedData.push({
            approveStatus,
            contributoryFactors,
            reporterName,
            accidentSeverity,
            location,
        });
    }

    return extractedData;
}