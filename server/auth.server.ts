interface Provider {
    name: 'google' | 'apple' | 'facebook' | 'instagram';
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
}

export class Auth {
    async callback(provider: Provider) {
        switch (provider.name) {
            case 'google':
                try {
                    // Google'dan access token al
                    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            code: provider.code,
                            client_id: provider.clientId,
                            client_secret: provider.clientSecret,
                            redirect_uri: provider.redirectUri,
                            grant_type: 'authorization_code',
                        }),
                    });

                    const { access_token } = await tokenResponse.json();

                    if (!access_token) {
                        throw new Error('Access token alınamadı');
                    }

                    // Google'dan kullanıcı bilgilerini al
                    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: {
                            Authorization: `Bearer ${access_token}`,
                        },
                    });

                    const userData = await userResponse.json();
                    if (!userData.email) {
                        throw new Error('Kullanıcı bilgileri alınamadı');
                    }

                    return userData;

                } catch (err) {
                    console.error('Google auth hatası:', err);
                    throw new Error('Google ile giriş yapılırken bir hata oluştu');
                }
                break;
        }
    }
}

export const auth = new Auth();
export default auth;