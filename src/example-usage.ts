import { transformAccidentReports } from './utils/dataTransformer';
import { AccidentReport } from './models';

// Example raw records from your data source
const rawRecords = [
  { 
    rcf_details: { 
      _localId: "123", 
      "BP NUMBER / বি পি নম্বর": "BP123",
      // other fields...
    }, 
    approval_status: '["Not Approve"]' 
  },
  // more records...
];

// Transform the records to the proper format
const formattedRecords: AccidentReport[] = transformAccidentReports(rawRecords);

// Now formattedRecords contains properly formatted AccidentReport objects
console.log(formattedRecords[0].approval_status); // Outputs: ["Not Approve"]
