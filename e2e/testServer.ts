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
    /** The last echoed request to the path with its query; none before one arrives */
    getLastRequest: (path: string) => NotRequired<TestServerEcho>;
    /** Stops the server */
    close: () => Promise<void>;
}

/** What the server answers to any path but its pages: what reached it */
export interface TestServerEcho {
    /** Method of the request */
    method: string;
    /** Path of the request, with its query */
    path: string;
    /** Request headers as they reached the server */
    headers: IncomingHttpHeaders;
    /** Request body as text */
    body: string;
}

export const LOOPBACK_HOST = '127.0.0.1';

/** The browser maps it to the loopback address with --host-resolver-rules */
export const FOREIGN_HOST = 'foreign.test';

export const PAGE_PATH = '/page';

/** A page whose own script sends a request while the page is still parsing */
export const EARLY_PAGE_PATH = '/early';

export const EARLY_REQUEST_PATH = '/api/early';

/** Answers with as many bytes as the number after it, for tests of the response limit */
export const BYTES_PATH = '/bytes/';

/** Where the early page leaves the status its request got */
export const EARLY_STATUS_ATTRIBUTE = 'data-early-status';

const EARLY_SCRIPT = `fetch('${EARLY_REQUEST_PATH}').then(response => {
    document.documentElement.dataset.earlyStatus = String(response.status);
});`;

const PAGES: Readonly<Record<string, string>> = {
    [PAGE_PATH]: '<!doctype html><title>Test page</title>',
    [EARLY_PAGE_PATH]: `<!doctype html><title>Early page</title><script>${EARLY_SCRIPT}</script>`,
};

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

const sendPage = (response: ServerResponse, html: string) => {
    response.setHeader('content-type', 'text/html');

    response.end(html);
};

const sendBytes = (response: ServerResponse, size: number) => {
    response.writeHead(200, {
        'content-type': 'text/plain',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
    });

    response.end(Buffer.alloc(size, 'a'));
};

const readBody = async (request: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('utf8');
};

/** Answers with what reached the server and keeps it for the test to read */
const sendEcho = async (request: IncomingMessage, response: ServerResponse, received: TestServerEcho[]) => {
    const echo: TestServerEcho = {
        method: request.method ?? '',
        path: request.url ?? '',
        headers: request.headers,
        body: await readBody(request),
    };

    received.push(echo);

    response.writeHead(200, ECHO_HEADERS);

    response.end(JSON.stringify(echo));
};

const closeServer = async (server: Server) => {
    server.close();

    await once(server, 'close');
};

/** Starts an HTTP server on a free port of the loopback address */
export const startTestServer = async (): Promise<TestServer> => {
    const received: TestServerEcho[] = [];

    const onRequest = (request: IncomingMessage, response: ServerResponse) => {
        const html = PAGES[request.url ?? ''];

        if (html !== undefined) {
            sendPage(response, html);

            return;
        }

        const path = request.url ?? '';

        if (path.startsWith(BYTES_PATH)) {
            sendBytes(response, Number(path.slice(BYTES_PATH.length)));

            return;
        }

        sendEcho(request, response, received).catch(() => response.destroy());
    };

    const getLastRequest = (path: string) => received.findLast(echo => echo.path === path);

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
        getLastRequest,
        close: () => closeServer(server),
    };
};
