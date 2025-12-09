import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Template {
  id: string
  name: string
  description: string | null
  intervalMonths: number | null
  intervalMiles: number | null
  checklistItems: string[]
  isBuiltIn: boolean
}

export function MaintenanceTemplateList({
  builtIn,
  custom,
}: {
  builtIn: Template[]
  custom: Template[]
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Built-in Templates</CardTitle>
          <CardDescription>
            Pre-configured maintenance templates available to all companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {builtIn.length === 0 ? (
            <p className="text-gray-600 text-sm">No built-in templates available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {builtIn.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {template.intervalMonths && (
                        <p className="text-gray-600">
                          Interval: Every {template.intervalMonths} months
                        </p>
                      )}
                      {template.intervalMiles && (
                        <p className="text-gray-600">
                          Interval: Every {template.intervalMiles.toLocaleString()} miles
                        </p>
                      )}
                      {template.checklistItems.length > 0 && (
                        <div>
                          <p className="font-medium mb-1">Checklist:</p>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {template.checklistItems.slice(0, 3).map((item, idx) => (
                              <li key={idx} className="text-xs">{item}</li>
                            ))}
                            {template.checklistItems.length > 3 && (
                              <li className="text-xs text-gray-400">
                                +{template.checklistItems.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Templates</CardTitle>
          <CardDescription>
            Templates created specifically for your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          {custom.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No custom templates yet.</p>
              <Link href="/maintenance/templates/new">
                <Button>Create Your First Template</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {custom.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {template.intervalMonths && (
                        <p className="text-gray-600">
                          Interval: Every {template.intervalMonths} months
                        </p>
                      )}
                      {template.intervalMiles && (
                        <p className="text-gray-600">
                          Interval: Every {template.intervalMiles.toLocaleString()} miles
                        </p>
                      )}
                      {template.checklistItems.length > 0 && (
                        <div>
                          <p className="font-medium mb-1">Checklist:</p>
                          <ul className="list-disc list-inside text-gray-600 space-y-1">
                            {template.checklistItems.slice(0, 3).map((item, idx) => (
                              <li key={idx} className="text-xs">{item}</li>
                            ))}
                            {template.checklistItems.length > 3 && (
                              <li className="text-xs text-gray-400">
                                +{template.checklistItems.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      <Link href={`/maintenance/templates/${template.id}/edit`}>
                        <Button variant="outline" size="sm" className="w-full mt-4">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


