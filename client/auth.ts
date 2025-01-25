interface Provider {
    name: 'google' | 'apple' | 'facebook' | 'instagram';
    clientId: string;
    redirectUri: string;
}


class Auth {
    login(provider: Provider) {
        switch (provider.name) {
            case 'google':
                const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${provider.clientId}&` +
                    `redirect_uri=${encodeURIComponent(provider.redirectUri)}&` +
                    `response_type=code&` +
                    `scope=email%20openid&` +
                    `access_type=offline`;
                window.location.href = googleAuthUrl;
                break;
        }
    }
}

export default new Auth();