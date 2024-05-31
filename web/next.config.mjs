import { setupDevBindings } from '@cloudflare/next-on-pages/next-dev';

/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        urlImports: ['https://assets-oh3.pages.dev/'],
    },
};

if (process.env.NODE_ENV === 'development') {
    await setupDevBindings({
        bindings: {
            CLOUDTD_USER_STACK_MAP: {
                type: 'kv',
                id: '45728eeaff424d71aa6da82e47a8dc78',
            },
        }
    });
}


export default nextConfig;
