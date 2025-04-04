import React from 'react';
import Link from 'next/link';

const GlassmorphicNavbar: React.FC = () => {
    return (
        <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 w-auto  px-6 py-3 
                    bg-white backdrop-blur-lg 
                    rounded-full shadow-lg z-50 
                    border border-white/30 md:w-2xl">
            <div className="flex items-center justify-between space-x-6">
                <Link href={'/'} className="flex items-center">
                    <div className="bg-gradient-to-br from-blue-400 to-blue-300 p-2 rounded-full shadow-md mr-3 flex items-center justify-center">
                        <span role="img" aria-label="sign language" className="text-xl text-white">👋</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold nohemi text-gray-800 tracking-tight">
                            Next<span className="text-blue-600">Sign</span>
                        </h1>
                    </div>
                </Link>
                <div className=' flex items-center justify-center gap-4'>

                    <div className="h-6 w-px bg-gray-300/50 mx-1"></div>
                    <Link href="/team" className="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200">
                        Team
                    </Link>
                    <Link href="https://github.com/ManojKumar2920/NextSign" className="bg-gradient-to-r from-blue-500 to-blue-300 text-white font-medium
                                           px-5 py-2 rounded-full hover:shadow-md hover:shadow-blue-300/30 transition-all duration-300">
                        Contribute
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default GlassmorphicNavbar;