"use client"
import React ,{ReactNode} from 'react' 
import { Card, CardHeader } from '@/components/ui/card'
import Link from 'next/link'
interface CardProps {
    title: string;
    description?: string;
    logoUrl?: string;
    children?: ReactNode;
    redirectUrl?: string;
}
const EventCard:React.FC<CardProps> = ({title,description,logoUrl,children,redirectUrl}:CardProps) => {
  return (
    <Link href={redirectUrl || '#'}>
    <Card className="w-full h-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-[#ff6b6b]/30 transform hover:-translate-y-2 transition-all duration-300 group" >
        <CardHeader className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-b border-gray-700/50">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-[#4facfe] via-[#00f2fe] to-[#7b4dff] bg-clip-text text-transparent group-hover:from-[#ff6b6b] group-hover:via-[#ffd93d] group-hover:to-[#6c5ce7] transition-all duration-500">{title}</h1>
            <p className="mt-2 text-sm text-gray-400 ">{description}</p>
        </CardHeader>
        <div className="p-6 text-gray-300 text-sm leading-relaxed">
            {children}
        </div>
    </Card>
    </Link>
  )
}

export default EventCard