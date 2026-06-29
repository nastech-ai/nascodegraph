/** Dashboard base for the device-login endpoints; override for testing via NASTECHGRAPH_LOGIN_URL. */
export declare function loginBaseUrl(): string;
/** The dashboard's response to a device-authorization start request. */
export interface DeviceStart {
    device_code: string;
    user_code: string;
    verification_uri: string;
    /** Same URL with the code prefilled, for one-click open. */
    verification_uri_complete?: string;
    /** Seconds the CLI should wait between polls. */
    interval?: number;
    /** Seconds until the request expires. */
    expires_in?: number;
}
/** Begin a device-authorization request. */
export declare function startDeviceLogin(): Promise<DeviceStart>;
/** Poll until the user approves in the browser; resolves with the org token. */
export declare function pollForToken(deviceCode: string, intervalSec: number, expiresInSec: number): Promise<string>;
/** Best-effort: open a URL in the default browser. Never throws — the URL is also printed. */
export declare function openBrowser(url: string): Promise<void>;
//# sourceMappingURL=login.d.ts.map