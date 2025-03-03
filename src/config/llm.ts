export const llmConfig = {
    apiUrl: "https://api.llm-service.com/v1/approve",
    apiKey: "YOUR_API_KEY_HERE",
    timeout: 5000,
    model: "gpt-3.5-turbo",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer YOUR_API_KEY_HERE`
    }
};