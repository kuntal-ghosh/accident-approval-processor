import { Client } from 'pg';
import { createTunnel } from 'tunnel-ssh';

const PORT = 15435;
class DatabaseService {
    private client: Client | null = null;
    private tunnel: any;

    constructor(private config: { 
        host: string; 
        port: number; 
        user: string; 
        password: string; 
        database: string;
        sshConfig: {
            host: string;
            port: number;
            username: string;
            privateKey: string;
        }
    }) {
        // this.initializeClient().catch(error => {
        //     console.error('Failed to initialize client:', error);
        // });
    }

    private async initializeClient() {
        const forwardOptions = {
            srcAddr: '127.0.0.1',
            srcPort: PORT,
            dstAddr: this.config.host,
            dstPort: this.config.port
        };

        const tunnelOptions = {
            autoClose: true,
            reconnectOnError: true
        };

        const serverOptions = {
            host: '127.0.0.1',
            port: PORT
        };

        const sshOptions = {
            host: this.config.sshConfig.host,
            port: this.config.sshConfig.port,
            username: this.config.sshConfig.username,
            privateKey: require('fs').readFileSync(this.config.sshConfig.privateKey)
        };

        // Create SSH tunnel with all required options
        [this.tunnel] = await createTunnel(
            tunnelOptions,
            serverOptions,
            sshOptions,
            forwardOptions
        );

        // Create PostgreSQL client with tunneled connection
        this.client = new Client({
            host: 'localhost',
            port: PORT,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database
        });

        // Add error handler to the client
        this.client.on('error', (error) => {
            console.error('PostgreSQL client error:', error);
        });
    }

    public async connect() {
        await this.initializeClient();
        if (this.client) {
            await this.client.connect();
        } else {
            throw new Error('Client is not initialized');
        }
    }

    public async disconnect() {
        if (this.client) {
            await this.client.end();
        } else {
            throw new Error('Client is not initialized');
        }
        if (this.tunnel) {
            this.tunnel.close();
        }
    }

    public async query(queryString: string, params: any[] = []) {
        // await this.connect();
        if (this.client) {
            return await this.client.query(queryString, params);
        } else {
            throw new Error('Client is not initialized');
        }
    }
}

export default DatabaseService;