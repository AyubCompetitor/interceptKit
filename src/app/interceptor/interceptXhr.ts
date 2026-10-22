import {
    buildMockHeaders,
    getMockHeader,
    resolveRequestUrl,
    type MockHeader,
    type MockRequest,
    type PageMock,
} from '#entities/mock';

import { findMock, isMockListReady, waitForMockList } from './mockList.ts';
import { buildXhrResponse, formatXhrHeaders, isTextResponseType } from './xhrReply.ts';

const XHR_EVENTS = {
    READY_STATE_CHANGE: 'readystatechange',
    LOAD_START: 'loadstart',
    PROGRESS: 'progress',
    LOAD: 'load',
    LOAD_END: 'loadend',
    ABORT: 'abort',
} as const;

const CONTENT_TYPE_HEADER = 'content-type';

const XHR_ERRORS = {
    ALREADY_SENT: 'The object state must be OPENED and the request not sent.',
    INVALID_STATE: 'InvalidStateError',
} as const;

/** Taken before page scripts run, so requests without a mock go to the browser's own XHR */
const NativeXhr = window.XMLHttpRequest;

/** The mock's response as the request reports it once it arrives */
interface XhrReply {
    /** Status of the mock */
    readonly status: number;
    /** URL of the request, without the fragment */
    readonly url: string;
    /** Response headers */
    readonly headers: readonly MockHeader[];
    /** Response body as text */
    readonly body: string;
}

/** A request the interceptor answers itself: it waits for the mock list, plays a mock or was aborted */
interface LocalXhr {
    /** Ready state the request reports */
    readyState: number;
    /** Whether send() waits for the mock list */
    isWaiting: boolean;
    /** The mock's response, from its arrival on */
    reply?: XhrReply;
    /** xhr.response, built once the body has arrived */
    response?: unknown;
    /** Timer of the mock's delay */
    timer?: number;
}

class InterceptedXhr extends NativeXhr {
    #method = '';

    #url = '';

    #isAsync = true;

    #local: NotRequired<LocalXhr>;

    override get readyState(): number {
        if (!this.#local) {
            return super.readyState;
        }

        return this.#local.readyState;
    }

    override get status(): number {
        if (!this.#local) {
            return super.status;
        }

        return this.#local.reply?.status ?? 0;
    }

    override get statusText(): string {
        if (!this.#local) {
            return super.statusText;
        }

        return '';
    }

    override get responseURL(): string {
        if (!this.#local) {
            return super.responseURL;
        }

        return this.#local.reply?.url ?? '';
    }

    /** The native getter throws for responseType json, blob and the like, and so it should */
    override get responseText(): string {
        if (!this.#local || !isTextResponseType(this.responseType)) {
            return super.responseText;
        }

        return this.#local.reply?.body ?? '';
    }

    override get response(): unknown {
        if (!this.#local) {
            return super.response;
        }

        if (this.#local.readyState === NativeXhr.DONE) {
            return this.#local.response;
        }

        if (isTextResponseType(this.responseType)) {
            return this.#local.reply?.body ?? '';
        }

        return null;
    }

    override get responseXML(): Nullable<Document> {
        if (!this.#local) {
            return super.responseXML;
        }

        return null;
    }

