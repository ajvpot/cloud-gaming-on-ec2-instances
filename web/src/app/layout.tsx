import { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {

    return (
        <html>
        <body>


        <div className="flex flex-col min-h-screen">
            <Head>
                <title>RenderLab.app</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <header className="bg-gray-800 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="text-xl font-bold">
                        RenderLab.app
                    </div>
                    <div className="space-x-4">
                        <Link href="/app" className="hover:underline">
                            Log In
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4">
                <div className="bg-white rounded shadow p-6">
                    {children}
                </div>
            </main>

            <footer className="bg-gray-800 text-white p-4 text-center">
                &copy; {new Date().getFullYear()} RenderLab.app. All Rights Reserved.
            </footer>
        </div>
        </body>
        </html>
    );
};

export default Layout;
