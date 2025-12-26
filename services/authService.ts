
import { UserProfile } from '../types';
import { GOOGLE_CLIENT_ID } from '../config';

let tokenClient: any;

const getClientId = () => {
    // Priority: Env -> LocalStorage -> Config File
    try {
        if (process.env.GOOGLE_CLIENT_ID) return process.env.GOOGLE_CLIENT_ID;
    } catch(e) {}
    
    const local = localStorage.getItem('GOOGLE_CLIENT_ID');
    if (local) return local;
    
    return GOOGLE_CLIENT_ID;
};

export const initAuth = (): Promise<void> => {
  return new Promise((resolve) => {
    const clientId = getClientId();

    if ((window as any).google && (window as any).google.accounts) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
            callback: '', // defined at request time
        });
        resolve();
    } else {
        const interval = setInterval(() => {
            if ((window as any).google && (window as any).google.accounts) {
                clearInterval(interval);
                tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
                    callback: '',
                });
                resolve();
            }
        }, 100);
    }
  });
};

export const signInWithGoogle = (): Promise<UserProfile> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
        initAuth().then(() => {
            if(!tokenClient) reject("Google Auth not initialized");
            else requestToken(resolve, reject);
        });
        return;
    }
    requestToken(resolve, reject);
  });
};

const requestToken = (resolve: Function, reject: Function) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
        return;
      }
      
      const accessToken = resp.access_token;
      
      try {
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
          });
          
          if (!userInfoResponse.ok) throw new Error("Failed to fetch user info");
          
          const data = await userInfoResponse.json();
          
          const profile: UserProfile = {
              id: data.sub,
              name: data.name,
              email: data.email,
              picture: data.picture
          };

          localStorage.setItem('USER_PROFILE', JSON.stringify(profile));
          localStorage.setItem('GOOGLE_ACCESS_TOKEN', accessToken);
          
          resolve(profile);
      } catch (err) {
          reject(err);
      }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
}

export const signOut = () => {
    localStorage.removeItem('USER_PROFILE');
    localStorage.removeItem('GOOGLE_ACCESS_TOKEN');
};

export const getUser = (): UserProfile | null => {
    const stored = localStorage.getItem('USER_PROFILE');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return null;
        }
    }
    return null;
};
