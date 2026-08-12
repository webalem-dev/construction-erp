import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export default function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="text-slate-600 mt-1">{description}</p>
        )}
      </div>

      <Card>
        <CardContent className="py-20">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
              <Construction className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Coming Soon
            </h3>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">
              This module is under construction.
              We'll build it in the next steps!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}