# Accident Approval Processor

This project processes accident reports stored in a database, extracts relevant information, formats it for a language model (LLM), and retrieves approval decisions based on the provided data.

## Project Structure

```
accident-approval-processor
├── src
│   ├── index.ts                # Entry point of the application
│   ├── config
│   │   ├── database.ts         # Database connection configuration
│   │   └── llm.ts              # LLM service configuration
│   ├── types
│   │   ├── database.ts         # Types and interfaces for database operations
│   │   └── accident.ts         # Types and interfaces for accident data structure
│   ├── services
│   │   ├── databaseService.ts   # Service for handling database operations
│   │   └── llmService.ts        # Service for interacting with the LLM API
│   └── utils
│       ├── dataExtractor.ts     # Utility for extracting data from JSON
│       └── promptFormatter.ts    # Utility for formatting prompts for the LLM
├── package.json                 # npm configuration file
├── tsconfig.json                # TypeScript configuration file
└── README.md                    # Project documentation
```

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd accident-approval-processor
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Database Connection**
   - Update the `src/config/database.ts` file with your database connection details.

4. **Run the Application**
   ```bash
   npm start
   ```

## Usage

The application connects to the specified database, fetches accident reports in JSON format, processes each entry to extract relevant information, formats it for the LLM, and retrieves approval decisions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.