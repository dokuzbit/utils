import home from './index.html';

Bun.serve({
    static: {
        "/": home,
    },
    async fetch(req) {
        return new Response(home, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    },
});
