import express from 'express';
import DatabaseService from './services/db.service';
import dotenv from 'dotenv';
import database from './config/database';
var timeout = require('connect-timeout')
import { json2csv } from 'json-2-csv';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(timeout('240s'));
dotenv.config();
const port = process.env.PORT || 3005;
app.use(express.json());


app.get('/', async (req, res) => {
    try {
        const dbService: DatabaseService = new DatabaseService(database);
        const response = await dbService.query('SELECT count(uuid) FROM public.grout_record;');
        await dbService.disconnect();
        const count = response.rows[0].count;
        const responseRecord = [];
        let skip = 0;
        
        for(let i = 0; i <= count; i += 1000) {
            const records = await dbService.query(`SELECT "data" FROM public.grout_record LIMIT ${(count - i) <1000 ? (count-i) : 1000} OFFSET ${skip};`);
            await dbService.disconnect();
            responseRecord.push(...records.rows);
            console.log("Fetched Data : ", responseRecord.length);
            skip += 1000;
        }

        responseRecord.forEach((item, index) => {
            responseRecord[index] = item.data;
        });

        const flattenedData = responseRecord.map(item => {
            interface FlatObject {
                [key: string]: any;
            }

            const flattenObject = (obj: any, prefix: string = ''): void => {
                for (let key in obj) {
                    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                        flattenObject(obj[key], `${prefix}${key}/`);
                    } else if (Array.isArray(obj[key])) {
                        obj[key].forEach((val: any, index: number) => {
                            if (typeof val === 'object') {
                                flattenObject(val, `${prefix}${key}[${index}]/`);
                            } else {
                                flatObject[`${prefix}${key}[${index}]`] = val;
                            }
                        });
                    } else {
                        flatObject[`${prefix}${key}`] = obj[key];
                    }
                }
            };
            const flatObject: FlatObject = {};
            flattenObject(item);
            return flatObject;
        });
            
        const csv = await json2csv(flattenedData);
        const filePath = path.join(__dirname, '..', 'output.csv');
        fs.writeFileSync(filePath, csv);
        res.status(200).send({
            status: 'success',
            message: 'CSV file has been created successfully'
        });
    } catch (error) {
        console.error('Error fetching grout records:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, async () => {
    console.log(`Server is running on http://localhost:${port}`);
    try {
        const dbService: DatabaseService = new DatabaseService(database);
        await dbService.connect();
        console.log('Connected to the PostgreSQL database.');
        await dbService.disconnect();
    } catch (error) {
        console.error('Database connection failed:', error);
    }
});