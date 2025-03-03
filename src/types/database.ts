export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    dialect: 'mysql' | 'postgres' | 'mssql';
}

export interface QueryResult {
    [key: string]: any;
}

export interface JsonData {
    driverRCFAPPROVE: {
        "APPROVE REPORT?": string[];
    };
    driverRCFDetails: {
        "CONTRIBUTORY FACTOR / সহায়ক কারণ": string[];
        "NAME OF REPORTER / প্রতিবেদকের নাম": string;
        "ACCIDENT SEVERITY / দুর্ঘটনার মাত্রা": string;
        "LOCATION NAME OF CITY/TOWN/VILLAGE / নগর/শহর/গ্রামের অবস্থানের নাম": string;
    };
}