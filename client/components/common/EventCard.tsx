import React ,{ReactNode} from 'react' 
import { Card, CardHeader } from '@/components/ui/card'
interface CardProps {
    title: string;
    description: string;
    logoUrl?: string;
    children?: ReactNode;

}
const EventCard:React.FC<CardProps> = ({title,description,logoUrl,children}:CardProps) => {
  return (
    <Card className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-purple-500/20 transform hover:-translate-y-2 transition-all duration-300 group">
        <CardHeader className="p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-b border-gray-700/50">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent group-hover:from-purple-400 group-hover:via-indigo-400 group-hover:to-blue-400 transition-all duration-500">{title}</h1>
            <p className="mt-2 text-sm text-gray-400">{description}</p>
        </CardHeader>
        <div className="p-6 text-gray-300 text-sm leading-relaxed">
            {children}
        </div>
    </Card>
  )
}

export default EventCard