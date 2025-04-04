import React from 'react';
import Image from 'next/image';

// Define the type for team member data
type TeamMember = {
  id: number;
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
};

// Sample team data
const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Manoj Kumar",
    role: "Captain",
    bio: "Software engineer and student leading the development of the Sign Language Translator. Specializes in AI, computer vision, and web technologies to bring this project to life.",
    imageUrl: "/team/manoj-kumar.jpg",
  },
  {
    id: 2,
    name: "Hemima",
    role: "Vice Captain",
    bio: "Supports the project by providing insights and ideas. Assists in research, testing, and user feedback to improve the system.",
    imageUrl: "/team/hemima.jpg",
  },
  {
    id: 3,
    name: "Roobasagaran",
    role: "Soldier",
    bio: "Actively contributes by helping with documentation, project coordination, and ensuring smooth collaboration within the team.",
    imageUrl: "/team/roobasagaran.jpg",
  },
  {
    id: 4,
    name: "Arthi",
    role: "Soldier",
    bio: "Plays a key role in testing and evaluating the project. Provides valuable feedback to enhance the user experience and accessibility of the translator.",
    imageUrl: "/team/arthi.jpg",
  },
];

const TeamPage: React.FC = () => {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mt-20 mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl nohemi-bold font-bold text-gray-900 sm:text-5xl">
            Meet Our Amazing Team
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Passionate professionals dedicated to bringing your ideas to life
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <div 
              key={member.id} 
              className="bg-white rounded-3xl shadow-lg overflow-hidden transform transition duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="relative h-64 w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-30 z-10 rounded-t-3xl" />
                <div className="relative h-full w-full">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover rounded-t-3xl"
                    priority
                  />
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold  text-gray-900">{member.name}</h3>
                <p className="text-indigo-600 font-medium mt-1">{member.role}</p>
                <p className="mt-3 text-gray-600">{member.bio}</p>
                
                <div className="mt-6 flex space-x-3">
                  <button className="flex-1 bg-indigo-600 cursor-pointer hover:bg-indigo-700 text-white py-2 px-4 rounded-full text-sm font-medium transition duration-200">
                    Contact
                  </button>
                  <button className="flex-1 bg-white cursor-pointer hover:bg-gray-100 text-indigo-600 border border-indigo-600 py-2 px-4 rounded-full text-sm font-medium transition duration-200">
                    Profile
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamPage;