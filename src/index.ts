import { DatabaseService } from './services/databaseService';
import { LLMService } from './services/llmService';
import { extractData } from './utils/dataExtractor';
import { formatPrompt } from './utils/promptFormatter';

async function main() {
    // Step 1: Connect to the Database
    const databaseService = new DatabaseService();
    await databaseService.connect();

    // Step 2: Fetch JSON data from the database
    const query = `
    select * from auth_user;
  `;
    const results = await databaseService.fetchJsonData(query);
    console.log("🚀 ~ main ~ results:", results)

    // Step 3: Process Each JSON Entry
    // for (const row of results) {
    //     const jsonString = row[0]; // Assuming JSON data is in the first column

    //     // Extract relevant information
    //     const data = extractData(jsonString);
    //     if (!data) continue; // Skip if extraction fails

    //     // Step 4: Format Data for LLM Input
    //     const prompt = formatPrompt(data);

    //     // Step 5: Send to the LLM
    //     const llmService = new LLMService();
    //     const llmResponse = await llmService.sendPrompt(prompt);

    //     // Step 6: Handle LLM Output
    //     console.log('LLM Response:', llmResponse);
    // }

    // Close the database connection
    // await databaseService.disconnect();
}

// Start the application
main().catch(err => {
    console.error('Error running the application:', err);
});