    override getResponseHeader(name: string): Nullable<string> {
        if (!this.#local) {
            return super.getResponseHeader(name);
        }

        return getMockHeader(this.#local.reply?.headers ?? [], name);
    }

    override getAllResponseHeaders(): string {
        if (!this.#local) {
            return super.getAllResponseHeaders();
        }

        return formatXhrHeaders(this.#local.reply?.headers ?? []);
    }

    override open(
        method: string,
        url: string | URL,
        isAsync = true,
        username?: Nullable<string>,
        password?: Nullable<string>,
    ): void {
        super.open(method, url, isAsync, username, password);

        this.#stopLocal();

        this.#method = method;
        this.#url = String(url);
        this.#isAsync = isAsync;
    }

    override send(body?: Nullable<Document | XMLHttpRequestBodyInit>): void {
        if (this.#local) {
            throw new DOMException(XHR_ERRORS.ALREADY_SENT, XHR_ERRORS.INVALID_STATE);
        }

        /** A synchronous request cannot wait, and the native send reports misuse such as a send without open */
        const isNativeOnly = !this.#isAsync || super.readyState !== NativeXhr.OPENED;

        if (isNativeOnly) {
            super.send(body);

            return;
        }

        if (isMockListReady()) {
            this.#sendOrPlayMock(body);

            return;
        }

        this.#waitAndSend(body);
    }

    override abort(): void {
        const local = this.#local;

        if (!local) {
            super.abort();

            return;
        }

        window.clearTimeout(local.timer);

        const isSending = local.readyState !== NativeXhr.DONE && local.readyState !== NativeXhr.UNSENT;
        const aborted: LocalXhr = { readyState: NativeXhr.DONE, isWaiting: false };

        this.#local = aborted;

        if (isSending) {
            this.#changeReadyState(aborted, NativeXhr.DONE);
            this.#dispatchProgress(aborted, XHR_EVENTS.ABORT);
            this.#dispatchProgress(aborted, XHR_EVENTS.LOAD_END);
        }

        aborted.readyState = NativeXhr.UNSENT;
    }

    #stopLocal() {
        window.clearTimeout(this.#local?.timer);

        this.#local = undefined;
    }

    #getMockRequest(): NotRequired<MockRequest> {
        const url = resolveRequestUrl(this.#url, document.baseURI);

        if (url === undefined) {
            return;
        }

        return {
            url,
            method: this.#method,
        };
    }

    #waitAndSend(body: NotRequired<Nullable<Document | XMLHttpRequestBodyInit>>) {
        const local: LocalXhr = { readyState: NativeXhr.OPENED, isWaiting: true };

        this.#local = local;

        waitForMockList()
            .then(() => this.#sendAfterWait(local, body))
            .catch(reportError);
    }

    /** Nothing to send if the page aborted or reopened the request while it waited */
    #sendAfterWait(local: LocalXhr, body: NotRequired<Nullable<Document | XMLHttpRequestBodyInit>>) {
        const isStillWaiting = this.#local === local && local.isWaiting;

        if (!isStillWaiting) {
            return;
        }

        this.#local = undefined;

        this.#sendOrPlayMock(body);
    }

    #sendOrPlayMock(body: NotRequired<Nullable<Document | XMLHttpRequestBodyInit>>) {
        const request = this.#getMockRequest();

        if (!request) {
            super.send(body);

            return;
        }

        const mock = findMock(request);

        if (!mock) {
            super.send(body);

            return;
        }

        this.#playMock(mock, request.url);
    }

    #playMock(mock: PageMock, url: string) {
        const local: LocalXhr = { readyState: NativeXhr.OPENED, isWaiting: false };

        const reply: XhrReply = {
            status: mock.response.status,
            url,
            headers: buildMockHeaders(mock.response),
            body: mock.response.body,
        };

        this.#local = local;

        this.#dispatchProgress(local, XHR_EVENTS.LOAD_START);

        local.timer = window.setTimeout(() => this.#deliverReply(local, reply), mock.response.delayMs);
    }

    #deliverReply(local: LocalXhr, reply: XhrReply) {
        const contentType = getMockHeader(reply.headers, CONTENT_TYPE_HEADER);

        local.reply = reply;

        this.#changeReadyState(local, NativeXhr.HEADERS_RECEIVED);
        this.#changeReadyState(local, NativeXhr.LOADING);
        this.#dispatchProgress(local, XHR_EVENTS.PROGRESS);

        local.response = buildXhrResponse(reply.body, this.responseType, contentType);

        this.#changeReadyState(local, NativeXhr.DONE);
        this.#dispatchProgress(local, XHR_EVENTS.LOAD);
        this.#dispatchProgress(local, XHR_EVENTS.LOAD_END);
    }

    /** Events stop once a handler aborts or reopens the request */
    #changeReadyState(local: LocalXhr, readyState: number) {
        if (this.#local !== local) {
            return;
        }

        local.readyState = readyState;

        this.dispatchEvent(new Event(XHR_EVENTS.READY_STATE_CHANGE));
    }

    #dispatchProgress(local: LocalXhr, type: string) {
        if (this.#local !== local) {
            return;
        }

        const loaded = local.reply?.body.length ?? 0;

        this.dispatchEvent(new ProgressEvent(type, { lengthComputable: loaded > 0, loaded, total: loaded }));
    }
}

export const interceptXhr: VoidFunction = () => {
    window.XMLHttpRequest = InterceptedXhr;
};
