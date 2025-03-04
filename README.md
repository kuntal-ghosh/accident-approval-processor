# README.md

# Node PostgreSQL App

This project is a Node.js application that connects to a PostgreSQL database. It demonstrates how to set up a database connection, manage queries, and structure a Node.js application.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd node-postgres-app
   ```

2. Install the dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template and fill in your database credentials.

## Configuration

The database connection settings can be found in `src/config/database.ts`. Update the following properties with your PostgreSQL server details:

- `host`: The hostname of your PostgreSQL server.
- `port`: The port number (default is 5432).
- `user`: Your PostgreSQL username.
- `password`: Your PostgreSQL password.
- `database`: The name of your database.

## Usage

To start the application, run:
```
npm start
```

This will initialize the application and connect to the PostgreSQL database.

## License

This project is licensed under the MIT License.