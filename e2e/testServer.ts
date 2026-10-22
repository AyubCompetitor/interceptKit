import { once } from 'node:events';
import {
    createServer,
    type IncomingHttpHeaders,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

export interface TestServer {
    /** Origin of the server on the loopback address */
    origin: string;
    /** The same server under a host that resolves to the loopback address only in the test browser */
    foreignOrigin: string;
    /** Stops the server */
    close: () => Promise<void>;
}

/** What the server answers to any path but the page: what reached it */
export interface TestServerEcho {
    /** Path of the request, with its query */
    path: string;
    /** Request headers as they reached the server */
    headers: IncomingHttpHeaders;
}

export const LOOPBACK_HOST = '127.0.0.1';

/** The browser maps it to the loopback address with --host-resolver-rules */
export const FOREIGN_HOST = 'foreign.test';

export const PAGE_PATH = '/page';

const PAGE_HTML = '<!doctype html><title>Test page</title>';

/** CORS is open, so a page on the foreign host may read the echo */
const ECHO_HEADERS = {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
    'x-powered-by': 'test-server',
} as const;

const SERVER_ERRORS = {
    NO_PORT: 'the test server listens on no TCP port',
} as const;

const isAddressInfo = (address: Nullable<string | AddressInfo>): address is AddressInfo => {
    return typeof address === 'object' && address !== null;
};

const sendPage = (response: ServerResponse) => {
    response.setHeader('content-type', 'text/html');

    response.end(PAGE_HTML);
};

const sendEcho = (request: IncomingMessage, response: ServerResponse) => {
    const echo: TestServerEcho = {
        path: request.url ?? '',
        headers: request.headers,
    };

    response.writeHead(200, ECHO_HEADERS);

    response.end(JSON.stringify(echo));
};

const onRequest = (request: IncomingMessage, response: ServerResponse) => {
    if (request.url === PAGE_PATH) {
        sendPage(response);

        return;
    }

    sendEcho(request, response);
};

const closeServer = async (server: Server) => {
    server.close();

    await once(server, 'close');
};

/** Starts an HTTP server on a free port of the loopback address */
export const startTestServer = async (): Promise<TestServer> => {
    const server = createServer(onRequest);

    server.listen(0, LOOPBACK_HOST);

    await once(server, 'listening');

    const address = server.address();

    if (!isAddressInfo(address)) {
        throw new Error(SERVER_ERRORS.NO_PORT);
    }

    return {
        origin: `http://${LOOPBACK_HOST}:${address.port}`,
        foreignOrigin: `http://${FOREIGN_HOST}:${address.port}`,
        close: () => closeServer(server),
    };
};
