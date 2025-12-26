
// Service for Google Drive Backup
import { GOOGLE_CLIENT_ID } from '../config';

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;
let initPromise: Promise<void> | null = null;

// Helpers to get keys with fallback
const getClientId = () => {
    let val = '';
    try { val = process.env.GOOGLE_CLIENT_ID || ''; } catch (e) {}
    if (!val) val = localStorage.getItem('GOOGLE_CLIENT_ID') || '';
    if (!val) val = GOOGLE_CLIENT_ID;
    return val.trim();
};

const getApiKey = () => {
    let val = '';
    try { val = process.env.GOOGLE_API_KEY || ''; } catch (e) {}
    if (!val) val = localStorage.getItem('GOOGLE_API_KEY') || '';
    return val.trim();
};

// Helper to wait for script load
const waitForGlobal = (key: string, timeout = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
        if ((window as any)[key]) return resolve(true);
        const start = Date.now();
        const interval = setInterval(() => {
            if ((window as any)[key]) {
                clearInterval(interval);
                resolve(true);
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                resolve(false);
            }
        }, 100);
    });
}

export const initGoogleDrive = async () => {
    if (gapiInited && gisInited) return;

    if (initPromise) {
        await initPromise;
        if (gapiInited && gisInited) return;
        initPromise = null;
    }

    initPromise = (async () => {
        const clientId = getClientId();
        const apiKey = getApiKey();

        if (!clientId || !apiKey) {
            console.warn("Google Drive Init skipped: Missing credentials.");
            return;
        }

        const gapiLoaded = await waitForGlobal('gapi');
        if (gapiLoaded && !gapiInited) {
            await new Promise<void>(resolve => {
                (window as any).gapi.load('client', async () => {
                    try {
                        await (window as any).gapi.client.init({
                            apiKey: apiKey,
                            discoveryDocs: [],
                        });
                        await (window as any).gapi.client.load('drive', 'v3');
                        gapiInited = true;
                    } catch(e) {
                        console.error("GAPI client init error", e);
                    }
                    resolve();
                });
            });
        }

        const googleLoaded = await waitForGlobal('google');
        if (googleLoaded && !gisInited) {
            try {
                tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPES,
                    callback: '', 
                });
                gisInited = true;
            } catch(e) {
                console.error("GIS init error", e);
            }
        }
    })();

    return initPromise;
};

export const backupToDrive = async (data: any, fileName: string): Promise<string> => {
    await initGoogleDrive();

    return new Promise((resolve, reject) => {
        const clientId = getClientId();
        const apiKey = getApiKey();

        if (!apiKey) {
            reject("Missing Google API Key. Please add it in Settings.");
            return;
        }
        if (!clientId) {
            reject("Missing Google Client ID. Please add it in Settings or config.ts.");
            return;
        }

        if (!gapiInited || !gisInited) {
            reject("Google Services failed to initialize.");
            return;
        }

        if (!tokenClient) {
             reject("Auth client not ready.");
             return;
        }

        tokenClient.callback = async (resp: any) => {
            if (resp.error) {
                reject(resp);
            }
            await createDriveFile(data, fileName, resolve, reject);
        };

        if ((window as any).gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            tokenClient.requestAccessToken({prompt: ''});
        }
    });
};

const createDriveFile = async (data: any, fileName: string, resolve: any, reject: any) => {
    try {
        const fileContent = JSON.stringify(data);
        const file = new Blob([fileContent], {type: 'application/json'});
        const metadata = {
            'name': fileName,
            'mimeType': 'application/json',
            'parents': ['root'] 
        };

        const accessToken = (window as any).gapi.client.getToken().access_token;
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form,
        });
        
        const resData = await response.json();
        if(resData.id) {
            resolve(resData.id);
        } else {
            reject("Upload failed: " + (resData.error?.message || "Unknown error"));
        }
    } catch (err) {
        reject(err);
    }
}
